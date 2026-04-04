'use client'

// AuraLogo v4 — Logo oficial com imagem PNG (triângulo fractal colorido)
// Fallback SVG para contextos sem imagem. Home button na sidebar.

import React from 'react'
import Image from 'next/image'

export type AuraLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AuraLogoVariant = 'icon' | 'full'

interface AuraLogoProps {
    size?: AuraLogoSize
    variant?: AuraLogoVariant
    className?: string
    onClick?: () => void
}

const SIZE_MAP: Record<AuraLogoSize, { icon: number; text: string; gap: string }> = {
    xs: { icon: 20, text: 'text-xs font-bold',   gap: 'gap-1.5' },
    sm: { icon: 28, text: 'text-lg font-bold',   gap: 'gap-2'   },
    md: { icon: 36, text: 'text-xl font-bold',   gap: 'gap-2.5' },
    lg: { icon: 48, text: 'text-2xl font-bold',  gap: 'gap-3'   },
    xl: { icon: 64, text: 'text-3xl font-bold',  gap: 'gap-3'   },
}

const AuraLogo = React.memo(function AuraLogo({
    size = 'sm',
    variant = 'full',
    className = '',
    onClick,
}: AuraLogoProps) {
    const { icon: iconSize, text: textClass, gap } = SIZE_MAP[size]

    const logoImg = (
        <Image
            src="/logo-aura.png"
            alt="Aura"
            width={iconSize}
            height={iconSize}
            className="object-contain"
            priority={size === 'lg' || size === 'xl'}
        />
    )

    const Wrapper = onClick ? 'button' : 'span'
    const wrapperProps = onClick
        ? { onClick, type: 'button' as const, 'aria-label': 'Ir para Home' }
        : {}

    if (variant === 'icon') {
        return (
            <Wrapper
                className={`inline-flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${className}`}
                {...wrapperProps}
            >
                {logoImg}
            </Wrapper>
        )
    }

    return (
        <Wrapper
            className={`inline-flex items-center ${gap} cursor-pointer hover:opacity-80 transition-opacity ${className}`}
            {...wrapperProps}
        >
            {logoImg}
            <span className={`${textClass} tracking-wider text-white/90`}>
                AURA
            </span>
        </Wrapper>
    )
})

export { AuraLogo }
export default AuraLogo
