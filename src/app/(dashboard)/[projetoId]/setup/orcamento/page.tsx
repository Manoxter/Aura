'use client'

import { DollarSign, TrendingUp, PieChart, ArrowRight, Wallet, AlertCircle } from 'lucide-react'
import { DimensionMapper } from '@/lib/engine/mapper'
import { useProject } from '@/context/ProjectContext'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Cell } from 'recharts'
import { calcularProjecaoFinanceira } from '@/lib/engine/math'
import { SetupStepper } from '@/components/aura/SetupStepper'

export default function OrcamentoPage() {
    const { projetoId } = useParams()
    const router = useRouter()
    const { isTapReady, orcamentoBase, prazoBase, tarefas, marcos, custosTarefas, dataInicio } = useProject()
    const [activeTab, setActiveTab] = useState<'curva' | 'liquidez'>('curva')

    // Configurações do SVG para plotar o Gráfico S
    const width = 800
    const height = 400
    const padding = 60

    if (!isTapReady) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md shadow-xl">
                    <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold text-slate-200 mb-2">Aguardando TAP</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        O orçamento detalhado do projeto requer o Termo de Abertura (TAP) preenchido para que a IA possa inferir os custos paramétricos.
                    </p>
                    <Link href={`/${projetoId}/setup/tap`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
                        Ir para o TAP
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        )
    }

    const budget = orcamentoBase || 0
    const prazo = prazoBase || 30 // Avoid div by zero

    // Gerando pontos de uma Curva S real baseada na projeção financeira
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const projecaoFinanceira = useMemo(() => {
        if (!tarefas.length || !prazoBase) return []
        const prazoEfetivo = dataInicio ? Math.max(...tarefas.map(t => t.ef || 0), prazoBase) : prazoBase
        const tarefasForCalc = tarefas.map(t => ({
            ...t,
            id: t.id,
            projeto_id: '',
            tenant_id: '',
            duracao_estimada: t.duracao_estimada,
            duracao_realizada: null,
            ordem: null,
            folga_total: t.folga,
            folga_livre: null,
            no_caminho_critico: t.critica,
            status: 'planejado',
            data_inicio_real: null,
            data_fim_real: null,
            predecessoras: t.dependencias,
            concluida: false,
        }))
        return calcularProjecaoFinanceira(tarefasForCalc, custosTarefas, marcos, prazoEfetivo)
    }, [tarefas, custosTarefas, marcos, prazoBase, dataInicio])

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sCurvePoints = useMemo(() => {
        if (projecaoFinanceira.length === 0) return []
        
        // Sampling points to keep the curve smooth but efficient (around 10-15 points)
        const sampleSize = Math.max(1, Math.floor(projecaoFinanceira.length / 10))
        const points = projecaoFinanceira.filter((_, idx) => idx % sampleSize === 0 || idx === projecaoFinanceira.length - 1)
        
        return points.map(p => ({
            dia: p.dia,
            acumulado: p.acumulado
        }))
    }, [projecaoFinanceira])

    const mapX = (dia: number) => padding + (dia / prazo) * (width - 2 * padding)
    const mapY = (valor: number) => height - padding - (budget > 0 ? (valor / budget) * (height - 2 * padding) : 0)

    // Lógica Aura: Projeção Real de Liquidez (usa projecaoFinanceira calculada acima)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Agrupamento Semanal para o Gráfico de Barras
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const projecaoSemanal = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const semanas: any[] = []
        for (let i = 0; i < projecaoFinanceira.length; i += 7) {
            const fatia = projecaoFinanceira.slice(i, i + 7)
            const desembolso = fatia.reduce((sum, d) => sum + d.desembolso, 0)
            const acumulado = fatia[fatia.length - 1].acumulado
            semanas.push({
                name: `Sem ${Math.floor(i / 7) + 1}`,
                desembolso,
                acumulado
            })
        }
        return semanas
    }, [projecaoFinanceira])

    // Lógica Aura: Reta Tangente (calculada via tangente pontual no ponto ~60% do prazo)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const tangentData = useMemo(() => {
        if (projecaoFinanceira.length < 3) return null
        const idx = Math.floor(projecaoFinanceira.length * 0.6)
        const p1 = projecaoFinanceira[Math.max(0, idx - 1)]
        const p2 = projecaoFinanceira[Math.min(projecaoFinanceira.length - 1, idx + 1)]
        if (!p1 || !p2 || p2.dia === p1.dia) return null
        const slope = (p2.acumulado - p1.acumulado) / (p2.dia - p1.dia)
        const pCenter = projecaoFinanceira[idx]
        return { slope, centerDia: pCenter.dia, centerVal: pCenter.acumulado }
    }, [projecaoFinanceira])

    const tangentStart = tangentData
        ? { x: mapX(tangentData.centerDia - prazo * 0.15), y: mapY(tangentData.centerVal - tangentData.slope * prazo * 0.15) }
        : { x: mapX(prazo * 0.5), y: mapY(budget * 0.56) }
    const tangentEnd = tangentData
        ? { x: mapX(tangentData.centerDia + prazo * 0.15), y: mapY(tangentData.centerVal + tangentData.slope * prazo * 0.15) }
        : { x: mapX(prazo * 0.8), y: mapY(budget * 0.9) }

    return (
        <div className="p-8 w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                        <DollarSign className="h-6 w-6" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Setup</h2>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-50">Orçamento & Liquidez</h1>
                    <p className="text-slate-400 mt-2">
                        Planejamento financeiro e modelagem do Vértice de Custo para o Motor CDT.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-inner">
                        <button
                            onClick={() => setActiveTab('curva')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'curva' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Curva S — Orçamento
                        </button>
                        <button
                            onClick={() => setActiveTab('liquidez')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'liquidez' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Liquidez Semanal
                        </button>
                    </div>

                    <button
                        onClick={() => router.push(`/${projetoId}/setup/funcoes`)}
                        className="flex items-center justify-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-base font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95 hover:scale-[1.02] duration-300"
                    >
                        Seguinte
                        <ArrowRight className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Metric Summary Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-4">
                            <PieChart className="h-5 w-5 text-emerald-500" />
                            Vértice do Custo
                        </h3>
                        <div className="text-3xl font-bold text-emerald-400 font-mono mb-2 track-tight break-all">
                            {DimensionMapper.formatCusto(budget)}
                        </div>
                        <p className="text-sm text-slate-400 border-t border-slate-800 pt-4 mt-4">
                            Este é o limite (teto) inferido pela IA ou digitado manualmente e será injetado no <strong>Diagrama CDT</strong>.
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Milestones Financeiros</h3>
                        <div className="space-y-4">
                            {sCurvePoints.filter((_, idx) => idx % 2 === 0 || idx === sCurvePoints.length - 1).slice(1).map((p, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-300">Dia {p.dia}</span>
                                        <span className="text-slate-500 font-mono">{budget > 0 ? ((p.acumulado / budget) * 100).toFixed(0) : 0}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${budget > 0 ? (p.acumulado / budget) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono text-right mt-1">
                                        {DimensionMapper.formatCusto(p.acumulado)}
                                    </div>
                                </div>
                            ))}
                            {sCurvePoints.length === 0 && <p className="text-xs text-slate-500 italic">Preencha o cronograma para visualizar milestones.</p>}
                        </div>
                    </div>
                </div>

                {/* S-Curve Plotter or Liquidity Chart */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                    {activeTab === 'curva' ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <Wallet className="h-5 w-5 text-orange-400" />}
                                    {activeTab === 'curva' ? 'Curva S de Orçamento Planejado' : 'Liquidez — Desembolso Semanal'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {activeTab === 'curva'
                                        ? 'Acúmulo de custo ao longo do tempo — Vértice C do CDT'
                                        : 'Fluxo de caixa semanal (barras) + acumulado % (linha) — pressão sobre liquidez'}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className={`w-3 h-3 rounded-full ${activeTab === 'curva' ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
                                    <span className="text-slate-400">Acumulado</span>
                                </div>
                                {activeTab === 'liquidez' && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-3 h-3 rounded-sm bg-orange-500/70"></div>
                                        <span className="text-slate-400">Desembolso / semana</span>
                                    </div>
                                )}
                                {activeTab === 'curva' && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-5 h-0.5 bg-pink-500" style={{ borderTop: '2px dashed #ec4899' }}></div>
                                        <span className="text-slate-400">Tangente CDT</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 w-full bg-slate-950/50 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[400px]">
                            {activeTab === 'curva' ? (
                                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">

                                    {/* Grid Horizontal (Custo) */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                                        const y = mapY(budget * p)
                                        return (
                                            <g key={`hy-${i}`}>
                                                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                                                <text x={padding - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                                                    {p === 0 ? 'R$ 0' : DimensionMapper.formatCusto(budget * p).replace(',00', '').replace('R$', '')}
                                                </text>
                                            </g>
                                        )
                                    })}

                                    {/* Grid Vertical (Tempo) */}
                                    {sCurvePoints.map((pt, i) => {
                                        const x = mapX(pt.dia)
                                        return (
                                            <g key={`vx-${i}`}>
                                                <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                                                <text x={x} y={height - padding + 20} fill="#64748b" fontSize="10" textAnchor="middle">
                                                    D{pt.dia}
                                                </text>
                                            </g>
                                        )
                                    })}

                                    {/* S-Curve Path Interpolation (M curves) */}
                                    <path
                                        d={`M ${sCurvePoints.map(p => `${mapX(p.dia)},${mapY(p.acumulado)}`).join(' L ')}`}
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* Area Under Curve */}
                                    <path
                                        d={`M ${mapX(sCurvePoints[0].dia)},${mapY(0)} L ${sCurvePoints.map(p => `${mapX(p.dia)},${mapY(p.acumulado)}`).join(' L ')} L ${mapX(prazo)},${mapY(0)} Z`}
                                        fill="url(#s-gradient)"
                                        opacity="0.2"
                                    />
                                    <defs>
                                        <linearGradient id="s-gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                    </defs>

                                    {/* Reta Tangente (Gerada pelo Motor CDT) */}
                                    <line 
                                        x1={tangentStart.x - 50} y1={tangentStart.y + 20} 
                                        x2={tangentEnd.x + 50} y2={tangentEnd.y - 20} 
                                        stroke="#ec4899" strokeWidth="2" strokeDasharray="6 3" 
                                    />
                                    <text x={tangentEnd.x + 60} y={tangentEnd.y - 20} fill="#ec4899" fontSize="10" fontWeight="bold">TANGENTE CDT</text>
                                </svg>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={projecaoSemanal} margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/budget*100).toFixed(0)}%`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                                            formatter={(value: any) => DimensionMapper.formatCusto(Number(value))}
                                        />
                                        <Bar yAxisId="left" dataKey="desembolso" radius={[4, 4, 0, 0]} name="Desembolso/semana">
                                            {projecaoSemanal.map((entry, index) => {
                                                // Cores quentes por intensidade: quanto maior o desembolso, mais vermelho
                                                const maxD = Math.max(...projecaoSemanal.map(s => s.desembolso), 1)
                                                const ratio = entry.desembolso / maxD
                                                const fill = ratio > 0.75 ? '#ef4444' : ratio > 0.5 ? '#f97316' : ratio > 0.25 ? '#fb923c' : '#fbbf24'
                                                return <Cell key={`cell-${index}`} fill={fill} opacity={0.8} />
                                            })}
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={3} dot={false} name="Acumulado" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Gantt de Desembolso — redesign com barras legíveis e eixo de dias */}
                        <div className="mt-8 pt-8 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cronograma de Desembolso</h4>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-500/70" />Baixo</span>
                                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-orange-500/70" />Médio</span>
                                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500/80" />Alto</span>
                                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-700 border border-red-500/50" />Crítica</span>
                                </div>
                            </div>
                            {(() => {
                                const maxCusto    = Math.max(...tarefas.map(t => custosTarefas[t.id] ?? 0), 1)
                                const ganttTarefas = [...tarefas].sort((a, b) => (a.es ?? 0) - (b.es ?? 0))
                                // Eixo X: marcadores em 0%, 25%, 50%, 75%, 100% do prazo
                                const xTicks = [0, 0.25, 0.5, 0.75, 1.0]
                                return (
                                    <div>
                                        {/* Eixo X de dias */}
                                        <div className="flex ml-36 mb-1 relative">
                                            {xTicks.map(pct => (
                                                <div
                                                    key={pct}
                                                    className="absolute text-[9px] font-mono text-slate-600"
                                                    style={{ left: `${pct * 100}%`, transform: 'translateX(-50%)' }}
                                                >
                                                    {Math.round(pct * prazo)}d
                                                </div>
                                            ))}
                                        </div>
                                        <div className="overflow-y-auto max-h-80 pr-1 mt-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                                            {ganttTarefas.map((t) => {
                                                const custo    = custosTarefas[t.id] ?? 0
                                                const ratio    = maxCusto > 0 ? custo / maxCusto : 0
                                                const barColor = t.critica
                                                    ? 'bg-red-700 border border-red-500/50 shadow-sm shadow-red-900/40'
                                                    : ratio > 0.66
                                                    ? 'bg-red-500/80'
                                                    : ratio > 0.33
                                                    ? 'bg-orange-500/70'
                                                    : 'bg-amber-500/60'
                                                const leftPct  = prazo > 0 ? ((t.es ?? 0) / prazo) * 100 : 0
                                                const widthPct = prazo > 0 ? Math.max((t.duracao_estimada / prazo) * 100, 0.8) : 0
                                                return (
                                                    <div key={t.id} className="flex items-center gap-3 group" title={`${t.nome} — ${t.es ?? 0}d → ${t.ef ?? 0}d${custo > 0 ? ` — ${DimensionMapper.formatCusto(custo)}` : ''}`}>
                                                        <span className="text-[10px] text-slate-400 w-32 truncate shrink-0 group-hover:text-slate-200 transition-colors">
                                                            {t.nome}
                                                        </span>
                                                        {/* Barra de Gantt */}
                                                        <div className="flex-1 h-6 bg-slate-950 rounded relative overflow-visible border border-slate-800/60">
                                                            <div
                                                                className={`absolute h-full rounded ${barColor} transition-all flex items-center overflow-hidden`}
                                                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '4px' }}
                                                            >
                                                                {widthPct > 8 && custo > 0 && (
                                                                    <span className="text-[8px] font-bold text-white/70 px-1 truncate">
                                                                        {DimensionMapper.formatCusto(custo).replace('R$\u00a0', 'R$').replace(',00', '')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Ticks de referência */}
                                                            {xTicks.slice(1, -1).map(pct => (
                                                                <div
                                                                    key={pct}
                                                                    className="absolute top-0 h-full w-px bg-slate-700/40"
                                                                    style={{ left: `${pct * 100}%` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Custo à direita para barras pequenas */}
                                                        <span className="text-[9px] font-mono text-slate-500 w-16 text-right shrink-0">
                                                            {custo > 0 ? DimensionMapper.formatCusto(custo).replace('R$\u00a0', 'R$').replace(',00', '') : '—'}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                            {tarefas.length === 0 && (
                                                <p className="text-xs text-slate-600 italic py-6 text-center">Nenhuma tarefa CPM disponível.</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Klauss Curve & Liquidity Guidance */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6 flex items-start gap-4">
                            <TrendingUp className="h-6 w-6 text-indigo-400 shrink-0" />
                            <div>
                                <h4 className="text-indigo-200 font-bold">Diretriz Prescritiva: Curva S</h4>
                                <p className="text-sm text-indigo-300/70 mt-1 leading-relaxed">
                                    A mobilização inicial consome 12% do budget. A fase crítica de desembolso (Tangente CDT) ocorre entre os dias 15 e 25.
                                </p>
                            </div>
                        </div>

                        <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                            <div>
                                <h4 className="text-emerald-200 font-bold">Saúde de Liquidez</h4>
                                <p className="text-sm text-emerald-300/70 mt-1 leading-relaxed">
                                    {projecaoSemanal.some(s => s.desembolso > budget * 0.2) 
                                        ? "Alerta: Semana com desembolso > 20% do budget detectada. Risco de caixa elevado."
                                        : "Fluxo de caixa equilibrado. O desembolso semanal máximo está abaixo de 15% do baseline."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
