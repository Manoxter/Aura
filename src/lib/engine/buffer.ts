/**
 * Buffer Engine — Cálculo de Buffers CCPM (RSS)
 *
 * Decisões:
 *   D2: Project Buffer = sqrt(sum(si²))  onde si = duracao_segura - duracao_otimista
 *   D6: Cost Buffer = sqrt(sum(ci²))     onde ci = custo_seguro - custo_otimista
 *   D14: Buffer não pode exceder CEt (TRUNCA)
 *
 * Tipos de buffer:
 *   - Project Buffer (PB): protege a data de entrega da cadeia crítica
 *   - Feeding Buffer (FB): protege junções onde caminhos não-críticos alimentam a cadeia
 *   - Cost Buffer (CB): protege o orçamento total
 *   - Integration Buffer: protege dependências inter-sprint (futuro)
 *
 * @aura-production — TOC, CCPM, Goldratt
 */

import type { TarefaCCPM } from './ccpm'
import { EIXO_LIMITE_CONTINGENCIA } from './cet-dimension'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProjectBuffer {
    /** Tamanho do buffer em dias */
    tamanho: number
    /** Gordura individual de cada tarefa (si = segura - otimista) */
    gorduras: number[]
    /** % consumido do buffer (0–100+) */
    consumido_pct: number
}

export interface CostBuffer {
    /** Tamanho do buffer em unidades monetárias */
    tamanho: number
    /** Gordura individual de custo (ci = custo_seguro - custo_otimista) */
    gorduras: number[]
    /** % consumido do buffer (0–100+) */
    consumido_pct: number
}

export interface FeedingBuffer {
    /** ID da tarefa de junção (onde o caminho não-crítico encontra a cadeia) */
    tarefa_juncao: string
    /** Tamanho do buffer em dias */
    tamanho: number
    /** IDs das tarefas do caminho alimentador */
    caminho: string[]
}

export interface BufferResult {
    project_buffer: ProjectBuffer
    cost_buffer: CostBuffer
    feeding_buffers: FeedingBuffer[]
}

// ─── RSS (Root Sum of Squares) ────────────────────────────────────────────────

/**
 * Calcula buffer RSS: sqrt(sum(si²))
 * Método estatístico de Goldratt para agregação de incertezas independentes.
 *
 * @param gorduras - array de diferenças (segura - otimista) por tarefa
 * @returns tamanho do buffer (arredondado para cima)
 */
export function calcularBufferRSS(gorduras: number[]): number {
    if (gorduras.length === 0) return 0
    const somaQuadrados = gorduras.reduce((sum, g) => sum + g * g, 0)
    return Math.ceil(Math.sqrt(somaQuadrados))
}

// ─── D2: Project Buffer ───────────────────────────────────────────────────────

/**
 * Calcula o Project Buffer da cadeia crítica.
 * PB = sqrt(sum((duracao_segura_i - duracao_otimista_i)²))
 *
 * @param tarefas_cadeia - tarefas que compõem a cadeia crítica
 */
export function calcularProjectBuffer(tarefas_cadeia: TarefaCCPM[]): ProjectBuffer {
    const gorduras = tarefas_cadeia.map(t =>
        Math.max(0, t.duracao_segura - t.duracao_otimista)
    )
    const tamanho = calcularBufferRSS(gorduras)

    return {
        tamanho,
        gorduras,
        consumido_pct: 0,
    }
}

// ─── D6: Cost Buffer ──────────────────────────────────────────────────────────

/**
 * Calcula o Cost Buffer do projeto.
 * CB = sqrt(sum((custo_seguro_i - custo_otimista_i)²))
 *
 * @param tarefas - todas as tarefas do projeto
 */
export function calcularCostBuffer(tarefas: TarefaCCPM[]): CostBuffer {
    const gorduras = tarefas.map(t =>
        Math.max(0, t.custo_seguro - t.custo_otimista)
    )
    const tamanho = calcularBufferRSS(gorduras)

    return {
        tamanho,
        gorduras,
        consumido_pct: 0,
    }
}

// ─── Feeding Buffers ──────────────────────────────────────────────────────────

/**
 * Calcula Feeding Buffers para caminhos não-críticos que alimentam a cadeia crítica.
 *
 * @param tarefas - todas as tarefas CCPM
 * @param cadeia_critica - IDs das tarefas na cadeia crítica
 */
export function calcularFeedingBuffers(
    tarefas: TarefaCCPM[],
    cadeia_critica: string[]
): FeedingBuffer[] {
    const ccSet = new Set(cadeia_critica)
    const taskMap = new Map(tarefas.map(t => [t.id, t]))
    const feedingBuffers: FeedingBuffer[] = []

    // Para cada tarefa na cadeia crítica, verificar predecessoras não-críticas
    for (const ccId of cadeia_critica) {
        const ccTask = taskMap.get(ccId)
        if (!ccTask) continue

        for (const depId of ccTask.dependencias) {
            if (ccSet.has(depId)) continue // pular se já é cadeia crítica

            // Traçar caminho não-crítico para trás
            const caminho: string[] = []
            const gorduras: number[] = []
            let atual = taskMap.get(depId)

            while (atual && !ccSet.has(atual.id)) {
                caminho.unshift(atual.id)
                gorduras.unshift(Math.max(0, atual.duracao_segura - atual.duracao_otimista))

                // Seguir a primeira predecessora (heurística simples)
                const pred = atual.dependencias.length > 0
                    ? taskMap.get(atual.dependencias[0])
                    : undefined
                atual = pred
            }

            if (caminho.length > 0) {
                feedingBuffers.push({
                    tarefa_juncao: ccId,
                    tamanho: calcularBufferRSS(gorduras),
                    caminho,
                })
            }
        }
    }

    return feedingBuffers
}

// ─── D14: Truncamento CEt ─────────────────────────────────────────────────────

/**
 * Trunca buffer para não exceder o limite CEt.
 * D14: buffer não pode exceder CEt do projeto — TRUNCA se necessário.
 *
 * @param buffer_tamanho - tamanho calculado do buffer
 * @param baseline - valor baseline (ex: duração total da cadeia ou orçamento)
 * @param limite_cet - fator CEt (default: EIXO_LIMITE_CONTINGENCIA = 1.25)
 * @returns tamanho truncado
 */
export function truncarBufferCEt(
    buffer_tamanho: number,
    baseline: number,
    limite_cet: number = EIXO_LIMITE_CONTINGENCIA
): number {
    if (baseline <= 0) return buffer_tamanho
    const margem_maxima = baseline * (limite_cet - 1) // ex: 25% do baseline
    return Math.min(buffer_tamanho, Math.ceil(margem_maxima))
}

// ─── Buffer Consumption ───────────────────────────────────────────────────────

/**
 * Calcula o percentual de consumo do buffer.
 *
 * @param atraso_acumulado - dias (ou $) de atraso acumulado
 * @param buffer_tamanho - tamanho total do buffer
 * @returns percentual (0–100+). Acima de 100 = buffer esgotado.
 */
export function calcularConsumoBuffer(atraso_acumulado: number, buffer_tamanho: number): number {
    if (buffer_tamanho <= 0) return atraso_acumulado > 0 ? 100 : 0
    return (atraso_acumulado / buffer_tamanho) * 100
}

// ─── Zona Fever Chart ─────────────────────────────────────────────────────────

export type FeverZone = 'azul' | 'verde' | 'amarelo' | 'vermelho' | 'preto'

/**
 * Determina a zona do Fever Chart baseado no consumo do buffer (D10, D29).
 * Decisão 24: 5ª zona AZUL (remissão — buffer < 0%, projeto devolvendo buffer).
 *
 * @param consumido_pct - percentual de buffer consumido (pode ser negativo = sobra)
 * @param progresso_pct - percentual de progresso da cadeia crítica (0–100)
 */
export function determinarFeverZone(consumido_pct: number, progresso_pct: number): FeverZone {
    // Decisão 24: Buffer negativo = remissão (projeto devolvendo buffer)
    if (consumido_pct < 0) return 'azul'

    if (consumido_pct >= 100) return 'preto'

    // Linha diagonal: se consumo > progresso → risco crescente
    const ratio = progresso_pct > 0 ? consumido_pct / progresso_pct : consumido_pct

    if (ratio <= 0.5) return 'verde'
    if (ratio <= 1.0) return 'amarelo'
    return 'vermelho'
}

// ─── Pipeline Completo de Buffers ─────────────────────────────────────────────

/**
 * Calcula todos os buffers do projeto CCPM.
 *
 * @param tarefas - todas as tarefas CCPM
 * @param cadeia_critica - IDs das tarefas na cadeia crítica
 * @param duracao_baseline - duração baseline para truncamento CEt (D14)
 * @param orcamento_baseline - orçamento baseline para truncamento CEt do cost buffer
 */
export function calcularBuffers(
    tarefas: TarefaCCPM[],
    cadeia_critica: string[],
    duracao_baseline: number,
    orcamento_baseline: number
): BufferResult {
    const taskMap = new Map(tarefas.map(t => [t.id, t]))
    const tarefas_cadeia = cadeia_critica
        .map(id => taskMap.get(id))
        .filter(Boolean) as TarefaCCPM[]

    // Project Buffer (D2 + D14)
    const pb = calcularProjectBuffer(tarefas_cadeia)
    pb.tamanho = truncarBufferCEt(pb.tamanho, duracao_baseline)

    // Cost Buffer (D6 + D14)
    const cb = calcularCostBuffer(tarefas)
    cb.tamanho = truncarBufferCEt(cb.tamanho, orcamento_baseline)

    // Feeding Buffers
    const feeding_buffers = calcularFeedingBuffers(tarefas, cadeia_critica)

    return {
        project_buffer: pb,
        cost_buffer: cb,
        feeding_buffers,
    }
}
