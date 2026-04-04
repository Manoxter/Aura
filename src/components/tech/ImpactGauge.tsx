'use client'

/**
 * ImpactGauge — Gauge de impacto de decisão (D18)
 *
 * Mostra o impacto acumulado de decisões no prazo e custo.
 */

import React from 'react'

interface Props {
    label: string
    valor: number
    unidade: string
    max: number
    cor?: 'blue' | 'amber' | 'red'
}

const CORES = {
    blue: { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    red: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
}

export default function ImpactGauge({ label, valor, unidade, max, cor = 'blue' }: Props) {
    const pct = max > 0 ? Math.min(100, (Math.abs(valor) / max) * 100) : 0
    const colors = CORES[cor]

    return (
        <div className={`px-4 py-3 rounded-xl ${colors.bg} border border-slate-700/50`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 font-medium">{label}</span>
                <span className={`text-sm font-bold font-mono ${colors.text}`}>
                    {valor > 0 ? '+' : ''}{valor}{unidade}
                </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
