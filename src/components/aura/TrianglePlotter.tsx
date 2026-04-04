'use client'

// Story 7.0 — MASTERPLAN-X Sprint 2: TrianglePlotter
// Visualização das curvas reais (custo + prazo) ao longo do tempo.
// Camadas: curvas, A_mancha, linha y₀, marcador de forma, diagnóstico técnico.
// Painel de controle de camadas colapsável.

import { useState, useMemo, useRef } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'

interface TrianglePlotterProps {
    curvaCusto: { x: number; y: number }[]
    curvaPrazo: { x: number; y: number }[]
    prazoBase: number
    /** y₀ em BRL absoluto — será normalizado internamente */
    custoMobilizacao?: number
    /** Forma geométrica atual: 'acutangulo' | 'obtusangulo_c' | 'obtusangulo_p' | 'retangulo' | 'invalido' */
    formaTriangulo?: string
    /** Dia atual do projeto (para marcador vertical) */
    diaAtual?: number
    className?: string
}

// ─── Constantes visuais ──────────────────────────────────────────────────────
const VB_W = 560
const VB_H = 220
const PAD_L = 36   // espaço para labels eixo Y
const PAD_B = 24   // espaço para labels eixo X
const PAD_T = 12
const PAD_R = 12

const PLOT_W = VB_W - PAD_L - PAD_R
const PLOT_H = VB_H - PAD_T - PAD_B

// Mapeamento forma → badge color
const FORMA_COLOR: Record<string, string> = {
    acutangulo:    '#10b981',  // emerald
    obtusangulo_c: '#f59e0b',  // amber
    obtusangulo_p: '#f59e0b',
    retangulo:     '#f97316',  // orange
    invalido:      '#f43f5e',  // rose
}

const FORMA_LABEL: Record<string, string> = {
    acutangulo:    'Acutangulo',
    obtusangulo_c: 'Obtusangulo C',
    obtusangulo_p: 'Obtusangulo P',
    retangulo:     'Retangulo (!)',
    invalido:      'invalido',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normaliza curva Y para [0, 1] — retorna array com x normalizado em [0,1] e y em [0,1] */
function normalizeCurva(
    curva: { x: number; y: number }[],
    xMax: number,
    yMax: number,
    yDivisor?: number,
): [number, number][] {
    const yDiv = yDivisor ?? yMax
    return curva.map(p => [
        xMax > 0 ? p.x / xMax : 0,
        yDiv > 0 ? p.y / yDiv : 0,
    ])
}

/** Converte ponto [0,1] para SVG pixel coords dentro da área de plot */
function toPlot(nx: number, ny: number): [number, number] {
    return [
        PAD_L + nx * PLOT_W,
        PAD_T + (1 - ny) * PLOT_H,  // Y invertido: 0 na base, 1 no topo
    ]
}

/** Gera string de pontos SVG para polyline */
function toPolylinePoints(points: [number, number][]): string {
    return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

/** Gera path SVG para área preenchida (fecha no eixo X) */
function toAreaPath(points: [number, number][]): string {
    if (points.length === 0) return ''
    const [x0, y0] = points[0]
    const [xl] = points[points.length - 1]
    const [, yBase] = toPlot(0, 0)
    const lines = points.slice(1).map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} ${lines} L ${xl.toFixed(1)} ${yBase.toFixed(1)} L ${x0.toFixed(1)} ${yBase.toFixed(1)} Z`
}

/** Gera path SVG para A_mancha: max(C_norm, P_norm) — área de cobertura total */
function toManchaPath(
    curvaCNorm: [number, number][],
    curvaPNorm: [number, number][],
): string {
    if (curvaCNorm.length === 0 || curvaPNorm.length === 0) return ''

    // Interpola curvaPrazo no tempo de curvaCusto (ou vice-versa — usar custo como base)
    const pMap = new Map<number, number>()
    curvaPNorm.forEach(([x, y]) => pMap.set(Math.round(x * 1000), y))

    // Ordenar keys uma vez fora do map — evita O(N log N) por ponto
    const keys = Array.from(pMap.keys()).sort((a, b) => a - b)

    const manchaPoints: [number, number][] = curvaCNorm.map(([cx, cy]) => {
        const pKey = Math.round(cx * 1000)
        // Interpolação linear mais próxima entre pontos adjacentes do prazo
        let pY = 0
        for (let i = 0; i < keys.length - 1; i++) {
            if (pKey >= keys[i] && pKey <= keys[i + 1]) {
                const t = (pKey - keys[i]) / (keys[i + 1] - keys[i])
                pY = (pMap.get(keys[i]) ?? 0) * (1 - t) + (pMap.get(keys[i + 1]) ?? 0) * t
                break
            }
        }
        pY = pMap.get(pKey) ?? pY
        return [cx, Math.max(cy, pY)]
    })

    const svgPoints = manchaPoints.map(([nx, ny]) => toPlot(nx, ny))
    return toAreaPath(svgPoints)
}

/** Interpola linearmente um valor y para um dado x na curva */
function interpolateCurva(curva: { x: number; y: number }[], x: number): number {
    if (curva.length === 0) return 0
    if (x <= curva[0].x) return curva[0].y
    if (x >= curva[curva.length - 1].x) return curva[curva.length - 1].y
    for (let i = 0; i < curva.length - 1; i++) {
        if (x >= curva[i].x && x <= curva[i + 1].x) {
            const t = (x - curva[i].x) / (curva[i + 1].x - curva[i].x)
            return curva[i].y + t * (curva[i + 1].y - curva[i].y)
        }
    }
    return 0
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ─── Layer Control Panel ─────────────────────────────────────────────────────

interface LayerState {
    curvaCusto: boolean
    curvaPrazo: boolean
    aMancha: boolean
    y0Line: boolean
    labels: boolean
    diaAtualLine: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function TrianglePlotter({
    curvaCusto,
    curvaPrazo,
    prazoBase,
    custoMobilizacao,
    formaTriangulo,
    diaAtual = 0,
    className = '',
}: TrianglePlotterProps) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [hoverInfo, setHoverInfo] = useState<{
        dia: number; custo: number; progresso: number; px: number; py: number
    } | null>(null)

    const [layerPanelOpen, setLayerPanelOpen] = useState(false)
    const [layers, setLayers] = useState<LayerState>({
        curvaCusto: true,
        curvaPrazo: true,
        aMancha: true,
        y0Line: true,
        labels: true,
        diaAtualLine: true,
    })

    const toggleLayer = (key: keyof LayerState) =>
        setLayers(prev => ({ ...prev, [key]: !prev[key] }))

    // ─── Compute normalized curves ─────────────────────────────────────────
    const { costoNorm, prazoNorm, y0Norm, diaAtualNorm, maxCusto } = useMemo(() => {
        const xMax = prazoBase > 0 ? prazoBase : (curvaCusto[curvaCusto.length - 1]?.x ?? 1)
        const maxCusto = Math.max(...curvaCusto.map(p => p.y), 1)
        const costoNorm = normalizeCurva(curvaCusto, xMax, maxCusto)
        const prazoNorm = normalizeCurva(curvaPrazo, xMax, 100)   // prazo em %
        const y0Norm = custoMobilizacao && custoMobilizacao > 0
            ? custoMobilizacao / maxCusto
            : null
        const diaAtualNorm = xMax > 0 ? diaAtual / xMax : 0
        return { costoNorm, prazoNorm, y0Norm, diaAtualNorm, maxCusto }
    }, [curvaCusto, curvaPrazo, prazoBase, custoMobilizacao, diaAtual])

    // Memoizar transformações SVG — evita recálculo em todo render
    const curvaCostoSvg = useMemo(
        () => costoNorm.map(([nx, ny]) => toPlot(nx, ny)),
        [costoNorm]
    )
    const curvaPrazoSvg = useMemo(
        () => prazoNorm.map(([nx, ny]) => toPlot(nx, ny)),
        [prazoNorm]
    )

    const manchaPath = useMemo(
        () => toManchaPath(costoNorm, prazoNorm),
        [costoNorm, prazoNorm]
    )

    const formaColor = formaTriangulo ? FORMA_COLOR[formaTriangulo] ?? '#94a3b8' : '#94a3b8'
    const formaLabel = formaTriangulo ? FORMA_LABEL[formaTriangulo] ?? formaTriangulo : null

    // ─── Tooltip MATED: hover no SVG ───────────────────────────────────────
    function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
        const svg = svgRef.current
        if (!svg || prazoBase <= 0) return
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const ctm = svg.getScreenCTM()
        if (!ctm) return
        const svgPt = pt.matrixTransform(ctm.inverse())
        const nx = Math.max(0, Math.min(1, (svgPt.x - PAD_L) / PLOT_W))
        const dia = Math.round(nx * prazoBase)
        const custo = interpolateCurva(curvaCusto, dia)
        const progresso = interpolateCurva(curvaPrazo, dia)
        setHoverInfo({ dia, custo, progresso, px: e.clientX, py: e.clientY })
    }

    function handleSvgMouseLeave() {
        setHoverInfo(null)
    }

    // "compra X dias ao custo de R$Y" — taxa média de dias comprados
    function tooltipText(dia: number, custo: number, progresso: number): string {
        if (dia <= 0) return `Início — ${BRL.format(custo)} | ${progresso.toFixed(1)}%`
        const taxaDiasBRL = custo / dia  // R$ por dia de projeto
        const compra10dias = taxaDiasBRL * 10
        return `Dia ${dia} | ${BRL.format(custo)} | ${progresso.toFixed(1)}% | Compra 10 dias ao custo de ${BRL.format(compra10dias)}`
    }

    // ─── Grid Y labels (0%, 25%, 50%, 75%, 100%) ──────────────────────────
    const yLabels = [0, 0.25, 0.5, 0.75, 1.0]

    if (curvaCusto.length < 2) {
        return (
            <div className={`bg-slate-900/50 border border-slate-700/60 rounded-2xl p-6 flex items-center justify-center text-slate-600 text-xs ${className}`}>
                Curvas insuficientes para visualização (min. 2 pontos)
            </div>
        )
    }

    return (
        <div className={`bg-slate-900/50 border border-slate-700/60 rounded-2xl overflow-hidden relative ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Campo Operacional — Curvas Reais
                </span>
                <button
                    onClick={() => setLayerPanelOpen(v => !v)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    title="Controle de camadas visuais"
                >
                    <Layers className="h-3 w-3" />
                    Camadas
                    {layerPanelOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
            </div>

            {/* Layer Control Panel */}
            {layerPanelOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-4 py-2.5 bg-slate-800/40 border-b border-slate-800">
                    {([
                        { key: 'curvaCusto',   label: 'Curva Custo',   color: '#10b981' },
                        { key: 'curvaPrazo',   label: 'Curva Prazo',   color: '#f59e0b' },
                        { key: 'aMancha',      label: 'A_mancha',      color: '#818cf8' },
                        { key: 'y0Line',       label: 'Linha y₀',      color: '#60a5fa' },
                        { key: 'diaAtualLine', label: 'Dia Atual',     color: '#f472b6' },
                        { key: 'labels',       label: 'Labels',        color: '#94a3b8' },
                    ] as { key: keyof LayerState; label: string; color: string }[]).map(({ key, label, color }) => (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={layers[key]}
                                onChange={() => toggleLayer(key)}
                                className="w-3 h-3 accent-blue-500"
                            />
                            <span
                                className="w-2 h-2 rounded-sm shrink-0"
                                style={{ backgroundColor: color }}
                                aria-hidden="true"
                            />
                            <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">
                                {label}
                            </span>
                        </label>
                    ))}
                </div>
            )}

            {/* SVG Chart */}
            <div className="px-2 py-3">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${VB_W} ${VB_H}`}
                    className="w-full h-auto cursor-crosshair"
                    style={{ maxHeight: '240px' }}
                    role="img"
                    aria-label="Campo operacional — curvas de custo e prazo reais ao longo do tempo"
                    onMouseMove={handleSvgMouseMove}
                    onMouseLeave={handleSvgMouseLeave}
                >
                    {/* Background */}
                    <rect x="0" y="0" width={VB_W} height={VB_H} fill="#0f172a" rx="8" />

                    {/* ═══ Grid horizontal ═══ */}
                    {yLabels.map(y => {
                        const [, sy] = toPlot(0, y)
                        return (
                            <g key={`grid-y-${y}`}>
                                <line
                                    x1={PAD_L} y1={sy}
                                    x2={VB_W - PAD_R} y2={sy}
                                    stroke="#1e293b"
                                    strokeWidth="0.5"
                                />
                                {layers.labels && (
                                    <text
                                        x={PAD_L - 4} y={sy + 4}
                                        textAnchor="end"
                                        fill="#475569"
                                        fontSize="8"
                                        fontFamily="ui-monospace, monospace"
                                    >
                                        {(y * 100).toFixed(0)}%
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {/* ═══ Eixo X ticks ═══ */}
                    {layers.labels && [0, 0.25, 0.5, 0.75, 1.0].map(nx => {
                        const [sx, ] = toPlot(nx, 0)
                        const [, syB] = toPlot(0, 0)
                        return (
                            <g key={`tick-x-${nx}`}>
                                <line x1={sx} y1={syB} x2={sx} y2={syB + 3} stroke="#334155" strokeWidth="0.5" />
                                <text
                                    x={sx} y={syB + 12}
                                    textAnchor="middle"
                                    fill="#475569"
                                    fontSize="7"
                                    fontFamily="ui-monospace, monospace"
                                >
                                    {Math.round(nx * prazoBase)}d
                                </text>
                            </g>
                        )
                    })}

                    {/* ═══ A_mancha (area de cobertura max(C,P)) ═══ */}
                    {layers.aMancha && manchaPath && (
                        <path
                            d={manchaPath}
                            fill="#818cf820"
                            stroke="#818cf840"
                            strokeWidth="0.5"
                        >
                            <title>A_mancha — campo real de operação: max(C_norm, P_norm) × tempo</title>
                        </path>
                    )}

                    {/* ═══ Curva Prazo ═══ */}
                    {layers.curvaPrazo && curvaPrazoSvg.length > 1 && (
                        <polyline
                            points={toPolylinePoints(curvaPrazoSvg)}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            opacity="0.8"
                        >
                            <title>Curva de prazo (burndown de progresso)</title>
                        </polyline>
                    )}

                    {/* ═══ Curva Custo ═══ */}
                    {layers.curvaCusto && curvaCostoSvg.length > 1 && (
                        <polyline
                            points={toPolylinePoints(curvaCostoSvg)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                            opacity="0.9"
                        >
                            <title>Curva de custo acumulado</title>
                        </polyline>
                    )}

                    {/* ═══ Linha y₀ (custo mínimo irredutível) ═══ */}
                    {layers.y0Line && y0Norm != null && y0Norm > 0 && y0Norm < 1 && (() => {
                        const [x0svg, y0svg] = toPlot(0, y0Norm)
                        const [x1svg, ] = toPlot(1, y0Norm)
                        return (
                            <g>
                                <line
                                    x1={x0svg} y1={y0svg}
                                    x2={x1svg} y2={y0svg}
                                    stroke="#60a5fa"
                                    strokeWidth="1"
                                    strokeDasharray="5 3"
                                    opacity="0.7"
                                >
                                    <title>y₀ — custo mínimo de mobilização (CEt inferior)</title>
                                </line>
                                {layers.labels && (
                                    <text
                                        x={x1svg - 2} y={y0svg - 4}
                                        textAnchor="end"
                                        fill="#60a5fa"
                                        fontSize="8"
                                        fontWeight="600"
                                        fontFamily="system-ui, sans-serif"
                                        opacity="0.8"
                                    >
                                        y₀
                                    </text>
                                )}
                            </g>
                        )
                    })()}

                    {/* ═══ Marcador dia atual + forma do triângulo ═══ */}
                    {layers.diaAtualLine && diaAtual > 0 && diaAtualNorm > 0 && diaAtualNorm <= 1 && (() => {
                        const [dxSvg, ] = toPlot(diaAtualNorm, 0)
                        const [, dyTop] = toPlot(diaAtualNorm, 1)
                        const [, dyBot] = toPlot(diaAtualNorm, 0)
                        return (
                            <g>
                                <line
                                    x1={dxSvg} y1={dyTop}
                                    x2={dxSvg} y2={dyBot}
                                    stroke="#f472b6"
                                    strokeWidth="1"
                                    strokeDasharray="3 2"
                                    opacity="0.6"
                                >
                                    <title>{tooltipText(
                                        diaAtual,
                                        interpolateCurva(curvaCusto, diaAtual),
                                        interpolateCurva(curvaPrazo, diaAtual),
                                    )}</title>
                                </line>
                                {/* Marcador de forma no topo da linha — clampado para não transbordar o SVG */}
                                {formaLabel && (() => {
                                    const BADGE_W = 58
                                    const bx = Math.min(dxSvg - 2, VB_W - PAD_R - BADGE_W)
                                    return (
                                        <g>
                                            <rect
                                                x={bx}
                                                y={dyTop - 1}
                                                width={BADGE_W}
                                                height={12}
                                                rx="3"
                                                fill="#0f172aE0"
                                                stroke={formaColor}
                                                strokeWidth="0.8"
                                                opacity="0.9"
                                            />
                                            <text
                                                x={bx + 3}
                                                y={dyTop + 8}
                                                fill={formaColor}
                                                fontSize="7"
                                                fontWeight="700"
                                                fontFamily="system-ui, sans-serif"
                                            >
                                                {formaLabel}
                                            </text>
                                        </g>
                                    )
                                })()}
                            </g>
                        )
                    })()}

                    {/* ═══ Legenda (canto inferior direito) ═══ */}
                    {layers.labels && (
                        <g>
                            {[
                                layers.curvaCusto && { color: '#10b981', label: 'Custo' },
                                layers.curvaPrazo && { color: '#f59e0b', label: 'Prazo' },
                                layers.aMancha    && { color: '#818cf8', label: 'A_mancha', dashed: false, area: true },
                            ].filter(Boolean).map((item, i) => {
                                if (!item) return null
                                const { color, label } = item as { color: string; label: string; area?: boolean }
                                const lx = VB_W - PAD_R - 52
                                const ly = PAD_T + i * 14
                                return (
                                    <g key={label}>
                                        <line
                                            x1={lx} y1={ly + 5}
                                            x2={lx + 12} y2={ly + 5}
                                            stroke={color}
                                            strokeWidth="2"
                                            opacity="0.8"
                                        />
                                        <text
                                            x={lx + 15} y={ly + 9}
                                            fill="#64748b"
                                            fontSize="8"
                                            fontFamily="system-ui, sans-serif"
                                        >
                                            {label}
                                        </text>
                                    </g>
                                )
                            })}
                        </g>
                    )}

                    {/* ═══ Eixo de plot (bordas) ═══ */}
                    <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={VB_H - PAD_B} stroke="#334155" strokeWidth="0.8" />
                    <line x1={PAD_L} y1={VB_H - PAD_B} x2={VB_W - PAD_R} y2={VB_H - PAD_B} stroke="#334155" strokeWidth="0.8" />
                </svg>
            </div>

            {/* Tooltip MATED linguagem natural — "compra X dias ao custo de R$Y" */}
            {hoverInfo && (
                <div
                    className="pointer-events-none fixed z-50 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-[10px] space-y-0.5"
                    style={{ left: hoverInfo.px + 14, top: hoverInfo.py - 10 }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">Dia</span>
                        <span className="font-bold text-white font-mono">{hoverInfo.dia}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-400 font-bold">{BRL.format(hoverInfo.custo)}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-400 font-bold">{hoverInfo.progresso.toFixed(1)}%</span>
                    </div>
                    {hoverInfo.dia > 0 && (
                        <div className="text-slate-300 border-t border-slate-700 pt-1 mt-1">
                            Compra <span className="font-bold text-pink-300">10 dias</span> ao custo de{' '}
                            <span className="font-bold text-emerald-300">
                                {BRL.format((hoverInfo.custo / hoverInfo.dia) * 10)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer: maxCusto + info */}
            {layers.labels && (
                <div className="px-4 pb-3 flex items-center justify-between text-[9px] text-slate-600">
                    <span>
                        Custo máx: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(maxCusto)}
                    </span>
                    <span>
                        Prazo base: {prazoBase}d
                    </span>
                </div>
            )}
        </div>
    )
}
