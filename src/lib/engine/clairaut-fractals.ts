/**
 * Clairaut nos Fractais (D23)
 *
 * Regras de aplicação do Clairaut aos Sprint Triangles:
 *   - Clairaut COMPLETO: TM total + último sprint
 *   - Clairaut SIMPLIFICADO (protocolo alpha apenas): demais sprints
 *   - TBZ: SEM classificação Clairaut
 *
 * @aura-math — Geometra Senior
 */

import { sintetizarClairaut, type ResultadoSC } from './clairaut'
import type { SprintTriangle } from './fractals'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClairautMode = 'completo' | 'simplificado' | 'nenhum'

/** Resultado Clairaut para um sprint fractal */
export interface ClairautFractal {
    sprint_id: string
    modo: ClairautMode
    /** Resultado completo (só para modo 'completo') */
    resultado: ResultadoSC | null
    /** Apenas alpha (para modo 'simplificado') */
    alpha: number | null
}

// ─── Aplicar Clairaut aos Fractais ────────────────────────────────────────────

/**
 * Determina o modo Clairaut para cada sprint (D23).
 *
 * @param sprint - o sprint triangle
 * @param isUltimo - se é o último sprint ativo/concluído
 * @param isTBZ - se está na zona TBZ (sem classificação)
 */
export function determinarModoClairaut(
    sprint: SprintTriangle,
    isUltimo: boolean,
    isTBZ: boolean = false
): ClairautMode {
    if (isTBZ) return 'nenhum'
    if (isUltimo) return 'completo'
    return 'simplificado'
}

/**
 * Aplica Clairaut a um sprint conforme o modo determinado.
 *
 * @param sprint - sprint triangle
 * @param modo - modo Clairaut
 */
export function aplicarClairautSprint(
    sprint: SprintTriangle,
    modo: ClairautMode
): ClairautFractal {
    if (modo === 'nenhum') {
        return { sprint_id: sprint.id, modo, resultado: null, alpha: null }
    }

    if (modo === 'completo') {
        const resultado = sintetizarClairaut(sprint.E, sprint.P, sprint.C)
        return {
            sprint_id: sprint.id,
            modo,
            resultado,
            alpha: resultado.alpha,
        }
    }

    // Simplificado: apenas alpha (ângulo de absorção)
    const resultado = sintetizarClairaut(sprint.E, sprint.P, sprint.C)
    return {
        sprint_id: sprint.id,
        modo,
        resultado: null,
        alpha: resultado.alpha,
    }
}

/**
 * Aplica Clairaut a todos os sprints do projeto (D23).
 *
 * @param sprints - sprints ordenados por número
 * @param tmTotal - lados do TM total { E, P, C } para Clairaut completo
 */
export function aplicarClairautFractais(
    sprints: SprintTriangle[],
    tmTotal: { E: number; P: number; C: number }
): { tm_clairaut: ResultadoSC; sprints: ClairautFractal[] } {
    // TM total: sempre Clairaut completo
    const tm_clairaut = sintetizarClairaut(tmTotal.E, tmTotal.P, tmTotal.C)

    // Identificar o último sprint ativo ou concluído
    const ativosOuConcluidos = sprints.filter(s => s.status !== 'planejado')
    const ultimoId = ativosOuConcluidos.length > 0
        ? ativosOuConcluidos[ativosOuConcluidos.length - 1].id
        : null

    const resultados = sprints.map(sprint => {
        const isUltimo = sprint.id === ultimoId
        const modo = determinarModoClairaut(sprint, isUltimo)
        return aplicarClairautSprint(sprint, modo)
    })

    return { tm_clairaut, sprints: resultados }
}
