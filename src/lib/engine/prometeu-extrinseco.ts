// ═══════════════════════════════════════════════════════════════════════════
// Story 13.5 — Prometeu Extrínseco: Score RC (Risco Composto)
// Função pura para quantificação de riscos externos ao Triângulo CDT.
// ═══════════════════════════════════════════════════════════════════════════

/** Score de Risco Composto — valor no intervalo [0, 1] */
export type ScoreRC = number

/** Faixa de classificação visual do Score RC */
export type ClassificacaoRC = 'verde' | 'amarelo' | 'vermelho'

// Pesos padrão Aura para Score RC
const W1 = 0.3  // peso da probabilidade
const W2 = 0.3  // peso do impacto
const W3 = 0.4  // peso da interação P × I

/**
 * Calcula o Score de Risco Composto (Score RC) de um risco.
 *
 * Fórmula: RC = w₁·P + w₂·I + w₃·(P × I)
 * Pesos Aura: w₁=0.3, w₂=0.3, w₃=0.4
 *
 * @param probabilidade  Probabilidade de ocorrência ∈ [0, 1]
 * @param impacto        Impacto se ocorrer ∈ [0, 1]
 * @returns Score RC ∈ [0, 1], 4 casas decimais
 * @throws Error se probabilidade ou impacto estiverem fora de [0, 1]
 */
export function calcularScoreRC(probabilidade: number, impacto: number): ScoreRC {
    if (probabilidade < 0 || probabilidade > 1) {
        throw new Error(`probabilidade deve estar em [0, 1]; recebido: ${probabilidade}`)
    }
    if (impacto < 0 || impacto > 1) {
        throw new Error(`impacto deve estar em [0, 1]; recebido: ${impacto}`)
    }
    const rc = W1 * probabilidade + W2 * impacto + W3 * (probabilidade * impacto)
    return parseFloat(rc.toFixed(4))
}

/**
 * Classifica o Score RC em faixa visual:
 * - 'verde'    → score_rc < 0.3  (risco baixo)
 * - 'amarelo'  → 0.3 ≤ score_rc ≤ 0.6 (risco moderado)
 * - 'vermelho' → score_rc > 0.6  (risco crítico)
 */
export function classificarScoreRC(score: ScoreRC): ClassificacaoRC {
    if (score < 0.3) return 'verde'
    if (score <= 0.6) return 'amarelo'
    return 'vermelho'
}
