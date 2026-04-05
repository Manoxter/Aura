'use client'
// v4.1.5 — force rebuild: NVO centroide + área clamp
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/useToast'
import { CDTCanvas } from '@/components/aura/CDTCanvas'
// R2: Dashboard herda canvas TM (TrianglePlotter do motor)
import { TrianglePlotter as MotorTrianglePlotter } from '@/components/motor/TrianglePlotter'
import { calculateOrthicTriangle, calculateBarycenter } from '@/lib/engine/triangle-logic'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { EventoAtipicoForm } from '@/components/aura/EventoAtipicoForm'
import { StickyFerramentasButton } from '@/components/aura/StickyFerramentasButton'
import { ReportArchiveDrawer } from '@/components/aura/ReportArchiveDrawer'
import { criarVersaoInicial } from '@/lib/api/tm-versoes'
import { Activity, LayoutDashboard, Rocket, CheckCircle2, Circle, ArrowRight, ShieldCheck, ChevronDown, ChevronUp, TrendingDown, Columns3, Siren, Target, Bot, Settings, LayoutGrid, Cpu, Lightbulb, TrendingUp, Zap, Wrench, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useProject } from '@/context/ProjectContext'
import { useRouter } from 'next/navigation'
import { DecisionSimulator } from '@/components/aura/DecisionSimulator'
import { calcularConfiancaMonteCarlo, gerarTrianguloCDT, calcularProjecaoFinanceira, calcularAMancha, calcularARebarba, buildRetaMestra, calcularCompensacao, type CDTResult } from '@/lib/engine/math'
import { traduzirCDT } from '@/lib/engine/traducao'
import { DrawerPanel } from '@/components/ui/DrawerPanel'
import { SetupStepper } from '@/components/Setup/SetupStepper'
import { useSetupCompletion } from '@/hooks/useSetupCompletion'
import { SierpinskiMesh, type SprintData, type FeverZone as SierpinskiFeverZone } from '@/components/aura/SierpinskiMesh'
import { SprintSanfona } from '@/components/aura/SprintSanfona'
import { supabase } from '@/lib/supabase'

// UX9: Tradução de métricas adimensionais para linguagem PM
function formatDesvioLado(valor: number, tipo: 'orcamento' | 'prazo' | 'escopo'): string {
    if (Math.abs(valor - 1.0) < 0.005) return 'no plano'
    const pct = ((valor - 1.0) * 100).toFixed(1)
    const sinal = valor > 1.0 ? '+' : ''
    const labels: Record<typeof tipo, [string, string]> = {
        orcamento: ['acima do operacional', 'abaixo do operacional'],
        prazo: ['além do crítico', 'adiantado'],
        escopo: ['expansão de escopo', 'contração'],
    }
    const [acima, abaixo] = labels[tipo]
    return `${sinal}${pct}% ${valor > 1.0 ? acima : abaixo}`
}

// ── Level 1: Semáforo config ─────────────────────────────────────────────────
const ZONA_CONFIG: Record<string, {
    bg: string; border: string; text: string; badgeBg: string;
    dot: string; msg: string; nivel: string
}> = {
    OTIMO: {
        bg: 'bg-emerald-950/30', border: 'border-emerald-500/40',
        text: 'text-emerald-300', badgeBg: 'bg-emerald-500/20 text-emerald-300',
        dot: 'bg-emerald-400', nivel: 'ÓTIMO',
        msg: 'Projeto em excelência executiva — geometria estável e dentro da ZRE.',
    },
    SEGURO: {
        bg: 'bg-blue-950/30', border: 'border-blue-500/40',
        text: 'text-blue-300', badgeBg: 'bg-blue-500/20 text-blue-300',
        dot: 'bg-blue-400', nivel: 'SEGURO',
        msg: 'Execução controlada — desvios dentro da zona de resiliência.',
    },
    RISCO: {
        bg: 'bg-amber-950/30', border: 'border-amber-500/40',
        text: 'text-amber-300', badgeBg: 'bg-amber-500/20 text-amber-300',
        dot: 'bg-amber-400', nivel: 'RISCO',
        msg: 'Atenção: triângulo se aproxima da fronteira de crise — intervenção preventiva.',
    },
    CRISE: {
        bg: 'bg-rose-950/40', border: 'border-rose-700/60',
        text: 'text-rose-300', badgeBg: 'bg-rose-500/20 text-rose-300',
        dot: 'bg-rose-400 animate-pulse', nivel: 'CRISE',
        msg: 'CEt violada ou deformação plástica detectada — intervenção imediata necessária.',
    },
}

export default function ProjetoDashboard({ params }: { params: { projetoId: string } }) {
    const {
        tap, tenantId, isMotorReady, isTapReady, isEapReady, isCpmReady,
        isOrcamentoReady, isCalendarioReady, loading, getLabel, tarefas,
        prazoBase, custosTarefas, marcos, dataInicio, dataInicioReal,
        custoMobilizacao, regimeTrabalho, orcamentoBase, cdtAreaBaseline,
    } = useProject()
    const router = useRouter()
    const { percentual: setupPercentual } = useSetupCompletion()
    const labelProjeto = getLabel('projeto')
    const { toast } = useToast()

    // UI state
    const [stepperExpanded, setStepperExpanded] = useState(() => setupPercentual < 60)
    const [cdtExpanded, setCdtExpanded]         = useState(true)
    const [tecnicoExpanded, setTecnicoExpanded] = useState(false)   // Level 3 — starts collapsed
    const [reportDrawerAberto, setReportDrawerAberto] = useState(false) // Req G: arquivo de relatórios
    const [cdtOverlayData, setCdtOverlayData] = useState<CDTResult | null>(null) // Req D: overlay decisão
    // R3: Camadas ocultáveis do canvas
    const [layerZRE, setLayerZRE] = useState(true)
    const [layerNVO, setLayerNVO] = useState(true)
    const [layerMancha, setLayerMancha] = useState(true)
    const [layerBands, setLayerBands] = useState(true)
    const [layerAngles, setLayerAngles] = useState(true)
    const [layerHeatmap, setLayerHeatmap] = useState(false)
    const [mgmtExpanded, setMgmtExpanded]       = useState(true)

    const [simulatedPonto, setSimulatedPonto] = useState({ x: 0.316, y: 0.196 })
    const [drawerOpen, setDrawerOpen]         = useState(false)
    const [drawerTool, setDrawerTool]         = useState<'evento' | 'simulador'>('evento')

    // ── Sierpinski Sprints ───────────────────────────────────────────────────
    const [sprintsData, setSprintsData] = useState<SprintData[]>([])
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)
    const [sprintTarefas, setSprintTarefas] = useState<{id:string;nome:string;duracao_estimada:number;progresso:number;no_caminho_critico:boolean;status:string}[]>([])

    useEffect(() => {
        if (!params.projetoId) return
        supabase
            .from('sprints_fractais')
            .select('id, nome, ordem, estado, buffer_original, buffer_consumido')
            .eq('projeto_id', params.projetoId)
            .order('ordem')
            .then(({ data }) => {
                if (!data) return
                const mapped: SprintData[] = data.map(s => {
                    const bufOrig = Number(s.buffer_original) || 0
                    const bufCons = Number(s.buffer_consumido) || 0
                    const pct = bufOrig > 0 ? (bufCons / bufOrig) * 100 : 0
                    let zone: SierpinskiFeverZone = 'verde'
                    if (pct < 0) zone = 'azul'
                    else if (pct <= 33) zone = 'verde'
                    else if (pct <= 66) zone = 'amarelo'
                    else if (pct <= 100) zone = 'vermelho'
                    else zone = 'preto'
                    return {
                        id: s.id,
                        nome: s.nome,
                        ordem: s.ordem,
                        estado: s.estado as SprintData['estado'],
                        buffer_original: bufOrig,
                        buffer_consumido: bufCons,
                        feverZone: zone,
                    }
                })
                setSprintsData(mapped)
            })
    }, [params.projetoId])

    // Fetch tarefas when sprint selected
    useEffect(() => {
        if (!selectedSprintId || !params.projetoId) {
            setSprintTarefas([])
            return
        }
        supabase
            .from('tarefas')
            .select('id, nome, duracao_estimada, progresso, no_caminho_critico, status')
            .eq('projeto_id', params.projetoId)
            .then(({ data }) => {
                if (data) {
                    setSprintTarefas(data.map(t => ({
                        id: t.id,
                        nome: t.nome,
                        duracao_estimada: Number(t.duracao_estimada) || 0,
                        progresso: Number(t.progresso) || 0,
                        no_caminho_critico: t.no_caminho_critico ?? false,
                        status: t.status || 'pendente',
                    })))
                }
            })
    }, [selectedSprintId, params.projetoId])

    // ── CDT real ─────────────────────────────────────────────────────────────
    const curvaCusto = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map(p => ({ x: p.dia, y: p.acumulado }))
    }, [tarefas, custosTarefas, marcos, prazoBase])

    const curvaPrazo = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        const step = Math.max(1, Math.floor(prazoBase / 50))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalWork = tarefas.reduce((s: number, t: any) => s + (t.duracao_estimada || 0), 0)
        if (totalWork === 0) return []
        // EP-ESCALENO: EF real considera atraso (duracao_realizada > estimada)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const efReal = (t: any) => {
            const dr = t.duracao_realizada || 0
            const de = t.duracao_estimada || 0
            if (dr > 0 && de > 0) return (t.es || 0) + dr
            return t.ef || 0
        }
        const pontos: { x: number; y: number }[] = []
        for (let dia = 0; dia <= prazoBase * 1.3; dia += step) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const done = tarefas.filter((t: any) => efReal(t) > 0 && efReal(t) <= dia).reduce((s: number, t: any) => s + (t.duracao_estimada || 0), 0)
            const remaining = parseFloat((Math.max(0, (1 - done / totalWork) * 100)).toFixed(1))
            pontos.push({ x: dia, y: remaining })
        }
        if (pontos.length > 0 && pontos[pontos.length - 1].y > 0)
            pontos.push({ x: Math.round(prazoBase * 1.3), y: 0 })
        return pontos
    }, [tarefas, prazoBase])

    // FIX-1: manchaChartData para Dashboard (sombras A_mancha)
    const manchaChartData = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return []
        const maxC = Math.max(...curvaCusto.map(p => p.y), 1e-9)
        const maxP = Math.max(...curvaPrazo.map(p => p.y), 1e-9)
        const xMin = Math.min(curvaCusto[0].x, curvaPrazo[0].x)
        const xMax = Math.max(curvaCusto[curvaCusto.length - 1].x, curvaPrazo[curvaPrazo.length - 1].x)
        if (xMax <= xMin) return []
        const N = 60, step = (xMax - xMin) / N
        const interp = (curva: { x: number; y: number }[], x: number, maxVal: number) => {
            if (x <= curva[0].x) return curva[0].y / maxVal
            if (x >= curva[curva.length - 1].x) return curva[curva.length - 1].y / maxVal
            for (let i = 0; i < curva.length - 1; i++) {
                if (curva[i].x <= x && x <= curva[i + 1].x) {
                    const t = (x - curva[i].x) / (curva[i + 1].x - curva[i].x || 1)
                    return (curva[i].y + t * (curva[i + 1].y - curva[i].y)) / maxVal
                }
            }
            return curva[curva.length - 1].y / maxVal
        }
        return Array.from({ length: N + 1 }, (_, i) => {
            const x = xMin + i * step
            const tNorm = parseFloat(((x - xMin) / (xMax - xMin)).toFixed(3))
            const fp = parseFloat(interp(curvaPrazo, x, maxP).toFixed(3))
            const fc = parseFloat(interp(curvaCusto, x, maxC).toFixed(3))
            return { t: tNorm, fp, fc }
        })
    }, [curvaCusto, curvaPrazo])

    const diaAtualProjeto = useMemo(() => {
        const dataParaCalculo = dataInicioReal || dataInicio
        if (!dataParaCalculo) return 0
        const inicio = new Date(dataParaCalculo)
        const hoje   = new Date()
        const diffMs = Math.max(0, hoje.getTime() - inicio.getTime())
        return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }, [dataInicio, dataInicioReal])

    // Sem execução real: nenhuma tarefa com duracao_realizada ou status operacional.
    // Mesmo critério do motor triangulo-matriz/page.tsx para consistência visual.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const semExecucaoReal = useMemo(() => !tarefas.some((t: any) =>
        (t.duracao_realizada || 0) > 0 || t.status === 'em_andamento' || t.status === 'concluida'
    ), [tarefas])

    // P0-2 @fermat: SEMPRE calcular CDT real — sem lock de baseline
    const cdtData: CDTResult | null = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        const pzBase = (tap?.prazo_total && tap.prazo_total > 0 ? tap.prazo_total : prazoBase) ?? undefined
        const baselineRates = { orcamentoBase: orcamentoBase ?? undefined, prazoBase: pzBase }
        const baseline = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, ...baselineRates })
        const areaBL = cdtAreaBaseline ?? baseline?.cdt_area ?? undefined
        return gerarTrianguloCDT({
            curvaCusto, curvaPrazo, diaAtual: diaAtualProjeto, diaBaseline: 0,
            areaBaseline: areaBL, ...baselineRates,
        })
    }, [curvaCusto, curvaPrazo, diaAtualProjeto, orcamentoBase, prazoBase, cdtAreaBaseline])

    const monteCarlo = useMemo(() => {
        if (!cdtData) return null
        return calcularConfiancaMonteCarlo(cdtData)
    }, [cdtData])

    // MASTERPLAN-X §2 — Motor Físico v3.0
    const fisicaV3 = useMemo(() => {
        if (curvaCusto.length < 3 || curvaPrazo.length < 3 || !cdtData) return null
        const { aMancha } = calcularAMancha(curvaCusto, curvaPrazo)
        const aRebarba    = calcularARebarba(aMancha, cdtData.cdt_area)
        const retaMestra  = buildRetaMestra(curvaCusto)
        return { aMancha, aRebarba, r2Custo: retaMestra.r2 }
    }, [curvaCusto, curvaPrazo, cdtData])

    // ── Level 1 semáforo config ───────────────────────────────────────────────
    const zona = cdtData?.zona_mated ? (ZONA_CONFIG[cdtData.zona_mated] ?? ZONA_CONFIG.RISCO) : null

    // Task 19: Snapshot v0 automático — dispara criarVersaoInicial() uma única vez
    // quando o motor fica pronto e cdtData está disponível (lados normalizados).
    const v0TriggeredRef = useRef(false)
    useEffect(() => {
        if (!isMotorReady || !cdtData || v0TriggeredRef.current) return
        v0TriggeredRef.current = true
        const { escopo, orcamento, prazo } = cdtData.lados
        criarVersaoInicial(params.projetoId, escopo, prazo, orcamento).catch(() => {
            // silencioso — v1 pode já existir (idempotente) ou usuário não autenticado
            v0TriggeredRef.current = false
        })
    }, [isMotorReady, cdtData, params.projetoId])

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 animate-pulse text-slate-500">
                <Activity className="h-10 w-10 animate-spin mr-3" />
                Carregando {labelProjeto}...
            </div>
        )
    }

    // ── Motor não pronto: wizard de setup ─────────────────────────────────────
    if (!isMotorReady) {
        const steps = [
            { id: 'tap',                label: 'Termo de Abertura (TAP)',        ready: isTapReady,       href: `/${params.projetoId}/setup/tap` },
            { id: 'wbs',                label: 'Estrutura Analítica (WBS)',       ready: isEapReady,       href: `/${params.projetoId}/setup/wbs` },
            { id: 'tarefas-diagramas',  label: 'Planejamento de Cronograma',      ready: isCpmReady,       href: `/${params.projetoId}/setup/tarefas-diagramas` },
            { id: 'orcamento',          label: 'Baseline de Orçamento',           ready: isOrcamentoReady, href: `/${params.projetoId}/setup/orcamento` },
            { id: 'calendario',         label: 'Marcos e Calendário',             ready: isCalendarioReady,href: `/${params.projetoId}/setup/calendario` },
        ]
        return (
            <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold uppercase tracking-widest">
                        <Rocket className="h-4 w-4" /> {labelProjeto} em Inicialização
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight">O Motor CDT está sendo calibrado.</h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Para visualizar a geometria de tripla restrição, precisamos completar os pilares básicos do planejamento.
                    </p>
                </header>
                <div className="grid gap-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            onClick={() => !step.ready && router.push(step.href)}
                            className={`flex items-center justify-between p-6 rounded-3xl border transition-all ${
                                step.ready
                                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                                    : 'bg-slate-900 border-slate-700 hover:border-blue-500/50 cursor-pointer shadow-xl'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${step.ready ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                    {step.ready ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold ${step.ready ? 'text-slate-300' : 'text-white'}`}>{step.label}</h3>
                                    <p className="text-xs text-slate-500">{step.ready ? 'Concluído com sucesso' : 'Pendente de configuração'}</p>
                                </div>
                            </div>
                            {!step.ready && (
                                <button className="flex items-center gap-2 text-sm font-bold text-blue-400 group">
                                    Configurar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Management cards ──────────────────────────────────────────────────────
    const managementCards = [
        { label: 'War Room',      icon: Siren,      href: `/${params.projetoId}/decisao/war-room`,           color: 'rose'   },
        { label: 'MATED',         icon: Target,     href: `/${params.projetoId}/decisao/mated`,              color: 'indigo' },
        { label: 'Kanban',        icon: Columns3,   href: `/${params.projetoId}/governanca/kanban`,           color: 'blue'   },
        { label: 'Klauss IA',     icon: Bot,        href: `/${params.projetoId}/decisao/ia`,                 color: 'violet' },
        { label: 'Gabinete',      icon: ShieldCheck,href: `/${params.projetoId}/governanca/gabinete`,         color: 'amber'  },
        { label: 'Gerenciamento', icon: Settings,   href: `/${params.projetoId}/governanca/gerenciamento`,    color: 'slate'  },
        { label: 'Evento Atípico', icon: Zap,      href: '#evento-atipico',                                  color: 'amber'  },
    ] as const

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <LayoutDashboard className="h-8 w-8 text-blue-500" />
                        Dashboard: {tap?.nome_projeto || 'Aura Strategy'}
                    </h1>
                    <p className="text-slate-400 font-medium">Hub Central — Estado Geométrico do Projeto (CDT)</p>
                </div>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all shrink-0"
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Gerenciar Portfólio
                </Link>
            </header>

            {/* ── TM ESCALENO + ALERT CENTER — Board de Controle ── */}
            {sprintsData.length > 0 && (
                <section className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
                    {/* TM Central com fractais Sierpinski */}
                    <div className="rounded-2xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-blue-400" />
                                Triângulo Mestre — {sprintsData.length} Sprints
                            </h2>
                            <span className="text-[10px] text-slate-600 font-mono">
                                Click sprint → drill-down
                            </span>
                        </div>
                        <div className="flex justify-center">
                            <SierpinskiMesh
                                sprints={sprintsData}
                                projetoId={params.projetoId}
                                width={520}
                                height={420}
                            />
                        </div>
                    </div>

                    {/* Alert Center + Métricas (lateral) */}
                    <div className="space-y-4">
                        {/* Alert Center */}
                        <div className="rounded-2xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Alert Center</h3>
                            <div className="space-y-2">
                                {sprintsData
                                    .filter(s => s.feverZone === 'vermelho' || s.feverZone === 'preto')
                                    .map(s => (
                                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                            <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                            <span className="text-xs text-rose-300 truncate">
                                                S{s.ordem}: {s.nome} — buffer {Math.round((s.buffer_consumido / Math.max(s.buffer_original, 1)) * 100)}%
                                            </span>
                                        </div>
                                    ))
                                }
                                {sprintsData
                                    .filter(s => s.feverZone === 'amarelo')
                                    .map(s => (
                                        <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                            <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                            <span className="text-xs text-amber-300 truncate">
                                                S{s.ordem}: atenção — buffer {Math.round((s.buffer_consumido / Math.max(s.buffer_original, 1)) * 100)}%
                                            </span>
                                        </div>
                                    ))
                                }
                                {sprintsData.every(s => s.feverZone === 'verde' || s.feverZone === 'azul') && (
                                    <p className="text-xs text-emerald-400/60 text-center py-2">Nenhum alerta ativo</p>
                                )}
                            </div>
                        </div>

                        {/* Project Metrics */}
                        <div className="rounded-2xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Project Metrics</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">IQ</span>
                                    <span className="text-sm font-mono font-bold text-white">{iq ?? '—'}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Sprints</span>
                                    <span className="text-sm font-mono text-slate-300">
                                        {sprintsData.filter(s => s.estado === 'concluido').length}/{sprintsData.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Sprint Ativo</span>
                                    <span className="text-sm text-blue-400 truncate max-w-[140px]">
                                        {sprintsData.find(s => s.estado === 'ativo')?.nome ?? 'Nenhum'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Buffer Global</span>
                                    <span className="text-sm font-mono font-bold text-white">
                                        {(() => {
                                            const totalB = sprintsData.reduce((a, s) => a + s.buffer_original, 0)
                                            const consB = sprintsData.reduce((a, s) => a + s.buffer_consumido, 0)
                                            return totalB > 0 ? `${Math.round((consB / totalB) * 100)}%` : '—'
                                        })()}
                                    </span>
                                </div>
                                {prazoBase && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">Prazo Base</span>
                                        <span className="text-sm font-mono text-slate-400">{prazoBase}d</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── SetupStepper (quando setup incompleto) ── */}
            {setupPercentual < 100 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40">
                    <button
                        onClick={() => setStepperExpanded(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-200 transition-colors"
                    >
                        <span>Setup do Projeto — {setupPercentual}% completo</span>
                        {stepperExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {stepperExpanded && (
                        <div className="px-4 pb-4">
                            <SetupStepper variant="expanded" projetoId={params.projetoId} />
                        </div>
                    )}
                </div>
            )}

            {/* ══ FIX-CRISE: Projeto matematicamente impossível (CEt violada) ══ */}
            {cdtData && !cdtData.cet_dupla.valid && (
                <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-950/30 p-8 text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-rose-500/20 flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-rose-400" />
                        </div>
                    </div>
                    <h2 className="text-xl font-black text-rose-300">Projeto Matematicamente Não Realizável</h2>
                    {(() => {
                        const E = cdtData.lados_brutos.E, C = cdtData.lados_brutos.C, P = cdtData.lados_brutos.P
                        const gap = Math.abs(P - C) - E  // quanto falta para fechar (em unidades normalizadas)
                        const gapPrazo = prazoBase ? Math.ceil(gap * (prazoBase ?? 1)) : null
                        const gapCusto = orcamentoBase ? Math.ceil(gap * (orcamentoBase ?? 1)) : null
                        return (<>
                            <p className="text-sm text-rose-400/80 max-w-lg mx-auto">
                                A Condição de Existência do Triângulo (CEt) está violada: <strong>|P−C| &ge; E</strong>.
                                {cdtData.cet_dupla.violatedSide === 'O' && ' O lado Orçamento é o causador — orçamento pressionado.'}
                                {cdtData.cet_dupla.violatedSide === 'P' && ' O lado Prazo é o causador — cronograma inviável.'}
                                {cdtData.cet_dupla.violatedSide === 'E' && ' O lado Escopo é o causador — escopo incompatível.'}
                            </p>
                            {gap > 0 && (
                                <div className="mt-3 bg-rose-900/30 border border-rose-500/30 rounded-xl px-4 py-3 text-left max-w-md mx-auto">
                                    <p className="text-xs font-bold text-rose-300 mb-1">Para fechar o triângulo, faltam:</p>
                                    {gapPrazo != null && <p className="text-[11px] text-rose-400">Prazo: +{gapPrazo} dias adicionais no cronograma</p>}
                                    {gapCusto != null && <p className="text-[11px] text-rose-400">Orçamento: +R$ {gapCusto.toLocaleString('pt-BR')} adicionais</p>}
                                    <p className="text-[10px] text-rose-500 mt-1">Ou reduza o escopo para reequilibrar a geometria.</p>
                                </div>
                            )}
                            <p className="text-xs text-rose-500/60 font-semibold uppercase tracking-widest mt-2">
                                Reveja parâmetros da TAP, WBS e Orçamento
                            </p>
                        </>)
                    })()}
                </div>
            )}

            {/* ── R15: MATED traduzido (prazo/custo, não pontos) ── */}
            {cdtData && cdtData.cet_dupla.valid && cdtData.mated_distancia > 0.01 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500">Distância MATED</p>
                        <p className="text-lg font-black font-mono text-white">{(cdtData.mated_distancia * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-xs text-slate-400 flex-1">
                        {cdtData.zona_mated === 'OTIMO' && 'Equilíbrio ideal — sem desvio significativo.'}
                        {cdtData.zona_mated === 'SEGURO' && 'Desvio gerenciável — monitorar tendência.'}
                        {cdtData.zona_mated === 'RISCO' && 'Atenção — desvio significativo. Avaliar ações corretivas.'}
                        {cdtData.zona_mated === 'CRISE' && 'Intervenção imediata — geometria em colapso.'}
                        {prazoBase && orcamentoBase && (
                            <span className="block mt-1 text-[10px] text-slate-500">
                                ≈ {Math.round(cdtData.mated_distancia * prazoBase)} dias ou R${Math.round(cdtData.mated_distancia * orcamentoBase).toLocaleString('pt-BR')} de desvio
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* R11: Card de Compensação (Pesos e Contrapesos) */}
            {cdtData && cdtData.cet_dupla.valid && (cdtData.zona_mated === 'RISCO' || cdtData.zona_mated === 'CRISE') && (() => {
                const { escopo: e, orcamento: c, prazo: p } = cdtData.lados
                const deltaP = 0.1  // simular ajuste de 10% no prazo
                try {
                    const comp = calcularCompensacao(e, c, p, deltaP, cdtData.cdt_area)
                    if (!comp || comp.sem_solucao) return null
                    const deltaCDias = prazoBase ? Math.round(comp.delta_c * (prazoBase ?? 1)) : null
                    const deltaPDias = prazoBase ? Math.round(deltaP * (prazoBase ?? 1)) : null
                    return (
                        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4">
                            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-2">Compensação Sugerida</h3>
                            <p className="text-[11px] text-amber-400/80">
                                Se o prazo aumentar {deltaP > 0 ? '+' : ''}{(deltaP * 100).toFixed(0)}%{deltaPDias ? ` (~${deltaPDias} dias)` : ''},
                                o custo deve ajustar em {comp.delta_c > 0 ? '+' : ''}{(comp.delta_c * 100).toFixed(1)}%{deltaCDias ? ` (~${deltaCDias} dias eq.)` : ''} para
                                manter a área do triângulo em {(cdtData.cdt_area).toFixed(4)}.
                            </p>
                        </div>
                    )
                } catch { return null }
            })()}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* LEVEL 1 — SEMÁFORO: status global do projeto                  */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {zona ? (
                <div className={`rounded-2xl border p-5 ${zona.bg} ${zona.border}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Zona + narrativa */}
                        <div className="flex items-center gap-4">
                            <span className={`h-4 w-4 rounded-full shrink-0 ${zona.dot}`} aria-hidden="true" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zona MATED</p>
                                <p className={`text-2xl font-black tracking-tight leading-none mt-0.5 ${zona.text}`}>
                                    {zona.nivel}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">{zona.msg}</p>
                            </div>
                        </div>
                        {/* KPIs rápidos */}
                        <div className="flex items-center gap-6 shrink-0">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Confiança</p>
                                <p className="text-2xl font-black text-white">
                                    {monteCarlo ? `${monteCarlo.confianca.toFixed(1)}%` : '—'}
                                </p>
                            </div>
                            <div className="w-px h-10 bg-slate-700" aria-hidden="true" />
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Forma</p>
                                <p className="text-lg font-black text-white capitalize">
                                    {cdtData?.forma_triangulo?.replace('angulo', '') ?? '—'}
                                </p>
                            </div>
                            {/* P7: Desvio só exibe quando < 100% (sinal com informação real) */}
                            {cdtData?.desvio_qualidade != null && cdtData.desvio_qualidade < 100 && (
                                <>
                                    <div className="w-px h-10 bg-slate-700" aria-hidden="true" />
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">IQ</p>
                                        <p className={`text-2xl font-black ${
                                            cdtData.desvio_qualidade >= 85 ? 'text-emerald-400' :
                                            cdtData.desvio_qualidade >= 60 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                            {cdtData.desvio_qualidade.toFixed(1)}%
                                        </p>
                                    </div>
                                </>
                            )}
                            <div className="w-px h-10 bg-slate-700" aria-hidden="true" />
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">MATED d</p>
                                <p className="text-2xl font-black font-mono text-white">
                                    {cdtData ? cdtData.mated_distancia.toFixed(3) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-center gap-4 text-slate-500">
                    <Activity className="h-5 w-5 animate-pulse shrink-0" />
                    <p className="text-sm">Motor CDT inicializando — aguardando dados suficientes para calcular a zona MATED.</p>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* RFN-4 — SITUAÇÃO DO PROJETO: 3 cards em linguagem de gestão   */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {cdtData && (() => {
                const sit = traduzirCDT(cdtData)
                const sevColor = sit.severidade === 'ok' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : sit.severidade === 'atencao' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Card 1 — Saúde */}
                        <div className={`rounded-2xl border p-4 ${sevColor}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="h-4 w-4 shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Saúde</p>
                            </div>
                            <p className="text-sm font-bold leading-tight">{sit.titulo}</p>
                            <p className="text-xs opacity-70 mt-1.5 leading-relaxed">{sit.descricao}</p>
                        </div>
                        {/* Card 2 — Tendência */}
                        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 text-slate-300">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-blue-400 shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tendência Geométrica</p>
                            </div>
                            <p className="text-sm font-bold leading-tight">{sit.tendencia}</p>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{sit.forma_natural}</p>
                        </div>
                        {/* Card 3 — Próxima Ação */}
                        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-indigo-300">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Próxima Ação</p>
                            </div>
                            <p className="text-xs leading-relaxed">{sit.acao_recomendada}</p>
                        </div>
                    </div>
                )
            })()}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* LEVEL 2 — CDT: visualização geométrica                        */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className="space-y-0 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4">
                <button
                    onClick={() => setCdtExpanded(v => !v)}
                    className="aura-section-toggle flex-1"
                    title={cdtExpanded ? 'Recolher geometria CDT' : 'Expandir geometria CDT'}
                >
                    <span className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-blue-400" />
                        Geometria em Tempo Real
                    </span>
                    {cdtExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {/* R10: Botão Registrar Snapshot */}
                {cdtData && cdtData.cet_dupla.valid && (
                    <button className="text-[10px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shrink-0"
                        onClick={async () => {
                            if (!cdtData || !params.projetoId) return
                            try {
                                await criarVersaoInicial(
                                    params.projetoId,
                                    cdtData.lados.escopo,
                                    cdtData.lados.prazo,
                                    cdtData.lados.orcamento
                                )
                                toast({ message: 'Snapshot TM registrado com sucesso!', variant: 'success' })
                            } catch (e: any) {
                                toast({ message: `Erro ao registrar snapshot: ${e.message}`, variant: 'error' })
                            }
                        }}>
                        Registrar Snapshot
                    </button>
                )}
                </div>
                {cdtExpanded && (
                    <div className="p-4 pt-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* R2: Dashboard herda canvas TM (mesmo TrianglePlotter do motor) */}
                        <div className="min-h-[420px]">
                            {cdtData && cdtData.cet_dupla.valid && cdtData.cdt_area > 0 ? (() => {
                                const tri = { A: { x: cdtData.A[0], y: cdtData.A[1] }, B: { x: cdtData.B[0], y: cdtData.B[1] }, C: { x: cdtData.C[0], y: cdtData.C[1] } }
                                // Guard: vértices degenerados (todos em 0,0)
                                if (tri.A.x === 0 && tri.A.y === 0 && tri.B.x === 0 && tri.B.y === 0) return null
                                let orth, bary
                                try {
                                    orth = calculateOrthicTriangle(tri)
                                    bary = cdtData.protocolo === 'obtuso_beta' || cdtData.protocolo === 'obtuso_gamma'
                                        ? { x: (tri.A.x + tri.B.x + tri.C.x) / 3, y: (tri.A.y + tri.B.y + tri.C.y) / 3 }
                                        : calculateBarycenter(orth)
                                } catch { return null }
                                return (<>
                                    {/* R3: Toggles de camada */}
                                    <div className="flex flex-wrap gap-2 mb-2 px-1">
                                        {[
                                            { label: 'ZRE', active: layerZRE, set: setLayerZRE },
                                            { label: 'NVO', active: layerNVO, set: setLayerNVO },
                                            { label: 'Manchas', active: layerMancha, set: setLayerMancha },
                                            { label: 'Bandas', active: layerBands, set: setLayerBands },
                                            { label: 'Ângulos', active: layerAngles, set: setLayerAngles },
                                            { label: 'Calor', active: layerHeatmap, set: setLayerHeatmap },
                                        ].map(l => (
                                            <button key={l.label} onClick={() => l.set(v => !v)}
                                                className={`text-[10px] px-2 py-1 rounded-lg font-semibold transition-colors ${
                                                    l.active ? 'bg-slate-700 text-slate-200' : 'bg-slate-800/40 text-slate-600'
                                                }`}>{l.active ? '●' : '○'} {l.label}</button>
                                        ))}
                                    </div>
                                    <div className="h-[400px] sm:h-[500px]">
                                        <MotorTrianglePlotter
                                            original={tri}
                                            orthic={orth}
                                            barycenter={bary}
                                            zonaOperacional={cdtData.zona_mated === 'OTIMO' ? 'verde' : cdtData.zona_mated === 'SEGURO' ? 'verde' : cdtData.zona_mated === 'RISCO' ? 'amarela' : 'vermelha'}
                                            prazoBase={prazoBase ?? undefined}
                                            orcamentoBase={orcamentoBase ?? undefined}
                                            protocolo={cdtData.protocolo ?? 'agudo'}
                                            showZRE={layerZRE}
                                            showNVO={layerNVO}
                                            showMancha={layerMancha}
                                            showBands={layerBands}
                                            showAngles={layerAngles}
                                            showHeatmap={layerHeatmap}
                                            angulos={(() => {
                                                const sE = cdtData.lados.escopo, sC = cdtData.lados.orcamento, sP = cdtData.lados.prazo
                                                const toDeg = (r: number) => r * 180 / Math.PI
                                                const cc = (v: number) => Math.max(-1, Math.min(1, v))
                                                return {
                                                    alpha: toDeg(Math.acos(cc((sE*sE + sP*sP - sC*sC) / (2*sE*sP || 1)))),
                                                    beta: toDeg(Math.acos(cc((sE*sE + sC*sC - sP*sP) / (2*sE*sC || 1)))),
                                                    gamma: toDeg(Math.acos(cc((sC*sC + sP*sP - sE*sE) / (2*sC*sP || 1)))),
                                                }
                                            })()}
                                            ladosNorm={{ E: cdtData.lados.escopo, C: cdtData.lados.orcamento, P: cdtData.lados.prazo }}
                                            manchaData={manchaChartData.length > 2 ? manchaChartData : undefined}
                                            aRebarba={fisicaV3?.aRebarba ?? 0}
                                            pctContingencia={tap?.percentual_contingencia ?? 10}
                                        />
                                    </div>
                                </>)
                            })() : (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
                                    <Activity className="h-12 w-12 animate-pulse" />
                                    <p className="text-sm font-medium">Complete o setup para visualizar a geometria CDT</p>
                                </div>
                            )}
                        </div>
                        {/* R6: Painel Clairaut compacto */}
                        {cdtData && cdtData.cet_dupla.valid && (() => {
                            const sE = cdtData.lados.escopo, sC = cdtData.lados.orcamento, sP = cdtData.lados.prazo
                            const cc = (v: number) => Math.max(-1, Math.min(1, v))
                            const toDeg = (r: number) => r * 180 / Math.PI
                            const angAlpha = toDeg(Math.acos(cc((sE*sE + sP*sP - sC*sC) / (2*sE*sP || 1))))
                            const angOmega = toDeg(Math.acos(cc((sE*sE + sC*sC - sP*sP) / (2*sE*sC || 1))))
                            const angEpsilon = toDeg(Math.acos(cc((sC*sC + sP*sP - sE*sE) / (2*sC*sP || 1))))
                            const proto = cdtData.protocolo ?? 'agudo'
                            const cor = (d: number) => d > 90 ? 'text-rose-400' : d > 75 ? 'text-amber-400' : 'text-emerald-400'
                            return (
                                <div className="px-4 pb-4 flex flex-wrap gap-3 justify-center">
                                    {[{ l: 'α Prazo', v: angAlpha }, { l: 'ω Custo', v: angOmega }, { l: 'ε Equilíbrio', v: angEpsilon }].map(a => (
                                        <div key={a.l} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-center">
                                            <span className="text-[10px] text-slate-500">{a.l}</span>
                                            <p className={`text-base font-black font-mono ${cor(a.v)}`}>{a.v.toFixed(1)}°</p>
                                        </div>
                                    ))}
                                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-center">
                                        <span className="text-[10px] text-slate-500">Protocolo</span>
                                        <p className="text-base font-black text-white">{proto === 'agudo' ? 'α' : proto === 'obtuso_beta' ? 'β' : proto === 'obtuso_gamma' ? 'γ' : '□'}</p>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* LEVEL 3 — TÉCNICO: painel colapsável (modo técnico opt-in)    */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div className="bg-slate-900/40 border border-slate-700/60 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setTecnicoExpanded(v => !v)}
                    aria-expanded={tecnicoExpanded}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-200 transition-colors"
                >
                    <span className="flex items-center gap-2" title="Modo Avançado: exibe métricas brutas do motor geométrico — R², A_rebarba, forma, regime, y₀">
                        <Cpu className="h-3.5 w-3.5" />
                        {tecnicoExpanded ? 'Modo Avançado Ativo' : 'Painel Técnico (Modo Avançado)'}
                    </span>
                    {tecnicoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {tecnicoExpanded && (
                    <div className="p-4 pt-0 grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Coluna 1: Lados do Triângulo (E/C/P) */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">Lados do Triângulo</p>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Eixo Escopo</p>
                                    <p className="text-2xl font-bold text-slate-200">1.000</p>
                                    <p className="text-xs text-slate-500 mt-1">no plano</p>
                                    <div className="absolute bottom-0 right-0 h-1 w-full bg-blue-500/20" />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                                    <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider mb-1">Eixo Orçamento</p>
                                    <p className="text-2xl font-bold text-amber-400">{cdtData?.lados.orcamento.toFixed(3) ?? '—'}</p>
                                    <p className="text-xs text-slate-500 mt-1">{cdtData ? formatDesvioLado(cdtData.lados.orcamento, 'orcamento') : '—'}</p>
                                    <div className="absolute bottom-0 right-0 h-1 w-full bg-amber-500/20" />
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                                    <p className="text-xs font-semibold text-rose-500/70 uppercase tracking-wider mb-1">Eixo Prazo</p>
                                    <p className="text-2xl font-bold text-rose-400">{cdtData?.lados.prazo.toFixed(3) ?? '—'}</p>
                                    <p className="text-xs text-slate-500 mt-1">{cdtData ? formatDesvioLado(cdtData.lados.prazo, 'prazo') : '—'}</p>
                                    <div className="absolute bottom-0 right-0 h-1 w-full bg-rose-500/20" />
                                </div>
                            </div>

                            {/* P7/P8: Índice de Qualidade — só mostra quando < 100% (sinal real) */}
                            {cdtData?.desvio_qualidade != null && cdtData.desvio_qualidade < 100 && (
                                <div className={`p-4 rounded-2xl border ${
                                    cdtData.desvio_qualidade <= 30
                                        ? 'bg-emerald-950/20 border-emerald-500/30'
                                        : cdtData.desvio_qualidade <= 65
                                            ? 'bg-amber-950/20 border-amber-500/30'
                                            : 'bg-rose-950/20 border-rose-500/30'
                                }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                                            cdtData.desvio_qualidade <= 30 ? 'text-emerald-300'
                                            : cdtData.desvio_qualidade <= 65 ? 'text-amber-300' : 'text-rose-300'
                                        }`}>
                                            <TrendingDown className="h-4 w-4" /> Desvio de Qualidade
                                        </h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            cdtData.desvio_qualidade <= 30 ? 'bg-emerald-500/20 text-emerald-400'
                                            : cdtData.desvio_qualidade <= 65 ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-rose-500/20 text-rose-400'
                                        }`}>
                                            {cdtData.desvio_qualidade <= 30 ? 'CONTROLADO'
                                             : cdtData.desvio_qualidade <= 65 ? 'ATENÇÃO' : 'CRÍTICO'}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-black text-white">{cdtData.desvio_qualidade.toFixed(1)}%</p>
                                    <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${
                                            cdtData.desvio_qualidade <= 30 ? 'bg-emerald-500'
                                            : cdtData.desvio_qualidade <= 65 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`} style={{ width: `${Math.min(cdtData.desvio_qualidade, 100)}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Coluna 2: Motor Físico v3.0 + Monte Carlo */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">Motor Físico v3.0</p>

                            {/* Monte Carlo */}
                            <div className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-2xl">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" /> Confiança
                                    </h3>
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">MONTE CARLO</span>
                                </div>
                                <p className="text-3xl font-black text-white">{monteCarlo?.confianca.toFixed(1) ?? '—'}%</p>
                                <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${
                                        (monteCarlo?.confianca ?? 0) > 85 ? 'bg-emerald-500'
                                        : (monteCarlo?.confianca ?? 0) > 65 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`} style={{ width: `${monteCarlo?.confianca ?? 0}%` }} />
                                </div>
                            </div>

                            {/* Campos físicos: forma, R², A_rebarba, y₀, regime */}
                            {cdtData && (
                                <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 cursor-help" title="Natureza geométrica do Triângulo Matriz">
                                            Forma geométrica
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            cdtData?.forma_triangulo === 'acutangulo'    ? 'bg-emerald-500/20 text-emerald-400' :
                                            cdtData?.forma_triangulo === 'retangulo'     ? 'bg-amber-500/20 text-amber-400'  :
                                            cdtData?.forma_triangulo === 'invalido'      ? 'bg-rose-500/20 text-rose-400'    :
                                            cdtData?.forma_triangulo                     ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-slate-700/40 text-slate-500'
                                        }`}>{cdtData?.forma_triangulo ?? '—'}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-400 cursor-help shrink-0" title="R² da reta-mestra: ≥0.7 boa aderência, 0.3–0.7 dispersão, <0.3 caótico">
                                            R² reta-mestra
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {fisicaV3?.r2Custo != null && (
                                                <span className={`text-[9px] font-bold ${
                                                    fisicaV3.r2Custo >= 0.7 ? 'text-emerald-500' :
                                                    fisicaV3.r2Custo >= 0.3 ? 'text-amber-500' : 'text-rose-500'
                                                }`}>{fisicaV3.r2Custo >= 0.7 ? 'BOA ADERÊNCIA' : fisicaV3.r2Custo >= 0.3 ? 'DISPERSÃO' : 'CAÓTICO'}</span>
                                            )}
                                            <span className={`text-xs font-mono font-bold ${
                                                fisicaV3?.r2Custo != null
                                                    ? fisicaV3.r2Custo >= 0.7 ? 'text-emerald-400'
                                                    : fisicaV3.r2Custo >= 0.3 ? 'text-amber-400' : 'text-rose-400'
                                                : 'text-slate-500'
                                            }`}>{fisicaV3?.r2Custo != null ? fisicaV3.r2Custo.toFixed(3) : '—'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 cursor-help" title="Zona plástica A_rebarba = A_mancha − A_TM">
                                            Zona plástica
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {fisicaV3?.aRebarba != null && fisicaV3.aRebarba > 0.05 && (
                                                <span className="text-[9px] font-bold text-orange-500">DEFORMAÇÃO</span>
                                            )}
                                            <span className={`text-xs font-mono font-bold ${
                                                fisicaV3?.aRebarba != null
                                                    ? fisicaV3.aRebarba > 0.05 ? 'text-orange-400' : 'text-emerald-400'
                                                : 'text-slate-500'
                                            }`}>{fisicaV3?.aRebarba != null ? fisicaV3.aRebarba.toFixed(4) : '—'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 cursor-help" title="y₀: custo mínimo irredutível — CEt inferior">
                                            y₀ — mobilização
                                        </span>
                                        <span className="text-xs font-mono text-blue-400">
                                            {custoMobilizacao > 0
                                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(custoMobilizacao)
                                                : <span className="text-slate-500 text-[10px]">não configurado</span>
                                            }
                                        </span>
                                    </div>

                                    {/* CEt inferior alerta */}
                                    {custoMobilizacao > 0 && curvaCusto.length > 0 &&
                                        curvaCusto[curvaCusto.length - 1].y < custoMobilizacao && (
                                        <div className="flex items-start gap-2 bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2 text-[10px] text-rose-400">
                                            <span className="mt-0.5 shrink-0" aria-hidden="true">⚠</span>
                                            <span><strong>CEt inferior violada</strong> — custo total projetado abaixo de y₀. O projeto não pode ser executado com este orçamento.</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                                        <span className="text-xs text-slate-400">Regime</span>
                                        <span className="text-xs text-slate-300 font-mono">
                                            {regimeTrabalho.horasPorDia}h × {regimeTrabalho.turnos}t{regimeTrabalho.incluiSabado ? ' + sáb' : ''}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Coluna 3: AI Insight + Decision Simulator + Eventos */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">Inteligência & Decisão</p>
                            <AIInsightCard
                                contexto={{
                                    modulo: 'Hub Principal (CDT)',
                                    dados: { ...(cdtData ?? {}), confianca: monteCarlo?.confianca ?? 0 },
                                    projeto_id: params.projetoId,
                                }}
                            />
                            <DecisionSimulator
                                projetoId={params.projetoId}
                                tenantId={tenantId || ''}
                                pontoOperacao={simulatedPonto}
                                baricentro={cdtData?.baricentro ?? [0.316, 0.196]}
                                onSimulate={(impact) => {
                                    setSimulatedPonto({ x: simulatedPonto.x + impact.dx, y: simulatedPonto.y + impact.dy })
                                }}
                            />
                            {tenantId && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">
                                        Ajustes Operacionais
                                    </p>
                                    <EventoAtipicoForm projetoId={params.projetoId} tenantId={tenantId} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* PAINEL DE GESTÃO — atalhos rápidos                            */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <section className="space-y-0 bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                    onClick={() => setMgmtExpanded(v => !v)}
                    className="aura-section-toggle w-full px-5 py-3.5"
                    title={mgmtExpanded ? 'Recolher painel de gestão' : 'Expandir painel de gestão'}
                >
                    <span className="flex items-center gap-2">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Painel de Gestão
                    </span>
                    {mgmtExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {mgmtExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 pt-0">
                        {managementCards.map(({ label, icon: Icon, href, color }) => {
                            const colorMap = {
                                rose:   'border-rose-800/40 hover:border-rose-500/60 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10',
                                indigo: 'border-indigo-800/40 hover:border-indigo-500/60 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10',
                                blue:   'border-blue-800/40 hover:border-blue-500/60 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10',
                                violet: 'border-violet-800/40 hover:border-violet-500/60 text-violet-400 bg-violet-500/5 hover:bg-violet-500/10',
                                amber:  'border-amber-800/40 hover:border-amber-500/60 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10',
                                slate:  'border-slate-700/40 hover:border-slate-500/60 text-slate-400 bg-slate-800/20 hover:bg-slate-700/30',
                            } as const
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all group ${colorMap[color]}`}
                                    title={label}
                                >
                                    <Icon className="h-6 w-6 transition-transform group-hover:scale-110" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-center">{label}</span>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* ── RFN-3 AC3: Botão flutuante ⚙ Ferramentas ── */}
            {isMotorReady && (
                <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
                    {/* Sub-ações (visíveis ao hover/estado expandido) */}
                    {drawerOpen && (
                        <div className="flex flex-col gap-2 items-end animate-in slide-in-from-bottom-2 duration-200">
                            <button
                                onClick={() => { setDrawerTool('simulador'); setDrawerOpen(true) }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                    drawerTool === 'simulador'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                <Target className="h-3.5 w-3.5" /> Simulador de Decisão
                            </button>
                            <button
                                onClick={() => { setDrawerTool('evento'); setDrawerOpen(true) }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
                                    drawerTool === 'evento'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                <Zap className="h-3.5 w-3.5" /> Evento Atípico
                            </button>
                        </div>
                    )}
                    {/* Botão principal */}
                    <button
                        onClick={() => setDrawerOpen(v => !v)}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                        title="Ferramentas Aura"
                    >
                        <Wrench className="h-4 w-4" />
                        <span className="text-sm">Ferramentas</span>
                    </button>
                </div>
            )}

            {/* ── RFN-3 AC2/AC4/AC5: DrawerPanel com ferramentas ── */}
            <DrawerPanel
                title={drawerTool === 'evento' ? 'Evento Atípico' : 'Simulador de Decisão'}
                icon={drawerTool === 'evento' ? <Zap className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                open={drawerOpen && !!(drawerTool === 'evento' ? tenantId : cdtData)}
                onClose={() => setDrawerOpen(false)}
            >
                {drawerTool === 'evento' && tenantId ? (
                    <EventoAtipicoForm
                        projetoId={params.projetoId}
                        tenantId={tenantId}
                    />
                ) : drawerTool === 'simulador' && cdtData ? (
                    <DecisionSimulator
                        projetoId={params.projetoId}
                        tenantId={tenantId || ''}
                        pontoOperacao={simulatedPonto}
                        baricentro={cdtData.baricentro ?? [0.316, 0.196]}
                        onSimulate={(impact) => {
                            setSimulatedPonto({ x: simulatedPonto.x + impact.dx, y: simulatedPonto.y + impact.dy })
                        }}
                    />
                ) : (
                    <p className="text-slate-500 text-sm">Configure o projeto para acessar esta ferramenta.</p>
                )}
            </DrawerPanel>

            {/* Req G: Botão Relatórios + Archive Drawer */}
            <button
                onClick={() => setReportDrawerAberto(true)}
                className="fixed bottom-6 right-20 z-50 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
                title="Arquivo de Relatórios"
            >
                <FileText className="h-5 w-5" />
            </button>
            <ReportArchiveDrawer
                projetoId={params.projetoId}
                aberto={reportDrawerAberto}
                onClose={() => setReportDrawerAberto(false)}
            />

            {/* Sprint 9 Req H: Botão Ferramentas sticky */}
            <StickyFerramentasButton />
        </div>
    )
}
