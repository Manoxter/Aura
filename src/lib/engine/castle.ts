/**
 * Castelo de Cartas — Propagação Direcional (D31)
 *
 * Propagação de impacto de decisões entre sprints:
 *   - Concluídos = cristalizados (ZERO impacto)
 *   - Ativo = recebe decisão diretamente
 *   - Futuros = distorção proporcional, atenuada por buffers (e^-λk)
 *
 * Skew visual = -arctan(buffer_consumido/buffer_original) × fator
 *
 * @aura-production — TOC, CCPM, Goldratt
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SprintState = 'concluido' | 'ativo' | 'futuro'

export interface CastleSprint {
    id: string
    numero: number
    estado: SprintState
    /** Buffer original do sprint (dias) */
    buffer_original: number
    /** Buffer consumido (dias) */
    buffer_consumido: number
    /** Impacto recebido por propagação (dias) */
    impacto_propagado: number
    /** Skew visual (radianos) para renderização */
    skew_visual: number
}

export interface PropagationResult {
    sprints: CastleSprint[]
    /** Impacto total não absorvido (ultrapassou todos os buffers) */
    impacto_residual: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Fator de atenuação exponencial (λ). Maior = decai mais rápido. */
const LAMBDA_DEFAULT = 0.3

/** Fator de escala para skew visual */
const SKEW_FATOR = 0.5

// ─── Atenuação Exponencial ────────────────────────────────────────────────────

/**
 * Calcula o fator de atenuação para o k-ésimo sprint futuro.
 * Fator = e^(-λ × k)
 *
 * @param k - distância em sprints do sprint ativo (1 = próximo, 2 = seguinte, etc)
 * @param lambda - fator de atenuação (default: 0.3)
 */
export function fatorAtenuacao(k: number, lambda: number = LAMBDA_DEFAULT): number {
    if (k <= 0) return 1
    return Math.exp(-lambda * k)
}

// ─── Skew Visual ──────────────────────────────────────────────────────────────

/**
 * Calcula o skew visual de um sprint baseado no consumo de buffer.
 * skew = -arctan(buffer_consumido / buffer_original) × fator
 *
 * @param buffer_consumido - dias de buffer consumidos
 * @param buffer_original - dias de buffer total
 * @param fator - fator de escala visual (default: 0.5)
 * @returns ângulo de skew em radianos (negativo = inclinação para a esquerda)
 */
export function calcularSkewVisual(
    buffer_consumido: number,
    buffer_original: number,
    fator: number = SKEW_FATOR
): number {
    if (buffer_original <= 0) return 0
    return -Math.atan(buffer_consumido / buffer_original) * fator
}

// ─── Propagação Direcional ────────────────────────────────────────────────────

/**
 * Propaga o impacto de uma decisão no sprint ativo para sprints futuros.
 *
 * Regras D31:
 *   1. Concluídos: ZERO impacto (cristalizados)
 *   2. Ativo: recebe impacto total da decisão
 *   3. Futuros: impacto × e^(-λk), atenuado pelos buffers disponíveis
 *
 * @param sprints - sprints ordenados por número
 * @param impacto_decisao - impacto da decisão em dias (positivo = atraso)
 * @param lambda - fator de atenuação exponencial
 */
export function propagarImpacto(
    sprints: CastleSprint[],
    impacto_decisao: number,
    lambda: number = LAMBDA_DEFAULT
): PropagationResult {
    const resultado = sprints.map(s => ({ ...s }))
    let impacto_residual = 0

    // Encontrar o sprint ativo
    const ativoIdx = resultado.findIndex(s => s.estado === 'ativo')
    if (ativoIdx === -1) {
        return { sprints: resultado, impacto_residual: impacto_decisao }
    }

    // Sprint ativo recebe impacto total
    const ativo = resultado[ativoIdx]
    const buffer_disponivel_ativo = Math.max(0, ativo.buffer_original - ativo.buffer_consumido)
    const absorvido_ativo = Math.min(impacto_decisao, buffer_disponivel_ativo)
    ativo.buffer_consumido += absorvido_ativo
    ativo.impacto_propagado += impacto_decisao
    ativo.skew_visual = calcularSkewVisual(ativo.buffer_consumido, ativo.buffer_original)

    let naoAbsorvido = impacto_decisao - absorvido_ativo

    // Propagar para sprints futuros
    let k = 1
    for (let i = ativoIdx + 1; i < resultado.length; i++) {
        const sprint = resultado[i]
        if (sprint.estado === 'concluido') continue // Cristalizado — D31

        if (naoAbsorvido <= 0) break

        const atenuado = naoAbsorvido * fatorAtenuacao(k, lambda)
        const buffer_disponivel = Math.max(0, sprint.buffer_original - sprint.buffer_consumido)
        const absorvido = Math.min(atenuado, buffer_disponivel)

        sprint.buffer_consumido += absorvido
        sprint.impacto_propagado += atenuado
        sprint.skew_visual = calcularSkewVisual(sprint.buffer_consumido, sprint.buffer_original)

        naoAbsorvido = atenuado - absorvido
        k++
    }

    impacto_residual = Math.max(0, naoAbsorvido)

    return { sprints: resultado, impacto_residual }
}

// ─── Estado do Castelo ────────────────────────────────────────────────────────

/**
 * Calcula o estado completo do Castelo de Cartas.
 * Usado para renderização visual dos sprints empilhados.
 *
 * @param sprints - sprints ordenados
 * @returns sprints com skew visual calculado
 */
export function calcularEstadoCastelo(sprints: CastleSprint[]): CastleSprint[] {
    return sprints.map(s => ({
        ...s,
        skew_visual: s.estado === 'concluido'
            ? 0 // Cristalizado — estável
            : calcularSkewVisual(s.buffer_consumido, s.buffer_original),
    }))
}

/**
 * Classifica a estabilidade geral do castelo.
 *
 * @param sprints - sprints do castelo
 * @returns 'estavel' | 'inclinado' | 'critico' | 'colapsado'
 */
export function classificarEstabilidade(
    sprints: CastleSprint[]
): 'estavel' | 'inclinado' | 'critico' | 'colapsado' {
    const futuros = sprints.filter(s => s.estado !== 'concluido')
    if (futuros.length === 0) return 'estavel'

    const skews = futuros.map(s =>
        Math.abs(calcularSkewVisual(s.buffer_consumido, s.buffer_original))
    )
    const maxSkew = Math.max(...skews)
    const mediaSkew = skews.reduce((a, b) => a + b, 0) / skews.length

    // Buffer esgotado em qualquer sprint futuro = colapsado
    const algumEsgotado = futuros.some(s =>
        s.buffer_original > 0 && s.buffer_consumido >= s.buffer_original
    )
    if (algumEsgotado) return 'colapsado'

    if (maxSkew > 0.5) return 'critico'     // skew > ~27°
    if (mediaSkew > 0.2) return 'inclinado' // skew médio > ~11°
    return 'estavel'
}
