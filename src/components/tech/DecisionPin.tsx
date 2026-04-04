'use client'

/**
 * DecisionPin — Pin de decisão interativo na timeline (D32)
 */

import React from 'react'
import type { DecisionChip } from '@/lib/engine/sanfona'

interface Props {
    chip: DecisionChip
    onClick?: (chip: DecisionChip) => void
}

const TYPE_ICONS: Record<string, string> = {
    aporte: '+$',
    corte_escopo: '-E',
    extensao_prazo: '+P',
    rebaseline: 'RB',
    contingencia: 'CT',
    aceleracao: '>>',
}

export default function DecisionPin({ chip, onClick }: Props) {
    const icon = TYPE_ICONS[chip.tipo] ?? '?'
    const hasImpact = chip.delta_prazo !== 0 || chip.delta_custo !== 0

    return (
        <button
            onClick={() => onClick?.(chip)}
            className={`group relative inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all
                ${hasImpact
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 ring-1 ring-slate-600/20'
                }`}
            title={chip.descricao}
        >
            <span className="font-mono">{icon}</span>
            {chip.delta_prazo !== 0 && (
                <span className={chip.delta_prazo > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {chip.delta_prazo > 0 ? '+' : ''}{chip.delta_prazo}d
                </span>
            )}
            {chip.delta_custo !== 0 && (
                <span className={chip.delta_custo > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {chip.delta_custo > 0 ? '+' : ''}{chip.delta_custo}$
                </span>
            )}
        </button>
    )
}
