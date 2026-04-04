/**
 * Sanfona — Setup vs Dashboard (D32)
 *
 * Função Prazo: setup tracejado (imutável) vs dashboard sólido (vivo)
 * Função Custo: idem
 * Histórico de Decisões: timeline com deltaP + deltaC
 * Badge: desvio acumulado = integral|f_dashboard - f_setup|dt
 * Chips de decisão interativos
 */

import type { Decision } from './decision'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Ponto de uma função (setup ou dashboard) ao longo do tempo */
export interface FuncaoPonto {
    /** Dia do projeto (0 = início) */
    t: number
    /** Valor da função neste ponto */
    valor: number
}

/** Par de funções (setup vs dashboard) para uma dimensão */
export interface SanfonaDimensao {
    /** Função setup: baseline imutável (tracejado) */
    setup: FuncaoPonto[]
    /** Função dashboard: valor vivo atualizado por decisões (sólido) */
    dashboard: FuncaoPonto[]
    /** Desvio acumulado: integral|dashboard - setup|dt */
    desvio_acumulado: number
}

/** Chip de decisão para renderização na timeline */
export interface DecisionChip {
    /** ID da decisão */
    id: string
    /** Dia do projeto quando a decisão ocorreu */
    t: number
    /** Impacto em prazo */
    delta_prazo: number
    /** Impacto em custo */
    delta_custo: number
    /** Tipo da decisão */
    tipo: string
    /** Descrição curta */
    descricao: string
    /** Zona fever no momento */
    zona_fever: string | null
}

/** Resultado completo da Sanfona */
export interface SanfonaData {
    prazo: SanfonaDimensao
    custo: SanfonaDimensao
    decisoes: DecisionChip[]
    /** Badge de desvio total (prazo + custo) */
    badge_desvio: number
}

// ─── Calcular Desvio Acumulado ────────────────────────────────────────────────

/**
 * Calcula o desvio acumulado (integral numérica) entre duas funções.
 * integral|f_dashboard(t) - f_setup(t)|dt usando regra do trapézio.
 *
 * @param setup - pontos da função baseline
 * @param dashboard - pontos da função viva
 * @returns desvio acumulado (sempre positivo)
 */
export function calcularDesvioAcumulado(
    setup: FuncaoPonto[],
    dashboard: FuncaoPonto[]
): number {
    if (setup.length < 2 || dashboard.length < 2) return 0

    // Alinhar os pontos por t
    const tMin = Math.max(setup[0].t, dashboard[0].t)
    const tMax = Math.min(
        setup[setup.length - 1].t,
        dashboard[dashboard.length - 1].t
    )

    if (tMax <= tMin) return 0

    // Interpolar e integrar com regra do trapézio
    const n_steps = 100
    const dt = (tMax - tMin) / n_steps
    let soma = 0

    for (let i = 0; i <= n_steps; i++) {
        const t = tMin + i * dt
        const vs = interpolar(setup, t)
        const vd = interpolar(dashboard, t)
        const diff = Math.abs(vd - vs)
        const peso = (i === 0 || i === n_steps) ? 0.5 : 1.0
        soma += diff * peso
    }

    return soma * dt
}

/**
 * Interpola linearmente o valor de uma função num ponto t.
 */
function interpolar(pontos: FuncaoPonto[], t: number): number {
    if (pontos.length === 0) return 0
    if (t <= pontos[0].t) return pontos[0].valor
    if (t >= pontos[pontos.length - 1].t) return pontos[pontos.length - 1].valor

    for (let i = 0; i < pontos.length - 1; i++) {
        if (t >= pontos[i].t && t <= pontos[i + 1].t) {
            const frac = (t - pontos[i].t) / (pontos[i + 1].t - pontos[i].t)
            return pontos[i].valor + frac * (pontos[i + 1].valor - pontos[i].valor)
        }
    }
    return pontos[pontos.length - 1].valor
}

// ─── Construir Função Setup (imutável) ────────────────────────────────────────

/**
 * Constrói a função de prazo setup (baseline) — linear do início ao fim.
 *
 * @param prazo_total - prazo baseline em dias
 * @param n_pontos - número de pontos (default: 50)
 */
export function buildFuncaoPrazoSetup(prazo_total: number, n_pontos: number = 50): FuncaoPonto[] {
    const pontos: FuncaoPonto[] = []
    for (let i = 0; i <= n_pontos; i++) {
        const t = (i / n_pontos) * prazo_total
        // Prazo restante: decresce de prazo_total até 0
        pontos.push({ t, valor: prazo_total - t })
    }
    return pontos
}

/**
 * Constrói a função de custo setup (baseline) — linear crescente (EVM Tech).
 *
 * @param orcamento_total - orçamento baseline
 * @param prazo_total - prazo baseline em dias
 * @param n_pontos - número de pontos (default: 50)
 */
export function buildFuncaoCustoSetup(
    orcamento_total: number,
    prazo_total: number,
    n_pontos: number = 50
): FuncaoPonto[] {
    const pontos: FuncaoPonto[] = []
    for (let i = 0; i <= n_pontos; i++) {
        const t = (i / n_pontos) * prazo_total
        // Custo acumulado: cresce de 0 até orcamento_total (EVM crescente)
        pontos.push({ t, valor: (t / prazo_total) * orcamento_total })
    }
    return pontos
}

// ─── Aplicar Decisões ao Dashboard ────────────────────────────────────────────

/**
 * Constrói a função dashboard aplicando decisões sobre o setup.
 * Cada decisão desloca a função a partir do ponto temporal da decisão.
 *
 * @param setup - função setup baseline
 * @param decisoes - decisões ordenadas por timestamp
 * @param prazo_total - prazo total para calcular t relativo
 * @param data_inicio - ISO date do início do projeto
 * @param delta_extractor - função que extrai o delta da decisão
 */
export function buildFuncaoDashboard(
    setup: FuncaoPonto[],
    decisoes: Decision[],
    prazo_total: number,
    data_inicio: string,
    delta_extractor: (d: Decision) => number
): FuncaoPonto[] {
    const dashboard = setup.map(p => ({ ...p }))
    const inicio = new Date(data_inicio).getTime()

    for (const decisao of decisoes) {
        const t_decisao = (new Date(decisao.timestamp).getTime() - inicio) / (1000 * 60 * 60 * 24)
        const delta = delta_extractor(decisao)

        for (const p of dashboard) {
            if (p.t >= t_decisao) {
                p.valor += delta
            }
        }
    }

    return dashboard
}

// ─── Construir Chips de Decisão ───────────────────────────────────────────────

/**
 * Transforma decisões em chips para renderização na timeline.
 *
 * @param decisoes - array de decisões
 * @param data_inicio - ISO date do início do projeto
 */
export function buildDecisionChips(
    decisoes: Decision[],
    data_inicio: string
): DecisionChip[] {
    const inicio = new Date(data_inicio).getTime()

    return decisoes.map(d => ({
        id: d.id,
        t: (new Date(d.timestamp).getTime() - inicio) / (1000 * 60 * 60 * 24),
        delta_prazo: d.delta_prazo,
        delta_custo: d.delta_custo,
        tipo: d.tipo,
        descricao: d.descricao,
        zona_fever: d.zona_fever,
    }))
}

// ─── Pipeline Sanfona Completo ────────────────────────────────────────────────

/**
 * Constrói o estado completo da Sanfona.
 *
 * @param prazo_total - prazo baseline
 * @param orcamento_total - orçamento baseline
 * @param decisoes - decisões do projeto
 * @param data_inicio - ISO date
 */
export function buildSanfona(
    prazo_total: number,
    orcamento_total: number,
    decisoes: Decision[],
    data_inicio: string
): SanfonaData {
    // Setup (imutáveis)
    const prazo_setup = buildFuncaoPrazoSetup(prazo_total)
    const custo_setup = buildFuncaoCustoSetup(orcamento_total, prazo_total)

    // Dashboard (vivos)
    const prazo_dashboard = buildFuncaoDashboard(
        prazo_setup, decisoes, prazo_total, data_inicio,
        d => d.delta_prazo
    )
    const custo_dashboard = buildFuncaoDashboard(
        custo_setup, decisoes, prazo_total, data_inicio,
        d => d.delta_custo
    )

    // Desvios
    const desvio_prazo = calcularDesvioAcumulado(prazo_setup, prazo_dashboard)
    const desvio_custo = calcularDesvioAcumulado(custo_setup, custo_dashboard)

    // Chips
    const chips = buildDecisionChips(decisoes, data_inicio)

    return {
        prazo: {
            setup: prazo_setup,
            dashboard: prazo_dashboard,
            desvio_acumulado: desvio_prazo,
        },
        custo: {
            setup: custo_setup,
            dashboard: custo_dashboard,
            desvio_acumulado: desvio_custo,
        },
        decisoes: chips,
        badge_desvio: desvio_prazo + desvio_custo,
    }
}
