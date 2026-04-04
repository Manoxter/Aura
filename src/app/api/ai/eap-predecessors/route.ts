import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ─── Sprint 5.6: EAP Predecessors AI Route ────────────────────────────────────
// Lê TAP + EAP do Supabase server-side, infere predecessoras com contexto rico
// e retorna sugestões para gate de confirmação (não aplica diretamente no CPM).
// Diferencial vs /api/ai/predecessors: usa TAP para contextualizar o projeto.
// ──────────────────────────────────────────────────────────────────────────────

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
}

function getSupabaseAdmin() {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createClient(url, key)
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const TarefaSchema = z.object({
    id: z.string().min(1),
    nome: z.string().min(1),
    duracao: z.number().positive().optional(),
    duracao_estimada: z.number().positive().optional(),
})

const EapNodeSchema = z.object({
    id: z.string().min(1),
    nome: z.string().optional(),
    pai_id: z.string().nullable().optional(),
})

const RequestSchema = z.object({
    projetoId: z.string().uuid('projetoId deve ser um UUID válido'),
    tarefas: z.array(TarefaSchema).min(1).max(300),
    eapNodes: z.array(EapNodeSchema).max(1000).optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mapa UUID → T01, T02... para compactar tokens
function buildIdMaps(tarefas: z.infer<typeof TarefaSchema>[]) {
    const toShort = new Map<string, string>()
    const toLong  = new Map<string, string>()
    tarefas.forEach((t, i) => {
        const short = t.id.length <= 6 ? t.id : `T${String(i + 1).padStart(2, '0')}`
        toShort.set(t.id, short)
        toLong.set(short, t.id)
    })
    return { toShort, toLong }
}

// Extrai grupos da EAP como "Fase A: tarefa1, tarefa2"
function buildEapContext(eapNodes: z.infer<typeof EapNodeSchema>[] | undefined): string {
    if (!eapNodes || eapNodes.length === 0) return ''
    const names = new Map(eapNodes.map(n => [n.id, (n.nome || '').slice(0, 40)]))
    const children = new Map<string, string[]>()
    eapNodes.forEach(n => {
        if (n.pai_id) {
            if (!children.has(n.pai_id)) children.set(n.pai_id, [])
            children.get(n.pai_id)!.push((n.nome || '').slice(0, 30))
        }
    })
    const groups = Array.from(children.entries())
        .filter(([pid]) => names.has(pid))
        .map(([pid, kids]) => `${names.get(pid)}: ${kids.join(', ')}`)
        .slice(0, 12)
    return groups.length > 0 ? `\nEstrutura EAP: ${groups.join(' | ')}` : ''
}

// Normaliza predecessoras (LLM pode retornar string, array, ou mistura)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePreds(raw: any): string[] {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
    if (typeof raw === 'string') return raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
    return []
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limit: 40 req/hora (rota mais cara que /predecessors por busca no DB)
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/eap-predecessors', 40, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 40, window: '1h' },
                { status: 429 }
            )
        }

        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 500 })
        }

        const rawBody = await req.json()
        const parsed  = RequestSchema.safeParse(rawBody)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { projetoId, tarefas, eapNodes } = parsed.data

        // ── Busca TAP do Supabase (server-side) ───────────────────────────────
        const supabase = getSupabaseAdmin()
        const { data: projeto, error: dbErr } = await supabase
            .from('projetos')
            .select('nome, objetivo_smart, escopo_sintetizado, justificativa, setor, prazo_total, tenant_id')
            .eq('id', projetoId)
            .maybeSingle()

        if (dbErr) {
            return NextResponse.json({ error: 'Erro ao buscar dados do projeto.' }, { status: 500 })
        }
        // Autorização: validar tenant do projeto = tenant do usuário autenticado
        if (!projeto || projeto.tenant_id !== auth.user.id) {
            return NextResponse.json({ error: 'Projeto não encontrado ou acesso negado.' }, { status: 404 })
        }

        // ── Compactar payload ─────────────────────────────────────────────────
        const { toShort, toLong } = buildIdMaps(tarefas)
        const compactTasks = tarefas.map(t => ({
            id: toShort.get(t.id) || t.id,
            n: t.nome.slice(0, 60),
            d: t.duracao ?? t.duracao_estimada ?? 1,
        }))
        const eapCtx = buildEapContext(eapNodes)

        // ── Monta contexto TAP ────────────────────────────────────────────────
        const tapLines: string[] = []
        if (projeto.nome)               tapLines.push(`Projeto: ${projeto.nome}`)
        if (projeto.setor)              tapLines.push(`Setor: ${projeto.setor}`)
        if (projeto.objetivo_smart)     tapLines.push(`Objetivo: ${projeto.objetivo_smart.slice(0, 150)}`)
        if (projeto.escopo_sintetizado) tapLines.push(`Escopo: ${projeto.escopo_sintetizado.slice(0, 150)}`)
        if (projeto.prazo_total)        tapLines.push(`Prazo total: ${projeto.prazo_total} dias`)
        const tapCtx = tapLines.length > 0 ? `\n---TAP---\n${tapLines.join('\n')}\n---` : ''

        const systemPrompt = `Você é engenheiro PMBOK. Dado o contexto do projeto e a lista de tarefas, infira as predecessoras (FS — Finish-to-Start).
Regras: fundação→estrutura→acabamento; planejamento→execução→encerramento; tarefas do mesmo grupo EAP podem ser paralelas.
Tarefas sem predecessoras = iniciais ([]).
Retorne SOMENTE JSON: {"sugestoes":[{"id":"T01","predecessoras":["T02"],"motivo":"breve explicação"}]}`

        const userContent = `${tapCtx}${eapCtx}\nTarefas: ${JSON.stringify(compactTasks)}`

        const response = await getGroq().chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userContent },
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
        })

        const rawContent = response.choices[0]?.message?.content || '{}'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any
        try {
            result = JSON.parse(rawContent)
        } catch {
            return NextResponse.json({ error: 'Resposta inválida da IA.' }, { status: 502 })
        }

        if (!Array.isArray(result.sugestoes)) {
            // Fallback: retorna sugestões vazias para cada tarefa
            return NextResponse.json({
                sugestoes: tarefas.map(t => ({ id: t.id, predecessoras: [], motivo: null })),
                totalTarefas: tarefas.length,
            })
        }

        // Mapeia short IDs de volta para UUIDs originais
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sugestoes = result.sugestoes.map((s: any) => ({
            id:          toLong.get(s.id) || s.id,
            predecessoras: normalizePreds(s.predecessoras).map(p => toLong.get(p) || p),
            motivo:      typeof s.motivo === 'string' ? s.motivo.slice(0, 200) : null,
        }))

        return NextResponse.json({ sugestoes, totalTarefas: tarefas.length })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('[eap-predecessors] Erro:', error?.message || error)

        if (error?.status === 401 || error?.message?.includes('API key')) {
            return NextResponse.json({ error: 'Chave GROQ inválida ou expirada.' }, { status: 500 })
        }
        if (error?.status === 429 || error?.message?.includes('rate_limit')) {
            return NextResponse.json({ error: 'Rate limit da IA excedido. Tente novamente em alguns segundos.' }, { status: 429 })
        }
        if (error?.message?.includes('413') || error?.message?.includes('too large')) {
            return NextResponse.json({ error: 'Payload muito grande. Reduza o número de tarefas.' }, { status: 413 })
        }

        return NextResponse.json({
            error: `Falha ao inferir predecessoras: ${error?.message || 'erro desconhecido'}`,
        }, { status: 500 })
    }
}
