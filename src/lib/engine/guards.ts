/**
 * Guards numéricos — Sessão 29 (D-S29-06)
 *
 * G1: Dead zone classificação (fronteira agudo/obtuso)
 * G2: Pré-classificação via slopes (mc²-mp²)
 * G3: Clamp de ângulo (unificado math.ts + clairaut.ts)
 * G4: Área mínima visual (anti-degeneração)
 * G5: Sinal do slope (direção da reta)
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

/** G1: Threshold da dead zone na fronteira agudo/obtuso.
 *  Quando |mc²-mp²-1| < DELTA, classificação fica em 'agudo' (evita oscilação). */
export const DELTA_CLASSIFICACAO = 0.05

/** G3: Limite de clamp para cos — unificado para math.ts e clairaut.ts.
 *  Evita acos(±1) que retorna 0° ou 180° exato (degenerado). */
export const COS_CLAMP_MIN = -0.9999
export const COS_CLAMP_MAX = 0.9999

/** G4: Sin mínimo para que o triângulo seja visível (~1.15°).
 *  Abaixo disso, a altura < 2% do lado → invisível no SVG. */
export const MIN_SIN_VISUAL = 0.02

/** G5: Threshold abaixo do qual o sinal do slope é indeterminado (ruído). */
export const EPSILON_SLOPE = 1e-4

// ─── G1: Dead Zone de Classificação ──────────────────────────────────────────

/**
 * Verifica se o discriminante está na dead zone (fronteira agudo/obtuso).
 *
 * O discriminante `mc² - mp²` determina o protocolo:
 * - `> 1 + delta`  → beta (custo domina)
 * - `< -1 - delta` → gamma (prazo domina)
 * - dentro da faixa → agudo (equilibrado ou fronteira)
 *
 * @param mc2 - mc_norm ao quadrado
 * @param mp2 - mp_norm ao quadrado
 * @param delta - largura da dead zone (default: DELTA_CLASSIFICACAO)
 */
export function isDeadZone(mc2: number, mp2: number, delta = DELTA_CLASSIFICACAO): boolean {
    const disc = mc2 - mp2
    return Math.abs(disc - 1) < delta || Math.abs(disc + 1) < delta
}

// ─── G2: Pré-classificação via Slopes ─────────────────────────────────────────

export type PreClassResult = 'provavel_beta' | 'provavel_gamma' | 'neutro'

/**
 * Pré-classificação do protocolo a partir dos slopes normalizados.
 *
 * Algebricamente equivalente ao Clairaut (E²+P² < C² ↔ mc²-mp² > 1),
 * mas executada ANTES de calcular os lados — elimina 2 operações de sqrt.
 *
 * Com E = 1:
 *   beta:  C² > E² + P²  →  1+mc² > 1+(1+mp²)  →  mc²-mp² > 1
 *   gamma: P² > E² + C²  →  1+mp² > 1+(1+mc²)  →  mp²-mc² > 1
 *
 * @param mc_norm - Slope normalizado do custo (pode ter sinal)
 * @param mp_norm - Slope normalizado do prazo (pode ter sinal)
 * @param delta - Dead zone (default: DELTA_CLASSIFICACAO)
 */
export function preClassificarProtocolo(
    mc_norm: number,
    mp_norm: number,
    delta = DELTA_CLASSIFICACAO,
): PreClassResult {
    const mc2 = mc_norm * mc_norm
    const mp2 = mp_norm * mp_norm
    const disc = mc2 - mp2

    if (disc > 1 + delta) return 'provavel_beta'
    if (disc < -(1 + delta)) return 'provavel_gamma'
    return 'neutro'
}

/**
 * Retorna o discriminante mc²-mp² para diagnóstico.
 * Positivo = custo domina, Negativo = prazo domina.
 */
export function calcularDiscriminante(mc_norm: number, mp_norm: number): number {
    return mc_norm * mc_norm - mp_norm * mp_norm
}

// ─── G3: Clamp de Ângulo (Unificado) ─────────────────────────────────────────

/**
 * Clamp do cosseno para evitar NaN em acos.
 * Unifica o clamp de math.ts (0.9999) e clairaut.ts (1.0) — agora ambos usam este.
 */
export function clampCos(cos: number): number {
    return Math.max(COS_CLAMP_MIN, Math.min(COS_CLAMP_MAX, cos))
}

// ─── G4: Área Mínima Visual ──────────────────────────────────────────────────

/**
 * Verifica se o triângulo é visualmente degenerado (quase colinear).
 * Quando sin(ângulo) < MIN_SIN_VISUAL, o triângulo é invisível no SVG.
 *
 * @param sinAngulo - Seno do ângulo de construção
 * @returns true se o triângulo é visível, false se degenerado
 */
export function isVisualmenteViavel(sinAngulo: number): boolean {
    return Math.abs(sinAngulo) >= MIN_SIN_VISUAL
}

/**
 * Força um ângulo mínimo para que o triângulo seja visível.
 * Se sin(ângulo) < MIN_SIN, ajusta para o ângulo mínimo correspondente.
 */
export function forcarAnguloMinimo(angulo: number): number {
    const sinA = Math.sin(angulo)
    if (Math.abs(sinA) >= MIN_SIN_VISUAL) return angulo

    // Preservar o lado correto: se ângulo > π/2, manter obtuso; senão, manter agudo
    if (angulo > Math.PI / 2) {
        return Math.PI - Math.asin(MIN_SIN_VISUAL)
    }
    return Math.asin(MIN_SIN_VISUAL)
}

// ─── G5: Sinal do Slope ──────────────────────────────────────────────────────

export type SlopeSign = 'positive' | 'negative' | 'zero'

/**
 * Determina o sinal do slope com guard de ruído.
 * Quando |slope| < EPSILON_SLOPE, retorna 'zero' (indeterminado).
 *
 * Defaults semânticos:
 * - Custo: positivo (custo acumulado sempre cresce)
 * - Prazo: negativo (burndown sempre decresce)
 */
export function classificarSlopeSign(slope: number): SlopeSign {
    if (Math.abs(slope) < EPSILON_SLOPE) return 'zero'
    return slope > 0 ? 'positive' : 'negative'
}

/**
 * Retorna o sinal seguro do slope, com default para slopes indeterminados.
 * @param slope - Slope da regressão
 * @param defaultSign - Sinal padrão quando slope ≈ 0 (1 para custo, -1 para prazo)
 */
export function safeSlopeSign(slope: number, defaultSign: 1 | -1): number {
    if (Math.abs(slope) < EPSILON_SLOPE) return defaultSign
    return Math.sign(slope)
}
