'use client'

/**
 * CastleOfCards — Visualização Castelo de Cartas (D31)
 *
 * Sprints empilhados verticalmente:
 *   - Concluídos: base sólida (cristalizados)
 *   - Ativo: com destaque
 *   - Futuros: com skew visual proporcional ao buffer consumido
 */

import React from 'react'
import type { CastleSprint } from '@/lib/engine/castle'

interface Props {
    sprints: CastleSprint[]
    estabilidade: 'estavel' | 'inclinado' | 'critico' | 'colapsado'
}

const STATE_COLORS = {
    concluido: { bg: 'bg-emerald-900/40', border: 'border-emerald-600/30', text: 'text-emerald-400' },
    ativo: { bg: 'bg-blue-900/40', border: 'border-blue-500', text: 'text-blue-300' },
    futuro: { bg: 'bg-slate-800/40', border: 'border-slate-600/30', text: 'text-slate-400' },
}

const ESTABILIDADE_BADGE = {
    estavel: { label: 'Estavel', color: 'text-emerald-400 bg-emerald-400/10' },
    inclinado: { label: 'Inclinado', color: 'text-yellow-400 bg-yellow-400/10' },
    critico: { label: 'Critico', color: 'text-red-400 bg-red-400/10' },
    colapsado: { label: 'Colapsado', color: 'text-red-500 bg-red-500/20' },
}

export default function CastleOfCards({ sprints, estabilidade }: Props) {
    const badge = ESTABILIDADE_BADGE[estabilidade]
    const reversed = [...sprints].reverse() // empilhar de baixo para cima

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Badge de estabilidade */}
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.color}`}>
                {badge.label}
            </div>

            {/* Sprints empilhados */}
            <div className="flex flex-col items-center gap-0.5 mt-2">
                {reversed.map((sprint) => {
                    const colors = STATE_COLORS[sprint.estado]
                    const skewDeg = (sprint.skew_visual * 180) / Math.PI
                    const bufferPct = sprint.buffer_original > 0
                        ? Math.round((sprint.buffer_consumido / sprint.buffer_original) * 100)
                        : 0

                    return (
                        <div
                            key={sprint.id}
                            className={`relative w-48 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} transition-transform duration-300`}
                            style={{
                                transform: `skewX(${skewDeg.toFixed(1)}deg)`,
                            }}
                        >
                            <div className="flex items-center justify-between" style={{ transform: `skewX(${(-skewDeg).toFixed(1)}deg)` }}>
                                <span className={`text-xs font-bold ${colors.text}`}>
                                    S{sprint.numero}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {bufferPct}% buf
                                </span>
                            </div>

                            {/* Buffer bar */}
                            <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden" style={{ transform: `skewX(${(-skewDeg).toFixed(1)}deg)` }}>
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        bufferPct >= 100 ? 'bg-red-500' :
                                        bufferPct >= 66 ? 'bg-yellow-500' :
                                        'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, bufferPct)}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
