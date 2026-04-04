'use client'

// CausalBreakdown.tsx — Story 5.8
// Exibe top 3 causas raiz do MATED com barras visuais

import type { CausalResult } from '@/lib/engine/causal-analysis'

const DIMENSAO_LABEL: Record<'E' | 'P' | 'O', { label: string; color: string }> = {
    E: { label: 'Escopo', color: 'bg-blue-500' },
    P: { label: 'Prazo', color: 'bg-amber-500' },
    O: { label: 'Orçamento', color: 'bg-rose-500' },
}

interface CausalBreakdownProps {
    causas: CausalResult[]
    /** Título exibido acima do breakdown */
    titulo?: string
}

export function CausalBreakdown({ causas, titulo = 'Top Causas Raiz — Caminho Crítico' }: CausalBreakdownProps) {
    if (causas.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-500 text-sm">Nenhuma tarefa crítica encontrada</p>
            </div>
        )
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
            {causas.map((causa, idx) => {
                const dim = DIMENSAO_LABEL[causa.dimensao]
                const pct = causa.contribuicao_mated.toFixed(1)
                return (
                    <div key={causa.tarefaId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-slate-500 font-mono text-xs w-4 flex-shrink-0">
                                    #{idx + 1}
                                </span>
                                <span className="text-white font-medium truncate">{causa.nome}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold text-white ${dim.color}`}>
                                    {dim.label}
                                </span>
                                <span className="text-slate-300 font-mono text-sm w-12 text-right">
                                    {pct}%
                                </span>
                            </div>
                        </div>
                        {/* Barra visual */}
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${dim.color}`}
                                style={{ width: `${Math.min(100, causa.contribuicao_mated)}%` }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default CausalBreakdown
