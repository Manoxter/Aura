'use client'

import { useState } from 'react'
import type { ZonaOperacional } from '@/lib/engine/zones'

interface ZonaSemaforoProps {
    zona: ZonaOperacional | null
    className?: string
}

const ZONA_CONFIG: Record<ZonaOperacional, {
    dot: string
    label: string
    descricao: string
    dotClass: string
    badgeClass: string
}> = {
    verde: {
        dot: '🟢',
        label: 'Verde',
        descricao: 'Projeto dentro dos parâmetros operacionais — sem ação corretiva necessária.',
        dotClass: 'bg-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    amarela: {
        dot: '🟡',
        label: 'Amarela',
        descricao: 'Consumindo reserva de contingência — monitoramento intensivo recomendado.',
        dotClass: 'bg-amber-400',
        badgeClass: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    },
    vermelha: {
        dot: '🔴',
        label: 'Vermelha',
        descricao: 'Folga ou contingência esgotada — ação imediata requerida.',
        dotClass: 'bg-red-500',
        badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    },
    cinza: {
        dot: '⬛',
        label: 'Cinza',
        descricao: 'Prazo total ultrapassado — revisão de escopo ou calendário obrigatória.',
        dotClass: 'bg-slate-500',
        badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    },
    nula: {
        dot: '⚫',
        label: 'Nula',
        descricao: 'Orçamento total esgotado — decisão bloqueada. Aporte de capital necessário.',
        dotClass: 'bg-slate-800',
        badgeClass: 'bg-slate-900/60 text-slate-500 border-slate-700/60',
    },
}

export function ZonaSemaforo({ zona, className = '' }: ZonaSemaforoProps) {
    const [showTooltip, setShowTooltip] = useState(false)

    if (!zona) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full font-mono ${className}`}>
                <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                Zona —
            </span>
        )
    }

    const cfg = ZONA_CONFIG[zona]

    return (
        <div
            className={`relative inline-flex ${className}`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span
                className={`inline-flex items-center gap-1.5 text-[10px] border px-2 py-0.5 rounded-full font-mono font-semibold cursor-default select-none ${cfg.badgeClass}`}
                aria-label={`Zona ${cfg.label}: ${cfg.descricao}`}
            >
                <span
                    className={`w-2 h-2 rounded-full inline-block shrink-0 ${cfg.dotClass} ${zona === 'vermelha' ? 'animate-pulse' : ''}`}
                />
                Zona {cfg.label}
            </span>

            {showTooltip && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-64 pointer-events-none">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-[11px] font-semibold text-slate-200 mb-0.5">
                            {cfg.dot} Zona {cfg.label}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            {cfg.descricao}
                        </p>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-[-45deg] ml-3 -mt-1" />
                </div>
            )}
        </div>
    )
}
