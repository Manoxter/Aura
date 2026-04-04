'use client'

import { useMemo, useCallback, useState } from 'react'
import { DollarSign } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, ReferenceLine } from 'recharts'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { TrianglePlotter } from '@/components/motor/TrianglePlotter'
import { Triangle, calculateOrthicTriangle, calculateBarycenter } from '@/lib/engine/triangle-logic'
import { DimensionMapper } from '@/lib/engine/mapper'
import { regressaoOLS, gerarTrianguloCDT, calcularProjecaoFinanceira } from '@/lib/engine/math'
import { useProject } from '@/context/ProjectContext'
import { getDefaultContingencia } from '@/lib/calibration/setor-config'

const CANVAS_MAPPINGS = { width: 600, height: 400 }

export default function OrcamentoPage({ params }: { params: { projetoId: string } }) {
    const { tarefas, prazoBase, orcamentoBase, custosTarefas, marcos, isMotorReady, tap } = useProject()

    const projectDuration = prazoBase || 1
    const projectCost = orcamentoBase || 1

    // C10 (K4): SVGPoint — decisão clicável no canvas
    const [decisionDias, setDecisionDias] = useState<number>(Math.floor(projectDuration * 0.5))
    const [decisionCusto, setDecisionCusto] = useState<number>(Math.floor(projectCost * 0.5))

    const mapper = useMemo(() => {
        return new DimensionMapper({ totalCost: projectCost, totalDuration: projectDuration }, CANVAS_MAPPINGS)
    }, [projectCost, projectDuration])

    // C9 (M3): Curva S financeira real baseada no CDT
    const curvaCusto = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map(p => ({ x: p.dia, y: p.acumulado }))
    }, [tarefas, custosTarefas, marcos, prazoBase])

    // C9 (M3): OLS sobre a curva de custo — clamped [0, teto] para evitar quebra visual
    const olsLine = useMemo(() => {
        if (curvaCusto.length < 2) return []
        const { a, b } = regressaoOLS(curvaCusto)
        const teto = orcamentoBase ? orcamentoBase * 1.5 : Infinity
        return curvaCusto.map(p => ({
            x: p.x,
            ols: parseFloat(Math.max(0, Math.min(teto, a * p.x + b)).toFixed(0))
        }))
    }, [curvaCusto, orcamentoBase])

    // Story 4.10: pontos da baseline planejada — gerados independentemente de curvaCusto
    const baselineData = useMemo(() => {
        if (!orcamentoBase || !prazoBase) return []
        const step = Math.max(1, Math.floor(prazoBase / 50))
        const pts: { x: number; planejado: number }[] = []
        for (let dia = 0; dia <= prazoBase; dia += step) {
            pts.push({ x: dia, planejado: Math.round((dia / prazoBase) * orcamentoBase) })
        }
        if (pts.length === 0 || pts[pts.length - 1].x < prazoBase) {
            pts.push({ x: prazoBase, planejado: orcamentoBase })
        }
        return pts
    }, [orcamentoBase, prazoBase])

    const chartData = useMemo(() => {
        // Merge curvaCusto + olsLine + baseline por dia (x)
        const baselineMap = new Map(baselineData.map(p => [p.x, p.planejado]))
        if (curvaCusto.length > 0) {
            return curvaCusto.map((p, i) => ({
                x: p.x,
                custo: Math.round(p.y) as number | null,
                ols: olsLine[i]?.ols ?? null,
                planejado: baselineMap.get(p.x) ?? null,
            }))
        }
        // Sem execução ainda: mostrar apenas baseline
        return baselineData.map(p => ({
            x: p.x,
            custo: null as number | null,
            ols: null as number | null,
            planejado: p.planejado as number | null,
        }))
    }, [curvaCusto, olsLine, baselineData])

    const olsRate = useMemo(() => {
        if (curvaCusto.length < 2) return null
        const { a } = regressaoOLS(curvaCusto)
        return a
    }, [curvaCusto])

    // C10 (K4): CDT para TrianglePlotter
    const curvaPrazo = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        const step = Math.max(1, Math.floor(prazoBase / 50))
        const pontos: { x: number; y: number }[] = []
        for (let dia = 0; dia <= prazoBase; dia += step) {
            const prog = (tarefas.filter(t => (t.ef || 0) <= dia).length / tarefas.length) * 100
            pontos.push({ x: dia, y: prog })
        }
        if (pontos.length > 0 && pontos[pontos.length - 1].x < prazoBase) pontos.push({ x: prazoBase, y: 100 })
        return pontos
    }, [tarefas, prazoBase])

    const cdtAtual = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [curvaCusto, curvaPrazo, orcamentoBase, prazoBase])

    const currentTriangle: Triangle = useMemo(() => {
        if (!cdtAtual) return { A: { x: 50, y: 350 }, B: { x: 300, y: 50 }, C: { x: 550, y: 300 } }
        const scaleX = CANVAS_MAPPINGS.width * 0.8, scaleY = CANVAS_MAPPINGS.height * 0.8
        const offsetX = CANVAS_MAPPINGS.width * 0.1, offsetY = CANVAS_MAPPINGS.height * 0.1
        const maxX = Math.max(cdtAtual.A[0], cdtAtual.B[0], cdtAtual.C[0], 0.001)
        const maxY = Math.max(cdtAtual.A[1], cdtAtual.B[1], cdtAtual.C[1], 0.001)
        return {
            A: { x: offsetX + (cdtAtual.A[0] / maxX) * scaleX, y: offsetY + scaleY - (cdtAtual.A[1] / maxY) * scaleY },
            B: { x: offsetX + (cdtAtual.B[0] / maxX) * scaleX, y: offsetY + scaleY - (cdtAtual.B[1] / maxY) * scaleY },
            C: { x: offsetX + (cdtAtual.C[0] / maxX) * scaleX, y: offsetY + scaleY - (cdtAtual.C[1] / maxY) * scaleY },
        }
    }, [cdtAtual])

    const orthic = useMemo(() => calculateOrthicTriangle(currentTriangle), [currentTriangle])
    const orthicBarycenter = useMemo(() => calculateBarycenter(orthic), [orthic])
    const decisionProps = useMemo(() => mapper.toCoordinate(decisionDias, decisionCusto), [mapper, decisionDias, decisionCusto])

    // C10 (K4): Canvas click handler
    const handleCanvasClick = useCallback((canvasPoint: { x: number; y: number }) => {
        const { dias, custo } = mapper.toProjectValues(canvasPoint)
        setDecisionDias(Math.max(0, Math.min(projectDuration, dias)))
        setDecisionCusto(Math.max(0, Math.min(projectCost, custo)))
    }, [mapper, projectDuration, projectCost])

    const custoAtual = curvaCusto.length > 0 ? curvaCusto[curvaCusto.length - 1].y : 0
    // AC-4 Story 3.0-D: percentual_contingencia lido do TAP; fallback setorial via getDefaultContingencia()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setor = (tap as any)?.setor ?? 'geral'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contingenciaPct: number = (tap as any)?.percentual_contingencia ?? getDefaultContingencia(setor)
    // AC-2 Story 3.0-E: limites para banda de contingência de custo
    const orcamentoTotal = orcamentoBase ? Math.round(orcamentoBase * (1 + contingenciaPct / 100)) : null

    const aiContexto = {
        modulo: 'Curva S / Orçamento',
        dados: {
            bac: orcamentoBase,
            contingenciaPct,
            teto: orcamentoBase ? Math.round(orcamentoBase * (1 + contingenciaPct / 100)) : null,
            custoAtual: Math.round(custoAtual),
            olsRate: olsRate?.toFixed(0),
            totalDuration: prazoBase,
        },
        projeto_id: params.projetoId
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-blue-500" />
                    Motor: Orçamento & Curva S
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Custo Acumulado vs Tempo com Linha OLS de Referência</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Métricas financeiras */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">BAC</p>
                            <p className="text-lg font-bold text-slate-200">
                                {orcamentoBase ? `R$ ${(orcamentoBase / 1000000).toFixed(2)}M` : '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teto ({contingenciaPct}%)</p>
                            <p className="text-lg font-bold text-amber-400">
                                {orcamentoTotal ? `R$ ${(orcamentoTotal / 1000000).toFixed(2)}M` : '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">OLS (R$/dia)</p>
                            <p className={`text-lg font-bold ${olsRate !== null ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {olsRate !== null ? `R$ ${Math.round(olsRate).toLocaleString('pt-BR')}` : '—'}
                            </p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl">
                            <p className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider mb-1">Projetado Final</p>
                            <p className="text-lg font-bold text-blue-300">
                                {custoAtual > 0 ? `R$ ${(custoAtual / 1000000).toFixed(2)}M` : '—'}
                            </p>
                        </div>
                    </div>

                    {/* C9 (M3): Curva S real com OLS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Curva S (Custo Acumulado)</h3>
                        {chartData.length > 0 && (orcamentoBase || curvaCusto.length > 0) ? (
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="x" stroke="#64748b" fontSize={11} label={{ value: 'Dias', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }} />
                                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px' }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, '']}
                                        />
                                        <Legend />
                                        {/* AC-2 Story 3.0-E: banda de contingência de custo */}
                                        {orcamentoBase !== null && orcamentoTotal !== null && orcamentoBase < orcamentoTotal && (
                                            <ReferenceArea
                                                y1={orcamentoBase}
                                                y2={orcamentoTotal}
                                                fill="rgba(245,158,11,0.20)"
                                                stroke="none"
                                                label={{ value: 'Zona Amarela — consumindo reserva de contingência', position: 'insideTopRight', fill: '#d97706', fontSize: 9 }}
                                            />
                                        )}
                                        {/* AC-2 Story 3.0-E: linha de teto de orçamento */}
                                        {orcamentoTotal !== null && (
                                            <ReferenceLine
                                                y={orcamentoTotal}
                                                stroke="#ef4444"
                                                strokeDasharray="5 5"
                                                strokeWidth={1.5}
                                                label={{ value: 'Teto de Orçamento', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }}
                                            />
                                        )}
                                        <Line type="monotone" dataKey="custo" stroke="#10b981" strokeWidth={2} dot={false} name="Executado (Real)" />
                                        {/* Story 4.10: linha baseline planejada (distribuição linear do BAC) */}
                                        <Line type="monotone" dataKey="planejado" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Planejado (Baseline)" />
                                        {/* C9 (M3): Linha OLS comparativa */}
                                        <Line type="monotone" dataKey="ols" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false} name="OLS (Referência)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center">
                                <p className="text-slate-500 text-sm">Dados de orçamento e tarefas necessários.</p>
                            </div>
                        )}
                    </div>

                    {/* C10 (K4): Mini TrianglePlotter */}
                    {isMotorReady && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponto de Decisão (CDT)</h3>
                                <span className="text-xs text-slate-500">
                                    {DimensionMapper.formatDias(decisionDias)} / {DimensionMapper.formatCusto(decisionCusto)}
                                </span>
                            </div>
                            <div className="h-[260px]">
                                <TrianglePlotter
                                    original={currentTriangle}
                                    orthic={orthic}
                                    barycenter={orthicBarycenter}
                                    decision={decisionProps}
                                    onCanvasClick={handleCanvasClick}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <AIInsightCard contexto={aiContexto} />
                </div>
            </div>
        </div>
    )
}
