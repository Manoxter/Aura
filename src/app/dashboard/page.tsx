"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SetupContinueBanner from "@/components/Onboarding/SetupContinueBanner"
import OnboardingGuard from "@/components/Onboarding/OnboardingGuard"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

// Colunas reais confirmadas via information_schema:
// projetos: id, nome, sponsor, status, criado_em
// orcamentos: teto_tap, cdt_area_baseline  (cdt_area / cdt_area_ortico não existem)

type OrcamentoRow = {
    teto_tap: number | null
    cdt_area_baseline: number | null
}

type ProjetoRow = {
    id: string
    nome: string
    sponsor: string | null
    status: string
    criado_em: string
    orcamentos: OrcamentoRow[]
}

function statusLabel(s: string) {
    const map: Record<string, string> = {
        planejamento: 'Planejamento',
        execucao: 'Em Execução',
        em_andamento: 'Em Andamento',
        concluido: 'Concluído',
        arquivado: 'Arquivado',
    }
    return map[s] ?? s.replace(/_/g, ' ')
}

function statusColor(s: string) {
    if (s === 'execucao' || s === 'em_andamento') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    if (s === 'planejamento') return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    if (s === 'concluido') return 'bg-slate-700/40 text-slate-400 border-slate-600/30'
    return 'bg-slate-800 text-slate-500 border-transparent'
}

function barColor(s: string) {
    if (s === 'execucao' || s === 'em_andamento') return 'bg-emerald-500/70'
    if (s === 'planejamento') return 'bg-blue-500/70'
    if (s === 'concluido') return 'bg-slate-600/70'
    return 'bg-slate-700/70'
}

function ExecDashboardContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [projetos, setProjetos] = useState<ProjetoRow[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        try {
            const { data, error: err } = await supabase
                .from('projetos')
                .select('id, nome, sponsor, status, criado_em, orcamentos(teto_tap, cdt_area_baseline)')
                .order('criado_em', { ascending: false })

            if (err) {
                console.error('[ExecDashboard]', err)
                setError(err.message)
                return
            }
            setProjetos((data ?? []) as ProjetoRow[])
        } catch (err) {
            console.error('[ExecDashboard] Erro inesperado:', err)
            setError('Erro inesperado ao carregar projetos.')
        } finally {
            setLoading(false)
        }
    }

    const fmtBRL = (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

    const totalOrcamento = projetos.reduce((s, p) => s + (p.orcamentos?.[0]?.teto_tap ?? 0), 0)
    const calibrados = projetos.filter(p => p.orcamentos?.[0]?.cdt_area_baseline != null).length
    const semCDT = projetos.filter(p => p.orcamentos?.[0]?.cdt_area_baseline == null)
    const maxBudget = Math.max(...projetos.map(p => p.orcamentos?.[0]?.teto_tap ?? 0), 1)

    const primeiroProjetoId = projetos[0]?.id ?? null

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-sm tracking-widest uppercase animate-pulse">
                Carregando portfólio...
            </div>
        )
    }

    return (
        <OnboardingGuard>
            <div className="min-h-screen bg-black text-white p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-10">
                    <SetupContinueBanner />

                    {/* Header */}
                    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-500 bg-clip-text text-transparent mb-1">
                                Aura Commander
                            </h1>
                            <p className="text-slate-400 text-sm tracking-wide uppercase">Portfólio de Projetos</p>
                        </div>
                        {primeiroProjetoId && (
                            <button
                                onClick={() => router.push(`/${primeiroProjetoId}`)}
                                className="shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition"
                            >
                                ← Voltar ao Projeto
                            </button>
                        )}
                    </header>

                    {/* Erro de API */}
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-sm">
                            <span className="font-bold">Erro ao carregar dados:</span> {error}
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Projetos</p>
                            <p className="text-3xl font-black text-white">{projetos.length}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Portfólio Total</p>
                            <p className="text-3xl font-black text-white">{totalOrcamento > 0 ? fmtBRL(totalOrcamento) : '—'}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 col-span-2 sm:col-span-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">CDT Calibrado</p>
                            <p className="text-3xl font-black text-white">
                                {calibrados}
                                <span className="text-slate-600 text-lg font-medium"> / {projetos.length}</span>
                            </p>
                        </div>
                    </div>

                    {/* Gráfico de Orçamento + Alertas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Barras de orçamento relativo */}
                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                Distribuição de Orçamento por Projeto
                            </h3>
                            {projetos.length === 0 ? (
                                <p className="text-slate-600 text-sm text-center py-12">Nenhum projeto encontrado.</p>
                            ) : (
                                <>
                                    <div className="h-44 flex items-end gap-2 px-2 border-b border-slate-800/50 pb-2">
                                        {projetos.map((p) => {
                                            const budget = p.orcamentos?.[0]?.teto_tap ?? 0
                                            const pct = maxBudget > 0 ? Math.max(4, (budget / maxBudget) * 100) : 4
                                            return (
                                                <div key={p.id} className="flex-1 group relative cursor-pointer" onClick={() => router.push(`/${p.id}`)}>
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all duration-500 hover:brightness-125 ${barColor(p.status)}`}
                                                        style={{ height: `${pct}%` }}
                                                    />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-950 border border-slate-800 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 text-[10px] shadow-2xl pointer-events-none">
                                                        <p className="font-bold text-white">{p.nome}</p>
                                                        <p className="text-indigo-400">{budget > 0 ? fmtBRL(budget) : 'Orçamento pendente'}</p>
                                                        <p className="text-slate-500">{statusLabel(p.status)}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[9px] text-slate-600 uppercase tracking-widest mt-3 text-center font-bold">
                                        Barras proporcionais ao teto TAP — clique para entrar no projeto
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Alertas: projetos sem CDT calibrado */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-5">Pendências CDT</h3>
                                <div className="space-y-3">
                                    {semCDT.slice(0, 4).map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => router.push(`/${p.id}/setup/funcoes`)}
                                            className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl cursor-pointer hover:bg-amber-500/20 transition"
                                        >
                                            <span className="text-amber-400 text-lg shrink-0">⚠</span>
                                            <div>
                                                <p className="text-xs font-bold text-amber-200 truncate max-w-[140px]">{p.nome}</p>
                                                <p className="text-[10px] text-amber-600 uppercase font-bold tracking-tight">CDT não calibrado</p>
                                            </div>
                                        </div>
                                    ))}
                                    {semCDT.length === 0 && calibrados > 0 && (
                                        <div className="py-10 text-center text-slate-600">
                                            <p className="text-sm font-bold uppercase tracking-widest">Todos calibrados ✓</p>
                                        </div>
                                    )}
                                    {projetos.length === 0 && (
                                        <div className="py-10 text-center text-slate-600">
                                            <p className="text-sm">Nenhum projeto ainda.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-6 font-medium">
                                CDT calibrado = área baseline registrada após execução das Funções Motor.
                            </p>
                        </div>
                    </div>

                    {/* Tabela */}
                    <section>
                        <h2 className="text-sm font-bold mb-4 text-slate-200 uppercase tracking-widest flex items-center gap-3">
                            Visão Geral do Portfólio
                            <div className="flex-grow h-px bg-gradient-to-r from-slate-800 to-transparent" />
                        </h2>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/80 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <th className="p-4 border-b border-slate-800">Projeto</th>
                                        <th className="p-4 border-b border-slate-800">Status</th>
                                        <th className="p-4 border-b border-slate-800">Orçamento (TAP)</th>
                                        <th className="p-4 border-b border-slate-800">CDT</th>
                                        <th className="p-4 border-b border-slate-800 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {projetos.map(p => {
                                        const orc = p.orcamentos?.[0] ?? null
                                        const cdtOk = orc?.cdt_area_baseline != null
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-800/40 transition duration-200">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-sm">{p.nome}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-wider">
                                                        {p.sponsor ?? new Date(p.criado_em).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${statusColor(p.status)}`}>
                                                        {statusLabel(p.status)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-300 font-medium text-sm">
                                                    {orc?.teto_tap ? fmtBRL(orc.teto_tap) : <span className="text-slate-600 font-mono text-xs">Pendente</span>}
                                                </td>
                                                <td className="p-4">
                                                    {cdtOk ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Calibrado</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pendente</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => router.push(`/${p.id}`)}
                                                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition hover:bg-indigo-500/10 px-4 py-2 rounded-lg"
                                                    >
                                                        ENTRAR →
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {projetos.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center">
                                                <div className="text-slate-600 mb-2 font-bold uppercase tracking-widest text-sm">Portfólio vazio</div>
                                                <p className="text-slate-500 text-xs">Nenhum projeto encontrado. Crie um para começar.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </OnboardingGuard>
    )
}

export default function ExecDashboardPage() {
    return (
        <ErrorBoundary>
            <ExecDashboardContent />
        </ErrorBoundary>
    )
}
