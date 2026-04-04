// ═══════════════════════════════════════════════════════════════════════════
// EP-ESCALENO ESC-7 — Motor Bayesiano + Histórico Geométrico
// Calibração progressiva: cada estado TM atualiza priors
// Sessão 24 | 2026-03-29 | Autoridade: @aura-math + @roberta
// ═══════════════════════════════════════════════════════════════════════════

/** Snapshot de um estado geométrico do TM num instante do projeto */
export interface GeometricSnapshot {
    data: string            // ISO date
    E: number
    C: number
    P: number
    area: number
    alpha: number           // graus
    beta: number
    gamma: number
    zona: string
    forma: string
    a_mancha?: number
    a_rebarba?: number
    fase?: string           // fase do projeto (setup, execução, encerramento)
}

/** Prior Bayesiano por setor */
export interface BayesianPrior {
    setor: string
    media_C: number
    sigma_C: number
    media_P: number
    sigma_P: number
    n_observacoes: number
}

/** Resultado da predição Bayesiana */
export interface BayesianPrediction {
    C_esperado: number
    P_esperado: number
    sigma_C_posterior: number
    sigma_P_posterior: number
    confianca: number       // 0-100%
    n_observacoes: number
    fonte: 'historico' | 'prior_setor' | 'generico'
}

// ─── Priors genéricos por setor (calibração inicial) ─────────────────────
const SECTOR_PRIORS: Record<string, BayesianPrior> = {
    construcao_civil: { setor: 'construcao_civil', media_C: 1.45, sigma_C: 0.25, media_P: 1.38, sigma_P: 0.20, n_observacoes: 0 },
    // B12: Priors calibrados para SOFTWARE (Standish CHAOS 2024)
    // probabilidade_estouro_prazo: 0.70, media_estouro_prazo: 1.35 (35% atraso médio)
    // probabilidade_estouro_custo: 0.56, media_scope_creep: 0.25
    // probabilidade_student_syndrome: 0.80
    software:         { setor: 'software',         media_C: 1.56, sigma_C: 0.35, media_P: 1.35, sigma_P: 0.30, n_observacoes: 0 },
    tecnologia:       { setor: 'tecnologia',       media_C: 1.56, sigma_C: 0.35, media_P: 1.35, sigma_P: 0.30, n_observacoes: 0 },
    consultoria:      { setor: 'consultoria',       media_C: 1.40, sigma_C: 0.20, media_P: 1.35, sigma_P: 0.15, n_observacoes: 0 },
    geral:            { setor: 'geral',             media_C: 1.42, sigma_C: 0.25, media_P: 1.42, sigma_P: 0.25, n_observacoes: 0 },
}

/**
 * getDefaultPrior — Retorna prior por setor. Fallback para 'geral'.
 */
export function getDefaultPrior(setor: string): BayesianPrior {
    return SECTOR_PRIORS[setor] ?? SECTOR_PRIORS.geral
}

/**
 * computeHistoricStats — Calcula média e desvio padrão de C e P
 * a partir do histórico geométrico do projeto.
 */
export function computeHistoricStats(history: GeometricSnapshot[]): {
    media_C: number; sigma_C: number; media_P: number; sigma_P: number; n: number
} | null {
    if (history.length < 3) return null
    const Cs = history.map(h => h.C)
    const Ps = history.map(h => h.P)
    const n = history.length
    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
    const std = (arr: number[], m: number) => Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)
    const mC = avg(Cs), mP = avg(Ps)
    return {
        media_C: mC, sigma_C: Math.max(std(Cs, mC), 0.01),
        media_P: mP, sigma_P: Math.max(std(Ps, mP), 0.01),
        n,
    }
}

/**
 * bayesianUpdate — Atualiza o prior com uma nova observação (conjugated normal).
 *
 * Posterior: μ_post = (σ²_obs × μ_prior + σ²_prior × x_obs) / (σ²_prior + σ²_obs)
 *           σ²_post = (σ²_prior × σ²_obs) / (σ²_prior + σ²_obs)
 *
 * @param prior - Prior (setor ou histórico)
 * @param observacao - Último snapshot observado
 */
export function bayesianUpdate(
    prior: BayesianPrior,
    observacao: GeometricSnapshot
): BayesianPrior {
    const sigma2_obs_C = 0.05 * 0.05  // incerteza da observação (fixo para começar)
    const sigma2_obs_P = 0.05 * 0.05

    const sigma2_C = prior.sigma_C ** 2
    const sigma2_P = prior.sigma_P ** 2

    const mu_post_C = (sigma2_obs_C * prior.media_C + sigma2_C * observacao.C) / (sigma2_C + sigma2_obs_C)
    const sigma2_post_C = (sigma2_C * sigma2_obs_C) / (sigma2_C + sigma2_obs_C)

    const mu_post_P = (sigma2_obs_P * prior.media_P + sigma2_P * observacao.P) / (sigma2_P + sigma2_obs_P)
    const sigma2_post_P = (sigma2_P * sigma2_obs_P) / (sigma2_P + sigma2_obs_P)

    return {
        setor: prior.setor,
        media_C: mu_post_C,
        sigma_C: Math.sqrt(sigma2_post_C),
        media_P: mu_post_P,
        sigma_P: Math.sqrt(sigma2_post_P),
        n_observacoes: prior.n_observacoes + 1,
    }
}

/**
 * predictNext — Predição Bayesiana do próximo estado geométrico.
 *
 * 1. Se histórico >= 5 pontos: usa estatísticas do histórico como prior
 * 2. Se histórico >= 1 ponto: atualiza prior setorial com observações
 * 3. Senão: usa prior setorial genérico
 */
export function predictNext(
    history: GeometricSnapshot[],
    setor: string = 'geral'
): BayesianPrediction {
    const sectorPrior = getDefaultPrior(setor)

    // Caso 1: histórico suficiente para aprendizado próprio
    const stats = computeHistoricStats(history)
    if (stats && stats.n >= 5) {
        return {
            C_esperado: stats.media_C,
            P_esperado: stats.media_P,
            sigma_C_posterior: stats.sigma_C,
            sigma_P_posterior: stats.sigma_P,
            confianca: Math.min(95, 50 + stats.n * 3),
            n_observacoes: stats.n,
            fonte: 'historico',
        }
    }

    // Caso 2: algumas observações — atualizar prior setorial
    if (history.length > 0) {
        let prior = sectorPrior
        for (const obs of history) {
            prior = bayesianUpdate(prior, obs)
        }
        return {
            C_esperado: prior.media_C,
            P_esperado: prior.media_P,
            sigma_C_posterior: prior.sigma_C,
            sigma_P_posterior: prior.sigma_P,
            confianca: Math.min(80, 30 + history.length * 10),
            n_observacoes: prior.n_observacoes,
            fonte: 'prior_setor',
        }
    }

    // Caso 3: sem histórico — prior puro
    return {
        C_esperado: sectorPrior.media_C,
        P_esperado: sectorPrior.media_P,
        sigma_C_posterior: sectorPrior.sigma_C,
        sigma_P_posterior: sectorPrior.sigma_P,
        confianca: 20,
        n_observacoes: 0,
        fonte: 'generico',
    }
}

/**
 * monteCarloFromHistory — Monte Carlo com distribuições aprendidas do histórico.
 * Substitui a distribuição genérica (σ fixo) por σ aprendido.
 */
export function monteCarloFromHistory(
    cdt: { lados: { escopo: number; orcamento: number; prazo: number }; cdt_area: number },
    history: GeometricSnapshot[],
    setor: string = 'geral',
    iteracoes: number = 1000
): { confianca: number; risco_dispersao: number } {
    const pred = predictNext(history, setor)

    // Box-Muller transform
    const gaussianRandom = (): number => {
        let u = 0, v = 0
        while (u === 0) u = Math.random()
        while (v === 0) v = Math.random()
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    }

    // Semi-perimeter area (Heron)
    const areaTri = (a: number, b: number, c: number): number => {
        const s = (a + b + c) / 2
        const val = s * (s - a) * (s - b) * (s - c)
        return val > 0 ? Math.sqrt(val) : 0
    }

    let sucessos = 0
    const areas: number[] = []

    for (let i = 0; i < iteracoes; i++) {
        const En = cdt.lados.escopo * (1 + gaussianRandom() * pred.sigma_C_posterior)
        const On = cdt.lados.orcamento * (1 + gaussianRandom() * pred.sigma_C_posterior)
        const Pn = cdt.lados.prazo * (1 + gaussianRandom() * pred.sigma_P_posterior)
        const mx = Math.max(En, On, Pn)
        const a = En / mx, b = On / mx, c = Pn / mx
        const area = areaTri(a, b, c)
        if (area > cdt.cdt_area * 0.9) sucessos++
        areas.push(area)
    }

    const media = areas.reduce((s, a) => s + a, 0) / iteracoes
    const variancia = areas.reduce((s, a) => s + (a - media) ** 2, 0) / iteracoes

    return {
        confianca: (sucessos / iteracoes) * 100,
        risco_dispersao: Math.sqrt(variancia),
    }
}
