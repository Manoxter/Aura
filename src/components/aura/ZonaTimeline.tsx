'use client'

import { useState } from 'react'
import type { ZonaOperacional } from '@/lib/engine/zones'

export interface HistoricoZonaItem {
    semana: string           // 'YYYY-MM-DD' — segunda-feira da semana
    zona: ZonaOperacional
    distancia_nvo: number | null
}

interface ZonaTimelineProps {
    historico: HistoricoZonaItem[]
    className?: string
}

const ZONA_BG: Record<ZonaOperacional, string> = {
    verde:    'bg-emerald-500',
    amarela:  'bg-amber-400',
    vermelha: 'bg-red-500',
    cinza:    'bg-slate-500',
    nula:     'bg-slate-800 border border-slate-600',
}

const ZONA_LABEL: Record<ZonaOperacional, string> = {
    verde:    'Verde',
    amarela:  'Amarela',
    vermelha: 'Vermelha',
    cinza:    'Cinza',
    nula:     'Nula',
}

function formatSemana(semana: string): string {
    const d = new Date(semana + 'T00:00:00Z')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

/** Exibe histórico semanal de zonas como linha do tempo colorida.
 *  Oculto se menos de 4 semanas de dados. */
export function ZonaTimeline({ historico, className = '' }: ZonaTimelineProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

    if (historico.length < 4) return null

    return (
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${className}`}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Histórico de Zonas — semanas
            </p>
            <div className="flex items-end gap-1 flex-wrap">
                {historico.map((item, i) => (
                    <div
                        key={item.semana}
                        className="relative"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div
                            className={`w-5 h-5 rounded-sm cursor-default shrink-0 ${ZONA_BG[item.zona]}`}
                            aria-label={`Semana ${formatSemana(item.semana)}: Zona ${ZONA_LABEL[item.zona]}`}
                        />
                        {hoveredIdx === i && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 pointer-events-none">
                                <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-xl text-center">
                                    <p className="text-[10px] font-semibold text-slate-300">{formatSemana(item.semana)}</p>
                                    <p className="text-[10px] text-slate-400">Zona {ZONA_LABEL[item.zona]}</p>
                                    {item.distancia_nvo !== null && (
                                        <p className="text-[9px] text-slate-500">dist. NVO: {item.distancia_nvo.toFixed(3)}</p>
                                    )}
                                </div>
                                {/* Tooltip arrow */}
                                <div className="w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-[-45deg] ml-3 -mt-1" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
