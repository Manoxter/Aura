/**
 * setor-config.ts — Story 3.3
 *
 * Fornece `getFatorSetor(setor)` para regressão ponderada Bayesiana.
 * Fórmula: Peso_i = (i+1)/n × fator_atividade
 *
 * @roberta: fatores validados com base em Flyvbjerg et al. (2022) e PMI Pulse 2024.
 * Cache estático em memória para evitar round-trips ao DB em pipelines Monte Carlo.
 */

export type Setor =
  | 'construcao_civil'
  | 'tecnologia'
  | 'infraestrutura'
  | 'saude'
  | 'geral';

export interface SetorConfig {
  setor: Setor;
  /** Peso da atividade na regressão ponderada: Peso_i = (i+1)/n × fator_atividade */
  fator_atividade: number;
  /** Desvio padrão prior do setor (literatura). Substituído por σ empírico quando n≥30. */
  sigma_prior: number;
  descricao: string;
}

/**
 * Tabela de configuração por setor — espelho do seed em aura_setor_config.
 * Fonte: Flyvbjerg et al. (2022), PMI Pulse of the Profession 2024, World Bank (2023).
 */
const SETOR_CONFIG_MAP: Readonly<Record<Setor, SetorConfig>> = {
  construcao_civil: {
    setor: 'construcao_civil',
    fator_atividade: 1.6,
    sigma_prior: 0.22,
    descricao: 'Alta variabilidade histórica — Flyvbjerg 2022: σ≈0.20-0.25',
  },
  tecnologia: {
    setor: 'tecnologia',
    fator_atividade: 1.2,
    sigma_prior: 0.16,
    descricao: 'Scope creep frequente — PMI 2024: σ≈0.15-0.18',
  },
  infraestrutura: {
    setor: 'infraestrutura',
    fator_atividade: 1.4,
    sigma_prior: 0.20,
    descricao: 'Megaprojetos — World Bank 2023: σ≈0.18-0.22',
  },
  saude: {
    setor: 'saude',
    fator_atividade: 1.0,
    sigma_prior: 0.11,
    descricao: 'Alta regulação — PMI Healthcare 2023: σ≈0.10-0.13',
  },
  geral: {
    setor: 'geral',
    fator_atividade: 1.2,
    sigma_prior: 0.15,
    descricao: 'Padrão quando setor não identificado',
  },
};

/**
 * Retorna o fator de atividade para regressão ponderada do setor informado.
 * Faz fallback para 'geral' quando o setor não é reconhecido.
 *
 * @param setor - Nome do setor (ex: 'construcao_civil', 'tecnologia')
 * @returns fator_atividade numérico (>0, ≤3.0)
 */
export function getFatorSetor(setor: string): number {
  const config = SETOR_CONFIG_MAP[setor as Setor];
  return config ? config.fator_atividade : SETOR_CONFIG_MAP.geral.fator_atividade;
}

/**
 * Retorna a configuração completa do setor, incluindo sigma_prior.
 * Faz fallback para 'geral' quando o setor não é reconhecido.
 *
 * @param setor - Nome do setor
 */
export function getSetorConfig(setor: string): SetorConfig {
  return SETOR_CONFIG_MAP[setor as Setor] ?? SETOR_CONFIG_MAP.geral;
}

/**
 * Retorna todos os setores configurados.
 */
export function getAllSetores(): SetorConfig[] {
  return Object.values(SETOR_CONFIG_MAP);
}

/**
 * Percentual de contingência default por setor (espelho de aura_setor_config).
 * Usado como fallback quando percentual_contingencia não está no TAP.
 * construcao_civil/infraestrutura: 15% (Flyvbjerg 2022)
 * demais setores: 10% (PMI Pulse 2024 / padrão geral)
 */
const CONTINGENCIA_DEFAULT: Readonly<Record<Setor, number>> = {
  construcao_civil: 15,
  infraestrutura: 15,
  tecnologia: 10,
  saude: 10,
  geral: 10,
};

/**
 * Retorna o percentual de contingência default para o setor informado.
 * Faz fallback para 'geral' (10%) quando o setor não é reconhecido ou não informado.
 *
 * @param setor - Nome do setor (opcional)
 * @returns percentual de contingência (0–100)
 */
export function getDefaultContingencia(setor?: string): number {
  if (!setor) return CONTINGENCIA_DEFAULT.geral;
  return CONTINGENCIA_DEFAULT[setor as Setor] ?? CONTINGENCIA_DEFAULT.geral;
}
