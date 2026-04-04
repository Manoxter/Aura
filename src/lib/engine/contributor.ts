/**
 * Contributor Model — Modelo de Recurso para CCPM
 *
 * Gerencia alocação de recursos (Contributors) para detecção de
 * conflitos de recurso na cadeia crítica.
 *
 * Decisão D19: Fórmula N — Recrutamento Extra
 *   N = sum(ti × Ni) / (60 × Te × DTE)
 *   Fator Brooks ×1.2 para N >= 2. Arredonda para cima.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Contributor {
    id: string
    nome: string
    /** Especialidade/papel (ex: 'frontend', 'backend', 'qa') */
    especialidade: string
    /** Horas disponíveis por dia (default 8) */
    horas_dia: number
    /** Fator de produtividade (1.0 = normal, 0.8 = junior, 1.2 = senior) */
    fator_produtividade: number
}

export interface Alocacao {
    tarefa_id: string
    contributor_id: string
    /** Percentual de dedicação (0–100). 100 = full-time */
    dedicacao_pct: number
}

export interface FormulaNResult {
    /** Número de recursos adicionais necessários */
    n_extra: number
    /** Horas-homem totais necessárias */
    horas_totais: number
    /** Fator Brooks aplicado */
    fator_brooks: number
}

// ─── D19: Fórmula N — Recrutamento Extra ──────────────────────────────────────

/**
 * Calcula o número de recursos extras necessários.
 *
 * N = sum(ti × Ni) / (60 × Te × DTE)
 *
 * @param tarefas - array de { duracao_minutos, n_recursos_atuais }
 * @param te_horas - tempo efetivo disponível por dia (em horas)
 * @param dte - dias de trabalho efetivo disponíveis
 * @returns resultado com N extra, horas totais e fator Brooks
 */
export function calcularFormulaN(
    tarefas: { duracao_minutos: number; n_recursos_atuais: number }[],
    te_horas: number,
    dte: number
): FormulaNResult {
    if (te_horas <= 0 || dte <= 0) {
        return { n_extra: 0, horas_totais: 0, fator_brooks: 1.0 }
    }

    const somaMinutos = tarefas.reduce(
        (sum, t) => sum + t.duracao_minutos * t.n_recursos_atuais,
        0
    )
    const horas_totais = somaMinutos / 60

    const n_bruto = horas_totais / (te_horas * dte)

    // Fator Brooks: cada recurso adicional acima de 2 reduz eficiência em 20%
    const fator_brooks = n_bruto >= 2 ? 1.2 : 1.0
    const n_ajustado = n_bruto * fator_brooks

    return {
        n_extra: Math.ceil(n_ajustado),
        horas_totais,
        fator_brooks,
    }
}

// ─── Utilitários de Alocação ──────────────────────────────────────────────────

/**
 * Calcula a carga de trabalho de um contributor (horas alocadas vs disponíveis).
 *
 * @param contributor - o recurso
 * @param alocacoes - todas as alocações do contributor
 * @param dias_projeto - número de dias do projeto
 * @returns { horas_alocadas, horas_disponiveis, sobrecarregado }
 */
export function calcularCarga(
    contributor: Contributor,
    alocacoes: Alocacao[],
    dias_projeto: number
): { horas_alocadas: number; horas_disponiveis: number; sobrecarregado: boolean } {
    const horas_disponiveis = contributor.horas_dia * dias_projeto * contributor.fator_produtividade
    const horas_alocadas = alocacoes.reduce(
        (sum, a) => sum + (contributor.horas_dia * (a.dedicacao_pct / 100)),
        0
    ) * dias_projeto

    return {
        horas_alocadas,
        horas_disponiveis,
        sobrecarregado: horas_alocadas > horas_disponiveis,
    }
}

/**
 * Verifica se existe sobrecarga em qualquer contributor do projeto.
 */
export function detectarSobrecarga(
    contributors: Contributor[],
    alocacoes: Alocacao[],
    dias_projeto: number
): { contributor_id: string; excesso_pct: number }[] {
    const sobrecargas: { contributor_id: string; excesso_pct: number }[] = []

    for (const c of contributors) {
        const minhasAlocacoes = alocacoes.filter(a => a.contributor_id === c.id)
        const { horas_alocadas, horas_disponiveis } = calcularCarga(c, minhasAlocacoes, dias_projeto)

        if (horas_alocadas > horas_disponiveis && horas_disponiveis > 0) {
            sobrecargas.push({
                contributor_id: c.id,
                excesso_pct: ((horas_alocadas - horas_disponiveis) / horas_disponiveis) * 100,
            })
        }
    }

    return sobrecargas
}
