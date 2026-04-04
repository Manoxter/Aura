'use client'

import { useState } from 'react'
import { LineChart, Line, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { gerarTrianguloCDT, buildCurvaCusto } from '@/lib/engine/math'
import { sintetizarClairaut } from '@/lib/engine/clairaut'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Zap, TrendingDown, TrendingUp, Clock, DollarSign, Trash2, AlertTriangle, Save, Upload, Info } from 'lucide-react'
import { SetupStepper } from '@/components/aura/SetupStepper'
import { buildDisplayMap } from '@/lib/engine/cpm'

type TabType = 'catalogo' | 'prazo' | 'tarefas'

// C5 (P2): OLS ponderada — Murphys recebem peso 1.8×, paradas planejadas são excluídas
function weightedOLS(pontos: { x: number; y: number; w: number }[]): { a: number; b: number } {
    const valid = pontos.filter(p => p.w > 0)
    if (valid.length < 2) return { a: 0, b: 100 }
    const n = valid.reduce((s, p) => s + p.w, 0)
    const Swx = valid.reduce((s, p) => s + p.w * p.x, 0)
    const Swy = valid.reduce((s, p) => s + p.w * p.y, 0)
    const Swx2 = valid.reduce((s, p) => s + p.w * p.x * p.x, 0)
    const Swxy = valid.reduce((s, p) => s + p.w * p.x * p.y, 0)
    const denom = n * Swx2 - Swx * Swx
    if (Math.abs(denom) < 1e-10) return { a: 0, b: Swy / n }
    const a = (n * Swxy - Swx * Swy) / denom
    const b = (Swy - a * Swx) / n
    return { a, b }
}

const TASK_COLORS = ['#818cf8','#34d399','#f59e0b','#f87171','#60a5fa','#a78bfa','#4ade80','#fb923c','#38bdf8','#c084fc']

export default function FuncoesPage({ params }: { params: { projetoId: string } }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { funcoes, setFuncoes, isTapReady, tarefas, prazoBase, prazoLimiteSuperior, bufferProjeto, isProjetoViavel, custosTarefas, setCustosTarefas, tenantId, dataBaseline, tap, modeloBurndown, setModeloBurndown, interrupcoes, feriados, marcos, orcamentoBase, dataInicio } = useProject()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Get tab from URL or fallback to 'prazo'
    const tabParam = searchParams.get('tab') as TabType
    const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'prazo')
    const [saving, setSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [importMsg, setImportMsg] = useState('')

    const handleImportCustosDaWBS = () => {
        const raw = typeof window !== 'undefined'
            ? localStorage.getItem(`aura_wbs_export_${params.projetoId}`)
            : null
        if (!raw) {
            setImportMsg('Export da WBS não encontrado. Acesse WBS → Exportar para CPM primeiro.')
            return
        }
        try {
            const { tasks } = JSON.parse(raw) as { tasks: Array<{ id: string; nome: string; custo?: number }> }
            if (!tasks?.length) { setImportMsg('Nenhuma tarefa no export da WBS.'); return }

            // Reverse displayMap: display-code → tarefa UUID
            // Normaliza removendo prefixo T para compatibilizar "T1.1" com "1.1"
            const stripT = (s: string) => s.replace(/^T/i, '')
            const displayMap = buildDisplayMap(tarefas)
            const reverseMap = new Map<string, string>()
            displayMap.forEach((code, tarefaId) => {
                reverseMap.set(code, tarefaId)           // "1.1" → uuid
                reverseMap.set(`T${stripT(code)}`, tarefaId) // "T1.1" → uuid
            })

            // Fallback: match por nome normalizado
            const byName = new Map<string, string>()
            tarefas.forEach(t => byName.set(t.nome.toLowerCase().trim(), t.id))

            const updated: Record<string, number> = { ...custosTarefas }
            let count = 0
            tasks.forEach(t => {
                if (!t.custo || t.custo <= 0) return
                const tarefaId =
                    reverseMap.get(t.id) ??
                    reverseMap.get(stripT(t.id)) ??
                    byName.get(t.nome.toLowerCase().trim())
                if (tarefaId) { updated[tarefaId] = t.custo; count++ }
            })

            if (count === 0) {
                setImportMsg('Nenhum custo encontrado. Preencha a coluna Custo na WBS e exporte novamente.')
                return
            }
            setCustosTarefas(updated)
            setImportMsg(`✓ ${count} custo(s) importado(s) da WBS. Clique "Salvar Custos" para persistir.`)
        } catch {
            setImportMsg('Erro ao ler export da WBS.')
        }
    }
    const [modelSaving, setModelSaving] = useState(false)
    const [showRetaTangentePrazo, setShowRetaTangentePrazo] = useState(true)
    const [showRetaTangenteCusto, setShowRetaTangenteCusto] = useState(false)
    const [showMurphyInfo, setShowMurphyInfo] = useState(false)

    // Prazo efetivo: usa limite superior (baseline/TAP) se disponível, senão CPM
    const prazoEfetivo = prazoLimiteSuperior || prazoBase

    // FIX-A1: Denominador para o Gantt — usa prazoEfetivo ou ef máximo das tarefas
    const ganttPrazoDenom = prazoEfetivo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || Math.max(...tarefas.map((t: any) => t.ef || 0), 0)
        || prazoBase
        || 0

    // C2 (K2): persiste modelo de burndown no Supabase
    const handleChangeModelo = async (m: 'linear' | 'quadratica' | 'cubica') => {
        setModeloBurndown(m)
        setModelSaving(true)
        try {
            await supabase.from('projetos').update({ modelo_burndown: m }).eq('id', params.projetoId)
        } catch {
            // silencioso — estado local já foi atualizado
        } finally {
            setModelSaving(false)
        }
    }

        // Converte offset de dias para label de data calendário (DD/MM)
    const dateLabel = (dayOffset: number): string => {
        if (!dataInicio) return `${dayOffset}d`
        const d = new Date(dataInicio)
        d.setDate(d.getDate() + dayOffset)
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    // C3 (M2): projeção do modelo selecionado em DIAS LÍQUIDOS (não mais %)
    // totalWork = total de dias líquidos do projeto (padrão: 100 para compat. com fallback)
    const modeloProjecao = (t: number, T: number, modelo: string, olsA: number, olsB: number, totalWork = 100): number => {
        const u = T > 0 ? Math.min(Math.max(t / T, 0), 1) : 0
        if (modelo === 'quadratica') {
            // S-curve PMBOK clássica: smoothstep 3u²−2u³ (lenta no início, rápida no meio, lenta no fim)
            return parseFloat((totalWork * (1 - (3 * u * u - 2 * u * u * u))).toFixed(1))
        }
        if (modelo === 'cubica') {
            // Cúbica convexa: back-loaded (maioria do trabalho no final)
            return parseFloat((totalWork * (1 - u * u * u)).toFixed(1))
        }
        // linear: OLS (olsA/olsB já em d.l./dia porque y agora é dias)
        return parseFloat((olsA * t + olsB).toFixed(1))
    }

    // C5 (P2): Verifica se um intervalo de dias contém uma parada planejada (interrupcao/feriado)
    const isIntervaloPlanejado = (diaInicio: number, diaFim: number): boolean => {
        // Verifica interrupcoes com campo 'dia' ou 'duracao'
        for (const intr of interrupcoes) {
            const dIntr = intr.dia ?? intr.dia_inicio
            if (dIntr != null && dIntr >= diaInicio && dIntr <= diaFim) return true
        }
        return false
    }

    // C1 (P1) + C5 (P2): CPM-based burndown com classificação Murphy
    const generateBurndownData = () => {
        if (!prazoEfetivo) return []

        const T = prazoEfetivo

        // Trabalho total = duração do caminho crítico (CPM) — âncora do eixo Y
        // MetodoAura: burndown mostra "dias do caminho crítico restantes", não soma de durações
        const totalWork = prazoBase || (tarefas.length > 0
            ? (tarefas.reduce((sum, t) => sum + (t.duracao_estimada || 0), 0) || 1)
            : T)

        if (tarefas.length === 0) {
            // Fallback: projeção pura do modelo sem dados CPM (y em dias líquidos)
            return [0, 0.25, 0.5, 0.75, 1].map(p => {
                const x = Math.round(T * p)
                const y = parseFloat((totalWork * (1 - p)).toFixed(1))
                const ideal = parseFloat((Math.max(0, totalWork * (1 - x / T))).toFixed(1))
                const modelo = modeloProjecao(x, T, modeloBurndown, -1, totalWork, totalWork)
                return { x, y, murphy: false, tendencia: y, modelo, ideal }
            })
        }

        // Pontos-chave: todos os EF únicos + 0 + prazoEfetivo
        const keyTimes = Array.from(new Set([0, ...tarefas.map(t => t.ef), T])).sort((a, b) => a - b)

        const rawData = keyTimes.map(t => {
            // Apenas tarefas críticas: soma das suas durações = prazoBase (caminho crítico)
            // Tarefas paralelas não-críticas não fazem parte do burndown do CP.
            const done = tarefas
                .filter(task => task.ef <= t && task.critica)
                .reduce((sum, task) => sum + (task.duracao_estimada || 0), 0)
            // Y em dias líquidos restantes (não mais %)
            const remaining = parseFloat((Math.max(0, totalWork - done)).toFixed(1))
            return { x: t, y: remaining }
        })

        // C5 (P2): Classificar intervalos planos → Murphy vs Planejado
        // Peso: Murphy = 1.8×, planejado = 0 (excluído), normal = 1.0
        const MURPHY_WEIGHT = 1.8
        const weighted = rawData.map((p, i) => {
            if (i === 0) return { ...p, w: 1.0, murphy: false }
            const prev = rawData[i - 1]
            const isFlat = p.y === prev.y && p.x > prev.x
            if (!isFlat) return { ...p, w: 1.0, murphy: false }
            // Intervalo plano — verificar se é planejado
            if (isIntervaloPlanejado(prev.x, p.x)) return { ...p, w: 0, murphy: false }
            return { ...p, w: MURPHY_WEIGHT, murphy: true }
        })

        // OLS ponderada (C5) — Murphys com peso 1.8×, paradas planejadas excluídas
        const { a: olsA, b: olsB } = weightedOLS(weighted)

        return weighted.map(p => ({
            x: p.x,
            y: p.y,
            murphy: p.murphy,
            // Clipa em [0, totalWork] para que OLS não extrapole valores negativos
            tendencia: parseFloat((Math.max(0, Math.min(totalWork, olsA * p.x + olsB))).toFixed(1)),
            modelo: modeloProjecao(p.x, T, modeloBurndown, olsA, olsB, totalWork),
            // Linha ideal: declínio linear de totalWork → 0 ao longo de T dias
            ideal: parseFloat((Math.max(0, totalWork * (1 - p.x / T))).toFixed(1)),
        }))
    }

    // Curva S de custo acumulado — spread linear por tarefa sobre [ES, EF]
    // Garante curva contínua (não degraus) e tangente dCdt sempre não-nula.
    const generateCostCurve = () => {
        if (tarefas.length === 0) return []
        const totalDuration = Math.max(...tarefas.map(t => t.ef || 0))
        if (totalDuration === 0) return []
        const extendedDuration = Math.round(totalDuration * 1.35)
        const maxCusto = tarefas.reduce((sum, task) => sum + (custosTarefas[task.id] || 0), 0)
        const steps = 55
        return Array.from({ length: steps + 1 }, (_, i) => {
            const t = Math.round((i / steps) * extendedDuration)
            // Spread linear: cada tarefa acumula custo proporcionalmente ao progresso [es, ef]
            const custo = Math.min(
                tarefas.reduce((sum, task) => {
                    const taskEs = task.es || 0
                    const taskEf = task.ef || 0
                    const taskCost = custosTarefas[task.id] || 0
                    const dur = taskEf - taskEs || 1
                    if (t <= taskEs) return sum
                    if (t >= taskEf) return sum + taskCost
                    return sum + taskCost * (t - taskEs) / dur
                }, 0),
                maxCusto
            )
            return { t, custo }
        })
    }

    // Tangente à Curva S no ponto de inflexão (50% da duração)
    // Método: derivada numérica central → dC/dt em R$/dia
    const computeTangenteCusto = (costData: { t: number; custo: number }[]) => {
        if (costData.length < 3) return null
        const totalDuration = costData[costData.length - 1].t
        const t0 = Math.round(totalDuration * 0.5) // ponto de máxima intensidade (inflexão S)
        const idx = costData.reduce((best, p, i) =>
            Math.abs(p.t - t0) < Math.abs(costData[best].t - t0) ? i : best, 0)
        const left = costData[Math.max(0, idx - 2)]
        const right = costData[Math.min(costData.length - 1, idx + 2)]
        const dCdt = (right.custo - left.custo) / ((right.t - left.t) || 1)
        const C0 = costData[idx].custo
        // Reta tangente extrapolada — sem clamp, cobre todo o domínio visível
        return costData.map(p => ({
            t: p.t,
            tangente: C0 + dCdt * (p.t - t0)
        }))
    }

    const costCurveData = generateCostCurve()
    const totalCostAll = Object.values(custosTarefas).reduce((a, b) => a + b, 0)
    // FIX-A2: totalDurationAll com fallback para prazoBase/prazoEfetivo quando CPM não rodou
    const totalDurationAll = tarefas.length > 0
        ? Math.max(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Math.max(...tarefas.map((t: any) => t.ef || 0)),
            prazoBase || 0,
            prazoEfetivo || 0
          )
        : 0
    const gradienteMedio = totalDurationAll > 0 ? totalCostAll / totalDurationAll : 0
    // Gradiente de pico: máx dC/dt na curva S (ponto de inflexão)
    const gradientePico = (() => {
        if (costCurveData.length < 3) return 0
        let max = 0
        for (let i = 1; i < costCurveData.length - 1; i++) {
            const dCdt = (costCurveData[i + 1].custo - costCurveData[i - 1].custo) /
                ((costCurveData[i + 1].t - costCurveData[i - 1].t) || 1)
            if (dCdt > max) max = dCdt
        }
        return max
    })()
    const tangenteCustoData = showRetaTangenteCusto ? computeTangenteCusto(costCurveData) : null

    const chartData = generateBurndownData()

    // C5 (P2): Contagem de Murphys detectados
    const murphyCount = chartData.filter(p => p.murphy).length

    // AI Insight: seleciona melhor modelo por R² (coeficiente de determinação)
    const allModelInsights = (() => {
        if (chartData.length < 3 || !prazoEfetivo) return null
        const T = prazoEfetivo
        // totalWork derivado do ponto inicial (x=0 → y = totalWork − 0)
        const tw = chartData[0]?.y ?? 100
        const { a: olsA, b: olsB } = weightedOLS(chartData.map(p => ({ x: p.x, y: p.y, w: p.murphy ? 1.8 : 1.0 })))
        const ys = chartData.map(p => p.y)
        const mean = ys.reduce((a, b) => a + b, 0) / ys.length
        const ssTot = ys.reduce((s, y) => s + (y - mean) ** 2, 0) || 1
        const computeR2 = (predicted: (x: number) => number) => {
            const ssRes = chartData.reduce((s, p) => s + (p.y - predicted(p.x)) ** 2, 0)
            return Math.max(0, 1 - ssRes / ssTot)
        }
        const r2Linear = computeR2(x => olsA * x + olsB)
        const r2Quad = computeR2(x => { const u = Math.min(Math.max(x / T, 0), 1); return tw * (1 - (3 * u * u - 2 * u * u * u)) })
        const r2Cubic = computeR2(x => { const u = Math.min(Math.max(x / T, 0), 1); return tw * (1 - u * u * u) })
        return [
            { id: 'linear' as const, r2: r2Linear, label: 'Linear (OLS)', justificativa: 'Ritmo constante — distribuição uniforme de trabalho ao longo do projeto.' },
            { id: 'quadratica' as const, r2: r2Quad, label: 'Curva S (PMBOK)', justificativa: 'Trabalho concentrado no meio — padrão S-curve validado pelo PMBOK.' },
            { id: 'cubica' as const, r2: r2Cubic, label: 'Cúbica (Back-loaded)', justificativa: 'Maior parte do trabalho no final — projeto com dependências tardias.' },
        ].sort((a, b) => b.r2 - a.r2)
    })()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const bestModelInsight = allModelInsights?.[0] ?? null

    // Taxa OLS ponderada (% por dia) + intercepto — reta tangente real
    const { olsRate, olsIntercept: _olsIntercept } = (() => {
        if (chartData.length < 2) return { olsRate: null as number | null, olsIntercept: null as number | null }
        const { a, b } = weightedOLS(chartData.map(p => ({ x: p.x, y: p.y, w: p.murphy ? 1.8 : 1.0 })))
        return { olsRate: a, olsIntercept: b }
    })()

    // FIX-B2 + FIX-C3: CEt + SC + Prometeu — usa buildCurvaCusto unificado (useSeed=false)
    const curvaPrazoForSC = chartData.length >= 2 ? chartData.map(p => ({ x: p.x, y: p.y })) : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const curvaCustoForSC = buildCurvaCusto(tarefas as any, custosTarefas, marcos, prazoBase || 0, orcamentoBase || 0, false)
    // FIX-CEt: usar ponto médio (T/2) como diaAtual — no dia T todas as tarefas terminaram
    // (calcularProjecaoFinanceira usa dia < ef), tangCostoAtual=0, C_raw=0, triângulo degenerado.
    // Em T/2 as tarefas ainda estão ativas → slope > 0 → CDT válido.
    const cdtDiaAtual = Math.max(1, Math.round(ganttPrazoDenom / 2))
    const cdtParaSC = (curvaCustoForSC.length >= 2 && curvaPrazoForSC && ganttPrazoDenom > 0)
        ? gerarTrianguloCDT({ curvaCusto: curvaCustoForSC, curvaPrazo: curvaPrazoForSC, diaAtual: cdtDiaAtual, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
        : null
    const scResult = (cdtParaSC && cdtParaSC.cet_dupla?.valid)
        ? sintetizarClairaut(cdtParaSC.lados.escopo, cdtParaSC.lados.prazo, cdtParaSC.lados.orcamento)
        : null

    const handleSaveTaskCosts = async () => {
        if (!tenantId) return
        setSaving(true)
        try {
            const { error: err } = await supabase
                .from('orcamentos')
                .upsert({ projeto_id: params.projetoId, tenant_id: tenantId, custos_tarefas: custosTarefas }, { onConflict: 'projeto_id' })
            
            if (err) throw err
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 2000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Erro ao salvar custos:', err)
            setSaveStatus('error')
        } finally {
            setSaving(false)
        }
    }

    if (!isTapReady) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                    <ShieldCheck className="h-10 w-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-100 mb-2">Setup Bloqueado</h1>
                <p className="text-slate-400 max-w-md mx-auto">
                    A definição de funções de tradeoff exige que a TAP seja extraída e salva primeiro.
                </p>
                <button
                    onClick={() => router.push(`/${params.projetoId}/setup/tap`)}
                    className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
                >
                    Ir para Setup TAP
                </button>
            </div>
        )
    }

    const removeFuncao = (id: string) => {
        setFuncoes(funcoes.filter(f => f.id !== id))
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <TrendingDown className="h-8 w-8 text-indigo-500" />
                        Função de Prazo & Compressão
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Análise de velocidade e modelagem de Crashing (Tradeoff Tempo x Custo)</p>
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button 
                        onClick={() => setActiveTab('prazo')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'prazo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Análise de Prazo
                    </button>
                    <button 
                        onClick={() => setActiveTab('tarefas')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tarefas' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Orçamento e Liquidez
                    </button>
                    <button 
                        onClick={() => setActiveTab('catalogo')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'catalogo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Crashing (Tradeoff)
                    </button>
                </div>
            </header>

            {activeTab === 'prazo' ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <TrendingDown className="h-64 w-64 text-indigo-500" />
                        </div>
                        
                        {/* ── Aviso: todas as tarefas em paralelo (sem predecessoras) ── */}
                        {tarefas.length > 1 && !tarefas.some((t: any) => (t.dependencias || []).length > 0) && (
                            <div className="mb-6 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-300">Burndown baseado em execução paralela total</p>
                                    <p className="text-xs text-amber-300/70 mt-0.5">
                                        Nenhuma predecessora configurada — CPM retorna prazo mínimo irreal.
                                        Configure predecessoras em <strong className="text-amber-200">Setup → CPM</strong> para um burndown realista.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white">Burndown de Variação</h3>
                                <div className="flex gap-2 mt-2 items-center flex-wrap">
                                    {['linear', 'quadratica', 'cubica'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => handleChangeModelo(m as 'linear' | 'quadratica' | 'cubica')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold uppercase border transition-all ${modeloBurndown === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setShowRetaTangentePrazo(v => !v)}
                                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold uppercase border transition-all ${showRetaTangentePrazo ? 'bg-orange-600/20 border-orange-500/60 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-orange-500/40 hover:text-orange-400'}`}
                                        title="Tendência de conclusão — calculada a partir dos marcos de entrega CPM com peso extra em atrasos não planejados"
                                    >
                                        <TrendingUp className="h-3 w-3" /> Reta Tangente
                                    </button>
                                    {modelSaving && <span className="text-xs text-slate-500 animate-pulse">salvando…</span>}
                                    {/* Aviso: poucos pontos distintos → tangente estatisticamente frágil */}
                                    {showRetaTangentePrazo && chartData.length < 5 && (
                                        <span className="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                            ⚠ &lt;5 pontos — tangente estimada
                                        </span>
                                    )}
                                    {/* C5 (P2): Badge de Murphys + info toggle */}
                                    {murphyCount > 0 && (
                                        <div className="relative flex items-center gap-1">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center gap-1">
                                                <AlertTriangle className="h-2.5 w-2.5" />
                                                {murphyCount} Murphy{murphyCount > 1 ? 's' : ''}
                                            </span>
                                            <button
                                                onClick={() => setShowMurphyInfo(v => !v)}
                                                className={`p-0.5 rounded transition-colors ${showMurphyInfo ? 'text-orange-400' : 'text-slate-600 hover:text-orange-400'}`}
                                                title="O que é Murphy?"
                                            >
                                                <Info className="h-3 w-3" />
                                            </button>
                                            {showMurphyInfo && (
                                                <div className="absolute z-20 top-full left-0 mt-2 w-72 bg-slate-900 border border-orange-500/40 rounded-xl p-3 shadow-2xl shadow-orange-500/10 text-xs text-slate-400 leading-relaxed">
                                                    <div className="font-bold text-orange-400 mb-1.5 flex items-center gap-1.5">
                                                        <AlertTriangle className="h-3 w-3" /> Murphy — Parada Não Planejada
                                                    </div>
                                                    <p>Intervalo plano no burndown onde nenhum trabalho foi concluído, sem feriado nem interrupção cadastrada.</p>
                                                    <p className="mt-1.5 text-orange-300/70 font-semibold">Peso 1.8× na OLS — distorce a taxa de queima e compromete a previsão de conclusão.</p>
                                                    <p className="mt-1.5 text-slate-500">Cadastre interrupções planejadas em <span className="text-indigo-400">Setup → Interrupções</span> para excluí-las do cálculo.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Status da Intensidade</div>
                                <div className={`font-mono font-bold flex items-center gap-2 justify-end ${modeloBurndown === 'linear' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <div className={`h-2 w-2 rounded-full animate-pulse ${modeloBurndown === 'linear' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {modeloBurndown.toUpperCase()} ({modeloBurndown === 'linear' ? '1.0x' : 'Auto'})
                                </div>
                            </div>
                        </div>

                        {/* Legenda TM + A_mancha */}
                        <div className="flex items-center gap-4 mb-2 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <div className="h-[2px] w-6 bg-emerald-500 opacity-80" style={{ background: 'repeating-linear-gradient(90deg, #22c55e 0 7px, transparent 7px 10px)' }} />
                                <span className="text-[10px] text-slate-400">TM Referência (hipotenusa isósceles)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-3 w-5 rounded-sm" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.3) 0%, rgba(245,158,11,0.04) 100%)' }} />
                                <span className="text-[10px] text-slate-400">A_mancha (∫ desvio vs TM)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-[3px] w-6 bg-indigo-400 rounded-full" />
                                <span className="text-[10px] text-slate-400">Progresso Real</span>
                            </div>
                        </div>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 60, bottom: 20 }}>
                                    <defs>
                                        {/* A_mancha: desvio acima do TM (burndown mais lento que o ideal) */}
                                        <linearGradient id="manchaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.30} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                                        </linearGradient>
                                        {/* TM Triangle: região do burndown ideal (triângulo base) */}
                                        <linearGradient id="tmGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="x"
                                        type="number"
                                        domain={[0, 'dataMax']}
                                        stroke="#64748b"
                                        fontSize={11}
                                        tickFormatter={dateLabel}
                                        label={{ value: 'Calendário', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        domain={[0, Math.ceil((prazoBase || chartData[0]?.y || 100) * 1.05)]}
                                        label={{ value: 'Dias Caminho Crítico', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                        labelFormatter={(v) => dateLabel(Number(v))}
                                        formatter={(value: unknown, name: unknown) => {
                                            if (name === 'TM Referência') return [`${value} d.l.`, '◇ TM Referência']
                                            return [`${value} d.l.`, String(name)]
                                        }}
                                    />
                                    {/* TM Triangle — hipotenusa linear + área (triângulo isósceles canônico E=1, C=P=√2) */}
                                    <Area
                                        type="linear"
                                        dataKey="ideal"
                                        fill="url(#tmGradient)"
                                        stroke="#22c55e"
                                        strokeWidth={1.5}
                                        strokeDasharray="7 3"
                                        strokeOpacity={0.85}
                                        dot={false}
                                        name="TM Referência"
                                    />
                                    {/* A_mancha — área sob o burndown real + desvio em relação ao TM */}
                                    <Area
                                        type="monotone"
                                        dataKey="y"
                                        fill="url(#manchaGradient)"
                                        stroke="#818cf8"
                                        strokeWidth={3}
                                        dot={{ fill: '#818cf8', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name="Progresso Real"
                                    />
                                    {showRetaTangentePrazo && (
                                        <Line
                                            type="linear"
                                            dataKey="tendencia"
                                            stroke="#f97316"
                                            strokeWidth={2.5}
                                            strokeDasharray="10 4"
                                            strokeOpacity={0.95}
                                            dot={false}
                                            name="Tendência OLS"
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Mini-Gantt Burndown — paralelismo de tarefas no eixo de tempo */}
                        {tarefas.length > 0 && ganttPrazoDenom > 0 && (
                            <div className="mt-3" style={{ paddingLeft: '64px', paddingRight: '24px' }}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                        Gantt CPM — sobreposição de tarefas por dia
                                    </span>
                                    <span className="text-[9px] text-slate-700 font-mono">{tarefas.length} tarefas · {ganttPrazoDenom}d</span>
                                </div>
                                <div className="relative h-[24px] bg-slate-950/50 rounded overflow-hidden border border-slate-800/40">
                                    {(() => {
                                        const T = ganttPrazoDenom
                                        return tarefas.map((t, index) => (
                                            <div
                                                key={t.id}
                                                className="absolute h-full rounded-sm"
                                                style={{
                                                    left: `${(Math.min(t.es || 0, T) / T) * 100}%`,
                                                    width: `${Math.max((t.duracao_estimada / T) * 100, 0.5)}%`,
                                                    backgroundColor: TASK_COLORS[index % TASK_COLORS.length],
                                                }}
                                                title={`${t.nome}: dia ${t.es || 0}→${t.ef || 0}`}
                                            />
                                        ))
                                    })()}
                                </div>
                                <div className="flex justify-between mt-0.5">
                                    <span className="text-[8px] text-slate-700 font-mono">0</span>
                                    <span className="text-[8px] text-slate-600 font-mono italic">
                                        {!tarefas.some((t: any) => (t.dependencias || []).length > 0) ? '⚠ paralelo total' : ''}
                                    </span>
                                    <span className="text-[8px] text-slate-700 font-mono">{ganttPrazoDenom}d</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Métricas Prescritivas</h4>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-xs text-slate-600 font-bold mb-1">TAXA DE TANGENTE (OLS)</div>
                                    <div className={`text-2xl font-bold font-mono ${olsRate === null ? 'text-slate-600' : olsRate < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {olsRate === null ? '—' : `${olsRate.toFixed(2)}`}
                                        <span className="text-xs text-slate-500 ml-1">d.l. / dia</span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                        {tarefas.length > 0 ? `Tendência calculada a partir das ${tarefas.length} tarefas do cronograma` : 'Sem dados de cronograma'}
                                    </p>
                                </div>
                                {/* C5 (P2): Painel de Murphys */}
                                {murphyCount > 0 && (
                                    <div className="border-t border-slate-800 pt-4">
                                        <div className="text-xs text-orange-400/80 font-bold mb-2 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" /> PARADAS NÃO PLANEJADAS
                                        </div>
                                        <div className="text-2xl font-bold font-mono text-orange-400">
                                            {murphyCount}
                                            <span className="text-xs text-slate-500 ml-1">Murphy{murphyCount > 1 ? 's' : ''}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">
                                            Peso 1.8× na OLS — desviam a taxa de queima prevista
                                        </p>
                                    </div>
                                )}
                                <div className="border-t border-slate-800 pt-4">
                                    <div className="text-xs text-slate-600 font-bold mb-1">EFICIÊNCIA DE CRASHING</div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full mt-2">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">O projeto está operando com 85% de aproveitamento das compressões de prazo.</p>
                                </div>
                            </div>
                        </div>

                        {/* Hierarquia de Limite de Prazo */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Hierarquia do Prazo</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">CPM (Caminho Crítico)</span>
                                    <span className="text-blue-400 font-mono font-bold">{prazoBase || 0}d</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Baseline Calendário</span>
                                    <span className={`font-mono font-bold ${dataBaseline?.prazo ? 'text-emerald-400' : 'text-slate-600'}`}>
                                        {dataBaseline?.prazo ? `${dataBaseline.prazo}d` : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">TAP (Teto Absoluto)</span>
                                    <span className={`font-mono font-bold ${tap?.prazo_total ? 'text-amber-400' : 'text-slate-600'}`}>
                                        {tap?.prazo_total ? `${tap.prazo_total}d` : '—'}
                                    </span>
                                </div>
                                <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm">
                                    <span className="text-white font-bold">Limite Superior Efetivo</span>
                                    <span className="text-white font-mono font-bold text-lg">{prazoLimiteSuperior || prazoBase || 0}d</span>
                                </div>
                            </div>
                            {bufferProjeto !== null && (
                                <div className={`mt-3 p-2 rounded-lg border ${isProjetoViavel ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-bold ${isProjetoViavel ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isProjetoViavel ? '✓ Viável' : '✗ Inviável'}
                                        </span>
                                        <span className={`text-xs font-mono font-bold ${bufferProjeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            Buffer: {bufferProjeto}d
                                        </span>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                Hierarquia: CPM (floor) &lt; Baseline (ceiling) &lt; TAP (cap). Limites entre Baseline e TAP ativáveis se CEt permitir. Fora da CEt → descartados.
                            </p>
                        </div>

                        <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6">
                            <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2 mb-3">
                                <Zap className="h-4 w-4" /> Firma Inteligente — Modelo Recomendado
                            </h4>
                            {allModelInsights ? (
                                <div className="space-y-3">
                                    {allModelInsights.map((m, idx) => {
                                        const isActive = m.id === modeloBurndown
                                        const isBest = idx === 0
                                        const barColor = m.id === 'linear' ? '#818cf8' : m.id === 'quadratica' ? '#f59e0b' : '#10b981'
                                        return (
                                            <div key={m.id} className={`rounded-xl p-3 border transition-all ${isActive ? 'border-indigo-500/50 bg-indigo-900/20' : 'border-slate-800 bg-slate-950/50'}`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${isActive ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                            {m.label}
                                                        </span>
                                                        {isBest && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">✓ recomendado</span>}
                                                    </div>
                                                    <span className="text-[11px] font-mono font-bold text-slate-300">R² {(m.r2 * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(m.r2 * 100).toFixed(1)}%`, backgroundColor: barColor }} />
                                                </div>
                                                {isBest && !isActive && (
                                                    <button
                                                        onClick={() => handleChangeModelo(m.id)}
                                                        className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-200 underline underline-offset-2 transition-colors"
                                                    >
                                                        Aplicar modelo recomendado →
                                                    </button>
                                                )}
                                                {isBest && isActive && (
                                                    <p className="mt-1.5 text-[10px] text-indigo-300/60 leading-relaxed">{m.justificativa}</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-indigo-300/60">Calcule o CPM para ativar a análise de modelo.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'tarefas' ? (
                <div className="space-y-6">

                    {/* Gradiente de Custo + Curva S */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Métricas de Gradiente */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gradiente de Custo</h4>
                            {totalCostAll === 0 && (
                                <div className="flex items-start gap-2 rounded-xl bg-amber-900/20 border border-amber-600/30 px-3 py-2">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-300/80 leading-snug">
                                        Nenhum custo cadastrado — gradiente exibindo zero.<br />
                                        Importe via &ldquo;Importar da WBS&rdquo; ou preencha manualmente.
                                    </p>
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-slate-600 font-bold uppercase mb-1">Total Orçado</div>
                                <div className="text-2xl font-bold font-mono text-white">
                                    {totalCostAll >= 1e9
                                        ? `R$ ${(totalCostAll / 1e9).toFixed(2)}B`
                                        : totalCostAll >= 1e6
                                            ? `R$ ${(totalCostAll / 1e6).toFixed(1)}M`
                                            : `R$ ${totalCostAll.toLocaleString('pt-BR')}`}
                                </div>
                            </div>
                            <div className="border-t border-slate-800 pt-4">
                                <div className="text-xs text-emerald-500/80 font-bold uppercase mb-1">∇C Médio (dC/dt)</div>
                                <div className="text-xl font-bold font-mono text-emerald-400">
                                    {gradienteMedio >= 1e6
                                        ? `R$ ${(gradienteMedio / 1e6).toFixed(2)}M`
                                        : `R$ ${Math.round(gradienteMedio).toLocaleString('pt-BR')}`}
                                    <span className="text-xs text-slate-500 ml-1">/ dia</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1">Taxa de queima linear média</p>
                            </div>
                            <div className="border-t border-slate-800 pt-4">
                                <div className="text-xs text-amber-500/80 font-bold uppercase mb-1">∇C Pico (inflexão S)</div>
                                <div className="text-xl font-bold font-mono text-amber-400">
                                    {gradientePico >= 1e6
                                        ? `R$ ${(gradientePico / 1e6).toFixed(2)}M`
                                        : `R$ ${Math.round(gradientePico).toLocaleString('pt-BR')}`}
                                    <span className="text-xs text-slate-500 ml-1">/ dia</span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1">Máxima taxa de desembolso (ponto de tangência)</p>
                            </div>
                            <button
                                onClick={() => setShowRetaTangenteCusto(v => !v)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${showRetaTangenteCusto ? 'bg-orange-600/20 border-orange-500/60 text-orange-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-orange-500/40 hover:text-orange-400'}`}
                                title="Tangente à curva S no ponto de inflexão (máxima taxa de desembolso)"
                            >
                                <TrendingUp className="h-4 w-4" />
                                {showRetaTangenteCusto ? 'Ocultar Tangente' : 'Gerar Reta Tangente'}
                            </button>
                        </div>

                        {/* Curva S de Custo Acumulado */}
                        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Curva S — Custo Acumulado</h4>
                            {costCurveData.length > 0 ? (
                                <div className="h-[240px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={costCurveData.map((p, i) => ({
                                            ...p,
                                            tangente: tangenteCustoData ? tangenteCustoData[i]?.tangente : undefined
                                        }))}>
                                            <defs>
                                                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="t" stroke="#64748b" fontSize={11}
                                                tickFormatter={dateLabel}
                                                label={{ value: 'Calendário', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }} />
                                            <YAxis stroke="#64748b" fontSize={11}
                                                tickFormatter={v => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}k`}
                                                label={{ value: 'Custo Acumulado (R$)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, dy: 60 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                formatter={(v: unknown, name: unknown) => {
                                                    const num = typeof v === 'number' ? v : 0
                                                    const label = name === 'custo' ? 'Curva S' : 'Reta Tangente'
                                                    const formatted = num >= 1e9 ? `R$ ${(num / 1e9).toFixed(3)}B` : num >= 1e6 ? `R$ ${(num / 1e6).toFixed(1)}M` : `R$ ${Math.round(num).toLocaleString('pt-BR')}`
                                                    return [formatted, label]
                                                }}
                                            />
                                            <Area type="monotone" dataKey="custo" stroke="#3b82f6" strokeWidth={2}
                                                fill="url(#costGradient)" dot={false} name="custo" />
                                            {showRetaTangenteCusto && (
                                                <Line type="linear" dataKey="tangente" stroke="#f97316"
                                                    strokeWidth={4} strokeDasharray="10 4" strokeOpacity={1}
                                                    dot={false} name="Reta Tangente (∇C pico)" />
                                            )}
                                            {showRetaTangenteCusto && totalDurationAll > 0 && (
                                                <ReferenceLine x={Math.round(totalDurationAll * 0.5)}
                                                    stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.7}
                                                    label={{ value: '⬧ Inflexão (dC/dt máx)', fill: '#f97316', fontSize: 10, position: 'insideTopLeft' }} />
                                            )}
                                            {/* Pontos extremos: Baseline, CPM end, Deadline */}
                                            <ReferenceLine x={0} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 3"
                                                label={{ value: 'Baseline', position: 'insideTopRight', fill: '#22c55e', fontSize: 8 }} />
                                            {(prazoBase ?? 0) > 0 && (
                                                <ReferenceLine x={prazoBase ?? undefined} stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 3"
                                                    label={{ value: `CPM`, position: 'insideTopLeft', fill: '#3b82f6', fontSize: 8 }} />
                                            )}
                                            {(prazoEfetivo ?? 0) > 0 && prazoEfetivo !== prazoBase && (
                                                <ReferenceLine x={prazoEfetivo ?? undefined} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2"
                                                    label={{ value: 'Deadline', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 8 }} />
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[240px] flex items-center justify-center text-slate-600 text-sm">
                                    Preencha os custos por tarefa e salve para visualizar a Curva S.
                                </div>
                            )}

                            {/* Mini-Gantt Custo — sobreposição de tarefas e ponto de tangência */}
                            {tarefas.length > 0 && totalDurationAll > 0 && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                            Gantt CPM — acumulação de custo por dia
                                        </span>
                                        {showRetaTangenteCusto && (
                                            <span className="text-[9px] text-orange-500/70 font-mono">
                                                ⬧ tangente no dia {Math.round(totalDurationAll * 0.5)} (máx dC/dt)
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative h-[24px] bg-slate-950/50 rounded overflow-hidden border border-slate-800/40">
                                        {tarefas.map((t, index) => (
                                            <div
                                                key={t.id}
                                                className="absolute h-full rounded-sm"
                                                style={{
                                                    left: `${(Math.min(t.es || 0, totalDurationAll) / totalDurationAll) * 100}%`,
                                                    width: `${Math.max((t.duracao_estimada / totalDurationAll) * 100, 0.5)}%`,
                                                    backgroundColor: TASK_COLORS[index % TASK_COLORS.length],
                                                }}
                                                title={`${t.nome}: dia ${t.es || 0}→${t.ef || 0}`}
                                            />
                                        ))}
                                        {/* Linha vertical no ponto de tangência (inflexão da Curva S) */}
                                        {showRetaTangenteCusto && (
                                            <div
                                                className="absolute top-0 bottom-0 w-0.5 bg-orange-500/70"
                                                style={{ left: '50%' }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                        <span className="text-[8px] text-slate-700 font-mono">0</span>
                                        <span className="text-[8px] text-slate-700 font-mono">{totalDurationAll}d</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FIX-B2: Painel CEt + Síntese de Clairaut + Prometeu */}
                    {cdtParaSC && (
                        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/60 p-5 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                                Estado Geométrico — CEt + Clairaut + Prometeu
                            </h3>

                            {/* Lados brutos + CEt */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'E (Escopo)', val: cdtParaSC.lados_brutos.E, color: 'text-emerald-400' },
                                    { label: 'P (Prazo)', val: cdtParaSC.lados_brutos.P, color: 'text-blue-400' },
                                    { label: 'O (Orçamento)', val: cdtParaSC.lados_brutos.C, color: 'text-amber-400' },
                                ].map(({ label, val, color }) => (
                                    <div key={label} className="bg-slate-950/60 rounded-xl p-3 text-center">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                                        <div className={`text-lg font-bold font-mono ${color}`}>{val.toFixed(3)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* CEt status */}
                            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${cdtParaSC.cet_dupla?.valid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>
                                <span className="font-mono text-sm">{cdtParaSC.cet_dupla?.valid ? '✅' : '❌'}</span>
                                <span className="font-bold">CEt Dupla:</span>
                                <span className="font-mono">|P−O| &lt; E &lt; P+O</span>
                                {!cdtParaSC.cet_dupla?.valid && (
                                    <span className="ml-auto text-rose-400/70 text-[10px]">Triângulo geometricamente inválido</span>
                                )}
                            </div>

                            {/* SC + Prometeu — só quando CEt válida */}
                            {scResult && (
                                <>
                                    {/* Classificação Clairaut */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-widest">Protocolo Clairaut</div>
                                            <div className={`text-sm font-bold px-2 py-0.5 rounded-full inline-block ${
                                                scResult.tipo === 'agudo' ? 'bg-emerald-500/15 text-emerald-300' :
                                                scResult.tipo === 'singular' ? 'bg-orange-500/15 text-orange-300' :
                                                'bg-amber-500/15 text-amber-300'
                                            }`}>
                                                {scResult.tipo === 'agudo' ? 'Agudo (normal)' :
                                                 scResult.tipo === 'singular' ? 'Singular — Estado Crítico' :
                                                 scResult.tipo === 'obtuso_beta' ? 'Obtuso β — Custo domina' :
                                                 'Obtuso γ — Prazo domina'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                            {[
                                                { label: 'α (abs.)', val: scResult.alpha },
                                                { label: 'ω (ent.)', val: scResult.omega },
                                                { label: 'ε (equil.)', val: scResult.epsilon },
                                            ].map(({ label, val }) => (
                                                <div key={label} className="bg-slate-950/50 rounded-lg px-2 py-1">
                                                    <div className="text-slate-600 mb-0.5">{label}</div>
                                                    <div className="font-mono font-bold text-slate-300">{val.toFixed(1)}°</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Prometeu Intrínseco */}
                                    <div className="space-y-2 border-t border-slate-800/50 pt-3">
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Prometeu Intrínseco</div>
                                        {[
                                            { label: 'IR — Risco Intrínseco', val: scResult.IR, color: scResult.IR > 0.6 ? '#f87171' : scResult.IR > 0.3 ? '#fb923c' : '#34d399' },
                                            { label: 'Rα — Risco Orçamentário', val: scResult.Ralpha, color: scResult.Ralpha > 0.5 ? '#f87171' : scResult.Ralpha > 0.2 ? '#fb923c' : '#34d399' },
                                            { label: 'Rω — Risco de Prazo', val: scResult.Romega, color: scResult.Romega > 0.5 ? '#f87171' : scResult.Romega > 0.2 ? '#fb923c' : '#34d399' },
                                        ].map(({ label, val, color }) => (
                                            <div key={label} className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 w-40 shrink-0">{label}</span>
                                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${(val * 100).toFixed(1)}%`, backgroundColor: color }} />
                                                </div>
                                                <span className="text-[10px] font-mono font-bold w-10 text-right" style={{ color }}>{(val * 100).toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sentidos de contagem — protocolo ativo */}
                                    {(scResult.tipo === 'obtuso_beta' || scResult.tipo === 'obtuso_gamma') && (
                                        <div className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                                            {scResult.tipo === 'obtuso_beta'
                                                ? 'Protocolo β ativo: função custo refletida (gradiente invertido)'
                                                : 'Protocolo γ ativo: função prazo transladada (eixo deslocado)'}
                                        </div>
                                    )}
                                    {scResult.tipo === 'singular' && (
                                        <div className="text-[10px] text-orange-300/80 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2 font-semibold">
                                            Estado Singular: triângulo degenera em linha reta — ε = 90°. Atenção máxima ao balanço entre prazo e custo.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center gap-3">
                            <div>
                                <h3 className="text-xl font-bold text-white">Distribuição Financeira por Escopo</h3>
                                <p className="text-sm text-slate-500">Vincule os custos diretos a cada tarefa do Caminho Crítico.</p>
                                {importMsg && (
                                    <p className={`text-xs mt-1 font-medium ${importMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {importMsg}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={handleImportCustosDaWBS}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-xl text-sm font-bold transition-colors"
                                    title="Preenche os custos automaticamente a partir do export da WBS"
                                >
                                    <Upload className="h-4 w-4" />
                                    Importar da WBS
                                </button>
                                <button
                                    onClick={handleSaveTaskCosts}
                                    disabled={saving}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${saveStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                >
                                    {saving ? <Clock className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                    {saveStatus === 'success' ? 'Sincronizado' : 'Salvar Custos'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">ID</th>
                                        <th className="p-6">Tarefa</th>
                                        <th className="p-6">Duração</th>
                                        <th className="p-6">Custo Direto (R$)</th>
                                        <th className="p-6">Peso (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {tarefas.map((t, idx) => {
                                        const totalCosts = Object.values(custosTarefas).reduce((a, b) => a + b, 0) || 1
                                        const cost = custosTarefas[t.id] || 0
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-6 font-mono text-slate-500 text-xs">#{idx + 1}</td>
                                                <td className="p-6 font-bold text-slate-200">{t.nome}</td>
                                                <td className="p-6 text-slate-400 text-sm">{t.duracao_estimada} dias</td>
                                                <td className="p-6">
                                                    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 w-40 focus-within:border-blue-500 transition-all">
                                                        <span className="text-xs text-slate-600">R$</span>
                                                        <input 
                                                            type="number" 
                                                            value={cost}
                                                            onChange={e => setCustosTarefas({ ...custosTarefas, [t.id]: parseFloat(e.target.value) || 0 })}
                                                            className="bg-transparent border-none outline-none text-white font-mono text-sm w-full text-right"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${(cost / totalCosts) * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-500">{((cost / totalCosts) * 100).toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {funcoes.map((f) => (
                            <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 p-2 rounded-bl-xl text-xs font-bold uppercase tracking-widest ${f.tipo === 'crashing' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                    {f.tipo}
                                </div>

                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`p-3 rounded-xl ${f.tipo === 'crashing' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                                        {f.tipo === 'crashing' ? <Zap className="h-6 w-6 text-amber-500" /> : <Clock className="h-6 w-6 text-blue-500" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{f.nome}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{f.descricao}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Adicional/Dia</span>
                                        <span className="text-emerald-400 font-mono font-bold">R$ {f.custo_adicional_dia.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Ganho Máximo</span>
                                        <span className="text-blue-400 font-mono font-bold">{f.reducao_maxima_dias} dias</span>
                                    </div>

                                    <div className="pt-2">
                                        <div className="text-xs text-slate-600 font-bold uppercase mb-2">Elasticidade Real (Tradeoff)</div>
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-indigo-500" style={{ width: `${(f.reducao_maxima_dias / 30) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeFuncao(f.id)}
                                    className="mt-6 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Remover Parâmetro
                                </button>
                            </div>
                        ))}

                        {funcoes.length === 0 && (
                            <div className="col-span-full bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-12 text-center">
                                <AlertTriangle className="h-10 w-10 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-slate-300 font-bold">Nenhuma função sugerida</h3>
                                <p className="text-slate-500 text-sm mt-1">Gere a TAP novamente ou adicione funções manualmente.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6 mt-12 flex items-start gap-4">
                        <ShieldCheck className="h-6 w-6 text-indigo-400 shrink-0" />
                        <div>
                            <h4 className="text-indigo-200 font-bold">Impacto no Motor CDT</h4>
                            <p className="text-sm text-indigo-300/70 mt-1 leading-relaxed">
                                Estes parâmetros alimentam o algoritmo de **Crashing** do Motor. Eles definem o custo de &quot;puxar&quot; os vértices do triângulo CDT no simulador. Quanto maior o custo adicional, menor a viabilidade financeira da aceleração.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
