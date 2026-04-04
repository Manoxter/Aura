'use client'

/**
 * FeverChart — Componente visual do Fever Chart CCPM (D10, D29)
 *
 * 4 zonas: verde / amarelo / vermelho / PRETO
 * Eixo X: % progresso cadeia crítica
 * Eixo Y: % buffer consumido
 * Trajetória + pins de decisão + cone Monte Carlo
 */

import React from 'react'
import type { FeverChartData, FeverPoint } from '@/lib/engine/fever-chart'
import type { FeverZone } from '@/lib/engine/buffer'

const ZONE_COLORS: Record<FeverZone, string> = {
    verde: '#22c55e',
    amarelo: '#eab308',
    vermelho: '#ef4444',
    preto: '#1e293b',
}

const ZONE_BG: Record<FeverZone, string> = {
    verde: 'rgba(34, 197, 94, 0.1)',
    amarelo: 'rgba(234, 179, 8, 0.1)',
    vermelho: 'rgba(239, 68, 68, 0.1)',
    preto: 'rgba(30, 41, 59, 0.3)',
}

interface Props {
    data: FeverChartData
    width?: number
    height?: number
    showProjection?: boolean
    onPointClick?: (point: FeverPoint) => void
}

export default function FeverChart({
    data,
    width = 600,
    height = 400,
    showProjection = false,
    onPointClick,
}: Props) {
    const padding = { top: 30, right: 30, bottom: 50, left: 60 }
    const innerW = width - padding.left - padding.right
    const innerH = height - padding.top - padding.bottom

    const scaleX = (v: number) => padding.left + (v / 100) * innerW
    const scaleY = (v: number) => padding.top + innerH - (v / 120) * innerH // max 120%

    const { zonas } = data

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label="Fever Chart CCPM"
        >
            {/* Zone backgrounds */}
            <rect x={scaleX(0)} y={scaleY(zonas.verde.max_buffer_pct)} width={innerW} height={scaleY(0) - scaleY(zonas.verde.max_buffer_pct)} fill={ZONE_BG.verde} />
            <rect x={scaleX(0)} y={scaleY(zonas.amarelo.max_buffer_pct)} width={innerW} height={scaleY(zonas.verde.max_buffer_pct) - scaleY(zonas.amarelo.max_buffer_pct)} fill={ZONE_BG.amarelo} />
            <rect x={scaleX(0)} y={scaleY(zonas.vermelho.max_buffer_pct)} width={innerW} height={scaleY(zonas.amarelo.max_buffer_pct) - scaleY(zonas.vermelho.max_buffer_pct)} fill={ZONE_BG.vermelho} />
            <rect x={scaleX(0)} y={scaleY(120)} width={innerW} height={scaleY(zonas.vermelho.max_buffer_pct) - scaleY(120)} fill={ZONE_BG.preto} />

            {/* Zone labels */}
            <text x={scaleX(2)} y={scaleY(15)} fill={ZONE_COLORS.verde} fontSize={11} fontWeight="bold" opacity={0.6}>VERDE</text>
            <text x={scaleX(2)} y={scaleY(50)} fill={ZONE_COLORS.amarelo} fontSize={11} fontWeight="bold" opacity={0.6}>AMARELO</text>
            <text x={scaleX(2)} y={scaleY(83)} fill={ZONE_COLORS.vermelho} fontSize={11} fontWeight="bold" opacity={0.6}>VERMELHO</text>
            <text x={scaleX(2)} y={scaleY(110)} fill="#94a3b8" fontSize={11} fontWeight="bold" opacity={0.6}>PRETO</text>

            {/* Monte Carlo projection cone */}
            {showProjection && data.projecao && (
                <g opacity={0.3}>
                    <path
                        d={`M ${data.projecao.ic_lower.map(p => `${scaleX(p.progresso_pct)},${scaleY(p.buffer_pct)}`).join(' L ')} L ${[...data.projecao.ic_upper].reverse().map(p => `${scaleX(p.progresso_pct)},${scaleY(p.buffer_pct)}`).join(' L ')} Z`}
                        fill="rgba(139, 92, 246, 0.15)"
                        stroke="none"
                    />
                    <path
                        d={`M ${data.projecao.p50.map(p => `${scaleX(p.progresso_pct)},${scaleY(p.buffer_pct)}`).join(' L ')}`}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                    />
                    <path
                        d={`M ${data.projecao.p80.map(p => `${scaleX(p.progresso_pct)},${scaleY(p.buffer_pct)}`).join(' L ')}`}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={1}
                        strokeDasharray="2 4"
                    />
                </g>
            )}

            {/* Trajectory line */}
            {data.trajetoria.length > 1 && (
                <path
                    d={`M ${data.trajetoria.map(p => `${scaleX(p.progresso_pct)},${scaleY(p.buffer_consumido_pct)}`).join(' L ')}`}
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />
            )}

            {/* Trajectory points */}
            {data.trajetoria.map((p, i) => (
                <circle
                    key={i}
                    cx={scaleX(p.progresso_pct)}
                    cy={scaleY(p.buffer_consumido_pct)}
                    r={p.decision_id ? 5 : 3}
                    fill={ZONE_COLORS[p.zona]}
                    stroke={p.decision_id ? 'white' : 'none'}
                    strokeWidth={p.decision_id ? 2 : 0}
                    className={onPointClick ? 'cursor-pointer hover:opacity-80' : ''}
                    onClick={() => onPointClick?.(p)}
                />
            ))}

            {/* Axes */}
            <line x1={padding.left} y1={scaleY(0)} x2={padding.left + innerW} y2={scaleY(0)} stroke="#334155" strokeWidth={1} />
            <line x1={padding.left} y1={scaleY(0)} x2={padding.left} y2={scaleY(120)} stroke="#334155" strokeWidth={1} />

            {/* Axis labels */}
            <text x={width / 2} y={height - 10} fill="#94a3b8" fontSize={11} textAnchor="middle">
                Progresso Cadeia Critica (%)
            </text>
            <text x={15} y={height / 2} fill="#94a3b8" fontSize={11} textAnchor="middle" transform={`rotate(-90 15 ${height / 2})`}>
                Buffer Consumido (%)
            </text>

            {/* Current zone badge */}
            <rect x={width - 120} y={5} width={110} height={24} rx={6} fill={ZONE_COLORS[data.zona_atual]} opacity={0.9} />
            <text x={width - 65} y={21} fill="white" fontSize={11} fontWeight="bold" textAnchor="middle">
                {data.zona_atual.toUpperCase()}
            </text>
        </svg>
    )
}
