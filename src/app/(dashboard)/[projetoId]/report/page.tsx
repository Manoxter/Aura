'use client'

import React, { useMemo } from 'react'
import { CDTCanvas } from '@/components/aura/CDTCanvas'
import { useProject } from '@/context/ProjectContext'
import { Activity, ShieldCheck, TrendingDown, Clock, DollarSign, FileText, Printer } from 'lucide-react'
import { calcularConfiancaMonteCarlo, gerarTrianguloCDT, calcularProjecaoFinanceira, type CDTResult } from '@/lib/engine/math'

export default function ReportPage({ params }: { params: { projetoId: string } }) {
    const { tap, loading, tenantId, tarefas, prazoBase, custosTarefas, marcos, dataInicio, dataInicioReal, orcamentoBase } = useProject()

    const diaAtualProjeto = useMemo(() => {
        const dataParaCalculo = dataInicioReal || dataInicio
        if (!dataParaCalculo) return 0
        const inicio = new Date(dataParaCalculo)
        const hoje   = new Date()
        const diffMs = Math.max(0, hoje.getTime() - inicio.getTime())
        return Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }, [dataInicio, dataInicioReal])

    const curvaCusto = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map((p: { dia: number; acumulado: number }) => ({ x: p.dia, y: p.acumulado }))
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

    const cdtData: CDTResult | null = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: diaAtualProjeto ?? 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [curvaCusto, curvaPrazo, diaAtualProjeto, orcamentoBase, prazoBase])

    const monteCarlo = useMemo(() => {
        if (!cdtData) return null
        return calcularConfiancaMonteCarlo(cdtData)
    }, [cdtData])

    if (loading) return <div className="p-20 text-center animate-pulse">Gerando relatório...</div>

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0">
            {/* Header / Brand */}
            <header className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 font-black text-2xl tracking-tighter uppercase">
                        <Activity className="h-8 w-8 text-blue-600" /> Aura v6.1 Strategic
                    </div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Klauss Executive Briefing</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase">Documento ID</p>
                    <p className="text-sm font-mono font-bold">RPT-{params.projetoId.slice(0, 8).toUpperCase()}-2026</p>
                    <button 
                        onClick={() => window.print()}
                        className="mt-2 flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all print:hidden"
                    >
                        <Printer className="h-3 w-3" /> Imprimir / PDF
                    </button>
                </div>
            </header>

            {/* Project Info */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                <div className="space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Metadados do Projeto</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-100 py-1">
                            <span className="text-sm font-medium text-slate-600">Projeto</span>
                            <span className="text-sm font-bold text-slate-900">{tap?.nome_projeto || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1">
                            <span className="text-sm font-medium text-slate-600">Tenant ID</span>
                            <span className="text-sm font-mono font-bold text-slate-900 uppercase">{tenantId?.slice(0, 8) || 'GLOBAL'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 py-1">
                            <span className="text-sm font-medium text-slate-600">Data de Geração</span>
                            <span className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Índice de Resiliência (Monte Carlo)</h3>
                    <div className="text-5xl font-black text-blue-600">{monteCarlo?.confianca.toFixed(1) ?? '—'}%</div>
                    <p className="text-[10px] font-bold text-slate-500 mt-2 max-w-[200px]">
                        Probabilidade de manter o equilíbrio geométrico sob variação estocástica.
                    </p>
                </div>
            </section>

            {/* Geometry Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                <div className="space-y-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Estado Geométrico (CDT)</h2>
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
                        {cdtData ? (
                            <CDTCanvas cdt={cdtData} className="scale-90" />
                        ) : (
                            <p className="text-slate-400 text-sm">Dados insuficientes para geometria CDT</p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">KPIs de Intensidade</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Eixo Escopo (E)</p>
                                <p className="text-xl font-bold text-slate-900">1.000 <span className="text-xs text-slate-500 font-normal">Baseline</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Eixo Orçamento (O)</p>
                                <p className="text-xl font-bold text-slate-900">{cdtData?.lados.orcamento.toFixed(3) ?? '—'} <span className="text-xs text-amber-600 font-bold tracking-tighter">{cdtData ? (cdtData.lados.orcamento > 1.5 ? 'Strain Critical' : cdtData.lados.orcamento > 1.2 ? 'Strain High' : 'Nominal') : ''}</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-2xl">
                            <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Eixo Prazo (P)</p>
                                <p className="text-xl font-bold text-slate-900">{cdtData?.lados.prazo.toFixed(3) ?? '—'} <span className="text-xs text-rose-600 font-bold tracking-tighter">{cdtData ? (cdtData.lados.prazo > 1.5 ? 'Stress Critical' : cdtData.lados.prazo > 1.2 ? 'Stress High' : 'Nominal') : ''}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Prescriptive Insights */}
            <section className="bg-slate-900 p-8 rounded-3xl text-white mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="h-6 w-6 text-blue-400" />
                    <h2 className="text-lg font-bold">Klauss Prescription & Audit Trail</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300 leading-relaxed italic">
                            {cdtData
                                ? `"Distância MATED atual: ${cdtData.mated_distancia.toFixed(3)} — Zona ${cdtData.zona_mated}. Resiliência Monte Carlo: ${monteCarlo?.confianca.toFixed(1) ?? '—'}%."`
                                : '"Dados insuficientes para análise prescritiva. Configure TAP, EAP e CPM para ativar o briefing."'}
                        </p>
                        {cdtData && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg w-fit">
                                <TrendingDown className="h-3 w-3 text-blue-400" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-300">
                                    Zona: {cdtData.zona_mated} · Confiança: {monteCarlo?.confianca.toFixed(1) ?? '—'}%
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4 border-l border-slate-800 pl-8">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Estado do Motor</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-mono">Forma CDT</span>
                                <span className="font-bold text-white">{cdtData?.forma_triangulo ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-mono">CEt válida</span>
                                <span className="font-bold text-white">{cdtData ? (cdtData.cet.valida ? 'Sim' : 'Não') : '—'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-mono">Área CDT</span>
                                <span className="font-bold text-white">{cdtData?.cdt_area.toFixed(4) ?? '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Aura Strategic Intelligence | Generated by AIOX Master</p>
                <p className="text-[9px] font-mono text-slate-500">Hash: {params.projetoId.slice(0, 16)}</p>
            </footer>
        </div>
    )
}
