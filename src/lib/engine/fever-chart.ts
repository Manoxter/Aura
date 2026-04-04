/**
 * Fever Chart Geométrico (D10, D29)
 *
 * 4 zonas: verde / amarelo / vermelho / PRETO (buffer esgotado = game over)
 * Trajetória com pontos históricos + pins de decisão
 * Cone Monte Carlo ASSIMÉTRICO (pessimista 1.5x maior, log-normal)
 * Linhas P50/P80 no cone. Banda IC 90%.
 * Cada ponto = instantâneo geométrico (mini-triângulo no hover)
 *
 * D29: Fever Chart é PROTAGONISTA — 4 zonas
 *
 * @aura-production — TOC, CCPM, Goldratt
 */

import { determinarFeverZone, type FeverZone } from './buffer'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Um ponto na trajetória do Fever Chart */
export interface FeverPoint {
    /** Timestamp ISO */
    data: string
    /** % de progresso da cadeia crítica (0–100) — eixo X */
    progresso_pct: number
    /** % de buffer consumido (0–100) — eixo Y */
    buffer_consumido_pct: number
    /** Zona neste ponto */
    zona: FeverZone
    /** Mini-triângulo instantâneo (E, P, C normalizados) */
    triangulo: { E: number; P: number; C: number }
    /** Pin de decisão associado (se houver) */
    decision_id: string | null
}

/** Cone de projeção Monte Carlo */
export interface MonteCarloProjection {
    /** Linha P50 (mediana) */
    p50: { progresso_pct: number; buffer_pct: number }[]
    /** Linha P80 (pessimista) */
    p80: { progresso_pct: number; buffer_pct: number }[]
    /** Banda inferior IC 90% (P5) */
    ic_lower: { progresso_pct: number; buffer_pct: number }[]
    /** Banda superior IC 90% (P95) */
    ic_upper: { progresso_pct: number; buffer_pct: number }[]
}

/** Resultado completo do Fever Chart */
export interface FeverChartData {
    /** Trajetória de pontos históricos */
    trajetoria: FeverPoint[]
    /** Zona atual */
    zona_atual: FeverZone
    /** Projeção Monte Carlo (cone assimétrico) */
    projecao: MonteCarloProjection | null
    /** Limites das zonas para renderização */
    zonas: FeverChartZones
}

/** Limites visuais das 4 zonas */
export interface FeverChartZones {
    verde: { max_buffer_pct: number }
    amarelo: { max_buffer_pct: number }
    vermelho: { max_buffer_pct: number }
    preto: { min_buffer_pct: number }
}

// ─── Zonas Default ────────────────────────────────────────────────────────────

export const FEVER_ZONES_DEFAULT: FeverChartZones = {
    verde: { max_buffer_pct: 33 },
    amarelo: { max_buffer_pct: 66 },
    vermelho: { max_buffer_pct: 100 },
    preto: { min_buffer_pct: 100 },
}

// ─── Construir Ponto do Fever Chart ───────────────────────────────────────────

/**
 * Cria um ponto na trajetória do Fever Chart.
 */
export function buildFeverPoint(
    data: string,
    progresso_pct: number,
    buffer_consumido_pct: number,
    triangulo: { E: number; P: number; C: number },
    decision_id: string | null = null
): FeverPoint {
    return {
        data,
        progresso_pct,
        buffer_consumido_pct,
        zona: determinarFeverZone(buffer_consumido_pct, progresso_pct),
        triangulo,
        decision_id,
    }
}

// ─── Monte Carlo Assimétrico (D29) ────────────────────────────────────────────

/**
 * Gera um valor log-normal assimétrico para simulação Monte Carlo.
 * O lado pessimista é 1.5x maior que o otimista (assimetria real de projetos).
 *
 * @param media - valor esperado
 * @param desvio - desvio padrão
 * @param assimetria - fator de assimetria pessimista (default: 1.5)
 */
export function sampleLogNormal(media: number, desvio: number, assimetria: number = 1.5): number {
    // Box-Muller para gerar normal
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)

    // Aplicar assimetria: valores positivos (pessimistas) são amplificados
    const z_assimetrico = z > 0 ? z * assimetria : z

    return media + desvio * z_assimetrico
}

/**
 * Executa simulação Monte Carlo para projeção do Fever Chart.
 *
 * @param progresso_atual - % de progresso atual (0–100)
 * @param buffer_atual_pct - % de buffer consumido atual (0–100)
 * @param taxa_consumo_media - taxa média de consumo de buffer por % de progresso
 * @param n_simulacoes - número de simulações (default: 1000)
 * @param n_pontos - número de pontos na projeção (default: 20)
 */
export function simularMonteCarlo(
    progresso_atual: number,
    buffer_atual_pct: number,
    taxa_consumo_media: number,
    n_simulacoes: number = 1000,
    n_pontos: number = 20
): MonteCarloProjection {
    const progresso_restante = 100 - progresso_atual
    const step = progresso_restante / n_pontos

    // Coletar todas as simulações
    const simulacoes: number[][] = []

    for (let sim = 0; sim < n_simulacoes; sim++) {
        const trajetoria: number[] = []
        let buffer = buffer_atual_pct

        for (let i = 0; i < n_pontos; i++) {
            const consumo = sampleLogNormal(taxa_consumo_media * step, taxa_consumo_media * step * 0.3)
            buffer += Math.max(0, consumo)
            trajetoria.push(buffer)
        }

        simulacoes.push(trajetoria)
    }

    // Calcular percentis para cada ponto
    const p50: { progresso_pct: number; buffer_pct: number }[] = []
    const p80: { progresso_pct: number; buffer_pct: number }[] = []
    const ic_lower: { progresso_pct: number; buffer_pct: number }[] = []
    const ic_upper: { progresso_pct: number; buffer_pct: number }[] = []

    for (let i = 0; i < n_pontos; i++) {
        const valores = simulacoes.map(s => s[i]).sort((a, b) => a - b)
        const progresso = progresso_atual + step * (i + 1)

        p50.push({ progresso_pct: progresso, buffer_pct: percentil(valores, 0.5) })
        p80.push({ progresso_pct: progresso, buffer_pct: percentil(valores, 0.8) })
        ic_lower.push({ progresso_pct: progresso, buffer_pct: percentil(valores, 0.05) })
        ic_upper.push({ progresso_pct: progresso, buffer_pct: percentil(valores, 0.95) })
    }

    return { p50, p80, ic_lower, ic_upper }
}

function percentil(sorted: number[], p: number): number {
    const idx = Math.floor(sorted.length * p)
    return sorted[Math.min(idx, sorted.length - 1)]
}

// ─── Construir Fever Chart Completo ───────────────────────────────────────────

/**
 * Constrói o Fever Chart a partir do histórico de pontos.
 *
 * @param trajetoria - pontos históricos
 * @param incluir_projecao - se deve incluir cone Monte Carlo
 */
export function buildFeverChart(
    trajetoria: FeverPoint[],
    incluir_projecao: boolean = false
): FeverChartData {
    const ultimo = trajetoria[trajetoria.length - 1]
    const zona_atual: FeverZone = ultimo
        ? determinarFeverZone(ultimo.buffer_consumido_pct, ultimo.progresso_pct)
        : 'verde'

    let projecao: MonteCarloProjection | null = null

    if (incluir_projecao && trajetoria.length >= 2) {
        // Calcular taxa média de consumo
        const taxas: number[] = []
        for (let i = 1; i < trajetoria.length; i++) {
            const dp = trajetoria[i].progresso_pct - trajetoria[i - 1].progresso_pct
            const db = trajetoria[i].buffer_consumido_pct - trajetoria[i - 1].buffer_consumido_pct
            if (dp > 0) taxas.push(db / dp)
        }
        const taxa_media = taxas.length > 0
            ? taxas.reduce((a, b) => a + b, 0) / taxas.length
            : 0.5

        projecao = simularMonteCarlo(
            ultimo.progresso_pct,
            ultimo.buffer_consumido_pct,
            taxa_media
        )
    }

    return {
        trajetoria,
        zona_atual,
        projecao,
        zonas: FEVER_ZONES_DEFAULT,
    }
}
