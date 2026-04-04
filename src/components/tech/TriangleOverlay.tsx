'use client'

/**
 * TriangleOverlay — Mini-triângulo CDT fractal (hover no Fever Chart)
 *
 * Cada ponto do Fever Chart mostra um instantâneo geométrico.
 */

import React from 'react'

interface Props {
    E: number
    P: number
    C: number
    size?: number
}

export default function TriangleOverlay({ E, P, C, size = 60 }: Props) {
    const scale = size / 2
    // Triângulo simplificado: vértice E no topo, P esquerda, C direita
    const cx = size / 2
    const cy = size / 2

    const eY = cy - E * scale * 0.8
    const pX = cx - P * scale * 0.6
    const pY = cy + P * scale * 0.4
    const cX = cx + C * scale * 0.6
    const cY = cy + C * scale * 0.4

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="inline-block">
            <polygon
                points={`${cx},${eY} ${pX},${pY} ${cX},${cY}`}
                fill="rgba(59, 130, 246, 0.15)"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
            {/* Labels */}
            <text x={cx} y={eY - 4} fill="#94a3b8" fontSize={8} textAnchor="middle">E</text>
            <text x={pX - 6} y={pY} fill="#94a3b8" fontSize={8} textAnchor="end">P</text>
            <text x={cX + 6} y={cY} fill="#94a3b8" fontSize={8} textAnchor="start">C</text>
        </svg>
    )
}
