import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { gerarTrianguloCDT, calcularProjecaoFinanceira } from '@/lib/engine/math'
import { translateCDT } from '@/components/aura/MetricTranslator'
import { buildCDTReport } from '@/lib/report/cdt-report'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { ReportCdtRequestSchema } from '@/lib/schemas'

export async function GET(req: Request) {
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    // Rate limiting: 60 req/hora por tenant
    const rateLimit = await checkRateLimit(auth.user.id, '/api/report/cdt', 60, 3600000)
    if (!rateLimit.ok) {
        return NextResponse.json(
            { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
            { status: 429 }
        )
    }

    const { searchParams } = new URL(req.url)
    const projetoId = searchParams.get('projetoId')

    // Zod validation dos query params
    const parseResult = ReportCdtRequestSchema.safeParse({ projetoId })
    if (!parseResult.success) {
        return NextResponse.json(
            { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
            { status: 400 }
        )
    }

    const { projetoId: validatedProjetoId } = parseResult.data
    const supabase = getSupabaseAdmin()

    // Fetch project data
    const { data: projeto } = await supabase
        .from('projetos')
        .select('nome, orcamento_total, prazo_total, data_inicio')
        .eq('id', validatedProjetoId)
        .maybeSingle()

    if (!projeto) {
        return NextResponse.json({ error: 'Projeto nao encontrado' }, { status: 404 })
    }

    // Fetch tasks for curves
    const { data: tarefas } = await supabase
        .from('tarefas')
        .select('id, nome, duracao_estimada, es, ef')
        .eq('projeto_id', validatedProjetoId)

    const { data: orcamento } = await supabase
        .from('orcamentos')
        .select('custos_tarefas, teto_tap')
        .eq('projeto_id', validatedProjetoId)
        .maybeSingle()

    const { data: marcos } = await supabase
        .from('marcos')
        .select('dia, custo')
        .eq('projeto_id', validatedProjetoId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prazoTotal = projeto.prazo_total || Math.max(...(tarefas || []).map((t: any) => t.ef || 0), 1)
    const orcamentoTotal = orcamento?.teto_tap || projeto.orcamento_total || 0
    const custosTarefas = orcamento?.custos_tarefas || {}

    // Build curves
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tarefasForCalc = (tarefas || []).map((t: any) => ({
        ...t,
        projeto_id: validatedProjetoId,
        tenant_id: '',
        duracao_realizada: null,
        predecessoras: [],
        ordem: 0,
        status: 'pending',
    }))

    const projecao = calcularProjecaoFinanceira(tarefasForCalc, custosTarefas, marcos || [], prazoTotal)
    const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))

    const curvaPrazo: { x: number; y: number }[] = []
    const step = Math.max(1, Math.floor(prazoTotal / 50))
    for (let dia = 0; dia <= prazoTotal; dia += step) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const done = (tarefas || []).filter((t: any) => (t.ef || 0) <= dia).length
        curvaPrazo.push({ x: dia, y: (done / Math.max((tarefas || []).length, 1)) * 100 })
    }
    if (curvaPrazo.length > 0 && curvaPrazo[curvaPrazo.length - 1].x < prazoTotal) {
        curvaPrazo.push({ x: prazoTotal, y: 100 })
    }

    if (curvaCusto.length < 2 || curvaPrazo.length < 2) {
        return NextResponse.json({ error: 'Dados insuficientes para gerar CDT' }, { status: 422 })
    }

    // CDT baseline + current
    const cdtBaseline = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })

    const diaAtual = projeto.data_inicio
        ? Math.max(0, Math.min(Math.floor((Date.now() - new Date(projeto.data_inicio).getTime()) / 86400000), prazoTotal))
        : Math.floor(prazoTotal * 0.5)

    const cdt = gerarTrianguloCDT({
        curvaCusto, curvaPrazo, diaAtual, diaBaseline: 0,
        areaBaseline: cdtBaseline.cdt_area,
    })

    const metrics = translateCDT(cdt, orcamentoTotal, prazoTotal)

    const html = buildCDTReport({
        projetoNome: projeto.nome || 'Sem Nome',
        dataGeracao: new Date().toLocaleDateString('pt-BR'),
        diaAtual,
        prazoTotal,
        orcamentoTotal,
        cdt,
        metrics,
    })

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
}
