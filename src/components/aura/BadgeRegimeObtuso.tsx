'use client'

import React from 'react'
import { ResultadoSC } from '@/lib/engine/clairaut'
import { badgeRegimeObtuso } from '@/lib/engine/regime-badge'

// ═══════════════════════════════════════════════════════════════════════════
// BadgeRegimeObtuso — Badge visual do regime obtuso (β/γ)
// Story 2.2 — Sprint TM-SHADOW
// Exibe badge colorido quando o triângulo entra em regime obtuso.
// β (custo) → laranja | γ (prazo) → roxo | agudo/null → null (não renderiza)
// ═══════════════════════════════════════════════════════════════════════════

export interface BadgeRegimeObtusProps {
    /** Resultado da Síntese de Clairaut (null = sem dados, não renderiza) */
    resultado: ResultadoSC | null
    /** Classe CSS adicional para o container */
    className?: string
}

const CORES = {
    custo: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/40',
        text: 'text-orange-400',
        dot: 'bg-orange-500',
    },
    prazo: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/40',
        text: 'text-purple-400',
        dot: 'bg-purple-500',
    },
}

/**
 * Badge que indica o regime obtuso ativo (β=custo / γ=prazo).
 * Retorna null quando o triângulo está em regime agudo ou singular.
 */
export function BadgeRegimeObtuso({ resultado, className }: BadgeRegimeObtusProps) {
    const badge = badgeRegimeObtuso(resultado)

    if (!badge.ativo || !badge.pressao) return null

    const cor = CORES[badge.pressao]

    return (
        <div
            className={[
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium',
                cor.bg,
                cor.border,
                cor.text,
                className ?? '',
            ].join(' ')}
            title={badge.descricao}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cor.dot}`} />
            <span className="font-semibold">{badge.simbolo}</span>
            <span>{badge.label}</span>
            <span className="text-[10px] opacity-60">
                ({badge.pressao})
            </span>
        </div>
    )
}
