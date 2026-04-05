'use client'

/**
 * SierpinskiMesh — Visualização da malha fractal Sierpinski
 *
 * Renderiza sprints como triângulos coloridos por fever zone,
 * TBZ como triângulos invertidos tracejados, e ghost TM como sombra.
 *
 * Decisões: 27-34, 35-38
 */

import React, { useMemo, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeverZone = 'azul' | 'verde' | 'amarelo' | 'vermelho' | 'preto'

export interface SprintData {
  id: string
  nome: string
  ordem: number
  estado: 'concluido' | 'ativo' | 'futuro'
  buffer_original: number
  buffer_consumido: number
  feverZone: FeverZone
}

interface SierpinskiMeshProps {
  sprints: SprintData[]
  onSprintClick?: (sprintId: string) => void
  selectedSprintId?: string | null
  width?: number
  height?: number
  className?: string
}

// ─── Fever Colors ─────────────────────────────────────────────────────────────

const FEVER_FILL: Record<FeverZone, string> = {
  azul:     'rgba(34, 211, 238, 0.15)',
  verde:    'rgba(0, 230, 118, 0.15)',
  amarelo:  'rgba(255, 171, 0, 0.15)',
  vermelho: 'rgba(229, 57, 53, 0.18)',
  preto:    'rgba(26, 26, 46, 0.25)',
}

const FEVER_STROKE: Record<FeverZone, string> = {
  azul:     '#22d3ee',
  verde:    '#00E676',
  amarelo:  '#FFAB00',
  vermelho: '#E53935',
  preto:    '#52525b',
}

const FEVER_TEXT: Record<FeverZone, string> = {
  azul:     '#67e8f9',
  verde:    '#4ade80',
  amarelo:  '#fbbf24',
  vermelho: '#f87171',
  preto:    '#a1a1aa',
}

// ─── Sierpinski Generator ─────────────────────────────────────────────────────

interface TriCell {
  id: string
  type: 'up' | 'down'
  vertices: [number, number][]
  row: number
  col: number
}

function generateSierpinskiCells(
  level: number,
  baseX: number,
  baseY: number,
  size: number,
  row: number = 0,
  col: number = 0
): TriCell[] {
  if (level === 0) {
    const h = size * (Math.sqrt(3) / 2)
    return [{
      id: `u-${row}-${col}`,
      type: 'up',
      vertices: [
        [baseX, baseY + h],           // bottom-left
        [baseX + size, baseY + h],    // bottom-right
        [baseX + size / 2, baseY],    // top
      ],
      row,
      col,
    }]
  }

  const half = size / 2
  const h = half * (Math.sqrt(3) / 2)
  const cells: TriCell[] = []

  // Bottom-left ↑
  cells.push(...generateSierpinskiCells(level - 1, baseX, baseY + h, half, row, col * 2))
  // Bottom-right ↑
  cells.push(...generateSierpinskiCells(level - 1, baseX + half, baseY + h, half, row, col * 2 + 1))
  // Top ↑
  cells.push(...generateSierpinskiCells(level - 1, baseX + half / 2, baseY, half, row + 1, col))

  // Center ↓ (TBZ)
  const fullH = size * (Math.sqrt(3) / 2)
  cells.push({
    id: `d-${row}-${col}`,
    type: 'down',
    vertices: [
      [baseX + half / 2, baseY + h],          // top-left
      [baseX + half / 2 + half, baseY + h],   // top-right
      [baseX + half, baseY + fullH],           // bottom-center
    ],
    row,
    col,
  })

  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SierpinskiMesh = React.memo(function SierpinskiMesh({
  sprints,
  onSprintClick,
  selectedSprintId,
  width = 600,
  height = 520,
  className = '',
}: SierpinskiMeshProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const nSprints = sprints.length
  const level = Math.max(1, Math.ceil(Math.log2(Math.max(nSprints, 2))))

  // Generate mesh
  const mesh = useMemo(() => {
    const padding = 40
    const meshSize = Math.min(width - padding * 2, (height - padding * 2) / (Math.sqrt(3) / 2))
    const offsetX = (width - meshSize) / 2
    const offsetY = (height - meshSize * (Math.sqrt(3) / 2)) / 2

    const cells = generateSierpinskiCells(level, offsetX, offsetY, meshSize)

    // Get up cells sorted: top first (row desc), left first (col asc)
    const upCells = cells
      .filter(c => c.type === 'up')
      .sort((a, b) => b.row !== a.row ? b.row - a.row : a.col - b.col)

    // Assign sprints backward: last sprint at top
    const sorted = [...sprints].sort((a, b) => a.ordem - b.ordem)
    const reversed = [...sorted].reverse()

    const sprintMap = new Map<string, SprintData>()
    const cellSprintMap = new Map<string, SprintData>()

    for (let i = 0; i < upCells.length; i++) {
      if (i < reversed.length) {
        cellSprintMap.set(upCells[i].id, reversed[i])
        sprintMap.set(reversed[i].id, reversed[i])
      }
    }

    return { cells, upCells, cellSprintMap, meshSize, offsetX, offsetY }
  }, [sprints, level, width, height])

  const pointsStr = (verts: [number, number][]) =>
    verts.map(v => `${v[0]},${v[1]}`).join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`select-none ${className}`}
    >
      <defs>
        {/* Glow filters per zone */}
        <filter id="glow-verde" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#00E676" floodOpacity="0.3" />
          <feComposite in2="blur" operator="in" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-vermelho" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor="#E53935" floodOpacity="0.4" />
          <feComposite in2="blur" operator="in" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ghost TM — full triangle outline behind everything */}
      <polygon
        points={pointsStr([
          [mesh.offsetX, mesh.offsetY + mesh.meshSize * (Math.sqrt(3) / 2)],
          [mesh.offsetX + mesh.meshSize, mesh.offsetY + mesh.meshSize * (Math.sqrt(3) / 2)],
          [mesh.offsetX + mesh.meshSize / 2, mesh.offsetY],
        ])}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />

      {/* Render all cells */}
      {mesh.cells.map(cell => {
        const sprint = mesh.cellSprintMap.get(cell.id)
        const isDown = cell.type === 'down'
        const isReserva = cell.type === 'up' && !sprint
        const isHovered = hoveredId === cell.id
        const isSelected = sprint?.id === selectedSprintId

        if (isDown) {
          // TBZ — dashed gray
          return (
            <g key={cell.id}>
              <polygon
                points={pointsStr(cell.vertices)}
                fill="rgba(156, 163, 175, 0.03)"
                stroke="rgba(156, 163, 175, 0.2)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={cell.vertices.reduce((a, v) => a + v[0], 0) / 3}
                y={cell.vertices.reduce((a, v) => a + v[1], 0) / 3 + 4}
                textAnchor="middle"
                fill="rgba(156, 163, 175, 0.3)"
                fontSize="8"
                fontFamily="var(--font-jetbrains), monospace"
              >
                TBZ
              </text>
            </g>
          )
        }

        if (isReserva) {
          // Reserva — dotted outline
          return (
            <polygon
              key={cell.id}
              points={pointsStr(cell.vertices)}
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="2,6"
            />
          )
        }

        // Sprint triangle
        const zone = sprint!.feverZone
        const fill = FEVER_FILL[zone]
        const stroke = FEVER_STROKE[zone]
        const textColor = FEVER_TEXT[zone]
        const bufferPct = sprint!.buffer_original > 0
          ? (sprint!.buffer_consumido / sprint!.buffer_original) * 100
          : 0

        // Compression: shrink horizontally based on buffer consumed
        const compressionFactor = 1 - (Math.min(bufferPct, 100) / 200) // max 50% shrink

        const cx = cell.vertices.reduce((a, v) => a + v[0], 0) / 3
        const cy = cell.vertices.reduce((a, v) => a + v[1], 0) / 3

        return (
          <g
            key={cell.id}
            onClick={() => onSprintClick?.(sprint!.id)}
            onMouseEnter={() => setHoveredId(cell.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="cursor-pointer transition-all"
            style={{ transform: `scaleX(${compressionFactor})`, transformOrigin: `${cx}px ${cy}px` }}
            filter={zone === 'vermelho' || zone === 'preto' ? 'url(#glow-vermelho)' : undefined}
          >
            {/* Fill */}
            <polygon
              points={pointsStr(cell.vertices)}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
              strokeLinejoin="round"
              opacity={isHovered ? 1 : 0.9}
            />

            {/* Sprint name */}
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              fill={textColor}
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-outfit), sans-serif"
            >
              S{sprint!.ordem}
            </text>

            {/* Sprint label */}
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="7"
              fontFamily="var(--font-outfit), sans-serif"
            >
              {sprint!.nome.length > 12 ? sprint!.nome.slice(0, 12) + '…' : sprint!.nome}
            </text>

            {/* Buffer % */}
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              fill={textColor}
              fontSize="8"
              fontFamily="var(--font-jetbrains), monospace"
              fontWeight="700"
            >
              {Math.round(bufferPct)}%
            </text>

            {/* Estado badge */}
            {sprint!.estado === 'ativo' && (
              <circle
                cx={cell.vertices[2][0]}
                cy={cell.vertices[2][1] - 4}
                r="3"
                fill={stroke}
                className="animate-pulse"
              />
            )}
            {sprint!.estado === 'concluido' && (
              <text
                x={cell.vertices[2][0]}
                y={cell.vertices[2][1] - 2}
                textAnchor="middle"
                fill="#4ade80"
                fontSize="8"
              >
                ✓
              </text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(10, ${height - 25})`}>
        {(['azul', 'verde', 'amarelo', 'vermelho', 'preto'] as FeverZone[]).map((zone, i) => (
          <g key={zone} transform={`translate(${i * 90}, 0)`}>
            <rect x="0" y="0" width="8" height="8" rx="2" fill={FEVER_STROKE[zone]} opacity="0.8" />
            <text x="12" y="8" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="var(--font-outfit)">
              {zone.charAt(0).toUpperCase() + zone.slice(1)}
            </text>
          </g>
        ))}
        <g transform={`translate(${5 * 90}, 0)`}>
          <rect x="0" y="0" width="8" height="8" rx="2" fill="transparent" stroke="rgba(156,163,175,0.3)" strokeWidth="1" strokeDasharray="2,2" />
          <text x="12" y="8" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="var(--font-outfit)">TBZ</text>
        </g>
      </g>
    </svg>
  )
})
