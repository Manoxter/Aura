import { NextResponse } from 'next/server'
import { groq } from '@/lib/engine/ai-client'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiInsightRequestSchema } from '@/lib/schemas'
import { logError } from '@/lib/logger'

export async function POST(req: Request) {
    const correlationId = (req.headers.get('X-Correlation-ID')) ?? crypto.randomUUID()
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limiting: 60 req/hora por tenant
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/insight', 60, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
                { status: 429 }
            )
        }

        // Zod validation
        const body = await req.json()
        const parseResult = AiInsightRequestSchema.safeParse(body)
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { contexto } = parseResult.data

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'Groq API key is missing' },
                { status: 500 }
            )
        }

        const systemPrompt = `Você é o assistente de IA ubíqua da plataforma Aura, voltada para projetos de engenharia.
Você deve responder ESTRITAMENTE em formato JSON.

Formato esperado:
{
  "resumo": "Análise de 1 ou 2 frases curtas sobre o estado geral e os dados recebidos",
  "alertas": ["alerta 1 caso encontre divergência ou risco", "alerta 2", ...],
  "acoes": [
    { "descricao": "nome curto de uma ação recomendada", "payload": {} }
  ]
}

Seja pragmático, como um engenheiro analisando dados matemáticos do projeto.
Contexto atual da plataforma: Módulo ${contexto.modulo}.`

        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(contexto.dados) }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        })

        const rawContent = response.choices[0]?.message?.content || '{}'
        const insight = JSON.parse(rawContent)

        return NextResponse.json(insight)
    } catch (error) {
        const err = error as Error
        logError({
            message: err.message ?? 'Unknown error in /api/ai/insight',
            stack: err.stack,
            correlationId,
            context: { route: '/api/ai/insight' },
        })
        return NextResponse.json(
            { error: 'Erro interno', correlationId },
            { status: 500 }
        )
    }
}
