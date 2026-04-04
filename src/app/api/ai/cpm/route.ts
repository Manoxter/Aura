import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiCpmRequestSchema } from '@/lib/schemas'
import { logError } from '@/lib/logger'

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
}

export async function POST(req: Request) {
    const correlationId = (req.headers.get('X-Correlation-ID')) ?? crypto.randomUUID()
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limiting: 60 req/hora por tenant
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/cpm', 60, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
                { status: 429 }
            )
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'Chave do Groq ausente' }, { status: 500 })
        }

        // Zod validation
        const body = await req.json()
        const result = AiCpmRequestSchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: result.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { tarefas } = result.data

        // Check if predecessors already exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasPredecessors = tarefas.some((t: any) => t.predecessoras && t.predecessoras.length > 0)

        const systemPrompt = hasPredecessors
            ? `Você é um engenheiro de planejamento especialista em PMBOK e CPM.
O usuário enviará tarefas com ID, nome, duração e PREDECESSORAS já definidas.
IMPORTANTE: As predecessoras JÁ FORAM definidas pelo usuário/IA. Você DEVE usá-las exatamente como recebidas — NÃO altere as dependências.

Sua missão é CALCULAR o CPM usando as predecessoras fornecidas:
1. Forward Pass: ES e EF para cada tarefa (ES = max(EF predecessoras), EF = ES + duração)
2. Backward Pass: LS e LF (LF da última = EF máximo, LS = LF - duração)
3. Folga = LS - ES (ou LF - EF)
4. Caminho Crítico: tarefas com Folga = 0
5. Se múltiplos caminhos empatados, TODOS com critica=true. O principal é o que contém a tarefa com MAIOR duração individual.
6. PRESERVE os IDs exatos recebidos.

Resposta ESTRITAMENTE JSON:
{
  "tarefasProcessadas": [
    { "id": "id-original", "nome": "...", "duracao": 5, "predecessoras": ["..."], "es": 0, "ef": 5, "ls": 0, "lf": 5, "folga": 0, "critica": true }
  ],
  "duracaoTotalProjeto": 30
}`
            : `Você é um engenheiro de planejamento especialista em PMBOK e CPM.
O usuário enviará tarefas com ID, nome e duração. SEM predecessoras definidas.

Sua missão:
1. Inferir logicamente as dependências (predecessoras) pela lógica construtiva dos nomes.
2. Calcular ES, EF, LS, LF e Folga (CPM completo).
3. Se múltiplos caminhos empatados, TODOS com critica=true. Principal = tarefa com MAIOR duração.
4. PRESERVE os IDs exatos recebidos.

Resposta ESTRITAMENTE JSON:
{
  "tarefasProcessadas": [
    { "id": "id-original", "nome": "...", "duracao": 5, "predecessoras": ["..."], "es": 0, "ef": 5, "ls": 0, "lf": 5, "folga": 0, "critica": true }
  ],
  "duracaoTotalProjeto": 30
}`

        const response = await getGroq().chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(tarefas) }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        })

        const rawContent = response.choices[0]?.message?.content || '{}'
        const cpmResult = JSON.parse(rawContent)

        return NextResponse.json(cpmResult)
    } catch (error: unknown) {
        const err = error as Error
        logError({
            message: err.message ?? 'Unknown error in /api/ai/cpm',
            stack: err.stack,
            correlationId,
            context: { route: '/api/ai/cpm' },
        })
        return NextResponse.json({ error: 'Erro interno', correlationId }, { status: 500 })
    }
}
