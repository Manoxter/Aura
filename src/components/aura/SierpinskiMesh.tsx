'use client'

/**
 * SierpinskiMesh v2 — Sierpinski REAL dentro do TM escaleno
 *
 * O TM é um triângulo escaleno calculado pelo motor TRIQ.
 * A subdivisão Sierpinski recursiva herda a angulação do pai.
 * Triângulos ↑ = sprints (cor fever). Triângulos ↓ = TBZ (buffer CCPM).
 * Todos os sub-triângulos mantêm a forma escalena do TM.
 *
 * Click no sprint → navega para página dedicada do sprint.
 */

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface Point { x: number; y: number }

interface TriCell {
  id: string
  type: 'sprint' | 'tbz' | 'reserva'
  vertices: [Point, Point, Point] // A (left), B (right), C (top)
  sprintData?: SprintData
}

interface SierpinskiMeshProps {
  /** Vértices reais do TM escaleno: [basLeft, baseRight, apex] */
  tmVertices?: [Point, Point, Point]
  sprints: SprintData[]
  projetoId: string
  width?: number
  height?: number
  className?: string
  /** Mostra TM miniatura (portfolio) ou completo (dashboard) */
  variant?: 'full' | 'mini'
}

// ─── Fever Colors ─────────────────────────────────────────────────────────────

const FEVER: Record<FeverZone, { fill: string; stroke: string; text: string; glow?: string }> = {
  azul:     { fill: 'rgba(34,211,238,0.12)',  stroke: '#22d3ee', text: '#67e8f9' },
  verde:    { fill: 'rgba(0,230,118,0.10)',   stroke: '#00E676', text: '#4ade80' },
  amarelo:  { fill: 'rgba(255,171,0,0.12)',   stroke: '#FFAB00', text: '#fbbf24' },
  vermelho: { fill: 'rgba(229,57,53,0.15)',   stroke: '#E53935', text: '#f87171', glow: 'rgba(229,57,53,0.3)' },
  preto:    { fill: 'rgba(26,26,46,0.20)',    stroke: '#52525b', text: '#a1a1aa' },
}

// ─── Sierpinski Subdivision ───────────────────────────────────────────────────

/**
 * Subdivide um triângulo em 4 sub-triângulos (Sierpinski):
 *   3 triângulos ↑ (cantos) + 1 triângulo ↓ (centro/TBZ)
 *
 * Herda a forma EXATA do pai — escaleno, isósceles, qualquer.
 */
function subdivide(
  A: Point, B: Point, C: Point
): { up: [Point, Point, Point][]; down: [Point, Point, Point] } {
  const midAB: Point = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
  const midBC: Point = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }
  const midAC: Point = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 }

  return {
    up: [
      [A, midAB, midAC],         // bottom-left ↑
      [midAB, B, midBC],         // bottom-right ↑
      [midAC, midBC, C],         // top ↑
    ],
    down: [midAB, midBC, midAC], // center ↓ (TBZ — inverted)
  }
}

/**
 * Gera todas as células recursivamente para N sprints.
 */
function generateCells(
  A: Point, B: Point, C: Point,
  level: number,
  sprints: SprintData[],
): TriCell[] {
  if (level <= 0 || sprints.length <= 1) {
    // Terminal: single sprint or no more subdivision
    if (sprints.length === 1) {
      return [{
        id: `sprint-${sprints[0].id}`,
        type: 'sprint',
        vertices: [A, B, C],
        sprintData: sprints[0],
      }]
    }
    if (sprints.length === 0) {
      return [{
        id: `reserva-${A.x.toFixed(0)}-${A.y.toFixed(0)}`,
        type: 'reserva',
        vertices: [A, B, C],
      }]
    }
  }

  const { up, down } = subdivide(A, B, C)
  const cells: TriCell[] = []

  // TBZ center
  cells.push({
    id: `tbz-${down[0].x.toFixed(1)}-${down[0].y.toFixed(1)}`,
    type: 'tbz',
    vertices: [down[0], down[1], down[2]],
  })

  // Distribute sprints across 3 sub-triangles
  // Strategy: backward fill — last sprint in top, rest split between bottom-left and bottom-right
  const sorted = [...sprints].sort((a, b) => a.ordem - b.ordem)

  if (sorted.length <= 3) {
    // Direct assignment: bottom-left, bottom-right, top
    const assignments = distributeSimple(sorted)
    for (let i = 0; i < 3; i++) {
      if (assignments[i]) {
        cells.push({
          id: `sprint-${assignments[i]!.id}`,
          type: 'sprint',
          vertices: up[i],
          sprintData: assignments[i]!,
        })
      } else {
        cells.push({
          id: `reserva-${up[i][0].x.toFixed(0)}-${up[i][0].y.toFixed(0)}`,
          type: 'reserva',
          vertices: up[i],
        })
      }
    }
  } else {
    // Recurse: split sprints across 3 sub-triangles
    const { left, right, top } = distributeRecursive(sorted)

    cells.push(...generateCells(up[0][0], up[0][1], up[0][2], level - 1, left))
    cells.push(...generateCells(up[1][0], up[1][1], up[1][2], level - 1, right))
    cells.push(...generateCells(up[2][0], up[2][1], up[2][2], level - 1, top))
  }

  return cells
}

function distributeSimple(sprints: SprintData[]): (SprintData | null)[] {
  // Fill backward: top = last sprint (Ômega), then bottom-right, bottom-left
  const result: (SprintData | null)[] = [null, null, null]
  const rev = [...sprints].reverse()
  if (rev[0]) result[2] = rev[0]  // top
  if (rev[1]) result[1] = rev[1]  // bottom-right
  if (rev[2]) result[0] = rev[2]  // bottom-left
  return result
}

function distributeRecursive(sprints: SprintData[]) {
  const n = sprints.length
  // Top gets ~1/3 (last sprints), right ~1/3, left ~1/3
  const topCount = Math.max(1, Math.ceil(n / 3))
  const rightCount = Math.max(1, Math.ceil((n - topCount) / 2))
  const leftCount = n - topCount - rightCount

  return {
    left: sprints.slice(0, leftCount),
    right: sprints.slice(leftCount, leftCount + rightCount),
    top: sprints.slice(leftCount + rightCount),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SierpinskiMesh = React.memo(function SierpinskiMesh({
  tmVertices,
  sprints,
  projetoId,
  width = 580,
  height = 460,
  className = '',
  variant = 'full',
}: SierpinskiMeshProps) {
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Default TM vertices if not provided (escaleno — NOT equilateral)
  const [A, B, C] = tmVertices ?? [
    { x: width * 0.08, y: height * 0.88 },   // base-left (Custo)
    { x: width * 0.92, y: height * 0.88 },   // base-right (Prazo)
    { x: width * 0.42, y: height * 0.08 },   // apex (Escopo) — off-center = escaleno
  ]

  const level = Math.max(1, Math.ceil(Math.log2(Math.max(sprints.length, 2))))

  const cells = useMemo(() => {
    return generateCells(A, B, C, level, sprints)
  }, [sprints, level, A, B, C])

  const pts = (v: [Point, Point, Point]) =>
    v.map(p => `${p.x},${p.y}`).join(' ')

  const centroid = (v: [Point, Point, Point]) => ({
    x: (v[0].x + v[1].x + v[2].x) / 3,
    y: (v[0].y + v[1].y + v[2].y) / 3,
  })

  const handleSprintClick = (sprintId: string) => {
    router.push(`/${projetoId}/sprint/${sprintId}`)
  }

  const isMini = variant === 'mini'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`select-none ${className}`}
    >
      <defs>
        <filter id="glow-crise" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feFlood floodColor="#E53935" floodOpacity="0.35" />
          <feComposite in2="blur" operator="in" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ghost TM — outline sombra do baseline */}
      <polygon
        points={pts([A, B, C])}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1.5"
      />

      {/* TM side labels */}
      {!isMini && (
        <>
          <text x={(A.x + B.x) / 2} y={A.y + 18} textAnchor="middle"
            fill="rgba(0,230,118,0.3)" fontSize="9" fontFamily="var(--font-jetbrains), monospace">
            E (Escopo)
          </text>
          <text x={(A.x + C.x) / 2 - 20} y={(A.y + C.y) / 2}
            fill="rgba(59,130,246,0.3)" fontSize="9" fontFamily="var(--font-jetbrains), monospace"
            transform={`rotate(-${Math.atan2(A.y - C.y, C.x - A.x) * 180 / Math.PI}, ${(A.x + C.x) / 2 - 20}, ${(A.y + C.y) / 2})`}>
            C (Custo)
          </text>
          <text x={(B.x + C.x) / 2 + 20} y={(B.y + C.y) / 2}
            fill="rgba(255,171,0,0.3)" fontSize="9" fontFamily="var(--font-jetbrains), monospace"
            transform={`rotate(${Math.atan2(B.y - C.y, B.x - C.x) * 180 / Math.PI}, ${(B.x + C.x) / 2 + 20}, ${(B.y + C.y) / 2})`}>
            P (Prazo)
          </text>
        </>
      )}

      {/* Render cells */}
      {cells.map(cell => {
        const center = centroid(cell.vertices)
        const isHovered = hoveredId === cell.id

        if (cell.type === 'tbz') {
          return (
            <g key={cell.id}>
              <polygon
                points={pts(cell.vertices)}
                fill="rgba(156,163,175,0.03)"
                stroke="rgba(156,163,175,0.15)"
                strokeWidth="0.8"
                strokeDasharray="3,3"
              />
              {!isMini && (
                <text x={center.x} y={center.y + 3} textAnchor="middle"
                  fill="rgba(156,163,175,0.25)" fontSize="7"
                  fontFamily="var(--font-jetbrains), monospace">
                  TBZ
                </text>
              )}
            </g>
          )
        }

        if (cell.type === 'reserva') {
          return (
            <polygon
              key={cell.id}
              points={pts(cell.vertices)}
              fill="transparent"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
              strokeDasharray="2,6"
            />
          )
        }

        // Sprint cell
        const sprint = cell.sprintData!
        const zone = sprint.feverZone
        const f = FEVER[zone]
        const isAtivo = sprint.estado === 'ativo'
        const isCrise = zone === 'vermelho' || zone === 'preto'

        return (
          <g
            key={cell.id}
            onClick={() => handleSprintClick(sprint.id)}
            onMouseEnter={() => setHoveredId(cell.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="cursor-pointer"
            filter={isCrise ? 'url(#glow-crise)' : undefined}
          >
            <polygon
              points={pts(cell.vertices)}
              fill={f.fill}
              stroke={f.stroke}
              strokeWidth={isHovered ? 2 : 1}
              strokeLinejoin="round"
              opacity={isHovered ? 1 : 0.85}
            />

            {/* Sprint label */}
            <text x={center.x} y={center.y - (isMini ? 0 : 4)} textAnchor="middle"
              fill={f.text} fontSize={isMini ? 7 : 10} fontWeight="700"
              fontFamily="var(--font-outfit), sans-serif">
              S{sprint.ordem}
            </text>

            {!isMini && (
              <>
                {/* Nome truncado */}
                <text x={center.x} y={center.y + 8} textAnchor="middle"
                  fill="rgba(255,255,255,0.35)" fontSize="7"
                  fontFamily="var(--font-outfit), sans-serif">
                  {sprint.nome.length > 14 ? sprint.nome.slice(0, 14) + '…' : sprint.nome}
                </text>

                {/* Buffer % */}
                <text x={center.x} y={center.y + 18} textAnchor="middle"
                  fill={f.text} fontSize="8" fontWeight="700"
                  fontFamily="var(--font-jetbrains), monospace">
                  {sprint.buffer_original > 0
                    ? `${Math.round((sprint.buffer_consumido / sprint.buffer_original) * 100)}%`
                    : '—'}
                </text>
              </>
            )}

            {/* Ativo indicator */}
            {isAtivo && (
              <circle cx={center.x} cy={cell.vertices[2].y + 6} r={isMini ? 2 : 3}
                fill={f.stroke} className="animate-pulse" />
            )}

            {/* Concluído check */}
            {sprint.estado === 'concluido' && !isMini && (
              <text x={center.x + 18} y={center.y - 8} textAnchor="middle"
                fill="#4ade80" fontSize="10">✓</text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      {!isMini && (
        <g transform={`translate(8, ${height - 22})`}>
          {(['azul', 'verde', 'amarelo', 'vermelho', 'preto'] as FeverZone[]).map((z, i) => (
            <g key={z} transform={`translate(${i * 80}, 0)`}>
              <rect x="0" y="0" width="6" height="6" rx="1" fill={FEVER[z].stroke} opacity="0.8" />
              <text x="10" y="6" fill="rgba(255,255,255,0.35)" fontSize="7"
                fontFamily="var(--font-outfit)">
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </text>
            </g>
          ))}
          <g transform={`translate(${5 * 80}, 0)`}>
            <rect x="0" y="0" width="6" height="6" rx="1" fill="transparent"
              stroke="rgba(156,163,175,0.3)" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
            <text x="10" y="6" fill="rgba(255,255,255,0.25)" fontSize="7"
              fontFamily="var(--font-outfit)">TBZ</text>
          </g>
        </g>
      )}
    </svg>
  )
})
