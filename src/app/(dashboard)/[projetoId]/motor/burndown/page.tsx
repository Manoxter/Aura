'use client'

import { useMemo, useCallback, useState } from 'react'
import { TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, ReferenceLine } from 'recharts'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { TrianglePlotter } from '@/components/motor/TrianglePlotter'
import { Triangle, calculateOrthicTriangle, calculateBarycenter } from '@/lib/engine/triangle-logic'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { evaluateDecision } from '@/lib/engine/euclidian'
import { DimensionMapper } from '@/lib/engine/mapper'
import { regressaoOLS, gerarTrianguloCDT, calcularProjecaoFinanceira } from '@/lib/engine/math'
import { useProject } from '@/context/ProjectContext'

const CANVAS_MAPPINGS = { width: 600, height: 400 }

export default function BurndownPage({ params }: { params: { projetoId: string } }) {
    const { tarefas, prazoBase, orcamentoBase, custosTarefas, marcos, isMotorReady, tap } = useProject()

    const projectDuration = prazoBase || 1
    const projectCost = orcamentoBase || 1

    // C10 (K4): SVGPoint — decisão clicável no canvas
    const [decisionDias, setDecisionDias] = useState<number>(Math.floor(projectDuration * 0.5))
    const [decisionCusto, setDecisionCusto] = useState<number>(Math.floor(projectCost * 0.5))

    const mapper = useMemo(() => {
        return new DimensionMapper({ totalCost: projectCost, totalDuration: projectDuration }, CANVAS_MAPPINGS)
    }, [projectCost, projectDuration])

    // C9 (M3): Burndown real baseado em EF das tarefas CPM
    const burndownData = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        const T = prazoBase
        const totalWork = tarefas.reduce((s, t) => s + (t.duracao_estimada || 0), 0) || 1
        const keyTimes = Array.from(new Set([0, ...tarefas.map(t => t.ef), T])).sort((a, b) => a - b)
        return keyTimes.map(t => {
            const done = tarefas.filter(task => task.ef <= t).reduce((s, task) => s + (task.duracao_estimada || 0), 0)
            return { x: t, y: parseFloat((Math.max(0, (1 - done / totalWork) * 100)).toFixed(1)) }
        })
    }, [tarefas, prazoBase])

    // C9 (M3): OLS sobre o burndown real — clamped [0,100] para evitar quebra visual
    const olsLine = useMemo(() => {
        if (burndownData.length < 2) return []
        const { a, b } = regressaoOLS(burndownData)
        return burndownData.map(p => ({
            x: p.x,
            ols: parseFloat(Math.max(0, Math.min(100, a * p.x + b)).toFixed(1))
        }))
    }, [burndownData])

    // Merge burndown + OLS para o chart
    const chartData = useMemo(() => {
        return burndownData.map((p, i) => ({ ...p, ols: olsLine[i]?.ols ?? null }))
    }, [burndownData, olsLine])

    const olsRate = useMemo(() => {
        if (burndownData.length < 2) return null
        const { a } = regressaoOLS(burndownData)
        return a
    }, [burndownData])

    // C10 (K4): CDT para o TrianglePlotter
    const curvaCusto = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map(p => ({ x: p.dia, y: p.acumulado }))
    }, [tarefas, custosTarefas, marcos, prazoBase])

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

    // AC-4 Story 3.0-E: caminho crítico do TAP para banda de prazo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caminhoCritico: number | null = (tap as any)?.caminho_critico_baseline_dias ?? null

    const aiContexto = {
        modulo: 'Função Prazo',
        dados: {
            totalDuration: prazoBase,
            totalCost: orcamentoBase,
            olsRate: olsRate?.toFixed(3),
            tarefasCriticas: tarefas.filter(t => t.critica).length,
            tarefasTotal: tarefas.length,
        },
        projeto_id: params.projetoId
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <TrendingDown className="h-8 w-8 text-blue-500" />
                    Motor: Função Prazo (Burndown)
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Escopo Remanescente vs Tempo (CPM/EF) com Linha OLS</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* C9 (M3): Burndown real com OLS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Burndown CPM</h3>
                            {olsRate !== null && (
                                <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${olsRate < 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    OLS: {olsRate.toFixed(3)}% /dia
                                </span>
                            )}
                        </div>
                        {chartData.length > 0 ? (
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="x" stroke="#64748b" fontSize={11} label={{ value: 'Dias', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }} />
                                        <YAxis stroke="#64748b" fontSize={11} label={{ value: 'Escopo Rem. (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px' }} />
                                        <Legend />
                                        {/* AC-1 Story 3.0-E: banda de contingência de prazo */}
                                        {caminhoCritico !== null && prazoBase && caminhoCritico < prazoBase && (
                                            <ReferenceArea
                                                x1={caminhoCritico}
                                                x2={prazoBase}
                                                fill="rgba(245,158,11,0.20)"
                                                stroke="none"
                                                label={{ value: 'Zona Amarela — consumindo folga de prazo', position: 'insideTopRight', fill: '#d97706', fontSize: 9 }}
                                            />
                                        )}
                                        {/* AC-1 Story 3.0-E: linha de teto de prazo (CPM baseline) */}
                                        {prazoBase && (
                                            <ReferenceLine
                                                x={prazoBase}
                                                stroke="#ef4444"
                                                strokeWidth={1.5}
                                                label={{ value: `Deadline (${prazoBase}d)`, position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }}
                                            />
                                        )}
                                        <Line type="stepAfter" dataKey="y" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} name="Burndown Real" />
                                        {/* C9 (M3): Linha OLS comparativa */}
                                        <Line type="monotone" dataKey="ols" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false} name="OLS (Referência)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center">
                                <p className="text-slate-500 text-sm">Dados CPM necessários para gerar burndown.</p>
                            </div>
                        )}
                    </div>

                    {/* C10 (K4): Mini TrianglePlotter para SVGPoint */}
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
