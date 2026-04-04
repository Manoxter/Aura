'use client'

import { useMemo } from 'react'
import { FileBarChart, Printer, ExternalLink, Activity, DollarSign, Clock, Shield } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { useParams, useRouter } from 'next/navigation'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { gerarTrianguloCDT, calcularProjecaoFinanceira, calcularConfiancaMonteCarlo } from '@/lib/engine/math'

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0">
            <span className="text-sm text-slate-400">{label}</span>
            <div className="text-right">
                <span className="text-sm font-bold text-slate-100">{value}</span>
                {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
        </div>
    )
}

export default function RelatoriosPage({ params }: { params: { projetoId: string } }) {
    const { projetoId } = useParams()
    const router = useRouter()
    const { tap, tarefas, prazoBase, custosTarefas, marcos, orcamentoBase, isMotorReady } = useProject()

    const cdtAtual = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return null
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
            const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
            const step = Math.max(1, Math.floor(prazoBase / 50))
            const curvaPrazo: { x: number; y: number }[] = []
            for (let dia = 0; dia <= prazoBase; dia += step) {
                const prog = (tarefas.filter(t => (t.ef || 0) <= dia).length / tarefas.length) * 100
                curvaPrazo.push({ x: dia, y: prog })
            }
            if (curvaPrazo.length > 0 && curvaPrazo[curvaPrazo.length - 1].x < prazoBase) curvaPrazo.push({ x: prazoBase, y: 100 })
            if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
            return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
        } catch { return null }
    }, [tarefas, prazoBase, custosTarefas, marcos, orcamentoBase])

    const monteCarlo = useMemo(() => cdtAtual ? calcularConfiancaMonteCarlo(cdtAtual) : null, [cdtAtual])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tarefasCriticas = tarefas.filter((t: any) => t.folga_total === 0 || t.is_critica)
    const custoTotal = useMemo(() => {
        return Object.values(custosTarefas).reduce((s, v) => s + (v || 0), 0)
    }, [custosTarefas])

    const zonaColor: Record<string, string> = {
        OTIMO: 'text-emerald-400',
        SEGURO: 'text-blue-400',
        RISCO: 'text-amber-400',
        CRISE: 'text-red-400',
    }

    function abrirRelatorioCompleto() {
        router.push(`/${projetoId}/report`)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <FileBarChart className="h-8 w-8 text-blue-500" />
                    Relatórios & Auditoria
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Resumo executivo e geração de relatório estratégico PDF</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <Activity className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Zona MATED</p>
                            <p className={`text-lg font-black ${zonaColor[cdtAtual?.zona_mated ?? ''] ?? 'text-slate-600'}`}>
                                {cdtAtual?.zona_mated ?? '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <Shield className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Resiliência</p>
                            <p className="text-lg font-black text-white">
                                {monteCarlo ? `${monteCarlo.confianca.toFixed(1)}%` : '—'}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <Clock className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Prazo Base</p>
                            <p className="text-lg font-black text-white">{prazoBase ? `${prazoBase}d` : '—'}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <DollarSign className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Orçamento</p>
                            <p className="text-lg font-black text-white">
                                {orcamentoBase ? `R$${(orcamentoBase / 1000).toFixed(0)}k` : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Resumo do Projeto */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                            Resumo Executivo
                        </h2>
                        <StatRow label="Projeto" value={tap?.nome_projeto ?? '—'} />
                        <StatRow label="Total de Tarefas" value={String(tarefas.length)} sub={`${tarefasCriticas.length} no caminho crítico`} />
                        <StatRow label="Prazo Total" value={prazoBase ? `${prazoBase} dias` : '—'} />
                        <StatRow label="Orçamento Base" value={orcamentoBase ? `R$ ${orcamentoBase.toLocaleString('pt-BR')}` : '—'} />
                        <StatRow label="Custo Distribuído" value={custoTotal > 0 ? `R$ ${custoTotal.toLocaleString('pt-BR')}` : '—'} sub="soma de custos por tarefa" />
                        <StatRow label="Distância MATED" value={cdtAtual ? cdtAtual.mated_distancia.toFixed(4) : '—'} />
                        <StatRow label="Índice de Confiança" value={monteCarlo ? `${monteCarlo.confianca.toFixed(1)}%` : '—'} sub="Monte Carlo 1000 iterações" />
                        <StatRow label="Lado Orçamento (C)" value={cdtAtual ? cdtAtual.lados.orcamento.toFixed(4) : '—'} />
                        <StatRow label="Lado Prazo (P)" value={cdtAtual ? cdtAtual.lados.prazo.toFixed(4) : '—'} />
                    </div>

                    {/* Ações */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Gerar Relatório
                        </h2>
                        <p className="text-slate-400 text-sm">
                            O Relatório Estratégico completo inclui o triângulo CDT, análise Monte Carlo, KPIs de intensidade
                            e rastro de auditoria — pronto para imprimir como PDF.
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={abrirRelatorioCompleto}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Abrir Relatório Completo
                            </button>
                            <button
                                onClick={() => { router.push(`/${projetoId}/report`); setTimeout(() => window.print(), 1000) }}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium px-5 py-3 rounded-xl transition-colors"
                            >
                                <Printer className="h-4 w-4" />
                                Imprimir / Salvar PDF
                            </button>
                        </div>
                        {!isMotorReady && (
                            <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                ⚠ Motor CDT não ativado — configure tarefas CPM e orçamento para relatório completo.
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <AIInsightCard
                        contexto={{
                            modulo: 'Relatórios',
                            dados: {
                                zona_mated: cdtAtual?.zona_mated,
                                mated: cdtAtual?.mated_distancia,
                                confianca: monteCarlo?.confianca,
                                total_tarefas: tarefas.length,
                                tarefas_criticas: tarefasCriticas.length,
                            },
                            projeto_id: params.projetoId
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
