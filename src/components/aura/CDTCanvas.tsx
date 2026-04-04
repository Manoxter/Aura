'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { CDTResult } from '@/lib/engine/math'
import { translateLabel, translateTooltip, type MetricMode } from '@/lib/translation/MetricTranslator'
import { ZONA_LABELS } from '@/lib/constants/cdt-labels'

// ═══════════════════════════════════════════════════════════════════════════
// Aura CDT Canvas v2 — Interactive Quality Triangle Visualization
// Renders: Main triangle, Orthic triangle (ZRE), NVO, Centroide, MATED line
// ═══════════════════════════════════════════════════════════════════════════

interface CDTCanvasProps {
    cdt: CDTResult
    className?: string
    showGrid?: boolean
    showOrthic?: boolean
    showMatedLine?: boolean
    showLabels?: boolean
    /** Callback fired when a vertex is dragged to a new position (normalized 0-1 coords) */
    onVertexDrag?: (vertex: 'A' | 'B' | 'C', newPosition: [number, number]) => void
    /** Enable drag-and-drop on vertices A, B, C. Default false for backward compatibility */
    interactive?: boolean
    /** Story 5.7 — Modo de exibição dos labels: 'pm' = gerencial, 'tech' = técnico (default) */
    mode?: MetricMode
    /** Sprint 5 Sessão 27: Modo dashboard — cores mais vivas, linhas grossas, glow. Sem grade. */
    dashboardMode?: boolean
    /** Sprint 6 Req D: CDT projetado para overlay de comparação (triângulo sombra) */
    cdtOverlay?: CDTResult | null
}

// ─── Design Token Colors ─────────────────────────────────────────────────
const ZONE_COLORS: Record<CDTResult['zona_mated'], { fill: string; stroke: string; bg: string; text: string; label: string }> = {
    OTIMO:  { fill: '#10b98118', stroke: '#10b981', bg: '#10b98110', text: '#34d399', label: ZONA_LABELS.OTIMO.nome },
    SEGURO: { fill: '#3b82f618', stroke: '#3b82f6', bg: '#3b82f610', text: '#60a5fa', label: ZONA_LABELS.SEGURO.nome },
    RISCO:  { fill: '#f59e0b18', stroke: '#f59e0b', bg: '#f59e0b10', text: '#fbbf24', label: ZONA_LABELS.RISCO.nome },
    CRISE:  { fill: '#f43f5e18', stroke: '#f43f5e', bg: '#f43f5e10', text: '#fb7185', label: ZONA_LABELS.CRISE.nome },
}

const CDT_COLORS = {
    escopo: '#3b82f6',   // blue-500
    custo:  '#10b981',   // emerald-500
    prazo:  '#f59e0b',   // amber-500
}

const ORTHIC_COLOR = '#818cf8'  // indigo-400
const NVO_COLOR = '#a855f7'     // purple-500
const CENTROIDE_COLOR = '#e2e8f0' // slate-200
const MATED_LINE_COLOR = '#f472b6' // pink-400
const GRID_COLOR = '#1e293b'    // slate-800

// ─── Geometry Helpers ────────────────────────────────────────────────────

/** Compute orthic triangle foot: perpendicular from R onto segment PQ */
function peAltitude(P: number[], Q: number[], R: number[]): [number, number] {
    const dx = Q[0] - P[0]
    const dy = Q[1] - P[1]
    const distSq = dx * dx + dy * dy
    if (distSq === 0) return [P[0], P[1]]
    const t = ((R[0] - P[0]) * dx + (R[1] - P[1]) * dy) / distSq
    return [P[0] + t * dx, P[1] + t * dy]
}

/** Transform model coordinates to SVG viewport coordinates */
function toSVG(
    point: number[],
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    viewBox: { width: number; height: number },
    padding: number
): [number, number] {
    const rangeX = bounds.maxX - bounds.minX || 1
    const rangeY = bounds.maxY - bounds.minY || 1
    const scaleX = (viewBox.width - padding * 2) / rangeX
    const scaleY = (viewBox.height - padding * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)
    const offsetX = (viewBox.width - rangeX * scale) / 2
    const offsetY = (viewBox.height - rangeY * scale) / 2
    return [
        (point[0] - bounds.minX) * scale + offsetX,
        viewBox.height - ((point[1] - bounds.minY) * scale + offsetY), // flip Y
    ]
}

/** Inverse of toSVG: map SVG pixel coordinates back to model coordinates */
function fromSVG(
    svgPoint: [number, number],
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    viewBox: { width: number; height: number },
    padding: number
): [number, number] {
    const rangeX = bounds.maxX - bounds.minX || 1
    const rangeY = bounds.maxY - bounds.minY || 1
    const scaleX = (viewBox.width - padding * 2) / rangeX
    const scaleY = (viewBox.height - padding * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)
    const offsetX = (viewBox.width - rangeX * scale) / 2
    const offsetY = (viewBox.height - rangeY * scale) / 2
    const modelX = (svgPoint[0] - offsetX) / scale + bounds.minX
    const modelY = (viewBox.height - svgPoint[1] - offsetY) / scale + bounds.minY  // un-flip Y
    return [modelX, modelY]
}

// ─── Drag State Type ────────────────────────────────────────────────────

type DragState = {
    vertex: 'A' | 'B' | 'C'
    /** Current SVG position of the dragged vertex */
    svgPos: [number, number]
    /** Original SVG position at drag start (for ghost rendering) */
    originSvgPos: [number, number]
} | null

// ─── Tooltip Subcomponent ────────────────────────────────────────────────

function VertexTooltip({
    x, y, label, sublabel, value, color, r = 7, pulsing = false,
}: {
    x: number; y: number; label: string; sublabel?: string; value?: string
    color: string; r?: number; pulsing?: boolean
}) {
    const [hover, setHover] = useState(false)

    // Decide tooltip placement to avoid clipping
    const tooltipX = x > 400 ? x - 200 : x + 14
    const tooltipY = y < 80 ? y + 10 : y - 70

    return (
        <g>
            {/* Outer glow ring for pulsing points */}
            {pulsing && (
                <circle
                    cx={x} cy={y} r={r + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.3"
                >
                    <animate
                        attributeName="r"
                        values={`${r + 3};${r + 10};${r + 3}`}
                        dur="2.5s"
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        values="0.4;0.1;0.4"
                        dur="2.5s"
                        repeatCount="indefinite"
                    />
                </circle>
            )}

            {/* Main dot */}
            <circle
                cx={x} cy={y} r={r}
                fill={color}
                stroke="#0f172a"
                strokeWidth="2"
                className="cursor-pointer"
                style={{ transition: 'r 0.2s ease' }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            />

            {/* Hover tooltip */}
            {hover && (
                <foreignObject
                    x={tooltipX} y={tooltipY}
                    width={190} height={80}
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="bg-slate-900/95 backdrop-blur-md border border-slate-600/60 rounded-lg px-3 py-2 shadow-xl"
                        style={{ animation: 'fadeIn 0.15s ease-out' }}
                    >
                        <p className="text-xs font-bold" style={{ color }}>{label}</p>
                        {sublabel && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>
                        )}
                        {value && (
                            <p className="text-xs text-slate-200 font-mono mt-1">{value}</p>
                        )}
                    </div>
                </foreignObject>
            )}
        </g>
    )
}

// ─── Vertex Label ────────────────────────────────────────────────────────

function VertexLabel({
    x, y, label, anchor, color,
}: {
    x: number; y: number; label: string; anchor: 'start' | 'middle' | 'end'; color: string
}) {
    // Offset label away from vertex
    const offsetMap: Record<string, [number, number]> = {
        start: [12, 5],
        end: [-12, 5],
        middle: [0, -16],
    }
    const [ox, oy] = offsetMap[anchor]

    return (
        <text
            x={x + ox} y={y + oy}
            textAnchor={anchor}
            fill={color}
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
            {label}
        </text>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function CDTCanvas({
    cdt,
    className,
    showGrid = true,
    showOrthic = true,
    showMatedLine = true,
    showLabels = true,
    onVertexDrag,
    interactive = false,
    mode = 'tech',
    dashboardMode = false,
    cdtOverlay = null,
}: CDTCanvasProps) {
    // Sprint 5: Canvas maior no dashboard mode
    const VB_W = dashboardMode ? 800 : 600
    const VB_H = dashboardMode ? 560 : 420
    const PAD = 60

    // ─── Drag State ──────────────────────────────────────────────────
    const [drag, setDrag] = useState<DragState>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // ─── Compute all geometry ────────────────────────────────────────
    const geo = useMemo(() => {
        const A = cdt.A
        const B = cdt.B
        const C = cdt.C
        const centroide = cdt.centroide
        const nvo = cdt.nvo
        const baricentro = cdt.baricentro

        // Orthic triangle vertices (altitude feet)
        const Ha = peAltitude(B, C, A)
        const Hb = peAltitude(A, C, B)
        const Hc = peAltitude(A, B, C)

        // All points for bounding box
        const allPoints = [A, B, C, centroide, nvo, baricentro, Ha, Hb, Hc]
        const xs = allPoints.map(p => p[0])
        const ys = allPoints.map(p => p[1])
        const margin = 0.08
        const bounds = {
            minX: Math.min(...xs) - margin,
            maxX: Math.max(...xs) + margin,
            minY: Math.min(...ys) - margin,
            maxY: Math.max(...ys) + margin,
        }

        const viewBox = { width: VB_W, height: VB_H }
        const svgA = toSVG(A, bounds, viewBox, PAD)
        const svgB = toSVG(B, bounds, viewBox, PAD)
        const svgC = toSVG(C, bounds, viewBox, PAD)
        const svgCentroide = toSVG(centroide, bounds, viewBox, PAD)
        const svgNVO = toSVG(nvo, bounds, viewBox, PAD)
        const svgHa = toSVG(Ha, bounds, viewBox, PAD)
        const svgHb = toSVG(Hb, bounds, viewBox, PAD)
        const svgHc = toSVG(Hc, bounds, viewBox, PAD)

        // G3: Zona de Sensibilidade Mínima — raio SVG correspondente a ε=0.05 (limiar OTIMO)
        const rangeX = bounds.maxX - bounds.minX || 1
        const rangeY = bounds.maxY - bounds.minY || 1
        const scaleX = (VB_W - PAD * 2) / rangeX
        const scaleY = (VB_H - PAD * 2) / rangeY
        const svgScale = Math.min(scaleX, scaleY)
        const zsm_radius = 0.05 * svgScale  // Zona de Sensibilidade Mínima MATED (ε=0.05)

        return { svgA, svgB, svgC, svgCentroide, svgNVO, svgHa, svgHb, svgHc, bounds, viewBox, zsm_radius }
    }, [cdt])

    const zone = ZONE_COLORS[cdt.zona_mated]
    const qualityPct = cdt.desvio_qualidade !== null
        ? cdt.desvio_qualidade.toFixed(1)
        : ((1 - cdt.mated_distancia) * 100).toFixed(1)

    // EP-ESCALENO: Detectar protocolo β/γ (obtuso) — triângulo invertido
    const isObtuso = cdt.forma_triangulo === 'obtusangulo_c' || cdt.forma_triangulo === 'obtusangulo_p'

    // ─── SVG Gradient IDs (unique per instance) ─────────────────────
    const gradId = useMemo(() => `cdt-grad-${Math.random().toString(36).slice(2, 8)}`, [])
    const glowId = `${gradId}-glow`
    const dragGlowId = `${gradId}-drag-glow`

    // ─── SVG coordinate conversion from pointer event ─────────────────
    const pointerToSVG = useCallback((e: React.PointerEvent<SVGSVGElement>): [number, number] => {
        const svg = svgRef.current
        if (!svg) return [0, 0]
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const ctm = svg.getScreenCTM()
        if (!ctm) return [0, 0]
        const svgPt = pt.matrixTransform(ctm.inverse())
        return [svgPt.x, svgPt.y]
    }, [])

    // ─── Drag Handlers ───────────────────────────────────────────────
    const handlePointerDown = useCallback((vertex: 'A' | 'B' | 'C', e: React.PointerEvent<SVGCircleElement>) => {
        if (!interactive) return
        e.preventDefault()
        e.stopPropagation()
        ;(e.target as SVGCircleElement).setPointerCapture(e.pointerId)
        const originMap = { A: geo.svgA, B: geo.svgB, C: geo.svgC }
        setDrag({
            vertex,
            svgPos: [...originMap[vertex]] as [number, number],
            originSvgPos: [...originMap[vertex]] as [number, number],
        })
    }, [interactive, geo])

    const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        if (!drag) return
        e.preventDefault()
        const svgPos = pointerToSVG(e)
        // Clamp to viewBox
        const clamped: [number, number] = [
            Math.max(PAD, Math.min(VB_W - PAD, svgPos[0])),
            Math.max(PAD, Math.min(VB_H - PAD, svgPos[1])),
        ]
        setDrag(prev => prev ? { ...prev, svgPos: clamped } : null)
    }, [drag, pointerToSVG])

    const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
        if (!drag) return
        e.preventDefault()
        const modelPos = fromSVG(drag.svgPos, geo.bounds, { width: VB_W, height: VB_H }, PAD)
        onVertexDrag?.(drag.vertex, modelPos)
        setDrag(null)
    }, [drag, geo.bounds, onVertexDrag])

    // ─── Effective vertex positions (dragged or original) ─────────────
    const effectiveSvgA = drag?.vertex === 'A' ? drag.svgPos : geo.svgA
    const effectiveSvgB = drag?.vertex === 'B' ? drag.svgPos : geo.svgB
    const effectiveSvgC = drag?.vertex === 'C' ? drag.svgPos : geo.svgC

    // ─── Recompute orthic and centroide during drag ───────────────────
    const dragGeo = useMemo(() => {
        if (!drag) return null
        // Convert effective SVG positions back to model space for orthic calculation
        const vb = { width: VB_W, height: VB_H }
        const mA = fromSVG(effectiveSvgA, geo.bounds, vb, PAD)
        const mB = fromSVG(effectiveSvgB, geo.bounds, vb, PAD)
        const mC = fromSVG(effectiveSvgC, geo.bounds, vb, PAD)
        const Ha = peAltitude(mB, mC, mA)
        const Hb = peAltitude(mA, mC, mB)
        const Hc = peAltitude(mA, mB, mC)
        return {
            svgHa: toSVG(Ha, geo.bounds, vb, PAD),
            svgHb: toSVG(Hb, geo.bounds, vb, PAD),
            svgHc: toSVG(Hc, geo.bounds, vb, PAD),
            svgCentroide: toSVG(
                [(mA[0] + mB[0] + mC[0]) / 3, (mA[1] + mB[1] + mC[1]) / 3],
                geo.bounds, vb, PAD
            ),
        }
    }, [drag, effectiveSvgA, effectiveSvgB, effectiveSvgC, geo.bounds])

    // Use drag-updated orthic/centroide if dragging, otherwise originals
    const activeSvgHa = dragGeo?.svgHa ?? geo.svgHa
    const activeSvgHb = dragGeo?.svgHb ?? geo.svgHb
    const activeSvgHc = dragGeo?.svgHc ?? geo.svgHc
    const activeSvgCentroide = dragGeo?.svgCentroide ?? geo.svgCentroide

    // ─── Drag delta display ───────────────────────────────────────────
    const dragDelta = useMemo(() => {
        if (!drag) return null
        const dx = drag.svgPos[0] - drag.originSvgPos[0]
        const dy = drag.svgPos[1] - drag.originSvgPos[1]
        // Also compute model-space delta
        const vb = { width: VB_W, height: VB_H }
        const modelOrigin = fromSVG(drag.originSvgPos, geo.bounds, vb, PAD)
        const modelCurrent = fromSVG(drag.svgPos, geo.bounds, vb, PAD)
        return {
            svgDx: dx, svgDy: dy,
            modelDx: modelCurrent[0] - modelOrigin[0],
            modelDy: modelCurrent[1] - modelOrigin[1],
        }
    }, [drag, geo.bounds])

    return (
        <div className={cn('relative w-full', className)}>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                className="w-full h-auto"
                style={{
                    maxHeight: '480px',
                    touchAction: interactive ? 'none' : undefined,
                    cursor: drag ? 'grabbing' : undefined,
                }}
                role="img"
                aria-label={`Triangulo CDT - Zona ${cdt.zona_mated}`}
                onPointerMove={interactive ? handlePointerMove : undefined}
                onPointerUp={interactive ? handlePointerUp : undefined}
                onPointerLeave={interactive ? handlePointerUp : undefined}
            >
                <defs>
                    {/* Zone-colored radial gradient for triangle fill */}
                    <radialGradient id={gradId} cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor={zone.stroke} stopOpacity="0.12" />
                        <stop offset="60%" stopColor={zone.stroke} stopOpacity="0.06" />
                        <stop offset="100%" stopColor={zone.stroke} stopOpacity="0.01" />
                    </radialGradient>

                    {/* Glow filter for NVO */}
                    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Glow filter for dragged vertex */}
                    <filter id={dragGlowId} x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feFlood floodColor="#fbbf24" floodOpacity="0.6" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Dashed stroke pattern for orthic */}
                    <pattern id={`${gradId}-dots`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.5" fill={GRID_COLOR} />
                    </pattern>
                </defs>

                {/* ═══ Background ═══ */}
                <rect x="0" y="0" width={VB_W} height={VB_H} fill="#0f172a" rx="12" />

                {/* ═══ Subtle Grid ═══ */}
                {showGrid && (
                    <g opacity="0.25">
                        {Array.from({ length: 13 }, (_, i) => i * 50).map(x => (
                            <line
                                key={`gx-${x}`}
                                x1={x} y1={0} x2={x} y2={VB_H}
                                stroke={GRID_COLOR} strokeWidth="0.5"
                            />
                        ))}
                        {Array.from({ length: 9 }, (_, i) => i * 50).map(y => (
                            <line
                                key={`gy-${y}`}
                                x1={0} y1={y} x2={VB_W} y2={y}
                                stroke={GRID_COLOR} strokeWidth="0.5"
                            />
                        ))}
                    </g>
                )}

                {/* ═══ Ghost triangle (original position during drag) ═══ */}
                {drag && (
                    <g opacity="0.2">
                        <polygon
                            points={`${geo.svgA.join(',')} ${geo.svgB.join(',')} ${geo.svgC.join(',')}`}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                        />
                        {/* Ghost vertex dot at original position */}
                        <circle
                            cx={drag.originSvgPos[0]} cy={drag.originSvgPos[1]}
                            r={6} fill="#94a3b8" opacity="0.5"
                        />
                    </g>
                )}

                {/* ═══ Main Triangle Fill (zone-colored gradient) ═══ */}
                <polygon
                    points={`${effectiveSvgA.join(',')} ${effectiveSvgB.join(',')} ${effectiveSvgC.join(',')}`}
                    fill={`url(#${gradId})`}
                />

                {/* ═══ Main Triangle Edges — espessura escalena (lado maior = mais grosso) ═══ */}
                {(() => {
                    const sE = cdt.lados.escopo, sC = cdt.lados.orcamento, sP = cdt.lados.prazo
                    const mx = Math.max(sE, sC, sP, 0.01)
                    // Sprint 5: linhas mais grossas no dashboardMode (melhor visibilidade)
                    const sw = (s: number) => dashboardMode
                        ? 2.5 + (s / mx) * 5.0   // range 2.5–7.5px (dashboard — bold)
                        : 1.5 + (s / mx) * 3.5    // range 1.5–5px (normal)
                    return (
                        <>
                            {/* Side A→B = Escopo (E) */}
                            <line x1={effectiveSvgA[0]} y1={effectiveSvgA[1]} x2={effectiveSvgB[0]} y2={effectiveSvgB[1]}
                                stroke={CDT_COLORS.escopo} strokeWidth={sw(sE)} strokeLinecap="round" />
                            {/* Side B→C = Custo (C/Orcamento) */}
                            <line x1={effectiveSvgB[0]} y1={effectiveSvgB[1]} x2={effectiveSvgC[0]} y2={effectiveSvgC[1]}
                                stroke={CDT_COLORS.custo} strokeWidth={sw(sC)} strokeLinecap="round" />
                            {/* Side C→A = Prazo (P) */}
                            <line x1={effectiveSvgC[0]} y1={effectiveSvgC[1]} x2={effectiveSvgA[0]} y2={effectiveSvgA[1]}
                                stroke={CDT_COLORS.prazo} strokeWidth={sw(sP)} strokeLinecap="round" />
                        </>
                    )
                })()}

                {/* ═══ Sprint 6 Req D: Overlay de decisão (triângulo projetado) ═══ */}
                {cdtOverlay && (() => {
                    const oA = toSVG(cdtOverlay.A, geo.bounds, geo.viewBox, PAD)
                    const oB = toSVG(cdtOverlay.B, geo.bounds, geo.viewBox, PAD)
                    const oC = toSVG(cdtOverlay.C, geo.bounds, geo.viewBox, PAD)
                    return (
                        <g opacity="0.35">
                            <polygon
                                points={`${oA.join(',')} ${oB.join(',')} ${oC.join(',')}`}
                                fill="rgba(255,255,255,0.05)"
                                stroke="#ffffff"
                                strokeWidth="2"
                                strokeDasharray="8 4"
                            />
                            <title>Triângulo projetado — resultado da decisão simulada</title>
                        </g>
                    )
                })()}

                {/* ═══ Orthic Triangle (ZRE) — somente protocolo α (agudo) ═══ */}
                {showOrthic && !isObtuso && (
                    <g>
                        <polygon
                            points={`${activeSvgHa.join(',')} ${activeSvgHb.join(',')} ${activeSvgHc.join(',')}`}
                            fill={`${ORTHIC_COLOR}08`}
                            stroke={ORTHIC_COLOR}
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            opacity="0.6"
                        />
                        <circle cx={activeSvgHa[0]} cy={activeSvgHa[1]} r="3" fill={ORTHIC_COLOR} opacity="0.5" />
                        <circle cx={activeSvgHb[0]} cy={activeSvgHb[1]} r="3" fill={ORTHIC_COLOR} opacity="0.5" />
                        <circle cx={activeSvgHc[0]} cy={activeSvgHc[1]} r="3" fill={ORTHIC_COLOR} opacity="0.5" />
                        {showLabels && (
                            <text
                                x={(activeSvgHa[0] + activeSvgHb[0] + activeSvgHc[0]) / 3}
                                y={(activeSvgHa[1] + activeSvgHb[1] + activeSvgHc[1]) / 3 + 4}
                                textAnchor="middle"
                                fill={ORTHIC_COLOR}
                                fontSize="9"
                                fontWeight="600"
                                opacity="0.5"
                                fontFamily="system-ui, sans-serif"
                            >
                                ZRE
                            </text>
                        )}
                    </g>
                )}

                {/* ═══ Badge regime obtuso (sem traslado diagonais) ═══ */}
                {isObtuso && (
                    <g>
                        <rect
                            x={12} y={VB_H - 32}
                            width={160} height={22}
                            rx="6"
                            fill="#0f172aE0"
                            stroke="#f59e0b"
                            strokeWidth="1"
                            opacity="0.9"
                        />
                        <text x={20} y={VB_H - 17}
                            fill="#fbbf24" fontSize="9" fontWeight="700"
                            fontFamily="system-ui, sans-serif">
                            {cdt.forma_triangulo === 'obtusangulo_c'
                                ? 'Protocolo β — Custo obtuso'
                                : 'Protocolo γ — Prazo obtuso'}
                        </text>
                    </g>
                )}

                {/* ═══ MATED Distance Line — só agudo ═══ */}
                {showMatedLine && !isObtuso && (
                    <g>
                        <line
                            x1={activeSvgCentroide[0]} y1={activeSvgCentroide[1]}
                            x2={geo.svgNVO[0]} y2={geo.svgNVO[1]}
                            stroke={MATED_LINE_COLOR}
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            opacity="0.7"
                        />
                        {/* MATED distance label at midpoint */}
                        {showLabels && !drag && (
                            <text
                                x={(activeSvgCentroide[0] + geo.svgNVO[0]) / 2 + 8}
                                y={(activeSvgCentroide[1] + geo.svgNVO[1]) / 2 - 6}
                                fill={MATED_LINE_COLOR}
                                fontSize="10"
                                fontWeight="600"
                                fontFamily="system-ui, sans-serif"
                                opacity="0.8"
                            >
                                d={cdt.mated_distancia.toFixed(3)}
                            </text>
                        )}
                    </g>
                )}

                {/* ═══ Edge Labels (side values) ═══ */}
                {showLabels && !drag && (
                    <g>
                        {/* E (Escopo) label — midpoint of A→B */}
                        <text
                            x={(effectiveSvgA[0] + effectiveSvgB[0]) / 2}
                            y={(effectiveSvgA[1] + effectiveSvgB[1]) / 2 + 18}
                            textAnchor="middle"
                            fill={CDT_COLORS.escopo}
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="system-ui, sans-serif"
                            opacity="0.7"
                        >
                            E={cdt.lados.escopo.toFixed(3)}
                        </text>

                        {/* C (Custo) label — midpoint of B→C */}
                        <text
                            x={(effectiveSvgB[0] + effectiveSvgC[0]) / 2 + 14}
                            y={(effectiveSvgB[1] + effectiveSvgC[1]) / 2}
                            textAnchor="start"
                            fill={CDT_COLORS.custo}
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="system-ui, sans-serif"
                            opacity="0.7"
                        >
                            C={cdt.lados.orcamento.toFixed(3)}
                        </text>

                        {/* P (Prazo) label — midpoint of C→A */}
                        <text
                            x={(effectiveSvgC[0] + effectiveSvgA[0]) / 2 - 14}
                            y={(effectiveSvgC[1] + effectiveSvgA[1]) / 2}
                            textAnchor="end"
                            fill={CDT_COLORS.prazo}
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="system-ui, sans-serif"
                            opacity="0.7"
                        >
                            P={cdt.lados.prazo.toFixed(3)}
                        </text>
                    </g>
                )}

                {/* ═══ Sprint 4 Req J: Arcos de ângulo α/ω/ε (Clairaut) ═══ */}
                {(() => {
                    const [Ax, Ay] = effectiveSvgA
                    const [Bx, By] = effectiveSvgB
                    const [Cx, Cy] = effectiveSvgC
                    const sE = cdt.lados.escopo, sC = cdt.lados.orcamento, sP = cdt.lados.prazo
                    const cc = (v: number) => Math.max(-1, Math.min(1, v))
                    const toDeg = (r: number) => r * 180 / Math.PI
                    const angOmega = toDeg(Math.acos(cc((sE*sE + sP*sP - sC*sC) / (2*sE*sP || 1))))
                    const angAlpha = toDeg(Math.acos(cc((sE*sE + sC*sC - sP*sP) / (2*sE*sC || 1))))
                    const angEpsilon = toDeg(Math.acos(cc((sC*sC + sP*sP - sE*sE) / (2*sC*sP || 1))))
                    const corAng = (deg: number) => deg > 90 ? '#ef4444' : deg > 75 ? '#f59e0b' : '#10b981'
                    const arcR = 18
                    const mkArc = (cx: number, cy: number, a1: number, a2: number) => {
                        const toR = (d: number) => (d * Math.PI) / 180
                        let s = a1, e = a2
                        if (Math.abs(e - s) > 180) { if (e > s) s += 360; else e += 360 }
                        if (s > e) { const t = s; s = e; e = t }
                        return `M ${cx + arcR * Math.cos(toR(s))} ${cy + arcR * Math.sin(toR(s))} A ${arcR} ${arcR} 0 ${Math.abs(e-s)>180?1:0} 1 ${cx + arcR * Math.cos(toR(e))} ${cy + arcR * Math.sin(toR(e))}`
                    }
                    const aA1 = Math.atan2(By-Ay, Bx-Ax)*180/Math.PI, aA2 = Math.atan2(Cy-Ay, Cx-Ax)*180/Math.PI
                    const aB1 = Math.atan2(Ay-By, Ax-Bx)*180/Math.PI, aB2 = Math.atan2(Cy-By, Cx-Bx)*180/Math.PI
                    const aC1 = Math.atan2(Ay-Cy, Ax-Cx)*180/Math.PI, aC2 = Math.atan2(By-Cy, Bx-Cx)*180/Math.PI
                    return (
                        <g opacity="0.8">
                            <path d={mkArc(Ax, Ay, aA1, aA2)} fill="none" stroke={corAng(angOmega)} strokeWidth="1.2" />
                            <path d={mkArc(Bx, By, aB1, aB2)} fill="none" stroke={corAng(angAlpha)} strokeWidth="1.2" />
                            <path d={mkArc(Cx, Cy, aC1, aC2)} fill="none" stroke={corAng(angEpsilon)} strokeWidth="1.2" />
                            <text x={Ax + 14} y={Ay - 3} fill={corAng(angOmega)} fontSize="10" fontWeight="700" fontFamily="serif" fontStyle="italic">ω</text>
                            <text x={Ax + 14} y={Ay + 8} fill="#94a3b8" fontSize="7">{angOmega.toFixed(1)}°</text>
                            <text x={Bx - 14} y={By - 3} fill={corAng(angAlpha)} fontSize="10" fontWeight="700" fontFamily="serif" fontStyle="italic" textAnchor="end">α</text>
                            <text x={Bx - 14} y={By + 8} fill="#94a3b8" fontSize="7" textAnchor="end">{angAlpha.toFixed(1)}°</text>
                            <text x={Cx} y={Cy - 14} fill={corAng(angEpsilon)} fontSize="10" fontWeight="700" fontFamily="serif" fontStyle="italic" textAnchor="middle">ε</text>
                            <text x={Cx} y={Cy - 4} fill="#94a3b8" fontSize="7" textAnchor="middle">{angEpsilon.toFixed(1)}°</text>
                        </g>
                    )
                })()}

                {/* ═══ G3: Zona de Sensibilidade Mínima — só agudo ═══ */}
                {!isObtuso && (
                    <circle
                        cx={geo.svgNVO[0]} cy={geo.svgNVO[1]} r={geo.zsm_radius}
                        fill="none" stroke={NVO_COLOR} strokeWidth="1"
                        strokeDasharray="4 3" opacity="0.35">
                        <title>Zona de Sensibilidade Mínima MATED (ε=0.05)</title>
                    </circle>
                )}

                {/* ═══ NVO Point (pulsing) ═══ */}
                <VertexTooltip
                    x={geo.svgNVO[0]}
                    y={geo.svgNVO[1]}
                    label="NVO"
                    sublabel={`Nucleo Viavel Otimo (${cdt.nvo_tipo})`}
                    value={`(${cdt.nvo[0].toFixed(3)}, ${cdt.nvo[1].toFixed(3)})`}
                    color={NVO_COLOR}
                    r={6}
                    pulsing
                />

                {/* ═══ Centroide Point (current state) ═══ */}
                <VertexTooltip
                    x={activeSvgCentroide[0]}
                    y={activeSvgCentroide[1]}
                    label="Centroide"
                    sublabel="Ponto de Operacao Atual"
                    value={`(${cdt.centroide[0].toFixed(3)}, ${cdt.centroide[1].toFixed(3)})`}
                    color={CENTROIDE_COLOR}
                    r={5}
                />

                {/* ═══ Vertex Points with Tooltips ═══ */}
                {/* A — Escopo vertex */}
                {drag?.vertex !== 'A' && (
                    <VertexTooltip
                        x={effectiveSvgA[0]}
                        y={effectiveSvgA[1]}
                        label={`${translateLabel('E', mode)} (E)`}
                        sublabel={translateTooltip('E', mode)}
                        value={`Bruto: ${cdt.lados_brutos.E.toFixed(3)} | Norm: ${cdt.lados.escopo.toFixed(3)}`}
                        color={CDT_COLORS.escopo}
                        r={interactive ? 8 : 8}
                    />
                )}

                {/* B — Custo/Orcamento vertex */}
                {drag?.vertex !== 'B' && (
                    <VertexTooltip
                        x={effectiveSvgB[0]}
                        y={effectiveSvgB[1]}
                        label={`${translateLabel('O', mode)} (O)`}
                        sublabel={translateTooltip('O', mode)}
                        value={`Bruto: ${cdt.lados_brutos.C.toFixed(3)} | Norm: ${cdt.lados.orcamento.toFixed(3)}`}
                        color={CDT_COLORS.custo}
                        r={interactive ? 8 : 8}
                    />
                )}

                {/* C — Prazo vertex */}
                {drag?.vertex !== 'C' && (
                    <VertexTooltip
                        x={effectiveSvgC[0]}
                        y={effectiveSvgC[1]}
                        label={`${translateLabel('P', mode)} (P)`}
                        sublabel={translateTooltip('P', mode)}
                        value={`Bruto: ${cdt.lados_brutos.P.toFixed(3)} | Norm: ${cdt.lados.prazo.toFixed(3)}`}
                        color={CDT_COLORS.prazo}
                        r={interactive ? 8 : 8}
                    />
                )}

                {/* ═══ Interactive Drag Hit Areas (larger, invisible targets) ═══ */}
                {interactive && !drag && (
                    <g>
                        {(['A', 'B', 'C'] as const).map(v => {
                            const pos = { A: effectiveSvgA, B: effectiveSvgB, C: effectiveSvgC }[v]
                            return (
                                <circle
                                    key={`drag-hit-${v}`}
                                    cx={pos[0]} cy={pos[1]}
                                    r={15}
                                    fill="transparent"
                                    stroke="transparent"
                                    style={{ cursor: 'grab' }}
                                    onPointerDown={(e) => handlePointerDown(v, e)}
                                >
                                    <title>Drag vertex {v}</title>
                                </circle>
                            )
                        })}
                    </g>
                )}

                {/* ═══ Dragged Vertex (with glow) ═══ */}
                {drag && (
                    <g filter={`url(#${dragGlowId})`}>
                        <circle
                            cx={drag.svgPos[0]} cy={drag.svgPos[1]}
                            r={12}
                            fill={
                                drag.vertex === 'A' ? CDT_COLORS.escopo
                                    : drag.vertex === 'B' ? CDT_COLORS.custo
                                        : CDT_COLORS.prazo
                            }
                            stroke="#fbbf24"
                            strokeWidth="2.5"
                            style={{ cursor: 'grabbing' }}
                        />
                    </g>
                )}

                {/* ═══ Drag Delta Label ═══ */}
                {drag && dragDelta && (
                    <g>
                        <rect
                            x={drag.svgPos[0] + 18}
                            y={drag.svgPos[1] - 28}
                            width={120}
                            height={22}
                            rx="4"
                            fill="#0f172aE0"
                            stroke="#fbbf2450"
                            strokeWidth="1"
                        />
                        <text
                            x={drag.svgPos[0] + 24}
                            y={drag.svgPos[1] - 13}
                            fill="#fbbf24"
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="ui-monospace, monospace"
                        >
                            {'\u0394'}x={dragDelta.modelDx >= 0 ? '+' : ''}{dragDelta.modelDx.toFixed(3)}
                            {' '}
                            {'\u0394'}y={dragDelta.modelDy >= 0 ? '+' : ''}{dragDelta.modelDy.toFixed(3)}
                        </text>
                    </g>
                )}

                {/* ═══ Vertex Name Labels ═══ */}
                {showLabels && (
                    <g>
                        <VertexLabel x={effectiveSvgA[0]} y={effectiveSvgA[1]} label={translateLabel('E', mode)} anchor="end" color={CDT_COLORS.escopo} />
                        <VertexLabel x={effectiveSvgB[0]} y={effectiveSvgB[1]} label={translateLabel('O', mode)} anchor="start" color={CDT_COLORS.custo} />
                        <VertexLabel x={effectiveSvgC[0]} y={effectiveSvgC[1]} label={translateLabel('P', mode)} anchor="middle" color={CDT_COLORS.prazo} />
                    </g>
                )}

                {/* ═══ Zone Badge Overlay ═══ */}
                <g>
                    {/* Badge background */}
                    <rect
                        x={VB_W - 155}
                        y={12}
                        width={143}
                        height={56}
                        rx="10"
                        fill="#0f172aE0"
                        stroke={zone.stroke}
                        strokeWidth="1.5"
                        opacity="0.95"
                    />

                    {/* Zone indicator dot */}
                    <circle cx={VB_W - 140} cy={32} r="5" fill={zone.stroke}>
                        <animate
                            attributeName="opacity"
                            values="1;0.4;1"
                            dur="2s"
                            repeatCount="indefinite"
                        />
                    </circle>

                    {/* Zone label */}
                    <text
                        x={VB_W - 128}
                        y={36}
                        fill={zone.text}
                        fontSize="13"
                        fontWeight="800"
                        fontFamily="system-ui, sans-serif"
                        letterSpacing="0.05em"
                    >
                        {zone.label}
                    </text>

                    {/* Quality percentage */}
                    <text
                        x={VB_W - 140}
                        y={56}
                        fill="#94a3b8"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                    >
                        Qualidade: {qualityPct}%
                    </text>
                </g>

                {/* ═══ CEt Validity Indicator ═══ */}
                <g>
                    <rect
                        x={12}
                        y={12}
                        width={100}
                        height={28}
                        rx="8"
                        fill="#0f172aD0"
                        stroke={cdt.cet.valida ? '#10b98140' : '#f43f5e40'}
                        strokeWidth="1"
                    />
                    <circle
                        cx={28}
                        cy={26}
                        r="4"
                        fill={cdt.cet.valida ? '#10b981' : '#f43f5e'}
                    />
                    <text
                        x={40}
                        y={30}
                        fill={cdt.cet.valida ? '#34d399' : '#fb7185'}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="system-ui, sans-serif"
                    >
                        CEt {cdt.cet.valida ? 'Valida' : 'Violada'}
                    </text>
                </g>

                {/* ═══ EP-ESCALENO: Protocolo β/γ Badge (obtuso) ═══ */}
                {isObtuso && (
                    <g>
                        <rect
                            x={12} y={82}
                            width={140} height={28}
                            rx="8" fill="#0f172aD0"
                            stroke="#f59e0b40" strokeWidth="1"
                        />
                        <text x={24} y={101}
                            fill="#fbbf24" fontSize="10" fontWeight="700"
                            fontFamily="system-ui, sans-serif"
                        >
                            {cdt.forma_triangulo === 'obtusangulo_c' ? 'Protocolo β (Custo)' : 'Protocolo γ (Prazo)'}
                        </text>
                        <text x={VB_W / 2} y={VB_H - 8}
                            textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="600"
                            fontFamily="system-ui, sans-serif" opacity="0.6"
                        >
                            Triangulo invertido — Escopo no teto · NVO = Baricentro TM (sem ortico)
                        </text>
                    </g>
                )}

                {/* ═══ NVO Type Indicator ═══ */}
                <g>
                    <rect
                        x={12}
                        y={46}
                        width={108}
                        height={24}
                        rx="6"
                        fill="#0f172aD0"
                        stroke={`${NVO_COLOR}30`}
                        strokeWidth="1"
                    />
                    <text
                        x={20}
                        y={62}
                        fill={NVO_COLOR}
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                        opacity="0.8"
                    >
                        NVO: {cdt.nvo_tipo === 'ortico' ? 'Baricentro Ortico' : cdt.nvo_tipo === 'centroide_tm' ? 'Centroide TM' : 'Incentro'}
                    </text>
                </g>

                {/* ═══ Area Info (bottom-left) ═══ */}
                <g>
                    <rect
                        x={12}
                        y={VB_H - 52}
                        width={160}
                        height={40}
                        rx="8"
                        fill="#0f172aD0"
                        stroke={`${GRID_COLOR}`}
                        strokeWidth="1"
                    />
                    <text
                        x={20}
                        y={VB_H - 34}
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                    >
                        Area CDT: {cdt.cdt_area.toFixed(4)}
                    </text>
                    <text
                        x={20}
                        y={VB_H - 20}
                        fill={ORTHIC_COLOR}
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                        opacity="0.7"
                    >
                        Area Ortico (ZRE): {cdt.cdt_area_ortico.toFixed(4)}
                    </text>
                </g>

                {/* ═══ MATED Inside/Outside Badge (bottom-right) ═══ */}
                <g>
                    <rect
                        x={VB_W - 172}
                        y={VB_H - 36}
                        width={160}
                        height={24}
                        rx="6"
                        fill="#0f172aD0"
                        stroke={cdt.mated_inside_ortico ? '#10b98130' : '#f59e0b30'}
                        strokeWidth="1"
                    />
                    <circle
                        cx={VB_W - 157}
                        cy={VB_H - 24}
                        r="3"
                        fill={cdt.mated_inside_ortico ? '#10b981' : '#f59e0b'}
                    />
                    <text
                        x={VB_W - 148}
                        y={VB_H - 20}
                        fill={cdt.mated_inside_ortico ? '#34d399' : '#fbbf24'}
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                    >
                        Centroide {cdt.mated_inside_ortico ? 'dentro' : 'fora'} do ZRE
                    </text>
                </g>

                {/* ═══ CDT Version watermark ═══ */}
                <text
                    x={VB_W - 12}
                    y={VB_H - 6}
                    textAnchor="end"
                    fill="#334155"
                    fontSize="8"
                    fontFamily="system-ui, sans-serif"
                >
                    CDT v{cdt.cdt_version}
                </text>
            </svg>
        </div>
    )
}
