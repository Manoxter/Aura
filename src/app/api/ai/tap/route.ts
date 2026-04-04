import { NextResponse } from 'next/server'
import { TAPSchema } from '@/lib/validations/ai-schemas'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiTapRequestSchema } from '@/lib/schemas'

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limiting: 60 req/hora por tenant
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/tap', 60, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
                { status: 429 }
            )
        }

        // Zod validation
        const body = await req.json()
        const parseResult = AiTapRequestSchema.safeParse(body)
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { text } = parseResult.data

        if (!process.env.GROQ_API_KEY) {
            console.warn('GROQ_API_KEY ausente. Retornando campos semânticos vazios para preenchimento manual.')
            return NextResponse.json({
                nome_projeto: '',
                justificativa: '',
                objetivo_smart: '',
                escopo_sintetizado: '',
                orcamento_total: 0,
                prazo_total: 0,
                restricoes: '',
                tarefas: [],
                _fallback: true
            })
        }

        const systemPrompt = `Você é um Engenheiro de Planejamento Sênior (PMBOK 7ª). Extraia dados de um Termo de Abertura de Projeto (TAP) e retorne SOMENTE JSON válido, sem markdown, sem blocos de código.

MAPEAMENTO DE RÓTULOS → CAMPOS JSON:
- "Nome do Projeto" / "Projeto" / "Project Name"   → nome_projeto
- "Justificativa" / "Problema" / "Contexto"        → justificativa
- "Objetivo" / "Objetivo SMART" / "Meta"           → objetivo_smart
- "Escopo" / "Descrição" / "Summary"               → escopo_sintetizado (1 frase)
- "Orçamento" / "Budget" / "Custo" / "BAC"         → orcamento_total (número puro, sem símbolo)
- "Prazo" / "Duração" / "Timeline" / "Deadline"    → prazo_total (inteiro em DIAS)
- "Restrições" / "Constraints" / "Limitações"      → restricoes
- Fases / Etapas / WBS / Milestones                → tarefas

REGRAS CRÍTICAS:
1. Se o campo tiver rótulo explícito no texto, copie o conteúdo LITERALMENTE (não invente).
2. Se o campo NÃO tiver rótulo, INFIRA a partir do contexto geral do texto.
3. PRAZO: converta para DIAS inteiros. "13 anos" → 4745, "18 meses" → 540, "365 dias" → 365.
4. ORÇAMENTO: retorne número puro. "USD 2.800.000.000" → 2800000000, "R$ 1,5 milhão" → 1500000.
5. TAREFAS: 6 a 10 macro-etapas. Soma das durações ≈ prazo_total.
6. NUNCA retorne null. Campos de texto sem dados → string vazia "". Números sem dados → 0.

FORMATO DE SAÍDA (JSON puro, sem markdown):
{
  "nome_projeto": "Nome oficial completo",
  "justificativa": "Motivo estratégico ou problema a resolver",
  "objetivo_smart": "Entregas concretas e capacidades a serem atingidas",
  "escopo_sintetizado": "Uma frase descrevendo a essência do projeto",
  "orcamento_total": 2800000000,
  "prazo_total": 4745,
  "restricoes": "Restrições de custo, prazo e contingência",
  "tarefas": [
    { "id": "T01", "nome": "Planejamento e Projeto", "duracao": 365 },
    { "id": "T02", "nome": "Execução Principal", "duracao": 3650 }
  ]
}`

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ]
            })
        })

        if (!groqRes.ok) {
            const errText = await groqRes.text()
            console.error('[TAP] Groq HTTP error:', groqRes.status, errText.substring(0, 300))
            return NextResponse.json(
                { error: 'Groq API error', detail: errText.substring(0, 200), status: groqRes.status },
                { status: 502 }
            )
        }

        const groqJson = await groqRes.json()
        const rawContent = groqJson.choices?.[0]?.message?.content || '{}'
        console.log('[TAP] Groq raw response:', rawContent.substring(0, 500))

        // Sanitiza markdown wrappers que alguns modelos adicionam mesmo com json_object
        const cleanJson = rawContent
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim()

        let parsed: unknown
        try {
            parsed = JSON.parse(cleanJson)
        } catch (__parseErr) {
            console.error('[TAP] JSON.parse falhou. Raw:', rawContent.substring(0, 300))
            return NextResponse.json({ error: 'Resposta da IA não é JSON válido.' }, { status: 422 })
        }

        const extractedTAP = TAPSchema.parse(parsed)
        console.log('[TAP] Extração OK:', JSON.stringify(extractedTAP).substring(0, 300))

        return NextResponse.json(extractedTAP)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('[TAP] Erro na extração:', error?.message || error)

        if (error instanceof ZodError) {
            console.error('[TAP] Zod errors:', JSON.stringify(error.flatten().fieldErrors))
            return NextResponse.json(
                { error: 'AI Validation Error: formato do TAP inválido', details: error.flatten().fieldErrors },
                { status: 422 }
            )
        }

        return NextResponse.json({
            error: 'Falha ao analisar texto com a IA.',
            detail: error?.message || String(error),
            type: error?.constructor?.name
        }, { status: 500 })
    }
}
