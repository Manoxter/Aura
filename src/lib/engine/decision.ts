/**
 * Decision Engine — Registro de Decisões (3 Camadas)
 *
 * Decisão D21: Decisão perfura 3 camadas no BACKEND (PM nunca vê):
 *   1. Camada Prazo: atualiza f_prazo_dashboard(t) += deltaP
 *   2. Camada Custo: atualiza f_custo_dashboard(t) += deltaC
 *   3. Camada Escopo: recalcula CDT → novo TA
 *
 * Resultado visível: Fever Chart + Triângulo + Castelo atualizam.
 *
 * D11: Custo no Tech = ACUMULADO (EVM, crescente), não burndown.
 */

import { EIXO_LIMITE_CONTINGENCIA } from './cet-dimension'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DecisionType =
    | 'aporte'           // crashing: adicionar recurso
    | 'corte_escopo'     // sacrificar feature
    | 'extensao_prazo'   // negociar mais tempo
    | 'rebaseline'       // resetar baseline
    | 'contingencia'     // usar reserva
    | 'aceleracao'       // paralelizar tarefas

export interface Decision {
    id: string
    /** Timestamp ISO da decisão */
    timestamp: string
    tipo: DecisionType
    descricao: string
    /** Impacto em prazo (dias). Positivo = atrasa, negativo = adianta */
    delta_prazo: number
    /** Impacto em custo (unidade monetária). Positivo = encarece */
    delta_custo: number
    /** Impacto em escopo (número de tarefas afetadas) */
    delta_escopo: number
    /** ID da tarefa diretamente afetada */
    tarefa_id: string | null
    /** Sprint/fase em que a decisão foi tomada */
    sprint_id: string | null
    /** Zona Fever Chart no momento da decisão */
    zona_fever: string | null
}

/** Estado acumulado das 3 camadas */
export interface DecisionState {
    /** Acúmulo de delta_prazo (dias de atraso acumulado) */
    prazo_acumulado: number
    /** Acúmulo de delta_custo (custo acumulado de decisões) */
    custo_acumulado: number
    /** Tarefas adicionadas/removidas por escopo */
    escopo_delta: number
    /** Total de decisões registradas */
    n_decisoes: number
    /** Desvio integrado = integral|f_dashboard - f_setup|dt (D32: badge) */
    desvio_integrado: number
}

// ─── Camada 1: Prazo ──────────────────────────────────────────────────────────

/**
 * Aplica o impacto de prazo de uma decisão na função dashboard.
 * f_prazo_dashboard(t) += deltaP
 */
export function aplicarDeltaPrazo(
    estado: DecisionState,
    decision: Decision
): DecisionState {
    return {
        ...estado,
        prazo_acumulado: estado.prazo_acumulado + decision.delta_prazo,
        n_decisoes: estado.n_decisoes + 1,
    }
}

// ─── Camada 2: Custo ──────────────────────────────────────────────────────────

/**
 * Aplica o impacto de custo de uma decisão na função dashboard.
 * f_custo_dashboard(t) += deltaC
 *
 * D11: No Tech, custo é ACUMULADO (EVM). Cada decisão SOMA ao acumulado.
 */
export function aplicarDeltaCusto(
    estado: DecisionState,
    decision: Decision
): DecisionState {
    return {
        ...estado,
        custo_acumulado: estado.custo_acumulado + decision.delta_custo,
        n_decisoes: estado.n_decisoes + 1,
    }
}

// ─── Camada 3: Escopo ─────────────────────────────────────────────────────────

/**
 * Aplica o impacto de escopo e dispara recálculo do CDT.
 */
export function aplicarDeltaEscopo(
    estado: DecisionState,
    decision: Decision
): DecisionState {
    return {
        ...estado,
        escopo_delta: estado.escopo_delta + decision.delta_escopo,
        n_decisoes: estado.n_decisoes + 1,
    }
}

// ─── Pipeline de 3 Camadas ────────────────────────────────────────────────────

/**
 * Aplica uma decisão nas 3 camadas simultaneamente (D21).
 * Retorna o novo estado e as flags de recálculo necessárias.
 */
export function aplicarDecisao(
    estado: DecisionState,
    decision: Decision
): { estado: DecisionState; requer_recalculo_cdt: boolean; requer_recalculo_fever: boolean } {
    const novo: DecisionState = {
        prazo_acumulado: estado.prazo_acumulado + decision.delta_prazo,
        custo_acumulado: estado.custo_acumulado + decision.delta_custo,
        escopo_delta: estado.escopo_delta + decision.delta_escopo,
        n_decisoes: estado.n_decisoes + 1,
        desvio_integrado: estado.desvio_integrado +
            Math.abs(decision.delta_prazo) + Math.abs(decision.delta_custo),
    }

    return {
        estado: novo,
        requer_recalculo_cdt: decision.delta_escopo !== 0 || decision.delta_prazo !== 0 || decision.delta_custo !== 0,
        requer_recalculo_fever: decision.delta_prazo !== 0 || decision.delta_custo !== 0,
    }
}

/**
 * Aplica múltiplas decisões em sequência (replay).
 */
export function replayDecisoes(decisoes: Decision[]): DecisionState {
    let estado = criarEstadoInicial()
    for (const d of decisoes) {
        const resultado = aplicarDecisao(estado, d)
        estado = resultado.estado
    }
    return estado
}

// ─── Estado Inicial ───────────────────────────────────────────────────────────

export function criarEstadoInicial(): DecisionState {
    return {
        prazo_acumulado: 0,
        custo_acumulado: 0,
        escopo_delta: 0,
        n_decisoes: 0,
        desvio_integrado: 0,
    }
}

// ─── D11: Custo Acumulado EVM (Tech) ──────────────────────────────────────────

/**
 * Calcula C(t) acumulado (EVM) para o produto Tech.
 * Corporate usa C(t) = custo RESTANTE (burndown, decrescente).
 * Tech usa C(t) = custo ACUMULADO (EVM, crescente).
 *
 * P decrescente + C crescente = triângulo natural.
 *
 * @param custos_realizados - array de custos realizados por período
 * @returns array acumulado
 */
export function calcularCustoAcumuladoEVM(custos_realizados: number[]): number[] {
    const acumulado: number[] = []
    let soma = 0
    for (const c of custos_realizados) {
        soma += c
        acumulado.push(soma)
    }
    return acumulado
}

/**
 * Calcula métricas EVM básicas.
 *
 * @param pv - Planned Value (valor planejado)
 * @param ev - Earned Value (valor agregado)
 * @param ac - Actual Cost (custo real)
 */
export function calcularEVM(pv: number, ev: number, ac: number): {
    spi: number    // Schedule Performance Index = EV/PV
    cpi: number    // Cost Performance Index = EV/AC
    sv: number     // Schedule Variance = EV - PV
    cv: number     // Cost Variance = EV - AC
} {
    return {
        spi: pv > 0 ? ev / pv : 0,
        cpi: ac > 0 ? ev / ac : 0,
        sv: ev - pv,
        cv: ev - ac,
    }
}

// ─── B5: CEt Hierárquica (D13, D14, D15) ─────────────────────────────────────

/**
 * Calcula CEt hierárquica em 3 etapas:
 *   1. CEt Total (projeto inteiro)
 *   2. CEt Sprint (cada sprint individual)
 *   3. CEt Buffer (buffer não pode exceder CEt) — D14: TRUNCA
 *
 * @param lados_total - [E, P, O] do projeto total
 * @param lados_sprints - array de [E, P, O] por sprint
 * @param buffer_pct - percentual do buffer em relação ao baseline
 * @returns { cet_total, cet_sprints, buffer_valido }
 */
export function calcularCEtHierarquica(
    lados_total: [number, number, number],
    lados_sprints: [number, number, number][],
    buffer_pct: number
): {
    cet_total: boolean
    cet_sprints: boolean[]
    buffer_valido: boolean
} {
    const verificarCEt = (lados: [number, number, number]): boolean => {
        const [a, b, c] = [...lados].sort((x, y) => x - y)
        return a + b > c // desigualdade triangular
    }

    const cet_total = verificarCEt(lados_total)
    const cet_sprints = lados_sprints.map(verificarCEt)

    // D14: buffer não pode exceder CEt → se buffer > 25% do menor lado, trunca
    const menorLado = Math.min(...lados_total)
    const buffer_valido = menorLado > 0 ? (buffer_pct / 100) <= (EIXO_LIMITE_CONTINGENCIA - 1) : false

    // D15: Se CEt total falha, propaga falha
    return {
        cet_total,
        cet_sprints,
        buffer_valido: cet_total && buffer_valido,
    }
}
