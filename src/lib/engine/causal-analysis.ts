// causal-analysis.ts — Story 5.8
// MATED Causal: Decompor Vetor por Tarefa CPM
//
// Função: decompMATEDCausal()
// Para cada tarefa do caminho crítico: calcula sua contribuição proporcional
// ao MATED total baseada no peso da duração no caminho crítico.
//
// @aura-math @aura-production validaram a metodologia de contribuição proporcional.

import type { TarefaData } from './cpm'

export interface CausalInput {
    /** Triângulo Atual (lados normalizados) + MATED atual */
    ta: { escopo: number; prazo: number; orcamento: number; mated_distancia: number }
    /** Triângulo Meta (lados normalizados) */
    tm: { escopo: number; prazo: number; orcamento: number }
    /** Lista de tarefas com dados CPM (ES/EF/LS/LF/folga/critica) */
    tarefas: TarefaData[]
}

export interface CausalResult {
    tarefaId: string
    nome: string
    /** Contribuição percentual para o MATED total (0–100) */
    contribuicao_mated: number
    /** Dimensão dominante afetada por esta tarefa */
    dimensao: 'E' | 'P' | 'O'
}

/**
 * Decompõe o MATED em contribuições por tarefa do caminho crítico.
 *
 * Algoritmo (contribuição proporcional por duração):
 *   Para cada tarefa crítica t_i:
 *     peso_i = duracao_i / Σ duracao_criticas
 *     contribuicao_i = mated_distancia × peso_i
 *
 *   Normaliza para percentual (sempre soma 100%).
 *
 * Dimensão dominante: determinada pelo desvio relativo do TA vs TM por dimensão.
 *   ESCOPO  → desvio_E = |ta.escopo - tm.escopo| / tm.escopo
 *   PRAZO   → desvio_P = |ta.prazo  - tm.prazo|  / tm.prazo
 *   ORÇAM.  → desvio_O = |ta.orcamento - tm.orcamento| / tm.orcamento
 *
 * Restrição: somente tarefas do caminho crítico (critica=true) são incluídas (AC-5).
 *
 * @returns Array de CausalResult ordenado por contribuicao_mated decrescente.
 */
export function decompMATEDCausal(input: CausalInput): CausalResult[] {
    const { ta, tm, tarefas } = input

    // Somente tarefas críticas participam da análise causal (AC-5)
    const criticas = tarefas.filter(t => t.critica)
    if (criticas.length === 0) return []

    const duracaoTotal = criticas.reduce((acc, t) => acc + t.duracao_estimada, 0)
    if (duracaoTotal <= 0) return []

    // Dimensão dominante global (mesma para todas as tarefas do caminho crítico)
    const desvioE = Math.abs(ta.escopo - tm.escopo) / Math.max(tm.escopo, 0.001)
    const desvioP = Math.abs(ta.prazo - tm.prazo) / Math.max(tm.prazo, 0.001)
    const desvioO = Math.abs(ta.orcamento - tm.orcamento) / Math.max(tm.orcamento, 0.001)

    let dimensaoDominante: 'E' | 'P' | 'O'
    if (desvioE >= desvioP && desvioE >= desvioO) dimensaoDominante = 'E'
    else if (desvioP >= desvioO) dimensaoDominante = 'P'
    else dimensaoDominante = 'O'

    const results: CausalResult[] = criticas.map(tarefa => {
        const peso = tarefa.duracao_estimada / duracaoTotal
        return {
            tarefaId: tarefa.id,
            nome: tarefa.nome,
            // Contribuição proporcional à duração no caminho crítico (será normalizada)
            contribuicao_mated: peso * 100,
            dimensao: dimensaoDominante,
        }
    })

    // Ordenar por contribuição decrescente
    results.sort((a, b) => b.contribuicao_mated - a.contribuicao_mated)

    return results
}

/**
 * Retorna os top-N resultados causais (default: 3).
 */
export function topCausas(results: CausalResult[], n = 3): CausalResult[] {
    return results.slice(0, n)
}
