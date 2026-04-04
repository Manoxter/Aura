'use client'

/**
 * KlaussCard — Card de insight do Klauss IA Tech (D33)
 *
 * 4 templates por zona Fever Chart.
 */

import React from 'react'
import type { FeverZone } from '@/lib/engine/buffer'

interface Props {
    zona: FeverZone
    mensagem: string
    buffer_pct?: number
    decisao_recente?: string
}

const ZONE_CONFIG: Record<FeverZone, { icon: string; title: string; borderColor: string; textColor: string }> = {
    verde: {
        icon: '🟢',
        title: 'Sprint saudavel',
        borderColor: 'border-emerald-500/30',
        textColor: 'text-emerald-400',
    },
    amarelo: {
        icon: '🟡',
        title: 'Sprint sob pressao',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
    },
    vermelho: {
        icon: '🔴',
        title: 'Sprint comprometido',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
    },
    preto: {
        icon: '⚫',
        title: 'Sprint em crise',
        borderColor: 'border-slate-500/30',
        textColor: 'text-slate-300',
    },
}

export default function KlaussCard({ zona, mensagem, buffer_pct, decisao_recente }: Props) {
    const config = ZONE_CONFIG[zona]

    return (
        <div className={`rounded-xl border ${config.borderColor} bg-surface-raised/50 p-4`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{config.icon}</span>
                <span className={`text-sm font-bold ${config.textColor}`}>{config.title}</span>
                {buffer_pct !== undefined && (
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                        Buffer {Math.round(buffer_pct)}%
                    </span>
                )}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{mensagem}</p>
            {decisao_recente && (
                <p className="mt-2 text-xs text-slate-500 italic">
                    Ultima decisao: {decisao_recente}
                </p>
            )}
        </div>
    )
}
