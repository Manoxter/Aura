'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart2, TrendingDown, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts'
import { gerarTrianguloCDT, calcularProjecaoFinanceira, calcularIQ } from '@/lib/engine/math'

// Colunas reais confirmadas via information_schema: criado_em, lados (JSONB), area_baseline, motivo, versao
// lados_ta / area_ta / area_tm não existem — removidos para evitar 400 na query
interface VersaoSnapshot {
    criado_em: string
    lados: { E_antes: number; P_antes: number; O_antes: number; E_depois: number; P_depois: number; O_depois: number } | null
    area_baseline: number | null
    motivo: string | null
    versao: number
}

interface RazaoPoint {
    data: string
    iq: number
    area_tm: number
    versao: number
    motivo: string | null
}

function getZona(iq: number): string {
    if (iq >= 95) return 'OTIMO'
    if (iq >= 80) return 'SEGURO'
    if (iq >= 60) return 'RISCO'
    return 'CRISE'
}

function ZonaBadge({ zona }: { zona: string }) {
    const cores: Record<string, string> = {
        OTIMO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        SEGURO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        RISCO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        CRISE: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cores[zona] ?? cores.SEGURO}`}>
            {zona}
        </span>
    )
}

export default function MonitorRazaoPage() {
    const { projetoId } = useParams()
    const { tarefas, prazoBase, custosTarefas, marcos, isMotorReady, orcamentoBase } = useProject()
    const [versoes, setVersoes] = useState<VersaoSnapshot[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projetoId) return
        async function load() {
            setLoading(true)
            const { data } = await supabase
                .from('triangulo_matriz_versoes')
                .select('criado_em, lados, area_baseline, motivo, versao')
                .eq('projeto_id', projetoId as string)
                .order('criado_em', { ascending: true })
            setVersoes((data as VersaoSnapshot[]) ?? [])
            setLoading(false)
        }
        load()
    }, [projetoId])

    const cdtAtual = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
        const step = Math.max(1, Math.floor(prazoBase / 50))
        const curvaPrazo: { x: number; y: number }[] = []
        for (let dia = 0; dia <= prazoBase; dia += step) {
            const prog = (tarefas.filter(t => (t.ef || 0) <= dia).length / tarefas.length) * 100
            curvaPrazo.push({ x: dia, y: prog })
        }
        if (curvaPrazo.length > 0 && curvaPrazo[curvaPrazo.length - 1].x < prazoBase) {
            curvaPrazo.push({ x: prazoBase, y: 100 })
        }
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [tarefas, prazoBase, custosTarefas, marcos, orcamentoBase])

    // Histórico mostra evolução do área_baseline (TM antes de cada aditivo).
    // area_ta histórica não é armazenada por versão — IQ em tempo real via cdtAtual.
    const serieIQ: RazaoPoint[] = useMemo(() => {
        const pontos = versoes
            .filter(v => v.area_baseline != null && (v.area_baseline ?? 0) > 0)
            .map(v => {
                const areaTm = v.area_baseline ?? 0
                const areaAtual = cdtAtual?.cdt_area ?? areaTm
                const iq = areaTm > 0 ? Math.min(100, (areaAtual / areaTm) * 100) : 0
                return {
                    data: new Date(v.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    iq: Math.round(iq * 10) / 10,
                    area_tm: Math.round(areaTm * 10000) / 10000,
                    versao: v.versao,
                    motivo: v.motivo,
                }
            })

        // Ponto sintético de baseline: quando não há histórico mas o CDT está calculado,
        // mostra o TM atual como referência inicial (IQ = 100% = estado ideal).
        if (pontos.length === 0 && cdtAtual && cdtAtual.cdt_area > 0) {
            pontos.push({
                data: 'Baseline',
                iq: 100,
                area_tm: Math.round(cdtAtual.cdt_area * 10000) / 10000,
                versao: 0,
                motivo: 'Baseline inicial — sem aditivos registrados.',
            })
        }

        return pontos
    }, [versoes, cdtAtual])

    const iqAtual = cdtAtual
        ? calcularIQ(cdtAtual.cdt_area, cdtAtual.cdt_area_baseline ?? cdtAtual.cdt_area)
        : null
    const zonaAtual = iqAtual != null ? getZona(iqAtual) : null
    const iqInicial = serieIQ[0]?.iq ?? null
    const iqFinal = serieIQ[serieIQ.length - 1]?.iq ?? null
    const tendencia = iqInicial != null && iqFinal != null ? iqFinal - iqInicial : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        const d = payload[0].payload as RazaoPoint
        const zona = getZona(d.iq)
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl">
                <p className="font-bold text-white mb-1">v{d.versao} — {d.data}</p>
                <p className="text-slate-300">IQ: <span className="font-mono font-bold">{d.iq.toFixed(1)}%</span></p>
                <p className="text-slate-400">Área TM: {d.area_tm.toFixed(4)}</p>
                {d.motivo && <p className="text-slate-500 mt-1 max-w-[200px] truncate">{d.motivo}</p>}
                <div className="mt-1"><ZonaBadge zona={zona} /></div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <BarChart2 className="h-8 w-8 text-blue-500" />
                    Monitor de Razão Geométrica
                </h1>
                <p className="text-slate-400 mt-2 font-medium">
                    Degradação do Índice de Qualidade (IQ = TA/TM) ao longo das versões do projeto
                </p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">IQ Atual</p>
                    {iqAtual != null ? (
                        <>
                            <p className="text-3xl font-black text-white">{iqAtual.toFixed(1)}<span className="text-base text-slate-400 font-normal">%</span></p>
                            <div className="mt-2">{zonaAtual && <ZonaBadge zona={zonaAtual} />}</div>
                        </>
                    ) : (
                        <p className="text-2xl font-black text-slate-600">—</p>
                    )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Versões</p>
                    <p className="text-3xl font-black text-white">{versoes.length}</p>
                    <p className="text-xs text-slate-500 mt-2">snapshots históricos</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tendência IQ</p>
                    {tendencia != null ? (
                        <div className="flex items-center gap-2">
                            {tendencia >= 0
                                ? <TrendingUp className="h-6 w-6 text-emerald-400" />
                                : <TrendingDown className="h-6 w-6 text-red-400" />
                            }
                            <p className={`text-2xl font-black ${tendencia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tendencia > 0 ? '+' : ''}{tendencia.toFixed(1)}%
                            </p>
                        </div>
                    ) : (
                        <p className="text-2xl font-black text-slate-600">—</p>
                    )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Área TA atual</p>
                    {cdtAtual ? (
                        <>
                            <p className="text-2xl font-black text-white font-mono">{cdtAtual.cdt_area.toFixed(4)}</p>
                            <p className="text-xs text-slate-500 mt-2">unidades adimensionais</p>
                        </>
                    ) : (
                        <p className="text-2xl font-black text-slate-600">—</p>
                    )}
                </div>
            </div>

            {/* Gráfico IQ Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Evolução do IQ = Área(TA) / Área(TM) × 100
                </h2>
                {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="animate-pulse text-slate-500 text-sm">Carregando histórico...</div>
                    </div>
                ) : serieIQ.length === 0 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center gap-3">
                        <Clock className="h-10 w-10 text-slate-700" />
                        <p className="text-slate-500 text-sm">CPM não calculado — sem dados para o monitor.</p>
                        <p className="text-slate-600 text-xs max-w-sm">
                            Calcule o CPM no painel Tarefas e Diagramas para ativar o Monitor de Razão.
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={serieIQ} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="data" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis domain={[0, 110]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={95} stroke="#22c55e" strokeDasharray="4 4" />
                            <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="4 4" />
                            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" />
                            <Line
                                type="monotone"
                                dataKey="iq"
                                name="IQ (%)"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Tabela de versões */}
            {!loading && serieIQ.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Histórico de Versões</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Versão</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                                    <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">Área TM (Baseline)</th>
                                    <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase">IQ</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Zona</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serieIQ.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-4 font-mono text-slate-300">v{p.versao}</td>
                                        <td className="py-3 px-4 text-slate-400">{p.data}</td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-300">{p.area_tm.toFixed(4)}</td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-white">{p.iq.toFixed(1)}%</td>
                                        <td className="py-3 px-4 text-center"><ZonaBadge zona={getZona(p.iq)} /></td>
                                        <td className="py-3 px-4 text-slate-500 text-xs max-w-[180px] truncate">{p.motivo ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isMotorReady && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                    <p className="text-amber-300">
                        O Motor CDT ainda não foi ativado. Configure tarefas CPM e orçamento no Setup para habilitar o Monitor de Razão.
                    </p>
                </div>
            )}
        </div>
    )
}
