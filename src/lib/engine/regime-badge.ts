import { ResultadoSC } from './clairaut'

// ═══════════════════════════════════════════════════════════════════════════
// regime-badge.ts — Badge de Regime Obtuso do CDT
// Story 2.1 — Sprint TM-SHADOW
// Deriva metadados do badge a partir do ResultadoSC para consumo por
// componentes UI sem re-implementar lógica de classificação.
// ═══════════════════════════════════════════════════════════════════════════

export type TipoBadgeRegime = 'beta' | 'gamma' | null

export interface BadgeRegimeObtuso {
    /** true quando o triângulo está em regime obtuso (β ou γ) */
    ativo: boolean
    /** tipo de regime: 'beta' | 'gamma' | null */
    tipo: TipoBadgeRegime
    /** símbolo grego: 'β' | 'γ' | '' */
    simbolo: string
    /** rótulo curto para exibição: 'Regime β' | 'Regime γ' | '' */
    label: string
    /** descrição da pressão ativa */
    descricao: string
    /** qual dimensão está em colapso */
    pressao: 'custo' | 'prazo' | null
}

// ─── Story 2.3 — Consumo de Reserva ──────────────────────────────────────────

export type NivelReserva = 'baixo' | 'moderado' | 'critico' | null

export interface BadgeConsumoReservaData {
    /** true quando Rα > 0 (alpha > 45°) */
    ativo: boolean
    /** nível de severidade: null quando inativo */
    nivel: NivelReserva
    /** valor de Rα ∈ [0, 1] */
    Ralpha: number
    /** rótulo de exibição */
    label: string
}

/**
 * Deriva o badge de consumo de reserva a partir do Rα (risco direcional orçamentário).
 *
 * Rα = max(0, α − 45) / 45 ∈ [0, 1]
 * - Rα = 0       → badge inativo (equilátero-like, sem pressão)
 * - 0 < Rα ≤ 0.33 → nivel 'baixo'    — "Reserva parcial"
 * - 0.33 < Rα ≤ 0.67 → nivel 'moderado' — "Consumindo reserva"
 * - Rα > 0.67    → nivel 'critico'   — "Reserva crítica"
 */
export function badgeConsumoReserva(resultado: ResultadoSC | null): BadgeConsumoReservaData {
    const inativo: BadgeConsumoReservaData = { ativo: false, nivel: null, Ralpha: 0, label: '' }

    if (!resultado || resultado.tipo === 'singular') return inativo

    const Ralpha = resultado.Ralpha ?? 0
    if (Ralpha <= 0) return inativo

    if (Ralpha <= 0.33) {
        return { ativo: true, nivel: 'baixo', Ralpha, label: 'Reserva parcial' }
    }
    if (Ralpha <= 0.67) {
        return { ativo: true, nivel: 'moderado', Ralpha, label: 'Consumindo reserva' }
    }
    return { ativo: true, nivel: 'critico', Ralpha, label: 'Reserva crítica' }
}

// ─── Story 2.1 — Badge Regime Obtuso ─────────────────────────────────────────

/**
 * Deriva os metadados do badge de regime a partir do ResultadoSC.
 *
 * - agudo / null → badge inativo
 * - singular     → badge inativo (estado degenerado — ângulo reto)
 * - obtuso_beta  → badge ativo, pressão custo (β)
 * - obtuso_gamma → badge ativo, pressão prazo (γ)
 */
export function badgeRegimeObtuso(resultado: ResultadoSC | null): BadgeRegimeObtuso {
    const inativo: BadgeRegimeObtuso = {
        ativo: false,
        tipo: null,
        simbolo: '',
        label: '',
        descricao: '',
        pressao: null,
    }

    if (!resultado) return inativo

    if (resultado.tipo === 'agudo' || resultado.tipo === 'singular') {
        return inativo
    }

    if (resultado.tipo === 'obtuso_beta') {
        return {
            ativo: true,
            tipo: 'beta',
            simbolo: 'β',
            label: 'Regime β',
            descricao: 'Pressão de custo: orçamento em colapso',
            pressao: 'custo',
        }
    }

    // obtuso_gamma
    return {
        ativo: true,
        tipo: 'gamma',
        simbolo: 'γ',
        label: 'Regime γ',
        descricao: 'Pressão de prazo: cronograma em colapso',
        pressao: 'prazo',
    }
}
