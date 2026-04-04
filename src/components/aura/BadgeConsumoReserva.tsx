'use client'

import React from 'react'
import { ResultadoSC } from '@/lib/engine/clairaut'
import { badgeConsumoReserva } from '@/lib/engine/regime-badge'

// ═══════════════════════════════════════════════════════════════════════════
// BadgeConsumoReserva — Badge de consumo de reserva geométrica (ângulo α)
// Story 2.3 — Sprint TM-SHADOW
// Ativa quando Rα > 0 (alpha > 45°), com 3 níveis de severidade.
// baixo=amarelo | moderado=laranja | critico=vermelho
// ═══════════════════════════════════════════════════════════════════════════

export interface BadgeConsumoReservaProps {
    /** Resultado da Síntese de Clairaut (null = sem dados, não renderiza) */
    resultado: ResultadoSC | null
    /** Classe CSS adicional */
    className?: string
}

const CORES_NIVEL = {
    baixo: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/40',
        text: 'text-yellow-400',
        dot: 'bg-yellow-500',
    },
    moderado: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/40',
        text: 'text-orange-400',
        dot: 'bg-orange-500',
    },
    critico: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        text: 'text-red-400',
        dot: 'bg-red-500',
    },
}

/**
 * Badge que indica o nível de consumo da reserva geométrica (Rα).
 * Retorna null quando Rα = 0 ou resultado inválido.
 */
export function BadgeConsumoReserva({ resultado, className }: BadgeConsumoReservaProps) {
    const badge = badgeConsumoReserva(resultado)

    if (!badge.ativo || !badge.nivel) return null

    const cor = CORES_NIVEL[badge.nivel]
    const pct = Math.round(badge.Ralpha * 100)

    return (
        <div
            className={[
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium',
                cor.bg,
                cor.border,
                cor.text,
                className ?? '',
            ].join(' ')}
            title={`Rα = ${pct}% — ${badge.label}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cor.dot}`} />
            <span>{badge.label}</span>
            <span className="text-[10px] opacity-60">Rα {pct}%</span>
        </div>
    )
}
