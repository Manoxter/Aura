// ═══════════════════════════════════════════════════════════════════════════
// MetricTranslator — Tradução de métricas CDT para linguagem PM/técnica
// Story 5.7 — Labels Semânticos CDT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modo de exibição das métricas CDT.
 * - 'pm'  : linguagem gerencial (Escopo, Prazo, Orçamento, etc.)
 * - 'tech': linguagem técnica (E, P, O, MATED, NVO, CEt, IQ)
 */
export type MetricMode = 'pm' | 'tech'

/**
 * Labels por métrica e modo de exibição.
 *
 * Chave = código técnico da métrica
 * Valor = { pm: label gerencial, tech: label técnico }
 */
export const METRIC_LABELS: Record<string, Record<MetricMode, string>> = {
    E: { pm: 'Escopo', tech: 'E' },
    P: { pm: 'Prazo', tech: 'P' },
    O: { pm: 'Orçamento', tech: 'O' },
    MATED: { pm: 'Índice de Qualidade', tech: 'MATED' },
    NVO: { pm: 'Posição Ideal', tech: 'NVO' },
    CEt: { pm: 'Triângulo Válido', tech: 'CEt' },
    IQ: { pm: 'Índice de Qualidade', tech: 'IQ' },
}

/**
 * Tooltips explicativos por métrica e modo.
 * Modo PM: linguagem de gestão de projetos, sem jargão matemático.
 * Modo Tech: definição formal do MetodoAura.
 */
export const METRIC_TOOLTIPS: Record<string, Record<MetricMode, string>> = {
    E: {
        pm: 'Escopo: proporção de tarefas concluídas vs total planejado',
        tech: 'E: vértice de Escopo do triângulo CDT',
    },
    P: {
        pm: 'Prazo: aderência ao cronograma (desvio de datas)',
        tech: 'P: vértice de Prazo do triângulo CDT',
    },
    O: {
        pm: 'Orçamento: proporção do custo realizado vs planejado',
        tech: 'O: vértice de Orçamento (custo) do triângulo CDT',
    },
    MATED: {
        pm: 'Índice de Desvio da Qualidade: distância do projeto ao estado ideal',
        tech: 'MATED: distância Euclidiana do ponto atual ao NVO',
    },
    NVO: {
        pm: 'Posição Ideal: ponto de equilíbrio ótimo entre Escopo, Prazo e Orçamento',
        tech: 'NVO: Núcleo Viável Ótimo — baricentro órtrico, centróide TM ou incentro TM (hierarquia 3 níveis)',
    },
    CEt: {
        pm: 'Triângulo Válido: indica se Escopo, Prazo e Orçamento coexistem de forma viável',
        tech: 'CEt: Condição de Existência do Triângulo — desigualdade triangular |P−C| < E < P+C',
    },
    IQ: {
        pm: 'Índice de Qualidade: percentual da área do projeto atual em relação ao projeto ideal',
        tech: 'IQ: (área_TA / área_TM) × 100% — proporção de área Atual vs Meta',
    },
}

/**
 * Retorna o label traduzido de uma métrica CDT.
 * Fallback: retorna o próprio código da métrica se não houver tradução cadastrada.
 *
 * @param metric - Código da métrica (ex: 'E', 'P', 'O', 'MATED', 'NVO', 'CEt', 'IQ')
 * @param mode   - Modo de exibição ('pm' ou 'tech')
 * @returns Label traduzido ou o próprio código como fallback
 */
export function translateLabel(metric: string, mode: MetricMode): string {
    return METRIC_LABELS[metric]?.[mode] ?? metric
}

/**
 * Retorna o tooltip explicativo de uma métrica CDT.
 * Fallback: retorna string vazia se não houver tooltip cadastrado.
 *
 * @param metric - Código da métrica (ex: 'E', 'P', 'O', 'MATED')
 * @param mode   - Modo de exibição ('pm' ou 'tech')
 * @returns Tooltip explicativo ou string vazia como fallback
 */
export function translateTooltip(metric: string, mode: MetricMode): string {
    return METRIC_TOOLTIPS[metric]?.[mode] ?? ''
}
