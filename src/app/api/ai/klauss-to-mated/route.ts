import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { KlaussMATEDRequestSchema } from '@/lib/schemas'
import { parseKlaussMATEDResponse, type KlaussMATEDResult } from '@/lib/api/klauss-mated'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logError } from '@/lib/logger'

// Lazy Groq init — igual ao padrão do klauss
function getGroq() { return new Groq({ apiKey: process.env.GROQ_API_KEY || '' }) }

// Mock estruturado retornado quando GROQ_API_KEY está ausente (modo offline)
const OFFLINE_MOCK: KlaussMATEDResult = {
  impacto: { E: 0, P: 0.2, O: 0.2 },
  zona_estimada: 'SEGURO',
  confianca: 0,
  justificativa: '[MODO OFFLINE] GROQ_API_KEY não configurada. Retornando mock estruturado.',
}

const MATED_SYSTEM_PROMPT = `Você é um motor analítico do MetodoAura. Analise a decisão gerencial fornecida e retorne APENAS JSON válido (sem markdown, sem explicações externas):
{
  "impacto": { "E": <número_delta>, "P": <número_delta>, "O": <número_delta> },
  "zona_estimada": "OTIMO"|"SEGURO"|"RISCO"|"CRISE",
  "confianca": <número_0_a_1>,
  "justificativa": "<texto curto>"
}

Regras:
- deltas em "impacto" são variações percentuais normalizadas de cada dimensão CDT (E=Escopo, P=Prazo, O=Orçamento), no intervalo [-1.0, +1.0].
- Valor positivo = aumento; negativo = redução.
- "zona_estimada" classifica o impacto geral no triângulo CDT:
  OTIMO  = impacto mínimo, projeto saudável
  SEGURO = desvio controlável dentro da ZRE
  RISCO  = desvio relevante, requer atenção
  CRISE  = violação iminente da CET
- "confianca" é sua certeza na análise (0.0 = incerto, 1.0 = certeza máxima).
- "justificativa" é uma frase curta (máx 120 chars) explicando o raciocínio.
- NUNCA invente dados que não estejam na decisão descrita. Infira apenas o que é razoável.`

export async function POST(req: Request) {
  const correlationId = req.headers.get('X-Correlation-ID') ?? crypto.randomUUID()

  try {
    // 1. Autenticação
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    // 2. Rate limit: 60 req/hora por tenant — igual ao klauss
    const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/klauss-to-mated', 60, 3600000)
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
        { status: 429 }
      )
    }

    // 3. Validação Zod
    const rawBody = await req.json()
    const parseResult = KlaussMATEDRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { descricao, projetoId, taAtual, tmAtual } = parseResult.data

    // 4. Modo offline — GROQ_API_KEY ausente
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        resultado: OFFLINE_MOCK,
        projetoId,
        correlationId,
      })
    }

    // 5. Montar contexto adicional para o prompt (opcional)
    const contextLines: string[] = []
    if (taAtual) {
      contextLines.push(`Triângulo Atual (TA): E=${taAtual.E} P=${taAtual.P} O=${taAtual.O}`)
    }
    if (tmAtual) {
      contextLines.push(`Meta (TM): E=${tmAtual.E} P=${tmAtual.P} O=${tmAtual.O}`)
    }
    const contextBlock = contextLines.length > 0
      ? `\n\nContexto CDT atual:\n${contextLines.join('\n')}`
      : ''

    const userPrompt = `Decisão gerencial: "${descricao}"${contextBlock}`

    // 6. Chamada Groq
    const chatCompletion = await getGroq().chat.completions.create({
      messages: [
        { role: 'system', content: MATED_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1, // Determinístico para análise estruturada
      max_tokens: 400,
    })

    const rawResponse = chatCompletion.choices[0]?.message?.content ?? ''

    // 7. Parse da resposta estruturada
    const resultado = parseKlaussMATEDResponse(rawResponse)
    if (!resultado) {
      return NextResponse.json(
        {
          error: 'O modelo retornou uma resposta não estruturada. Tente novamente.',
          correlationId,
        },
        { status: 422 }
      )
    }

    // 8. Persistir em decisoes_mated
    const supabase = getSupabaseAdmin()

    // impacto_area_percent: média dos deltas absolutos das 3 dimensões × 100
    const impactoAreaPercent =
      (Math.abs(resultado.impacto.E) + Math.abs(resultado.impacto.P) + Math.abs(resultado.impacto.O)) / 3 * 100

    const { error: dbError } = await supabase
      .from('decisoes_mated')
      .insert({
        projeto_id: projetoId,
        descricao,
        parametros_numericos: resultado.impacto,
        zona_resultado: resultado.zona_estimada,
        impacto_area_percent: impactoAreaPercent,
      })

    if (dbError) {
      // Persistência falha não bloqueia a resposta — apenas loga
      logError({
        message: `[klauss-to-mated] Falha ao persistir em decisoes_mated: ${dbError.message}`,
        correlationId,
        context: { projetoId, tenantId: auth.user.id },
      })
    }

    // 9. Retornar resultado estruturado
    return NextResponse.json({
      resultado,
      projetoId,
      correlationId,
      impactoAreaPercent,
    })

  } catch (error: unknown) {
    const err = error as Error
    logError({
      message: err.message ?? 'Unknown error in /api/ai/klauss-to-mated',
      stack: err.stack,
      correlationId,
      context: { route: '/api/ai/klauss-to-mated' },
    })
    return NextResponse.json(
      { error: 'Erro interno', correlationId },
      { status: 500 }
    )
  }
}
