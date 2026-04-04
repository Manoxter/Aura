'use client'

/**
 * TriangleDiagnostic — Aura-6.1 Rendering Spec
 *
 * Renderiza o triângulo diagnóstico baseado em 3 RETAS FINANCEIRAS:
 * - Escopo (verde): horizontal fixa no topo = valor contratado
 * - Prazo (amarelo): burndown ↘ decrescente (prazo total → 0)
 * - Custo (azul): acumulado ↗ crescente (0 → custo previsto)
 *
 * Estados: ALFA (retas naturais), BETA (translado invertido),
 *          GAMMA (obtuso prazo), SINGULAR (90° + modal), CRISE (gap)
 *
 * @fermat — Sessão 27
 */

import React, { useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiagnosticState = 'alfa' | 'beta' | 'gamma' | 'singular' | 'crise'

export interface TriangleDiagnosticProps {
    /** Nome do projeto */
    projeto: string
    /** Valor total do escopo contratado (R$) */
    escopoValor: number
    /** Prazo total planejado (dias) */
    prazoDias: number
    /** Custo acumulado atual (R$) — ou custo previsto total para planejamento */
    custoPrevisto: number
    /** Estado classificado pelo motor CDT/Clairaut */
    estado: DiagnosticState
    /** Ângulo obtuso em graus (para β, γ, singular) */
    anguloObtuso?: number
    /** Lado violado na CEt (para CRISE) */
    ladoViolado?: 'E' | 'P' | 'O'
    /** Lados CDT brutos {E, C, P} para cálculo de gap */
    ladosBrutos?: { E: number; C: number; P: number }
    /** Prazo base (dias) para cálculos de déficit */
    prazoBase?: number
    /** Orçamento base (R$) para cálculos de déficit */
    orcamentoBase?: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
    escopo: '#34d399',   // verde
    prazo: '#f59e0b',    // amarelo
    custo: '#60a5fa',    // azul
    crise: '#ef4444',    // vermelho
    bg: '#0f172a',       // fundo
    grid: '#1e293b',     // grade
    text: '#94a3b8',     // texto secundário
    textBright: '#e2e8f0', // texto primário
}

const W = 900     // largura SVG
const H = 500     // altura SVG
const PAD = 60    // padding
const PLOT_W = W - PAD * 2
const PLOT_H = H - PAD * 2

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converte coordenadas financeiras (dias, R$) para SVG */
function toSvg(
    dia: number, valor: number,
    maxDias: number, maxValor: number
): [number, number] {
    const x = PAD + (dia / maxDias) * PLOT_W
    const y = PAD + PLOT_H - (valor / maxValor) * PLOT_H  // Y invertido: R$ cresce para cima
    return [x, y]
}

/** Formata R$ */
function fmtBRL(v: number): string {
    if (v >= 1e6) return `R$${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `R$${(v / 1e3).toFixed(0)}k`
    return `R$${v.toFixed(0)}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TriangleDiagnostic({
    projeto,
    escopoValor,
    prazoDias,
    custoPrevisto,
    estado,
    anguloObtuso,
    ladoViolado,
    ladosBrutos,
    prazoBase,
    orcamentoBase,
}: TriangleDiagnosticProps) {

    const maxDias = prazoDias * 1.15  // 15% buffer visual
    // maxValor precisa acomodar a altura do vértice CDT
    const verticeAltura = (() => {
        if (!ladosBrutos || ladosBrutos.E < 0.01) return escopoValor
        const { E, C, P } = ladosBrutos
        const cosA = Math.max(-1, Math.min(1, (E * E + P * P - C * C) / (2 * E * P)))
        return P * Math.sin(Math.acos(cosA)) * (prazoDias / E)
    })()
    const maxValor = Math.max(escopoValor, custoPrevisto, verticeAltura) * 1.15

    // ─── 3 Retas por Estado (conforme imagens de referência) ─────────────────

    // ─── Vértice do triângulo via Lei dos Cossenos (lados CDT reais) ─────────
    // Os lados E, C, P do CDT engine refletem as curvas reais (OLS das funções).
    // Escopo = base horizontal. Prazo = lado esquerdo. Custo = lado direito.
    // Posicionar vértice via ângulo no início: cos(α_inicio) = (E²+P²−C²)/(2EP)
    const verticeCalc = useMemo(() => {
        if (!ladosBrutos || ladosBrutos.E < 0.01) {
            // Fallback: interseção linear simples
            const m1 = custoPrevisto / prazoDias
            const b2 = escopoValor
            const xStar = b2 / (m1 + escopoValor / prazoDias)
            return { dia: xStar, valor: m1 * xStar }
        }
        const { E, C, P } = ladosBrutos
        // Ângulo no vértice "início" (entre Escopo e Prazo)
        const cosAlpha = Math.max(-1, Math.min(1, (E * E + P * P - C * C) / (2 * E * P)))
        const alpha = Math.acos(cosAlpha)
        // Posição do vértice em coordenadas do projeto:
        // Escopo vai de (0,0) a (prazoDias, 0). O lado Prazo parte do início (0,0)
        // com comprimento proporcional a P, ângulo alpha acima da horizontal.
        // Escalar: comprimentoReal = P/E × prazoDias (proporção dos lados × escala do Escopo)
        const escala = prazoDias / E
        const vx = P * Math.cos(alpha) * escala  // dias
        const vy = P * Math.sin(alpha) * escala  // "valor" em escala do canvas
        return { dia: vx, valor: vy }
    }, [ladosBrutos, escopoValor, prazoDias, custoPrevisto])

    const retas = useMemo(() => {
        const vSvg = toSvg(verticeCalc.dia, verticeCalc.valor, maxDias, maxValor)

        if (estado === 'alfa' || estado === 'singular' || estado === 'crise') {
            // ALFA: Escopo = BASE horizontal. Prazo = início→vértice (↗). Custo = vértice→fim (↘).
            const escopoStart = toSvg(0, 0, maxDias, maxValor)            // início (base-esq)
            const escopoEnd = toSvg(prazoDias, 0, maxDias, maxValor)      // fim (base-dir)
            const prazoStart = toSvg(0, 0, maxDias, maxValor)             // início = base-esq
            const prazoEnd = vSvg                                          // vértice (topo)
            const custoStart = vSvg                                        // vértice (topo)
            const custoEnd = toSvg(prazoDias, 0, maxDias, maxValor)       // fim = base-dir
            return { escopoStart, escopoEnd, prazoStart, prazoEnd, custoStart, custoEnd }
        }
        if (estado === 'beta') {
            // BETA (modelo beta.png): Escopo = TOPO horizontal.
            // Prazo = diagonal longa do início(topo-esq) para vértice(baixo-dir)
            // O&L = do fim(topo) para vértice(baixo-dir)
            const escopoStart = toSvg(0, escopoValor, maxDias, maxValor)
            const escopoEnd = toSvg(prazoDias * 0.6, escopoValor, maxDias, maxValor)
            const vertBeta = toSvg(prazoDias * 0.85, escopoValor * 0.05, maxDias, maxValor)
            const prazoStart = escopoStart
            const prazoEnd = vertBeta
            const custoStart = escopoEnd
            const custoEnd = vertBeta
            return { escopoStart, escopoEnd, prazoStart, prazoEnd, custoStart, custoEnd }
        }
        // GAMMA (modelo gama certo.png): Escopo = TOPO horizontal.
        // Prazo = curta do início(topo-esq) para vértice(baixo-esq)
        // O&L = longa do fim(topo-dir) para vértice(baixo-esq)
        const escopoStart = toSvg(prazoDias * 0.3, escopoValor, maxDias, maxValor)
        const escopoEnd = toSvg(prazoDias * 0.85, escopoValor, maxDias, maxValor)
        const vertGamma = toSvg(prazoDias * 0.1, escopoValor * 0.02, maxDias, maxValor)
        const prazoStart = escopoStart
        const prazoEnd = vertGamma
        const custoStart = escopoEnd
        const custoEnd = vertGamma
        return { escopoStart, escopoEnd, prazoStart, prazoEnd, custoStart, custoEnd }
    }, [estado, escopoValor, prazoDias, custoPrevisto, maxDias, maxValor, verticeCalc])

    // Interseção SVG (para CRISE gap rendering)
    const intersecaoSvg = useMemo(() =>
        toSvg(verticeCalc.dia, verticeCalc.valor, maxDias, maxValor),
        [verticeCalc, maxDias, maxValor]
    )

    // ─── Vértices do triângulo por estado ────────────────────────────────────

    const triangulo = useMemo(() => {
        // Vértices derivados das extremidades das retas
        switch (estado) {
            case 'alfa':
            case 'singular':
                // ALFA/SINGULAR: Escopo na BASE, vértice no topo (onde Prazo e Custo se encontram)
                return {
                    A: retas.escopoStart,   // início (base-esquerda)
                    B: retas.escopoEnd,     // fim (base-direita)
                    C: retas.prazoEnd,      // topo (vértice onde Prazo↗ e Custo↘ se encontram)
                }
            case 'beta':
                // BETA: Escopo no TOPO, vértice embaixo-direita
                return {
                    A: retas.escopoStart,   // início (topo-esquerda)
                    B: retas.escopoEnd,     // fim (topo — ângulo obtuso)
                    C: retas.prazoEnd,      // vértice (baixo-direita)
                }
            case 'gamma':
                // GAMMA: Escopo no TOPO, vértice embaixo-esquerda
                return {
                    A: retas.escopoStart,   // início (topo)
                    B: retas.escopoEnd,     // fim (topo)
                    C: retas.prazoEnd,      // vértice (baixo-esquerda)
                }
            case 'crise':
            default:
                return null
        }
    }, [estado, retas])

    // ─── Cálculo CRISE: déficit ──────────────────────────────────────────────

    const criseInfo = useMemo(() => {
        if (estado !== 'crise' || !ladosBrutos || !prazoBase || !orcamentoBase) return null
        const { E, C, P } = ladosBrutos
        const gap = Math.abs(P - C) - E
        if (gap <= 0) return null
        return {
            prazoAtual: prazoBase,
            prazoNecessario: Math.ceil(prazoBase * (1 + gap)),
            deficitDias: Math.ceil(prazoBase * gap),
            custoAtual: orcamentoBase,
            custoNecessario: Math.ceil(orcamentoBase * (1 + gap)),
            deficitCusto: Math.ceil(orcamentoBase * gap),
        }
    }, [estado, ladosBrutos, prazoBase, orcamentoBase])

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-slate-950 rounded-xl">
                {/* Background */}
                <rect x="0" y="0" width={W} height={H} fill={COLORS.bg} rx="12" />

                {/* Grid sutil */}
                {Array.from({ length: 10 }, (_, i) => {
                    const x = PAD + (i / 9) * PLOT_W
                    const y = PAD + (i / 9) * PLOT_H
                    return (
                        <React.Fragment key={i}>
                            <line x1={x} y1={PAD} x2={x} y2={PAD + PLOT_H} stroke={COLORS.grid} strokeWidth="0.5" opacity="0.3" />
                            <line x1={PAD} y1={y} x2={PAD + PLOT_W} y2={y} stroke={COLORS.grid} strokeWidth="0.5" opacity="0.3" />
                        </React.Fragment>
                    )
                })}

                {/* ═══ EIXO X — Tempo (dias) ═══ */}
                <line x1={PAD} y1={PAD + PLOT_H} x2={PAD + PLOT_W} y2={PAD + PLOT_H}
                    stroke={COLORS.text} strokeWidth="1.5" />
                <text x={PAD + PLOT_W / 2} y={H - 10}
                    fill={COLORS.text} fontSize="11" textAnchor="middle" fontStyle="italic">
                    tempo / execução do projeto (dias)
                </text>
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const x = PAD + f * PLOT_W
                    return (
                        <React.Fragment key={f}>
                            <line x1={x} y1={PAD + PLOT_H} x2={x} y2={PAD + PLOT_H + 6} stroke={COLORS.text} strokeWidth="1" />
                            <text x={x} y={PAD + PLOT_H + 18} fill={COLORS.text} fontSize="9" textAnchor="middle">
                                {Math.round(prazoDias * f)}d
                            </text>
                        </React.Fragment>
                    )
                })}

                {/* ═══ EIXO Y — Valor (R$) ═══ */}
                <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + PLOT_H}
                    stroke={COLORS.text} strokeWidth="1.5" />
                {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
                    const y = PAD + PLOT_H - f * PLOT_H
                    const val = maxValor * f
                    return (
                        <React.Fragment key={f}>
                            <line x1={PAD - 6} y1={y} x2={PAD} y2={y} stroke={COLORS.text} strokeWidth="1" />
                            <text x={PAD - 10} y={y + 3} fill={COLORS.text} fontSize="9" textAnchor="end">
                                {fmtBRL(val)}
                            </text>
                        </React.Fragment>
                    )
                })}

                {/* ═══ PREENCHIMENTO DO TRIÂNGULO (não para CRISE) ═══ */}
                {triangulo && estado !== 'crise' && (
                    <polygon
                        points={`${triangulo.A.join(',')} ${triangulo.B.join(',')} ${triangulo.C.join(',')}`}
                        fill={estado === 'singular' ? 'rgba(245,158,11,0.08)' :
                              estado === 'beta' ? 'rgba(59,130,246,0.08)' :
                              estado === 'gamma' ? 'rgba(59,130,246,0.06)' :
                              'rgba(16,185,129,0.08)'}
                        stroke="none"
                    />
                )}

                {/* ═══ RETA ESCOPO — verde horizontal (base para α/singular/crise, topo para β/γ) ═══ */}
                <line x1={retas.escopoStart[0]} y1={retas.escopoStart[1]}
                      x2={retas.escopoEnd[0]} y2={retas.escopoEnd[1]}
                    stroke={COLORS.escopo} strokeWidth="3" strokeDasharray="8 4" />
                {/* Label Escopo */}
                <rect x={(retas.escopoStart[0] + retas.escopoEnd[0]) / 2 - 40}
                      y={retas.escopoStart[1] - 28}
                      width="80" height="20" rx="4" fill={COLORS.escopo} opacity="0.9" />
                <text x={(retas.escopoStart[0] + retas.escopoEnd[0]) / 2}
                      y={retas.escopoStart[1] - 14}
                    fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">
                    Escopo
                </text>
                {/* Dots início/fim */}
                <circle cx={retas.escopoStart[0]} cy={retas.escopoStart[1]} r="5" fill={COLORS.escopo} />
                <circle cx={retas.escopoEnd[0]} cy={retas.escopoEnd[1]} r="5" fill={COLORS.escopo} />
                <text x={retas.escopoStart[0]} y={retas.escopoStart[1] - 8}
                    fill={COLORS.escopo} fontSize="10" textAnchor="middle">início</text>
                <text x={retas.escopoEnd[0]} y={retas.escopoEnd[1] - 8}
                    fill={COLORS.escopo} fontSize="10" textAnchor="middle">fim</text>

                {/* ═══ RETA PRAZO — amarelo ↘ burndown ═══ */}
                {estado !== 'crise' ? (
                    <>
                        <line x1={retas.prazoStart[0]} y1={retas.prazoStart[1]}
                              x2={triangulo ? triangulo.C[0] : retas.prazoEnd[0]}
                              y2={triangulo ? triangulo.C[1] : retas.prazoEnd[1]}
                            stroke={COLORS.prazo} strokeWidth="3" strokeDasharray="8 4" />
                        <text x={(retas.prazoStart[0] + (triangulo?.C[0] ?? retas.prazoEnd[0])) / 2 - 15}
                              y={(retas.prazoStart[1] + (triangulo?.C[1] ?? retas.prazoEnd[1])) / 2}
                            fill={COLORS.prazo} fontSize="14" fontWeight="bold"
                            transform={`rotate(-30, ${(retas.prazoStart[0] + (triangulo?.C[0] ?? retas.prazoEnd[0])) / 2 - 15}, ${(retas.prazoStart[1] + (triangulo?.C[1] ?? retas.prazoEnd[1])) / 2})`}>
                            Prazo
                        </text>
                    </>
                ) : (
                    <>
                        {/* CRISE: segmento real em amarelo */}
                        <line x1={retas.prazoStart[0]} y1={retas.prazoStart[1]}
                              x2={retas.prazoEnd[0]} y2={retas.prazoEnd[1]}
                            stroke={COLORS.prazo} strokeWidth="3" strokeDasharray="8 4" />
                        {/* Gap em vermelho tracejado */}
                        {intersecaoSvg && (
                            <>
                                <line x1={retas.prazoEnd[0]} y1={retas.prazoEnd[1]}
                                      x2={intersecaoSvg[0]} y2={intersecaoSvg[1]}
                                    stroke={COLORS.crise} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" />
                                <circle cx={intersecaoSvg[0]} cy={intersecaoSvg[1]} r="8"
                                    fill="none" stroke={COLORS.crise} strokeWidth="2" className="animate-pulse" />
                                <text x={intersecaoSvg[0] + 12} y={intersecaoSvg[1]}
                                    fill={COLORS.crise} fontSize="10" fontWeight="bold">
                                    fechamento teórico
                                </text>
                            </>
                        )}
                        <text x={(retas.prazoStart[0] + retas.prazoEnd[0]) / 2 - 15}
                              y={(retas.prazoStart[1] + retas.prazoEnd[1]) / 2}
                            fill={COLORS.prazo} fontSize="14" fontWeight="bold">
                            Prazo
                        </text>
                    </>
                )}

                {/* ═══ RETA CUSTO — azul ↗ acumulado ═══ */}
                <line x1={retas.custoStart[0]} y1={retas.custoStart[1]}
                      x2={triangulo ? triangulo.C[0] : retas.custoEnd[0]}
                      y2={triangulo ? triangulo.C[1] : retas.custoEnd[1]}
                    stroke={COLORS.custo} strokeWidth="3" strokeDasharray="8 4" />
                <text x={(retas.custoStart[0] + (triangulo?.C[0] ?? retas.custoEnd[0])) / 2 + 15}
                      y={(retas.custoStart[1] + (triangulo?.C[1] ?? retas.custoEnd[1])) / 2}
                    fill={COLORS.custo} fontSize="14" fontWeight="bold"
                    transform={`rotate(30, ${(retas.custoStart[0] + (triangulo?.C[0] ?? retas.custoEnd[0])) / 2 + 15}, ${(retas.custoStart[1] + (triangulo?.C[1] ?? retas.custoEnd[1])) / 2})`}>
                    {estado === 'beta' || estado === 'gamma' ? 'Orçamento & Liquidez' : 'Custo'}
                </text>

                {/* ═══ VÉRTICE com label ═══ */}
                {triangulo && (
                    <g>
                        <circle cx={triangulo.C[0]} cy={triangulo.C[1]} r="6"
                            fill={COLORS.text} stroke={COLORS.bg} strokeWidth="2" />
                        <text x={triangulo.C[0] + 10} y={triangulo.C[1] + 4}
                            fill={COLORS.text} fontSize="11" fontWeight="bold">vértice</text>
                    </g>
                )}

                {/* ═══ ÂNGULO OBTUSO (β/γ) ═══ */}
                {(estado === 'beta' || estado === 'gamma') && anguloObtuso && triangulo && (
                    <g>
                        {/* Arco no vértice do ângulo obtuso */}
                        <text x={estado === 'beta' ? triangulo.B[0] - 30 : triangulo.A[0] + 10}
                              y={estado === 'beta' ? triangulo.B[1] + 25 : triangulo.A[1] + 25}
                            fill={COLORS.crise} fontSize="13" fontWeight="bold">
                            {anguloObtuso.toFixed(1)}°
                        </text>
                    </g>
                )}

                {/* ═══ SINGULAR: símbolo de esquadro □ ═══ */}
                {estado === 'singular' && triangulo && (
                    <g>
                        <rect x={triangulo.C[0] - 8} y={triangulo.C[1] - 8}
                            width="16" height="16" fill="none"
                            stroke={COLORS.crise} strokeWidth="2.5" />
                        <text x={triangulo.C[0]} y={triangulo.C[1] - 16}
                            fill={COLORS.crise} fontSize="11" fontWeight="bold" textAnchor="middle">
                            90°
                        </text>
                    </g>
                )}

                {/* ═══ ALFA: ponto de inversão ═══ */}
                {estado === 'alfa' && intersecaoSvg && (
                    <g>
                        <circle cx={intersecaoSvg[0]} cy={intersecaoSvg[1]} r="5"
                            fill={COLORS.textBright} stroke={COLORS.bg} strokeWidth="2" />
                    </g>
                )}

                {/* ═══ Legenda ═══ */}
                <g transform={`translate(${PAD + 5}, ${PAD + 10})`}>
                    {[
                        { color: COLORS.escopo, label: 'Escopo' },
                        { color: COLORS.prazo, label: 'Prazo' },
                        { color: COLORS.custo, label: estado === 'beta' || estado === 'gamma' ? 'Orçamento & Liquidez' : 'Custo' },
                    ].map((item, i) => (
                        <g key={item.label} transform={`translate(0, ${i * 18})`}>
                            <line x1="0" y1="0" x2="20" y2="0" stroke={item.color} strokeWidth="2.5" strokeDasharray="5 3" />
                            <text x="26" y="4" fill={item.color} fontSize="11" fontWeight="600">{item.label}</text>
                        </g>
                    ))}
                </g>

            </svg>

            {/* ═══ ALERTAS E MODAIS (HTML abaixo do SVG) ═══ */}

            {/* ALFA: alerta de inversão */}
            {estado === 'alfa' && (
                <div className="mt-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    Atenção: as curvas de custo e prazo estão invertidas em relação ao triângulo ideal.
                </div>
            )}

            {/* SINGULAR: modal de decisão */}
            {estado === 'singular' && (
                <div className="mt-4 border-2 border-amber-500/60 rounded-2xl bg-slate-900 p-6 space-y-3">
                    <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                        Projeto Sob Risco — Ângulo Crítico Detectado
                    </h3>
                    <p className="text-xs text-amber-400/80">
                        Conduzido nesta perspectiva, o projeto opera sem margem de segurança operacional.
                    </p>
                    <div className="flex gap-3 mt-4">
                        <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors">
                            A — Prosseguir com o modelo atual
                        </button>
                        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">
                            B — Revisar TAP e WBS
                        </button>
                    </div>
                </div>
            )}

            {/* CRISE: painel de diagnóstico */}
            {estado === 'crise' && criseInfo && (
                <div className="mt-4 border-2 border-rose-500/60 rounded-2xl bg-rose-950/30 p-6 space-y-3">
                    <h3 className="text-sm font-black text-rose-300 uppercase tracking-wide">
                        CRISE — Triângulo Não Fecha
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-rose-400">Prazo atual: <strong>{criseInfo.prazoAtual} dias</strong></p>
                            <p className="text-rose-400">Prazo necessário: <strong>{criseInfo.prazoNecessario} dias</strong></p>
                            <p className="text-rose-300 font-bold">Déficit: +{criseInfo.deficitDias} dias</p>
                        </div>
                        <div>
                            <p className="text-rose-400">Custo atual: <strong>{fmtBRL(criseInfo.custoAtual)}</strong></p>
                            <p className="text-rose-400">Custo fechamento: <strong>{fmtBRL(criseInfo.custoNecessario)}</strong></p>
                            <p className="text-rose-300 font-bold">Déficit: +{fmtBRL(criseInfo.deficitCusto)}</p>
                        </div>
                    </div>
                    <p className="text-[11px] text-rose-500 font-semibold mt-2">
                        Para fechar o triângulo: +{criseInfo.deficitDias} dias OU +{fmtBRL(criseInfo.deficitCusto)} de aporte.
                        Reformule a TAP e WBS.
                    </p>
                </div>
            )}
        </div>
    )
}
