'use client'

/**
 * SprintBadge — Badge de status do sprint com cores Fever Chart
 */

import React from 'react'
import type { FeverZone } from '@/lib/engine/buffer'

interface Props {
    numero: number
    nome: string
    zona: FeverZone
    progresso_pct: number
    buffer_pct: number
}

const ZONE_STYLES: Record<FeverZone, { bg: string; text: string; ring: string }> = {
    verde: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
    amarelo: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
    vermelho: { bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-red-500/30' },
    preto: { bg: 'bg-slate-800', text: 'text-slate-300', ring: 'ring-slate-500/30' },
}

export default function SprintBadge({ numero, nome, zona, progresso_pct, buffer_pct }: Props) {
    const style = ZONE_STYLES[zona]

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ring-1 ${style.bg} ${style.ring}`}>
            <span className={`text-xs font-black ${style.text}`}>S{numero}</span>
            <span className="text-xs text-slate-400 truncate max-w-[120px]">{nome}</span>
            <span className="text-[10px] text-slate-500">{Math.round(progresso_pct)}%</span>
            <span className={`text-[10px] font-mono ${style.text}`}>{Math.round(buffer_pct)}%buf</span>
        </div>
    )
}
