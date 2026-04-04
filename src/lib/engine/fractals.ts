/**
 * Sprint Triangles — Fractais CDT
 *
 * Cada sprint = mini-CDT com:
 *   E = 1 (normalizado, escopo do sprint é fixo)
 *   P = burndown CCPM (progresso do sprint)
 *   C = custo EVM (acumulado do sprint)
 *
 * Decisões:
 *   D7:  Sprint Triangles + TBZ (zona do triângulo)
 *   D9:  Sprints sequenciais (não sobrepostos)
 *   D12: Saúde global = CDT(totais), NÃO média dos sprints
 *   D24: Obtusângulos PERMITIDOS. Beta natural em sprints (~30%)
 *   D23: Clairaut completo no TM total + último sprint, simplificado nos demais
 *
 * @aura-production — TOC, CCPM, Goldratt
 */

import { determinarFeverZone, type FeverZone } from './buffer'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Um sprint como mini-CDT fractal */
export interface SprintTriangle {
    /** ID do sprint */
    id: string
    /** Nome/label do sprint */
    nome: string
    /** Número sequencial do sprint (D9: sequenciais) */
    numero: number
    /** Lado E — escopo normalizado (sempre 1.0 no sprint) */
    E: number
    /** Lado P — progresso burndown CCPM (0→1 conforme sprint avança) */
    P: number
    /** Lado C — custo acumulado EVM normalizado (0→1 conforme gasta) */
    C: number
    /** Data de início do sprint (ISO) */
    data_inicio: string
    /** Data de fim planejada do sprint (ISO) */
    data_fim: string
    /** Status do sprint */
    status: 'planejado' | 'ativo' | 'concluido'
    /** Zona Fever Chart deste sprint */
    fever_zone: FeverZone
    /** Buffer consumido (%) do sprint */
    buffer_consumido_pct: number
    /** Ângulos do triângulo sprint (graus) */
    alpha: number
    beta: number
    gamma: number
    /** Forma geométrica do triângulo */
    forma: TriangleShape
}

export type TriangleShape =
    | 'equilatero'
    | 'isosceles'
    | 'escaleno_acutangulo'
    | 'escaleno_obtusangulo'  // D24: PERMITIDO
    | 'degenerado'

/** Saúde global do projeto (D12: CDT dos totais, NÃO média) */
export interface GlobalHealth {
    /** Lados totais do CDT global */
    E_total: number
    P_total: number
    C_total: number
    /** Área do CDT global */
    area_global: number
    /** Zona Fever Chart global */
    fever_zone_global: FeverZone
    /** Contagem de sprints por zona */
    sprints_por_zona: Record<FeverZone, number>
}

// ─── Cálculos Geométricos ─────────────────────────────────────────────────────

/**
 * Calcula os ângulos de um triângulo usando lei dos cossenos.
 * Retorna [alpha, beta, gamma] em graus.
 * D24: Obtusângulos são PERMITIDOS (beta natural em sprints).
 */
export function calcularAngulos(E: number, P: number, C: number): [number, number, number] {
    if (E <= 0 || P <= 0 || C <= 0) return [0, 0, 0]

    // Verificar desigualdade triangular
    const lados = [E, P, C].sort((a, b) => a - b)
    if (lados[0] + lados[1] <= lados[2]) return [0, 0, 0] // degenerado

    const toDeg = 180 / Math.PI

    // Lei dos cossenos: cos(A) = (b² + c² - a²) / (2bc)
    const cosAlpha = clamp((P * P + C * C - E * E) / (2 * P * C), -1, 1)
    const cosBeta = clamp((E * E + C * C - P * P) / (2 * E * C), -1, 1)
    const cosGamma = clamp((E * E + P * P - C * C) / (2 * E * P), -1, 1)

    return [
        Math.acos(cosAlpha) * toDeg,
        Math.acos(cosBeta) * toDeg,
        Math.acos(cosGamma) * toDeg,
    ]
}

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v))
}

/**
 * Classifica a forma do triângulo.
 * D24: obtusângulos são válidos e esperados em sprints de infra.
 */
export function classificarForma(alpha: number, beta: number, gamma: number): TriangleShape {
    if (alpha === 0 && beta === 0 && gamma === 0) return 'degenerado'

    const angulos = [alpha, beta, gamma].sort((a, b) => a - b)
    const maxAngulo = angulos[2]

    // Tolerância de 2° para classificação
    const todosSimilares = Math.abs(angulos[2] - angulos[0]) < 6
    const doisSimilares = Math.abs(angulos[0] - angulos[1]) < 3 ||
                          Math.abs(angulos[1] - angulos[2]) < 3

    if (todosSimilares) return 'equilatero'
    if (doisSimilares) return 'isosceles'
    if (maxAngulo > 90) return 'escaleno_obtusangulo'
    return 'escaleno_acutangulo'
}

// ─── Área do Triângulo (Heron) ────────────────────────────────────────────────

/**
 * Calcula a área do triângulo usando a fórmula de Heron.
 */
export function areaHeron(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2
    const val = s * (s - a) * (s - b) * (s - c)
    if (val <= 0) return 0
    return Math.sqrt(val)
}

// ─── Construir Sprint Triangle ────────────────────────────────────────────────

/**
 * Constrói um SprintTriangle a partir dos dados de execução de um sprint.
 *
 * @param id - ID do sprint
 * @param nome - nome do sprint
 * @param numero - número sequencial (D9)
 * @param progresso_pct - % de tarefas concluídas (0–100) → P
 * @param custo_pct - % de orçamento do sprint gasto (0–100) → C
 * @param buffer_consumido_pct - % do buffer consumido
 * @param data_inicio - ISO date
 * @param data_fim - ISO date
 * @param status - status do sprint
 */
export function buildSprintTriangle(
    id: string,
    nome: string,
    numero: number,
    progresso_pct: number,
    custo_pct: number,
    buffer_consumido_pct: number,
    data_inicio: string,
    data_fim: string,
    status: 'planejado' | 'ativo' | 'concluido'
): SprintTriangle {
    // E = 1 (escopo normalizado do sprint)
    const E = 1.0

    // P = burndown normalizado (1 = nada feito, 0 = tudo concluído)
    // Invertido: progresso_pct alto → P baixo (decrescente)
    const P = Math.max(0.01, 1.0 - (progresso_pct / 100))

    // C = custo EVM normalizado (0 = nada gasto, 1 = orçamento gasto)
    // Crescente: custo_pct alto → C alto
    const C = Math.max(0.01, custo_pct / 100)

    const [alpha, beta, gamma] = calcularAngulos(E, P, C)
    const forma = classificarForma(alpha, beta, gamma)
    const fever_zone = determinarFeverZone(buffer_consumido_pct, progresso_pct)

    return {
        id,
        nome,
        numero,
        E,
        P,
        C,
        data_inicio,
        data_fim,
        status,
        fever_zone,
        buffer_consumido_pct,
        alpha,
        beta,
        gamma,
        forma,
    }
}

// ─── D12: Saúde Global (NÃO média dos sprints) ───────────────────────────────

/**
 * Calcula a saúde global do projeto a partir dos totais, NÃO da média dos sprints.
 * D12: Saúde global = CDT(totais). A média esconde sprints problemáticos.
 *
 * @param sprints - todos os sprint triangles
 * @param progresso_total_pct - % global de progresso (0–100)
 * @param custo_total_pct - % global de orçamento gasto (0–100)
 * @param buffer_total_pct - % global de buffer consumido
 */
export function calcularSaudeGlobal(
    sprints: SprintTriangle[],
    progresso_total_pct: number,
    custo_total_pct: number,
    buffer_total_pct: number
): GlobalHealth {
    const E_total = 1.0
    const P_total = Math.max(0.01, 1.0 - (progresso_total_pct / 100))
    const C_total = Math.max(0.01, custo_total_pct / 100)

    const area_global = areaHeron(E_total, P_total, C_total)
    const fever_zone_global = determinarFeverZone(buffer_total_pct, progresso_total_pct)

    const sprints_por_zona: Record<FeverZone, number> = {
        verde: 0,
        amarelo: 0,
        vermelho: 0,
        preto: 0,
    }

    for (const s of sprints) {
        sprints_por_zona[s.fever_zone]++
    }

    return {
        E_total,
        P_total,
        C_total,
        area_global,
        fever_zone_global,
        sprints_por_zona,
    }
}

// ─── Validação D9: Sprints Sequenciais ────────────────────────────────────────

/**
 * Valida que sprints são sequenciais (sem sobreposição).
 * D9: Sprints devem ser sequenciais.
 *
 * @param sprints - lista de sprints ordenada por número
 * @returns lista de conflitos (pares de sprints sobrepostos)
 */
export function validarSprintsSequenciais(
    sprints: SprintTriangle[]
): { sprint_a: string; sprint_b: string }[] {
    const conflitos: { sprint_a: string; sprint_b: string }[] = []
    const sorted = [...sprints].sort((a, b) => a.numero - b.numero)

    for (let i = 0; i < sorted.length - 1; i++) {
        const atual = sorted[i]
        const proximo = sorted[i + 1]

        if (atual.data_fim > proximo.data_inicio) {
            conflitos.push({
                sprint_a: atual.id,
                sprint_b: proximo.id,
            })
        }
    }

    return conflitos
}
