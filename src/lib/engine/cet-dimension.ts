/**
 * Eixo de Dimensão CEt — Zonamento do Triângulo de Monitoramento
 *
 * Define as três faixas do Eixo de Dimensão (renomeação AC-14 Story 2.0-engine).
 * Nomenclatura anterior (descontinuada): zona_normal / zona_risco / zona_bloqueada
 *
 * Story 2.0-engine — Sprint SC-FOUNDATION
 */

// ─── Tipo ZonaCET ──────────────────────────────────────────────────────────────

/**
 * Faixas do Eixo de Dimensão CEt.
 *
 *  faixa_autorizada  — triângulo saudável dentro dos limites operacionais
 *  faixa_ajuste — zona de risco gerenciável, monitoramento intensivo
 *  fora_do_cone       — violação CEt, bloqueio de fitting obrigatório
 */
export type ZonaCET =
  | 'faixa_autorizada'
  | 'faixa_ajuste'
  | 'fora_do_cone'

// ─── Constantes de Display (AC-15) ────────────────────────────────────────────

export const ZONA_CET_LABELS: Record<ZonaCET, string> = {
  faixa_autorizada:  'Faixa Autorizada',
  faixa_ajuste: 'Faixa de Ajuste',
  fora_do_cone:      'Fora do Cone',
}

export const ZONA_CET_DESCRICAO: Record<ZonaCET, string> = {
  faixa_autorizada:
    'Triângulo dentro dos limites operacionais — protocolos normais ativos.',
  faixa_ajuste:
    'Zona de risco gerenciável — monitoramento intensivo recomendado.',
  fora_do_cone:
    'Violação da Condição de Existência do Triângulo — fitting bloqueado.',
}

// Indicadores de cor para UI
export const ZONA_CET_COLOR: Record<ZonaCET, string> = {
  faixa_autorizada:  'green',
  faixa_ajuste: 'amber',
  fora_do_cone:      'red',
}

// ─── Constantes Numéricas do Eixo ─────────────────────────────────────────────

/**
 * Limites percentuais do Eixo de Dimensão (desvio relativo ao baseline).
 * Faixa Autorizada: desvio até LIMITE_AUTORIZADO
 * Faixa de Ajuste: desvio entre LIMITE_AUTORIZADO e LIMITE_CONTINGENCIA
 * Fora do Cone: desvio acima de LIMITE_CONTINGENCIA
 */
export const EIXO_LIMITE_AUTORIZADO = 1.10   // 10% acima do baseline
export const EIXO_LIMITE_CONTINGENCIA = 1.25 // 25% acima do baseline

/**
 * Determina a ZonaCET com base na razão lado_atual / lado_baseline.
 *
 * @param razao - lado_atual / lado_baseline (ex: 1.12 = 12% acima)
 */
export function determinarZonaCET(razao: number): ZonaCET {
  if (razao <= EIXO_LIMITE_AUTORIZADO) return 'faixa_autorizada'
  if (razao <= EIXO_LIMITE_CONTINGENCIA) return 'faixa_ajuste'
  return 'fora_do_cone'
}
