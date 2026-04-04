'use client'

// AuraLogo v3 — triângulo escaleno CDT com três vértices coloridos
// Custo (azul, base-esq) • Escopo (esmeralda, ápice) • Prazo (âmbar, base-dir)
// Funciona em 16px (favicon), 24px (sidebar), 32px (header), 40px (hero)

import React from 'react'

export type AuraLogoSize = 'xs' | 'sm' | 'md' | 'lg'
export type AuraLogoVariant = 'icon' | 'full'

interface AuraLogoProps {
    size?: AuraLogoSize
    variant?: AuraLogoVariant
    className?: string
}

const SIZE_MAP: Record<AuraLogoSize, { icon: number; text: string; gap: string }> = {
    xs: { icon: 16, text: 'text-sm font-bold',   gap: 'gap-1.5' },
    sm: { icon: 24, text: 'text-lg font-bold',   gap: 'gap-2'   },
    md: { icon: 32, text: 'text-xl font-bold',   gap: 'gap-2.5' },
    lg: { icon: 40, text: 'text-2xl font-bold',  gap: 'gap-3'   },
}

/**
 * Triângulo CDT escaleno: 3 vértices representam as 3 dimensões de gestão.
 *   A = (4, 28)  → Custo     (azul    #3b82f6)  base-esquerda
 *   B = (28, 28) → Prazo     (âmbar   #f59e0b)  base-direita
 *   C = (14, 4)  → Escopo    (esmeralda #10b981)  ápice deslocado para formar escaleno
 *
 * Proporções dos lados (em unidades):
 *   AB (E) = 24      — escopo / base
 *   AC (P) = sqrt(200+576) ≈ 27.9  — prazo / lado esquerdo
 *   BC (O) = sqrt(196+576) ≈ 27.8  — custo / lado direito
 * → quase isósceles no baseline, diferenciando ao variar execução.
 */
function TriangleIcon({ size }: { size: number }) {
    const gradId = `aura-fill-${size}`
    const strokeId = `aura-stroke-${size}`
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
        >
            <defs>
                {/* Preenchimento: azul-escuro → esmeralda-escuro, muito suave */}
                <linearGradient id={gradId} x1="0%" y1="100%" x2="60%" y2="0%">
                    <stop offset="0%"   stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                {/* Stroke: azul vivo → esmeralda */}
                <linearGradient id={strokeId} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
            </defs>

            {/* Triângulo escaleno — corpo */}
            <polygon
                points="4,28 28,28 14,4"
                fill={`url(#${gradId})`}
                opacity="0.75"
            />
            {/* Borda gradiente */}
            <polygon
                points="4,28 28,28 14,4"
                fill="none"
                stroke={`url(#${strokeId})`}
                strokeWidth="1.8"
                strokeLinejoin="round"
            />

            {/* Vértice A — Custo (azul) */}
            <circle cx="4"  cy="28" r="2.2" fill="#3b82f6" />
            {/* Vértice B — Prazo (âmbar) */}
            <circle cx="28" cy="28" r="2.2" fill="#f59e0b" />
            {/* Vértice C — Escopo (esmeralda) */}
            <circle cx="14" cy="4"  r="2.2" fill="#10b981" />
        </svg>
    )
}

const AuraLogo = React.memo(function AuraLogo({
    size = 'sm',
    variant = 'full',
    className = '',
}: AuraLogoProps) {
    const { icon: iconSize, text: textClass, gap } = SIZE_MAP[size]

    if (variant === 'icon') {
        return (
            <span className={`inline-flex items-center justify-center ${className}`} aria-label="AURA">
                <TriangleIcon size={iconSize} />
            </span>
        )
    }

    return (
        <span className={`inline-flex items-center ${gap} ${className}`} aria-label="AURA">
            <TriangleIcon size={iconSize} />
            <span className={`${textClass} tracking-tight text-gradient`}>AURA</span>
        </span>
    )
})

export { AuraLogo }
export default AuraLogo
