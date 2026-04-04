'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ZONA_LABELS, type ZonaMATED } from '@/lib/constants/cdt-labels'

// ═══════════════════════════════════════════════════════════════════════════
// MATEDBadge — Badge semântico de zona MATED
// Story DS-6 — Design System: Labels Semânticos CDT
//
// Exibe a zona MATED com nome por extenso + ícone semântico.
// Usa ZONA_LABELS como fonte única de verdade para nomenclatura.
// ═══════════════════════════════════════════════════════════════════════════

export interface MATEDBadgeProps {
    /** Zona MATED do projeto */
    zona: ZonaMATED
    /** Exibir ícone semântico. Default: true */
    showIcon?: boolean
    /** Variante de tamanho. Default: 'sm' */
    size?: 'xs' | 'sm' | 'md'
    /** Classe CSS adicional */
    className?: string
}

// ─── Mapeamento de classes Tailwind por zona ──────────────────────────────
// Nota: classes explícitas (não interpoladas) para que o Tailwind as inclua
// no bundle de produção.

const ZONA_TAILWIND: Record<ZonaMATED, {
    bg: string
    border: string
    text: string
    dot: string
}> = {
    OTIMO: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500',
    },
    SEGURO: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/40',
        text: 'text-blue-400',
        dot: 'bg-blue-500',
    },
    RISCO: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        dot: 'bg-amber-500',
    },
    CRISE: {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/40',
        text: 'text-rose-400',
        dot: 'bg-rose-500',
    },
}

const SIZE_CLASSES = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
}

const DOT_SIZE_CLASSES = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
}

/**
 * MATEDBadge — exibe a zona MATED com nome por extenso e ícone semântico.
 *
 * Fonte única de verdade: ZONA_LABELS de `@/lib/constants/cdt-labels`.
 *
 * @example
 * <MATEDBadge zona="OTIMO" />          // ✅ Ótimo
 * <MATEDBadge zona="RISCO" size="md" /> // ⚠️ Risco
 * <MATEDBadge zona="CRISE" showIcon={false} /> // Crise (sem ícone)
 */
const MATEDBadge = React.memo(function MATEDBadge({
    zona,
    showIcon = true,
    size = 'sm',
    className,
}: MATEDBadgeProps) {
    const { nome, descricao, icone } = ZONA_LABELS[zona]
    const tw = ZONA_TAILWIND[zona]

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border font-semibold',
                tw.bg,
                tw.border,
                tw.text,
                SIZE_CLASSES[size],
                className,
            )}
            title={descricao}
            aria-label={`Zona MATED: ${nome} — ${descricao}`}
        >
            <span className={cn('rounded-full flex-shrink-0', tw.dot, DOT_SIZE_CLASSES[size])} />
            {showIcon && (
                <span aria-hidden="true">{icone}</span>
            )}
            <span>{nome}</span>
        </span>
    )
})

export default MATEDBadge
export { MATEDBadge }
