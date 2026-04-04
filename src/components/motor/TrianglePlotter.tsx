'use client'

import { useState } from 'react'
import { Point, Triangle } from '@/lib/engine/triangle-logic'
import type { ZonaOperacional } from '@/lib/engine/zones'

const ZONA_TRIANGLE_STYLE: Record<ZonaOperacional, { fill: string; stroke: string }> = {
    verde:    { fill: 'rgba(16, 185, 129, 0.10)',  stroke: 'rgba(16, 185, 129, 0.75)' },
    amarela:  { fill: 'rgba(245, 158, 11, 0.10)',  stroke: 'rgba(245, 158, 11, 0.75)' },
    vermelha: { fill: 'rgba(239, 68, 68, 0.13)',   stroke: 'rgba(239, 68, 68, 0.90)' },
    cinza:    { fill: 'rgba(148, 163, 184, 0.09)', stroke: 'rgba(148, 163, 184, 0.60)' },
    nula:     { fill: 'rgba(120, 20, 20, 0.15)',   stroke: 'rgba(239, 68, 68, 0.50)' },
}
const DEFAULT_TRIANGLE_STYLE = { fill: 'rgba(59, 130, 246, 0.07)', stroke: 'rgba(59, 130, 246, 0.65)' }

// Sprint 1: Labels dinâmicos baseados no protocolo
function getVertexMeta(protocolo: string) {
    const isBeta = protocolo === 'obtuso_beta'
    return [
        { key: 'A', label: 'início', sublabel: '', color: '#94a3b8' },
        { key: 'B', label: 'fim', sublabel: '', color: '#94a3b8' },
        { key: 'C', label: 'vértice', sublabel: '', color: '#94a3b8' },
    ]
}
// vertexMeta é computado dentro do componente via getVertexMeta(protocolo)

// ─── Formatadores compactos ───────────────────────────────────────────────────
function fmtDias(n: number): string {
    if (n <= 0) return '0d'
    if (n >= 730) return `${(n / 365).toFixed(1)}a`
    return `${Math.round(n)}d`
}
function fmtBRL(n: number): string {
    if (n <= 0) return 'R$0'
    if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}k`
    return `R$${Math.round(n)}`
}

/** Dados normalizados f_p × f_c para sombra A_mancha (EP-ESCALENO ESC-4) */
interface ManchaPoint { t: number; fp: number; fc: number }

interface TrianglePlotterProps {
    original: Triangle
    orthic: Triangle
    barycenter: Point
    decision?: Point
    onCanvasClick?: (canvasPoint: Point) => void
    baselineTriangle?: Triangle
    zonaOperacional?: ZonaOperacional
    modoExemplo?: boolean
    /** Para eixos com valores reais */
    prazoBase?: number
    orcamentoBase?: number
    pctContingencia?: number
    /** P normalizado do limite Amarela (prazoTotal/caminhoCritico). Default 1.0 */
    limiteP_amarela?: number
    /**
     * Sprint 1 Sessão 27: Protocolo Clairaut ativo.
     * Substitui isObtuso boolean por discriminador tipado.
     * β: custo obtuso (Orcamento & Liquidez). γ: prazo obtuso.
     */
    protocolo?: 'agudo' | 'obtuso_beta' | 'obtuso_gamma' | 'singular'
    /** EP-ESCALENO ESC-4: dados da A_mancha para plano de fundo do diagrama */
    manchaData?: ManchaPoint[]
    /** EP-ESCALENO ESC-4: A_rebarba > 0 → borda da zona plástica */
    aRebarba?: number
    /** @deprecated Sessão 29: sombras invariantes — manchaDataLiquidez eliminada (D-S29-02) */
    manchaDataLiquidez?: ManchaPoint[]  // mantida na interface para retrocompat, nunca usada
    /** EP-ESCALENO ESC-5: ângulos do triângulo em graus {alpha, beta, gamma} */
    angulos?: { alpha: number; beta: number; gamma: number }
    /** EP-ESCALENO ESC-5: lados normalizados {E, C, P} */
    ladosNorm?: { E: number; C: number; P: number }
    /** R3: Camadas ocultáveis — cada uma pode ser desligada */
    showZRE?: boolean
    showNVO?: boolean
    showMancha?: boolean
    showBands?: boolean
    showBaseline?: boolean
    showAngles?: boolean
    /** R1: Mapa de calor — gradação de zonas de decisão ótima */
    showHeatmap?: boolean
    /** Sessão 29: Labels dinâmicos conforme ancoragem GUIA */
    labelCusto?: string
    labelPrazo?: string
    subLabelCusto?: string
    subLabelPrazo?: string
}

// Margens para eixos
const ML = 56   // esquerda — Y-axis Prazo
const MR = 56   // direita  — Y-axis Custo
const MB = 46   // baixo    — X-axis Escopo/Tempo

export function TrianglePlotter({
    original,
    orthic,
    barycenter,
    decision,
    onCanvasClick,
    baselineTriangle,
    zonaOperacional,
    modoExemplo,
    prazoBase,
    orcamentoBase,
    pctContingencia,
    limiteP_amarela = 1.0,
    protocolo = 'agudo',
    manchaData,
    manchaDataLiquidez,
    aRebarba,
    angulos,
    ladosNorm,
    showZRE = true,
    showNVO = true,
    showMancha = true,
    showBands = true,
    showBaseline = true,
    showAngles = true,
    showHeatmap = false,
    labelCusto: labelCustoProp,
    labelPrazo: labelPrazoProp,
    subLabelCusto: subLabelCustoProp,
    subLabelPrazo: subLabelPrazoProp,
}: TrianglePlotterProps) {
    // Sprint 1: derivar flags de protocolo
    const isObtuso = protocolo === 'obtuso_beta' || protocolo === 'obtuso_gamma'
    const isBeta = protocolo === 'obtuso_beta'
    const _isGamma = protocolo === 'obtuso_gamma'
    const vertexMeta = getVertexMeta(protocolo)

    const [hoverSvgPoint, setHoverSvgPoint] = useState<{ x: number; y: number } | null>(null)

    const padding = 64
    const pts = [original.A, original.B, original.C]
    const rawMinX = Math.min(...pts.map(p => p.x)) - padding
    const rawMaxX = Math.max(...pts.map(p => p.x)) + padding
    const rawMinY = Math.min(...pts.map(p => p.y)) - padding
    const rawMaxY = Math.max(...pts.map(p => p.y)) + padding
    const rawW = Math.max(rawMaxX - rawMinX, 100)
    const rawH = Math.max(rawMaxY - rawMinY, 100)
    // Garantir aspect ratio mínimo: triângulos achatados (obtuso ~170°) precisam de
    // altura mínima = 40% da largura para que o triângulo seja VISÍVEL, não uma linha.
    const minH = rawW * 0.4
    const vbW = rawW
    const vbH = Math.max(rawH, minH)
    // Centralizar verticalmente quando altura foi expandida
    const yExpansion = (vbH - rawH) / 2
    const minX = rawMinX
    const maxX = rawMaxX
    const minY = rawMinY - yExpansion
    const maxY = rawMaxY + yExpansion

    // viewBox estendido incluindo margens para eixos
    const extMinX = minX - ML
    const extMinY = minY
    const extW    = vbW + ML + MR
    const extH    = vbH + MB

    // Sessão 29: Com Âncora Semântica ativa, o triângulo já nasce orientado no math-space.
    // Os transforms abaixo são mantidos temporariamente para compatibilidade visual.
    // TODO(Sessão 30): Validar visualmente e remover transforms quando Âncora Semântica
    // estiver confirmada em produção. A remoção requer teste visual em todos os 4 protocolos.
    //
    // Transforms ATUAIS (pré-Âncora, mantidos por segurança):
    // - α (agudo): flip Y → E na base, ápice no topo
    // - β (obtuso): sem flip Y + mirror X → E no teto, vértice à direita
    // - γ (obtuso): sem flip Y, sem mirror → E no teto, vértice à esquerda
    const transformY = (y: number) => isObtuso ? y : maxY - y + minY
    const transformX = (x: number) => isBeta ? (maxX - x + minX) : x
    const transformY_terrain = (y: number) => maxY - y + minY

    // Centroide SVG (para offset de labels)
    const centSvgX = (original.A.x + original.B.x + original.C.x) / 3
    const centSvgY = (transformY(original.A.y) + transformY(original.B.y) + transformY(original.C.y)) / 3
    const labelOffset = (ptX: number, ptSvgY: number, extra = 0) => {
        const dx = ptX - centSvgX
        const dy = ptSvgY - centSvgY
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const off = 26 + extra
        return { lx: ptX + (dx / len) * off, ly: ptSvgY + (dy / len) * off }
    }

    // ─── Referência para bandas e eixos ──────────────────────────────────────
    const ref = baselineTriangle || original
    const yBase      = original.A.y           // base do triângulo (math-space)
    const yTMC       = ref.C.y                // TM apex = P/O = 1.0
    const _hPerUnit  = Math.max(yTMC - yBase, 1)  // canvas-units por P=1.0 (reservado)

    const svgYBase   = transformY(yBase)       // SVG-Y da base (visualmente embaixo)
    const svgYTMC    = transformY(yTMC)        // SVG-Y do TM-C (visualmente em cima)

    // Ponto SVG para qualquer valor normalizado P
    const svgYforP = (p: number) => svgYBase + (svgYTMC - svgYBase) * p

    // A_mancha: svgYforP que SEMPRE usa Y flipped (terreno estável)
    const svgYBase_t = transformY_terrain(yBase)
    const svgYTMC_t  = transformY_terrain(yTMC)
    const svgYforP_terrain = (p: number) => svgYBase_t + (svgYTMC_t - svgYBase_t) * p

    const limO   = 1.0 + (pctContingencia ?? 0) / 100    // O-limite Amarela
    const limP   = Math.max(limiteP_amarela, 1.0)          // P-limite Amarela
    const svgY_O_lim = svgYforP(limO)
    const svgY_P_lim = svgYforP(limP)

    // ─── Eixo X: de A.x até B.x ──────────────────────────────────────────────
    const xLeft  = original.A.x
    const xRight = original.B.x
    const xSpan  = Math.max(xRight - xLeft, 1)

    // ─── Ticks ───────────────────────────────────────────────────────────────
    const Y_TICKS = [0, 0.25, 0.5, 0.75, 1.0]
    const X_TICKS = [0, 0.25, 0.5, 0.75, 1.0]

    // orçamento operacional
    const orcOp = (orcamentoBase != null && pctContingencia != null)
        ? orcamentoBase * (1 - pctContingencia / 100)
        : orcamentoBase

    // ─── Mouse ───────────────────────────────────────────────────────────────
    const getSvgCanvasPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
        const el   = e.currentTarget
        const rect = el.getBoundingClientRect()
        const scX  = extW / rect.width
        const scY  = extH / rect.height
        const svgX = (e.clientX - rect.left) * scX + extMinX
        const svgY = (e.clientY - rect.top)  * scY + extMinY
        return { x: svgX, y: maxY - svgY + minY }
    }
    const handleClick      = (e: React.MouseEvent<SVGSVGElement>) => { if (onCanvasClick) onCanvasClick(getSvgCanvasPoint(e)) }
    const handleMouseMove  = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onCanvasClick) return
        const el   = e.currentTarget
        const rect = el.getBoundingClientRect()
        setHoverSvgPoint({
            x: (e.clientX - rect.left) * (extW / rect.width)  + extMinX,
            y: (e.clientY - rect.top)  * (extH / rect.height) + extMinY,
        })
    }
    const handleMouseLeave = () => setHoverSvgPoint(null)

    return (
        <div className="relative w-full h-full flex flex-col gap-1.5">
            {/* Hint interação */}
            {onCanvasClick && !modoExemplo && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                    <span className="text-xs font-medium text-slate-400 bg-slate-900/90 border border-slate-700/60 rounded-full px-4 py-1.5 shadow-lg">
                        Clique no canvas para simular uma decisão
                    </span>
                </div>
            )}
            {modoExemplo && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <span className="text-xs font-bold text-rose-400 bg-slate-950/90 border border-rose-500/40 rounded-full px-4 py-2 backdrop-blur-sm shadow-xl">
                        EXEMPLO — CEt inválida · Configure predecessoras no CPM
                    </span>
                </div>
            )}

            {/* ══ SVG principal ══════════════════════════════════════════════ */}
            <div className="flex-1 min-h-0">
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`${extMinX} ${extMinY} ${extW} ${extH}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl"
                    style={{ cursor: onCanvasClick ? 'crosshair' : 'default' }}
                    onClick={handleClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <defs>
                        <pattern id="aura-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.6" />
                        </pattern>
                        <filter id="label-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.9" />
                        </filter>
                        {/* Clip para confinar bandas ao interior do triângulo area */}
                        <clipPath id="zone-clip">
                            <rect x={minX} y={minY} width={vbW} height={vbH} />
                        </clipPath>
                    </defs>

                    {/* Fundo total (inclui margens de eixo) */}
                    <rect x={extMinX} y={extMinY} width={extW} height={extH} fill="#0f172a" />

                    {/* Grid — somente na área do triângulo */}
                    <rect x={minX} y={minY} width={vbW} height={vbH} fill="url(#aura-grid)" />

                    {/* ══ EP-ESCALENO ESC-4: Sombra A_mancha — R3 ocultável ═══ */}
                    {showMancha && manchaData && manchaData.length > 2 && (() => {
                        const activeData = manchaData;
                        // Garantir: shadowBottom = maior Y SVG (fundo visual), shadowTop = menor Y SVG (topo visual)
                        const shadowBottom = Math.max(svgYBase, svgYTMC)  // SEMPRE o fundo visual
                        const shadowTop    = Math.min(svgYBase, svgYTMC)  // SEMPRE o topo visual
                        // p=0 → fundo, p=1 → topo (correto em AMBOS os protocolos)
                        const yForP = (p: number) => shadowBottom + (shadowTop - shadowBottom) * p
                        const yBase = shadowBottom
                        const fpPoints = activeData.map(d => ({
                            x: xLeft + d.t * xSpan,
                            y: yForP(d.fp),
                        }))
                        const fcPoints = activeData.map(d => ({
                            x: xLeft + d.t * xSpan,
                            y: yForP(d.fc),
                        }))
                        const envelopePoints = activeData.map(d => ({
                            x: xLeft + d.t * xSpan,
                            y: yForP(Math.max(d.fp, d.fc)),
                        }))
                        const fpPoly = fpPoints.map(p => `${p.x},${p.y}`).join(' ')
                            + ` ${xRight},${yBase} ${xLeft},${yBase}`
                        const fcPoly = fcPoints.map(p => `${p.x},${p.y}`).join(' ')
                            + ` ${xRight},${yBase} ${xLeft},${yBase}`
                        const envPoly = envelopePoints.map(p => `${p.x},${p.y}`).join(' ')
                            + ` ${xRight},${yBase} ${xLeft},${yBase}`
                        const interPoints = activeData.map(d => ({
                            x: xLeft + d.t * xSpan,
                            y: yForP(Math.min(d.fp, d.fc)),
                        }))
                        const interPoly = interPoints.map(p => `${p.x},${p.y}`).join(' ')
                            + ` ${xRight},${yBase} ${xLeft},${yBase}`
                        return (
                            <g opacity="0.65">
                                {/* Sombra f_p — prazo (indigo) */}
                                <polygon points={fpPoly}
                                    fill="rgba(99,102,241,0.08)" stroke="none" />
                                {/* Sombra f_c — custo (amber) */}
                                <polygon points={fcPoly}
                                    fill="rgba(245,158,11,0.08)" stroke="none" />
                                {/* Intersecao — zona de acumulo (violeta mais intensa) */}
                                <polygon points={interPoly}
                                    fill="rgba(139,92,246,0.12)" stroke="none" />
                                {/* Contorno A_mancha (envelope superior) */}
                                <polyline
                                    points={envelopePoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none" stroke="rgba(139,92,246,0.30)" strokeWidth="1.2"
                                />
                                {/* Borda rebarba (zona plástica) — destaque quando A_rebarba > 0 */}
                                {(aRebarba ?? 0) > 0.001 && (
                                    <polyline
                                        points={envelopePoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none" stroke="rgba(244,63,94,0.55)" strokeWidth="1.8"
                                        strokeDasharray="4 3"
                                    />
                                )}
                            </g>
                        )
                    })()}

                    {/* ── Bandas e linhas de referência (R3: ocultável) ── */}
                    {showBands && !isObtuso && (<>
                    <rect x={minX} y={svgYTMC} width={vbW} height={Math.max(0, svgYBase - svgYTMC)}
                        fill="rgba(16,185,129,0.05)" clipPath="url(#zone-clip)" />
                    {(pctContingencia ?? 0) > 0 && (
                        <rect x={minX} y={svgY_O_lim} width={vbW} height={Math.max(0, svgYTMC - svgY_O_lim)}
                            fill="rgba(245,158,11,0.08)" clipPath="url(#zone-clip)" />
                    )}
                    {limP > 1.005 && (
                        <rect x={minX} y={svgY_P_lim} width={vbW} height={Math.max(0, svgYTMC - svgY_P_lim)}
                            fill="rgba(245,158,11,0.06)" clipPath="url(#zone-clip)" />
                    )}
                    <line x1={minX} y1={svgYTMC} x2={maxX} y2={svgYTMC}
                        stroke="rgba(16,185,129,0.45)" strokeWidth="1.2" strokeDasharray="8 5" />
                    <text x={maxX - 6} y={svgYTMC - 5} fill="#10b981" fontSize="9" fontWeight="600"
                        textAnchor="end" opacity="0.80" filter="url(#label-shadow)">P=O=1.0 (Baseline)</text>
                    {(pctContingencia ?? 0) > 0 && (<>
                        <line x1={minX} y1={svgY_O_lim} x2={maxX} y2={svgY_O_lim}
                            stroke="rgba(245,158,11,0.50)" strokeWidth="1.1" strokeDasharray="6 4" />
                        <text x={maxX - 6} y={svgY_O_lim - 4} fill="#f59e0b" fontSize="8" fontWeight="600"
                            textAnchor="end" opacity="0.80" filter="url(#label-shadow)">
                            O={limO.toFixed(2)} (+{pctContingencia}% contg.)</text>
                    </>)}
                    {limP > 1.005 && (<>
                        <line x1={minX} y1={svgY_P_lim} x2={maxX} y2={svgY_P_lim}
                            stroke="rgba(245,158,11,0.45)" strokeWidth="1.1" strokeDasharray="6 4" />
                        <text x={minX + 6} y={svgY_P_lim - 4} fill="#f59e0b" fontSize="8" fontWeight="600"
                            textAnchor="start" opacity="0.80" filter="url(#label-shadow)">
                            P={limP.toFixed(2)} (lim. prazo)</text>
                    </>)}
                    </>)}

                    {/* ── Eixos tênues de origem — só agudo ────────────────── */}
                    {!isObtuso && (<>
                        <line x1={minX} y1={transformY(0)} x2={maxX} y2={transformY(0)}
                            stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="6 4" />
                        <line x1={0} y1={minY} x2={0} y2={maxY}
                            stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="6 4" />
                    </>)}

                    {/* ── TM baseline (Sessão 29: visível em TODOS os protocolos para overlay TM+TA) ── */}
                    {showBaseline && baselineTriangle && (
                        <polygon
                            points={`${transformX(baselineTriangle.A.x)},${transformY(baselineTriangle.A.y)} ${transformX(baselineTriangle.B.x)},${transformY(baselineTriangle.B.y)} ${transformX(baselineTriangle.C.x)},${transformY(baselineTriangle.C.y)}`}
                            fill="rgba(148,163,184,0.05)"
                            stroke="rgba(148,163,184,0.35)"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                        >
                            <title>TM — Triângulo Matriz (Baseline Planejado)</title>
                        </polygon>
                    )}

                    {/* ── Altitudes (só agudo) ──────────────────────────────── */}
                    {isObtuso ? null : (
                        [
                            [original.A, orthic.A],
                            [original.B, orthic.B],
                            [original.C, orthic.C],
                        ].map(([v, o], i) => (
                            <line key={i}
                                x1={v.x} y1={transformY(v.y)} x2={o.x} y2={transformY(o.y)}
                                stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.50"
                            />
                        ))
                    )}

                    {/* ── ZRE (Triângulo Órtico) — R3 ocultável ── */}
                    {showZRE && !isObtuso && (
                        <>
                            <polygon
                                points={`${orthic.A.x},${transformY(orthic.A.y)} ${orthic.B.x},${transformY(orthic.B.y)} ${orthic.C.x},${transformY(orthic.C.y)}`}
                                fill="rgba(16,185,129,0.14)" stroke="#10b981" strokeWidth="2"
                            >
                                <title>ZRE — Zona de Resiliência Executiva</title>
                            </polygon>
                            {(() => {
                                const cx = (orthic.A.x + orthic.B.x + orthic.C.x) / 3
                                const cy = (transformY(orthic.A.y) + transformY(orthic.B.y) + transformY(orthic.C.y)) / 3
                                return (
                                    <text x={cx} y={cy + 4} fill="#10b981" fontSize="10" fontWeight="600"
                                        textAnchor="middle" opacity="0.7" filter="url(#label-shadow)">ZRE</text>
                                )
                            })()}
                        </>
                    )}

                    {/* ── TA (Triângulo Atual) — lados com espessura escalena ── */}
                    {(() => {
                        const st = zonaOperacional ? ZONA_TRIANGLE_STYLE[zonaOperacional] : DEFAULT_TRIANGLE_STYLE
                        const pulse = zonaOperacional === 'vermelha'
                        const Ax = transformX(original.A.x), Ay = transformY(original.A.y)
                        const Bx = transformX(original.B.x), By = transformY(original.B.y)
                        const Cx = transformX(original.C.x), Cy = transformY(original.C.y)
                        // Espessura escalena: lado maior = mais grosso (2-5px range)
                        const sE = ladosNorm?.E ?? 1, sC = ladosNorm?.C ?? 1, sP = ladosNorm?.P ?? 1
                        const maxSide = Math.max(sE, sC, sP, 0.01)
                        const sw = (s: number) => 1.5 + (s / maxSide) * 3.5 // range 1.5–5px
                        return (
                            <g>
                                {/* Fill do triângulo */}
                                <polygon
                                    points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`}
                                    fill={st.fill} stroke="none"
                                >
                                    <title>TA — Triângulo Atual</title>
                                </polygon>
                                {/* Lado E (A→B) — Escopo — verde (base horizontal) */}
                                <line x1={Ax} y1={Ay} x2={Bx} y2={By}
                                    stroke="#34d399" strokeWidth={sw(sE)} strokeDasharray="5 3"
                                    opacity={pulse ? undefined : 0.85}
                                >
                                    {pulse && <animate attributeName="stroke-opacity" values="0.9;0.25;0.9" dur="2s" repeatCount="indefinite" />}
                                </line>
                                {/* Sessão 29: C→A (ESQUERDO) = Custo ↗ azul */}
                                {/*           B→C (DIREITO) = Prazo ↘ amarelo */}
                                <line x1={Cx} y1={Cy} x2={Ax} y2={Ay}
                                    stroke="#60a5fa" strokeWidth={sw(sC)} strokeDasharray="5 3"
                                    opacity={pulse ? undefined : 0.85}
                                >
                                    {pulse && <animate attributeName="stroke-opacity" values="0.9;0.25;0.9" dur="2s" repeatCount="indefinite" />}
                                </line>
                                <line x1={Bx} y1={By} x2={Cx} y2={Cy}
                                    stroke="#f59e0b" strokeWidth={sw(sP)} strokeDasharray="5 3"
                                    opacity={pulse ? undefined : 0.85}
                                >
                                    {pulse && <animate attributeName="stroke-opacity" values="0.9;0.25;0.9" dur="2s" repeatCount="indefinite" />}
                                </line>
                            </g>
                        )
                    })()}

                    {/* ── R1: Mapa de Calor — gradação de zonas de decisão ── */}
                    {showHeatmap && !isObtuso && (() => {
                        const nx = transformX(barycenter.x), ny = transformY(barycenter.y)
                        // Raios das zonas (proporcionais ao tamanho do triângulo)
                        const maxR = Math.max(vbW, vbH) * 0.4
                        const zones = [
                            { r: maxR * 0.12, color: '#10b981', opacity: 0.25, label: 'NVO' },      // ① Ótimo
                            { r: maxR * 0.25, color: '#10b981', opacity: 0.12, label: 'ZRE' },       // ② Elástico
                            { r: maxR * 0.40, color: '#3b82f6', opacity: 0.08, label: 'Interseção' }, // ③ Limite
                            { r: maxR * 0.60, color: '#f59e0b', opacity: 0.06, label: 'TM' },        // ④ Tensão
                            { r: maxR * 0.80, color: '#f59e0b', opacity: 0.04, label: 'Mancha' },    // ⑤⑥ Plástico
                            { r: maxR * 1.00, color: '#ef4444', opacity: 0.03, label: 'Rebarba' },   // ⑦ Fratura
                        ]
                        return (
                            <g>
                                {zones.reverse().map((z, i) => (
                                    <circle key={i} cx={nx} cy={ny} r={z.r}
                                        fill={z.color} opacity={z.opacity} stroke="none" />
                                ))}
                            </g>
                        )
                    })()}

                    {/* ── Vértices com labels ───────────────────────────────── */}
                    {([
                        { pt: original.A, ...vertexMeta[0] },
                        { pt: original.B, ...vertexMeta[1] },
                        { pt: original.C, ...vertexMeta[2] },
                    ]).map(({ pt, label, sublabel, color }) => {
                        const sx = transformX(pt.x), sy = transformY(pt.y)
                        const { lx, ly } = labelOffset(sx, sy)
                        return (
                            <g key={label}>
                                <circle cx={sx} cy={sy} r="10" fill={color} opacity="0.12" />
                                <circle cx={sx} cy={sy} r="7"  fill={color} stroke="#0f172a" strokeWidth="1.5" opacity="0.95" />
                                <text x={lx} y={ly - 6} fill={color} fontSize="15" fontWeight="800"
                                    textAnchor="middle" filter="url(#label-shadow)">{label}</text>
                                <text x={lx} y={ly + 10} fill={color} fontSize="11"
                                    textAnchor="middle" opacity="0.75" filter="url(#label-shadow)">{sublabel}</text>
                            </g>
                        )
                    })}

                    {/* ══ EP-ESCALENO ESC-5: Rótulos geométricos α/β/γ + E/P/C ═══════ */}
                    {showAngles && angulos && ladosNorm && (() => {
                        const Ax = transformX(original.A.x), Ay = transformY(original.A.y)
                        const Bx = transformX(original.B.x), By = transformY(original.B.y)
                        const Cx = transformX(original.C.x), Cy = transformY(original.C.y)
                        {/* Sessão 29: AC (ESQUERDO) = Custo (Cn, azul) */}
                        {/*           BC (DIREITO)  = Prazo (Pn, amarelo) */}
                        const midAB = { x: (Ax + Bx) / 2, y: (Ay + By) / 2 }  // E (base)
                        const midAC = { x: (Ax + Cx) / 2, y: (Ay + Cy) / 2 }  // Custo (ESQUERDO)
                        const midBC = { x: (Bx + Cx) / 2, y: (By + Cy) / 2 }  // Prazo (DIREITO)
                        const offE  = 16
                        const offAC = -12
                        const offBC = 12
                        return (
                            <g>
                                <text x={midAB.x} y={midAB.y + offE}
                                    fill="#34d399" fontSize="10" fontWeight="600"
                                    textAnchor="middle" opacity="0.7" filter="url(#label-shadow)">
                                    {ladosNorm.E.toFixed(3)} u
                                </text>
                                <text x={midAC.x + offAC} y={midAC.y + 4}
                                    fill="#60a5fa" fontSize="10" fontWeight="600"
                                    textAnchor="middle" opacity="0.7" filter="url(#label-shadow)">
                                    {ladosNorm.C.toFixed(3)} u
                                </text>
                                <text x={midBC.x + offBC} y={midBC.y + 4}
                                    fill="#f59e0b" fontSize="10" fontWeight="600"
                                    textAnchor="middle" opacity="0.7" filter="url(#label-shadow)">
                                    {ladosNorm.P.toFixed(3)} u
                                </text>

                                {/* ── Sprint 4 Req J: Ângulos Clairaut α/ω/ε + arcos SVG ── */}
                                {(() => {
                                    const arcR = 22 // raio dos arcos internos
                                    // Cores por saúde do ângulo: verde <75°, amarelo 75-90°, vermelho >90°
                                    const corAng = (deg: number) => deg > 90 ? '#ef4444' : deg > 75 ? '#f59e0b' : '#10b981'

                                    // ω (omega) at vertex A — oposto a C (Custo) — Pressão Custo
                                    const angA1 = Math.atan2(By - Ay, Bx - Ax) * 180 / Math.PI
                                    const angA2 = Math.atan2(Cy - Ay, Cx - Ax) * 180 / Math.PI
                                    // α (alpha) at vertex B — oposto a P (Prazo) — Pressão Prazo
                                    const angB1 = Math.atan2(Ay - By, Ax - Bx) * 180 / Math.PI
                                    const angB2 = Math.atan2(Cy - By, Cx - Bx) * 180 / Math.PI
                                    // ε (epsilon) at vertex C — oposto a E (Escopo) — Equilíbrio
                                    const angC1 = Math.atan2(Ay - Cy, Ax - Cx) * 180 / Math.PI
                                    const angC2 = Math.atan2(By - Cy, Bx - Cx) * 180 / Math.PI

                                    const mkArc = (cx: number, cy: number, a1: number, a2: number) => {
                                        const toRad = (d: number) => (d * Math.PI) / 180
                                        let start = a1, end = a2
                                        if (Math.abs(end - start) > 180) {
                                            if (end > start) start += 360; else end += 360
                                        }
                                        if (start > end) { const t = start; start = end; end = t }
                                        const x1 = cx + arcR * Math.cos(toRad(start))
                                        const y1 = cy + arcR * Math.sin(toRad(start))
                                        const x2 = cx + arcR * Math.cos(toRad(end))
                                        const y2 = cy + arcR * Math.sin(toRad(end))
                                        const large = Math.abs(end - start) > 180 ? 1 : 0
                                        return `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${large} 1 ${x2} ${y2}`
                                    }

                                    return <>
                                        {/* Arcos internos (coloridos por saúde) */}
                                        <path d={mkArc(Ax, Ay, angA1, angA2)} fill="none" stroke={corAng(angulos.alpha)} strokeWidth="1.5" opacity="0.7" />
                                        <path d={mkArc(Bx, By, angB1, angB2)} fill="none" stroke={corAng(angulos.beta)} strokeWidth="1.5" opacity="0.7" />
                                        <path d={mkArc(Cx, Cy, angC1, angC2)} fill="none" stroke={corAng(angulos.gamma)} strokeWidth="1.5" opacity="0.7" />

                                        {/* R5: Somente graus — sem letras gregas (Painel Clairaut já informa) */}
                                        <text x={Ax + 18} y={Ay + 4}
                                            fill="#94a3b8" fontSize="9" fontWeight="600"
                                            textAnchor="start" filter="url(#label-shadow)">
                                            {angulos.alpha.toFixed(1)}°
                                        </text>

                                        <text x={Bx - 18} y={By + 4}
                                            fill="#94a3b8" fontSize="9" fontWeight="600"
                                            textAnchor="end" filter="url(#label-shadow)">
                                            {angulos.beta.toFixed(1)}°
                                        </text>

                                        <text x={Cx} y={Cy - 10}
                                            fill="#94a3b8" fontSize="9" fontWeight="600"
                                            textAnchor="middle" filter="url(#label-shadow)">
                                            {angulos.gamma.toFixed(1)}°
                                        </text>
                                    </>
                                })()}
                            </g>
                        )
                    })()}

                    {/* ── NVO (R3: ocultável) ──────────────────────────────── */}
                    {showNVO && (() => {
                        const nx = barycenter.x
                        const ny = transformY(barycenter.y)
                        return (
                            <g>
                                <circle cx={nx} cy={ny} r="12" fill="#f59e0b" opacity="0.15" />
                                <circle cx={nx} cy={ny} r="7"  fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                                <text x={nx} y={ny - 14} fill="#f59e0b" fontSize="11" fontWeight="700"
                                    textAnchor="middle" filter="url(#label-shadow)">NVO</text>
                            </g>
                        )
                    })()}

                    {/* ── Sessão 29: Esquadro visual □ para estado Singular ──── */}
                    {protocolo === 'singular' && angulos && (() => {
                        // Identificar qual ângulo ≈ 90° e renderizar esquadro no vértice correspondente
                        const Ax = transformX(original.A.x), Ay = transformY(original.A.y)
                        const Bx = transformX(original.B.x), By = transformY(original.B.y)
                        const Cx = transformX(original.C.x), Cy = transformY(original.C.y)
                        const TOL = 1.0 // graus de tolerância para detectar 90°
                        let vx = 0, vy = 0, refX = 0, refY = 0
                        if (Math.abs(angulos.alpha - 90) < TOL) { vx = Ax; vy = Ay; refX = Bx; refY = By }
                        else if (Math.abs(angulos.beta - 90) < TOL) { vx = Bx; vy = By; refX = Ax; refY = Ay }
                        else if (Math.abs(angulos.gamma - 90) < TOL) { vx = Cx; vy = Cy; refX = Ax; refY = Ay }
                        else return null
                        // Ângulo da aresta para rotação do esquadro
                        const theta = Math.atan2(refY - vy, refX - vx) * 180 / Math.PI
                        const s = 14 // tamanho do esquadro em unidades SVG
                        return (
                            <g>
                                <rect
                                    x={vx} y={vy - s}
                                    width={s} height={s}
                                    fill="none"
                                    stroke="#f97316"
                                    strokeWidth="1.5"
                                    opacity="0.85"
                                    transform={`rotate(${theta}, ${vx}, ${vy})`}
                                />
                                <text x={vx} y={vy - s - 6}
                                    fill="#f97316" fontSize="9" fontWeight="700"
                                    textAnchor="middle" filter="url(#label-shadow)">
                                    SINGULAR
                                </text>
                            </g>
                        )
                    })()}

                    {/* ── Hover preview ─────────────────────────────────────── */}
                    {hoverSvgPoint && !decision && (
                        <g>
                            <circle cx={hoverSvgPoint.x} cy={hoverSvgPoint.y} r="14" fill="rgba(239,68,68,0.08)" />
                            <circle cx={hoverSvgPoint.x} cy={hoverSvgPoint.y} r="7"
                                fill="rgba(239,68,68,0.35)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
                        </g>
                    )}

                    {/* ── Decisão simulada ──────────────────────────────────── */}
                    {decision && (
                        <g>
                            <line x1={decision.x} y1={transformY(decision.y)} x2={barycenter.x} y2={transformY(barycenter.y)}
                                stroke="#ef4444" strokeWidth="2" strokeDasharray="5 4" opacity="0.8" />
                            <circle cx={decision.x} cy={transformY(decision.y)} r="18" fill="rgba(239,68,68,0.10)" />
                            <circle cx={decision.x} cy={transformY(decision.y)} r="8"
                                fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" className="animate-pulse" />
                            <text x={decision.x} y={transformY(decision.y) + 24}
                                fill="#ef4444" fontSize="12" fontWeight="700" textAnchor="middle"
                                filter="url(#label-shadow)">Decisão Simulada</text>
                        </g>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        EIXO X — Escopo / Calendário (base do triângulo)
                    ══════════════════════════════════════════════════════ */}
                    <g>
                        {/* Linha principal do eixo */}
                        <line x1={xLeft} y1={svgYBase + 8} x2={xRight} y2={svgYBase + 8}
                            stroke="#334155" strokeWidth="1.2" />
                        {/* Ticks + labels */}
                        {X_TICKS.map(t => {
                            const x     = xLeft + xSpan * t
                            const label = prazoBase ? fmtDias(prazoBase * t) : `${Math.round(t * 100)}%`
                            return (
                                <g key={`xt${t}`}>
                                    <line x1={x} y1={svgYBase + 5} x2={x} y2={svgYBase + 13}
                                        stroke="#475569" strokeWidth="1" />
                                    <text x={x} y={svgYBase + 24}
                                        fill="#64748b" fontSize="9" textAnchor="middle">{label}</text>
                                </g>
                            )
                        })}
                        {/* Label do eixo */}
                        <text
                            x={(xLeft + xRight) / 2} y={svgYBase + 38}
                            fill="#475569" fontSize="8.5" textAnchor="middle" fontStyle="italic"
                        >
                            {prazoBase
                                ? `E — Escopo / Calendário (${fmtDias(prazoBase)} baseline)`
                                : 'E — Escopo (normalizado)'}
                        </text>
                    </g>

                    {/* ══════════════════════════════════════════════════════
                        EIXO Y ESQUERDO — Prazo (P)
                    ══════════════════════════════════════════════════════ */}
                    {(() => {
                        const ax = minX - 8
                        const midY = (svgYBase + svgYTMC) / 2
                        return (
                            <g>
                                {/* Linha principal */}
                                <line x1={ax} y1={svgYBase} x2={ax} y2={svgYTMC}
                                    stroke="#334155" strokeWidth="1.2" />
                                {/* Ticks + labels */}
                                {Y_TICKS.map(t => {
                                    const y = svgYforP(t)
                                    const label = prazoBase ? fmtDias(prazoBase * t) : `P=${t.toFixed(2)}`
                                    return (
                                        <g key={`yl${t}`}>
                                            <line x1={ax - 5} y1={y} x2={ax} y2={y} stroke="#475569" strokeWidth="1" />
                                            <text x={ax - 8} y={y + 4} fill="#64748b" fontSize="9" textAnchor="end">{label}</text>
                                        </g>
                                    )
                                })}
                                {/* Tick do limite O Amarela (contingência) */}
                                {(pctContingencia ?? 0) > 0 && (() => {
                                    const y = svgYforP(limO)
                                    return (
                                        <g>
                                            <line x1={ax - 6} y1={y} x2={ax} y2={y} stroke="#f59e0b" strokeWidth="1.5" />
                                            <text x={ax - 8} y={y + 4} fill="#f59e0b" fontSize="8" textAnchor="end">
                                                +{pctContingencia}%
                                            </text>
                                        </g>
                                    )
                                })()}
                                {/* Label vertical rotacionado */}
                                <text
                                    x={minX - ML + 10} y={midY}
                                    fill="#475569" fontSize="8.5" textAnchor="middle" fontStyle="italic"
                                    transform={`rotate(-90, ${minX - ML + 10}, ${midY})`}
                                >
                                    {prazoBase ? `P — Prazo (${fmtDias(prazoBase)} = 1.0)` : 'P — Prazo (norm.)'}
                                </text>
                            </g>
                        )
                    })()}

                    {/* ══════════════════════════════════════════════════════
                        EIXO Y DIREITO — Custo / Orçamento (O)
                    ══════════════════════════════════════════════════════ */}
                    {(() => {
                        const ax = maxX + 8
                        const midY = (svgYBase + svgYTMC) / 2
                        return (
                            <g>
                                {/* Linha principal */}
                                <line x1={ax} y1={svgYBase} x2={ax} y2={svgYTMC}
                                    stroke="#334155" strokeWidth="1.2" />
                                {/* Ticks + labels */}
                                {Y_TICKS.map(t => {
                                    const y = svgYforP(t)
                                    const label = orcOp ? fmtBRL(orcOp * t) : `O=${t.toFixed(2)}`
                                    return (
                                        <g key={`yr${t}`}>
                                            <line x1={ax} y1={y} x2={ax + 5} y2={y} stroke="#475569" strokeWidth="1" />
                                            <text x={ax + 8} y={y + 4} fill="#64748b" fontSize="9" textAnchor="start">{label}</text>
                                        </g>
                                    )
                                })}
                                {/* Tick do limite O Amarela = orcamentoBase total */}
                                {(pctContingencia ?? 0) > 0 && (() => {
                                    const y = svgYforP(limO)
                                    return (
                                        <g>
                                            <line x1={ax} y1={y} x2={ax + 6} y2={y} stroke="#f59e0b" strokeWidth="1.5" />
                                            <text x={ax + 8} y={y + 4} fill="#f59e0b" fontSize="8" textAnchor="start">
                                                {orcamentoBase ? fmtBRL(orcamentoBase) : `O=${limO.toFixed(2)}`}
                                            </text>
                                        </g>
                                    )
                                })()}
                                {/* Label vertical rotacionado */}
                                <text
                                    x={maxX + MR - 10} y={midY}
                                    fill="#475569" fontSize="8.5" textAnchor="middle" fontStyle="italic"
                                    transform={`rotate(90, ${maxX + MR - 10}, ${midY})`}
                                >
                                    {orcOp
                                        ? `O — ${labelCustoProp ?? 'Orçamento'} (${fmtBRL(orcOp)})`
                                        : `O — ${labelCustoProp ?? 'Orçamento'} (norm.)`}
                                </text>
                            </g>
                        )
                    })()}
                </svg>
            </div>

            {/* ══ P4 Sessão 27: Caixa de Camadas Hierárquica ══════════════════ */}
            {/* Hierarquia: NVO → ZRE → TA → TM → A_mancha (de dentro p/ fora) */}
            {/* Legenda principal */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-3 justify-center pb-1">
                <LegendItem type="dash"  color="#34d399" label="Escopo"  sub="Cobertura do calendário" />
                <LegendItem type="dash"  color="#f59e0b" label={labelPrazoProp ?? 'Prazo'}   sub={subLabelPrazoProp ?? 'Burndown regressivo'} />
                <LegendItem type="dash"  color="#60a5fa" label={labelCustoProp ?? 'Custo'}  sub={subLabelCustoProp ?? 'Custo acumulado'} />
                <LegendItem type="dot"   color="#f59e0b" label="NVO"     sub="Núcleo de Viabilidade Ótima" />
                {!isObtuso && <LegendItem type="fill"  color="#10b981" label="ZRE"  sub="Zona de Resiliência Executiva" />}
            </div>
        </div>
    )
}

// ─── Item de legenda HTML ─────────────────────────────────────────────────────
function LegendItem({ type, color, label, sub }: {
    type: 'fill' | 'dot' | 'dash' | 'dotted'
    color: string
    label: string
    sub: string
}) {
    return (
        <div className="flex items-center gap-1.5 cursor-default" title={sub}>
            {type === 'fill' && (
                <div className="w-4 h-2.5 rounded-sm border flex-shrink-0"
                    style={{ background: color.replace(/[\d.]+\)$/, '0.25)'), borderColor: color }} />
            )}
            {type === 'dot' && (
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            )}
            {(type === 'dash' || type === 'dotted') && (
                <svg width="18" height="8" className="flex-shrink-0">
                    <line x1="0" y1="4" x2="18" y2="4"
                        stroke={color}
                        strokeWidth={type === 'dotted' ? 1.2 : 2}
                        strokeDasharray={type === 'dotted' ? "3 3" : "5 3"} />
                </svg>
            )}
            <span className="text-[10px] font-semibold text-slate-400">{label}</span>
        </div>
    )
}
