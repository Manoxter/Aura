import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiProactiveSetupRequestSchema } from '@/lib/schemas'

function getGroq() { return new Groq({ apiKey: process.env.GROQ_API_KEY || '' }) }

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    // Rate limiting: 60 req/hora por tenant
    const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/proactive-setup', 60, 3600000)
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
        { status: 429 }
      )
    }

    // Zod validation
    const rawBody = await req.json()
    const parseResult = AiProactiveSetupRequestSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { tap } = parseResult.data

    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY ausente. Usando fallback de setup proativo local.')
      return NextResponse.json({
        tarefasSugeridas: [
          { id: "T01", nome: "Planejamento e Mobilização", duracao: 10, dependencias: [], es: 0, ef: 10, ls: 0, lf: 10, folga: 0, critica: true },
          { id: "T02", nome: "Execução Fase Principal", duracao: 90, dependencias: ["T01"], es: 10, ef: 100, ls: 10, lf: 100, folga: 0, critica: true },
          { id: "T03", nome: "Acabamento e Entrega", duracao: 30, dependencias: ["T02"], es: 100, ef: 130, ls: 100, lf: 130, folga: 0, critica: true }
        ],
        orcamentoSugerido: 1500000,
        funcoesSugeridas: [
          { id: "f1", nome: "Crashing Padrão", descricao: "Aceleração geral de cronograma", custo_adicional_dia: 5000, reducao_maxima_dias: 10, tipo: "crashing" },
          { id: "f2", nome: "Logística Expressa", descricao: "Antecipação de suprimentos", custo_adicional_dia: 3000, reducao_maxima_dias: 5, tipo: "crashing" }
        ],
        marcosSugeridos: [
          { id: "m1", nome: "Início", dia_estimado: 0 },
          { id: "m2", nome: "Entrega de Chaves", dia_estimado: 130 }
        ]
      })
    }

    const systemPrompt = `Você é o Engenheiro Chefe de Planejamento (Klauss IA) do sistema Aura.
O usuário preencheu a TAP de um projeto de alta complexidade.
Sua missão é deduzir de forma pragmática e matemática:

1. CRONOGRAMA CPM (tarefasSugeridas):
   - Mínimo de 6, máximo de 10 macro-etapas.
   - Utilize as tarefas já identificadas na TAP como espinha dorsal.
   - Infira dependências lógicas (FS - Finish to Start).
   - Calcule durações realistas conforme o escopo (ex: Refinaria = anos/meses).
   - Inclua os campos matemáticos (es, ef, ls, lf, folga, critica) baseados no cálculo de rede.

2. ORÇAMENTO (orcamentoSugerido):
   - Baseie-se no CAPEX mencionado na TAP. Se for R$ 15 Bilhões, retorne 15000000000.

3. COMPRESSÃO (funcoesSugeridas):
   - Sugira 3 estratégias de Crashing (Aceleração).

4. MARCOS (marcosSugeridos):
   - Marque os milestones oficiais da TAP.

Regras de Saída (JSON PURO):
{
  "tarefasSugeridas": [
    { "id": "T01", "nome": "Mobilização", "duracao": 30, "dependencias": [], "es": 0, "ef": 30, "ls": 0, "lf": 30, "folga": 0, "critica": true }
  ],
  "orcamentoSugerido": 15000000000,
  "funcoesSugeridas": [
    { "id": "f1", "nome": "Turno Extra", "descricao": "24h/dia", "custo_adicional_dia": 1000000, "reducao_maxima_dias": 10, "tipo": "crashing" }
  ],
  "marcosSugeridos": [
     { "id": "m1", "nome": "Início", "dia_estimado": 0 }
  ]
}

Contexto da TAP:
${JSON.stringify(tap)}
`

    const response = await getGroq().chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    })

    const rawContent = response.choices[0]?.message?.content || '{}'
    let result
    try {
        result = JSON.parse(rawContent)
    } catch (_e) {
        // Fallback cleaning if JSON is wrapped in markdown
        const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim()
        result = JSON.parse(cleaned)
    }

    return NextResponse.json(result)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Erro no processamento Proativo:', error)
    return NextResponse.json({ error: 'Falha ao gerar Setup Proativo com a IA.' }, { status: 500 })
  }
}
