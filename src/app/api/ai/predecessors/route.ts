import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiPredecessorsRequestSchema } from '@/lib/schemas'

function getGroq() { return new Groq({ apiKey: process.env.GROQ_API_KEY || '' }) }

// Normalize predecessoras: LLM may return string, array, or object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePreds(raw: any): string[] {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map(String)
    if (typeof raw === 'string') return raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
    return []
}

// Compact task payload to stay within GROQ token limits (12K TPM on free tier)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compactPayload(tarefas: any[], eapNodes?: any[]) {
    // Map UUIDs to short IDs (T01, T02...) to save tokens
    const idMap = new Map<string, string>()
    const reverseMap = new Map<string, string>()

    tarefas.forEach((t, i) => {
        const shortId = t.id.length <= 6 ? t.id : `T${String(i + 1).padStart(2, '0')}`
        idMap.set(t.id, shortId)
        reverseMap.set(shortId, t.id)
    })

    // Compact tasks: short ID, truncated name, duration only
    const compactTasks = tarefas.map(t => ({
        id: idMap.get(t.id) || t.id,
        n: (t.nome || '').slice(0, 50), // truncate names to 50 chars
        d: t.duracao || t.duracao_estimada || 1
    }))

    // Compact EAP: only parent-child relationships for grouping context
    let eapContext = ''
    if (eapNodes && eapNodes.length > 0) {
        // Build parent groups: "Group: child1, child2, child3"
        const parentMap = new Map<string, string[]>()
        const nodeNames = new Map<string, string>()
        eapNodes.forEach(n => {
            nodeNames.set(n.id, (n.nome || '').slice(0, 30))
            if (n.pai_id) {
                if (!parentMap.has(n.pai_id)) parentMap.set(n.pai_id, [])
                parentMap.get(n.pai_id)!.push((n.nome || '').slice(0, 30))
            }
        })
        const groups = Array.from(parentMap.entries())
            .filter(([pid]) => nodeNames.has(pid))
            .map(([pid, children]) => `${nodeNames.get(pid)}: ${children.join(', ')}`)
            .slice(0, 10) // max 10 groups
        if (groups.length > 0) {
            eapContext = `\nGrupos EAP: ${groups.join(' | ')}`
        }
    }

    return { compactTasks, eapContext, reverseMap }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limiting: 60 req/hora por tenant
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/predecessors', 60, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
                { status: 429 }
            )
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'GROQ_API_KEY não configurada no servidor.' }, { status: 500 })
        }

        // Zod validation
        const rawBody = await req.json()
        const parseResult = AiPredecessorsRequestSchema.safeParse(rawBody)
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { tarefas, eapNodes } = parseResult.data

        const { compactTasks, eapContext, reverseMap } = compactPayload(tarefas, eapNodes)

        // Compact system prompt (~400 tokens vs ~600 before)
        const systemPrompt = `Engenheiro PMBOK. Infira predecessoras entre tarefas pela lógica construtiva dos nomes.
Regras: fundação→estrutura→acabamento, planejamento→execução, instalação→testes.
Tarefas do mesmo grupo EAP podem ser paralelas. Sem predecessoras = tarefa inicial ([]).
PRESERVE IDs exatos. Responda APENAS JSON: {"tarefasComPredecessoras":[{"id":"...","predecessoras":["..."]}]}`

        const userContent = JSON.stringify(compactTasks) + eapContext

        const response = await getGroq().chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' }
        })

        const rawContent = response.choices[0]?.message?.content || '{}'
        const result = JSON.parse(rawContent)

        // Validate response structure
        if (!result.tarefasComPredecessoras || !Array.isArray(result.tarefasComPredecessoras)) {
            return NextResponse.json({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tarefasComPredecessoras: tarefas.map((t: any) => ({ id: t.id, predecessoras: [] }))
            })
        }

        // Map short IDs back to original UUIDs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expanded = result.tarefasComPredecessoras.map((p: any) => ({
            id: reverseMap.get(p.id) || p.id,
            predecessoras: normalizePreds(p.predecessoras).map((pred: string) => reverseMap.get(pred) || pred)
        }))

        return NextResponse.json({ tarefasComPredecessoras: expanded })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('[predecessors] Erro:', error?.message || error)

        if (error?.status === 401 || error?.message?.includes('API key')) {
            return NextResponse.json({ error: 'Chave GROQ inválida ou expirada.' }, { status: 500 })
        }
        if (error?.status === 429 || error?.message?.includes('rate_limit')) {
            return NextResponse.json({ error: 'Rate limit da IA excedido. Tente novamente em alguns segundos.' }, { status: 429 })
        }
        if (error?.message?.includes('413') || error?.message?.includes('too large') || error?.message?.includes('Request too large')) {
            return NextResponse.json({ error: 'Payload muito grande. Reduza o número de tarefas ou simplifique os nomes.' }, { status: 413 })
        }
        if (error?.message?.includes('model')) {
            return NextResponse.json({ error: `Modelo IA indisponível: ${error.message}` }, { status: 500 })
        }

        return NextResponse.json({
            error: `Falha ao inferir predecessoras: ${error?.message || 'erro desconhecido'}`
        }, { status: 500 })
    }
}
