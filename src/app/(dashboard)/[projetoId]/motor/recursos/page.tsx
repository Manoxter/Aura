'use client'

import { useMemo } from 'react'
import { Users, AlertTriangle, TrendingUp, Calendar, Activity } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'

interface DiaAlocacao {
    dia: number
    ativas: number
    label: string
    pico: boolean
}

export default function RecursosPage({ params }: { params: { projetoId: string } }) {
    const { tarefas, prazoBase, isMotorReady } = useProject()

    // Agrupa tarefas por responsavel
    const responsaveis = useMemo(() => {
        const map: Record<string, number> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tarefas.forEach((t: any) => {
            const resp = t.responsavel || 'Não atribuído'
            map[resp] = (map[resp] || 0) + 1
        })
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .map(([nome, count]) => ({ nome, count }))
    }, [tarefas])

    // Histograma de carga: para cada dia, conta tarefas ativas (es <= dia < ef)
    const histograma: DiaAlocacao[] = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        const step = Math.max(1, Math.floor(prazoBase / 60))
        const pontos: DiaAlocacao[] = []

        for (let dia = 0; dia <= prazoBase; dia += step) {
            const ativas = tarefas.filter(t => {
                const es = t.es ?? 0
                const ef = t.ef ?? 0
                return dia >= es && dia < ef
            }).length
            pontos.push({
                dia,
                ativas,
                label: `D${dia}`,
                pico: false,
            })
        }

        // Marca picos (acima de 75% do máximo)
        const maxAtivas = Math.max(...pontos.map(p => p.ativas), 1)
        pontos.forEach(p => { p.pico = p.ativas >= maxAtivas * 0.75 })

        return pontos
    }, [tarefas, prazoBase])

    // Estatísticas
    const maxCarga = useMemo(() => Math.max(...histograma.map(p => p.ativas), 0), [histograma])
    const mediaCarga = useMemo(() => {
        if (histograma.length === 0) return 0
        return histograma.reduce((s, p) => s + p.ativas, 0) / histograma.length
    }, [histograma])
    const diasCriticos = useMemo(() => histograma.filter(p => p.pico).length, [histograma])
    const totalTarefas = tarefas.length

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        const d = payload[0].payload as DiaAlocacao
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl">
                <p className="font-bold text-white mb-1">{d.label}</p>
                <p className="text-slate-300">Tarefas ativas: <span className="font-bold text-blue-400">{d.ativas}</span></p>
                {d.pico && <p className="text-amber-400 font-bold mt-1">⚠ Pico de carga</p>}
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    Motor: Recursos
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Histogramas de Alocação e Carga de Trabalho</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Tarefas</p>
                            <p className="text-2xl font-black text-white">{totalTarefas}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pico de Carga</p>
                            <p className="text-2xl font-black text-amber-400">{maxCarga}</p>
                            <p className="text-xs text-slate-500">tarefas/dia</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Média</p>
                            <p className="text-2xl font-black text-blue-400">{mediaCarga.toFixed(1)}</p>
                            <p className="text-xs text-slate-500">tarefas/dia</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Dias Pico</p>
                            <p className="text-2xl font-black text-rose-400">{diasCriticos}</p>
                            <p className="text-xs text-slate-500">≥75% do pico</p>
                        </div>
                    </div>

                    {/* Histograma de carga */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center gap-2 mb-5">
                            <Activity className="h-4 w-4 text-blue-400" />
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                Histograma de Carga — Tarefas Ativas por Dia
                            </h2>
                        </div>

                        {!isMotorReady || histograma.length === 0 ? (
                            <div className="h-[300px] flex flex-col items-center justify-center text-center gap-3">
                                <Calendar className="h-10 w-10 text-slate-700" />
                                <p className="text-slate-500 text-sm">Configure o CPM para visualizar a carga de trabalho.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={histograma} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barSize={Math.max(2, Math.floor(600 / histograma.length))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} interval={Math.floor(histograma.length / 8)} />
                                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <ReferenceLine y={mediaCarga} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Média', fill: '#3b82f6', fontSize: 10 }} />
                                    <Bar dataKey="ativas" radius={[2, 2, 0, 0]}>
                                        {histograma.map((entry, i) => (
                                            <Cell key={i} fill={entry.pico ? '#f59e0b' : '#3b82f6'} fillOpacity={entry.pico ? 1 : 0.7} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                        <p className="text-xs text-slate-600 mt-3">
                            Barras amarelas = picos de carga (≥75% do máximo). Linha azul tracejada = carga média.
                        </p>
                    </div>

                    {/* Distribuição por responsável */}
                    {responsaveis.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                    Distribuição por Responsável
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {responsaveis.map((r, i) => {
                                    const pct = totalTarefas > 0 ? (r.count / totalTarefas) * 100 : 0
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-28 text-xs text-slate-400 truncate shrink-0">{r.nome}</div>
                                            <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-blue-600 transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="text-xs font-mono text-slate-300 w-16 text-right shrink-0">
                                                {r.count} ({pct.toFixed(0)}%)
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {!isMotorReady && (
                        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
                            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                            <p className="text-amber-300">
                                Configure as tarefas CPM (ES/EF) no Setup para habilitar o histograma de recursos.
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <AIInsightCard
                        contexto={{
                            modulo: 'Recursos',
                            dados: {
                                total_tarefas: totalTarefas,
                                pico_carga: maxCarga,
                                media_carga: mediaCarga,
                                dias_pico: diasCriticos,
                                responsaveis: responsaveis.length,
                            },
                            projeto_id: params.projetoId
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
