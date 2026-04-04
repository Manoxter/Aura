/**
 * NVO Ponderado + MATED Composto
 *
 * NVO = Baricentro ponderado de todos os triângulos (TM + fractais).
 * TM tem peso dominante (Σ(w_sprints) + 1).
 * Sprints têm peso = complexidade.
 *
 * MATED Composto = distância euclidiana ponderada entre ponto de
 * operação e todos os baricentros.
 *
 * Decisões: 13, 14, 15, 16, 19
 */

import type { SprintFractal, TMNormalizado } from './fractal-builder'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Ponto2D {
  x: number
  y: number
}

export interface NVOResult {
  /** NVO (Núcleo de Viabilidade Operacional) ponderado */
  nvo: Ponto2D
  /** Baricentro do TM */
  baricentro_tm: Ponto2D
  /** Baricentros dos sprints */
  baricentros_sprints: { sprintId: string; baricentro: Ponto2D; peso: number }[]
  /** Peso do TM */
  peso_tm: number
}

export interface MATEDCompostoResult {
  /** MATED composto (ponderado global) */
  mated_composto: number
  /** MATED global (distância ao NVO) */
  mated_global: number
  /** MATED por sprint */
  mated_por_sprint: { sprintId: string; mated: number; peso: number; distancia_ao_tm: number }[]
  /** Sprint mais distante do TM */
  sprint_mais_distante: string | null
  /** Zona MATED */
  zona: 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'
}

// ─── NVO Ponderado ───────────────────────────────────────────────────────────

/**
 * Calcula o NVO (Núcleo de Viabilidade Operacional) ponderado.
 *
 * @param baricentro_tm - baricentro do TM
 * @param sprints - fractais com seus baricentros e pesos
 * @returns NVO ponderado + metadados
 */
export function calcularNVOPonderado(
  baricentro_tm: Ponto2D,
  sprints: { sprintId: string; baricentro: Ponto2D; peso_complexidade: number }[]
): NVOResult {
  // Peso do TM = soma dos pesos dos sprints + 1 (sempre dominante)
  const soma_pesos_sprints = sprints.reduce((acc, s) => acc + s.peso_complexidade, 0)
  const peso_tm = soma_pesos_sprints + 1

  // NVO = média ponderada dos baricentros
  let soma_wx = peso_tm * baricentro_tm.x
  let soma_wy = peso_tm * baricentro_tm.y
  let soma_w = peso_tm

  const baricentros_sprints: NVOResult['baricentros_sprints'] = []

  for (const s of sprints) {
    soma_wx += s.peso_complexidade * s.baricentro.x
    soma_wy += s.peso_complexidade * s.baricentro.y
    soma_w += s.peso_complexidade

    baricentros_sprints.push({
      sprintId: s.sprintId,
      baricentro: s.baricentro,
      peso: s.peso_complexidade,
    })
  }

  const nvo: Ponto2D = {
    x: soma_wx / soma_w,
    y: soma_wy / soma_w,
  }

  return {
    nvo,
    baricentro_tm,
    baricentros_sprints,
    peso_tm,
  }
}

// ─── MATED Composto ──────────────────────────────────────────────────────────

/**
 * Calcula o MATED composto (distância euclidiana ponderada multi-baricentro).
 *
 * @param pontoOperacao - ponto atual de operação do projeto
 * @param nvoResult - resultado do cálculo NVO
 * @param sprints - fractais com baricentros
 */
export function calcularMATEDComposto(
  pontoOperacao: Ponto2D,
  nvoResult: NVOResult,
  sprints: { sprintId: string; baricentro: Ponto2D; peso_complexidade: number }[]
): MATEDCompostoResult {
  // MATED global = distância ao NVO ponderado
  const mated_global = distanciaEuclidiana(pontoOperacao, nvoResult.nvo)

  // MATED por sprint = distância do ponto de operação ao baricentro de cada sprint
  const mated_por_sprint: MATEDCompostoResult['mated_por_sprint'] = []
  let soma_w_mated = nvoResult.peso_tm * mated_global
  let soma_w = nvoResult.peso_tm

  for (const s of sprints) {
    const mated_sprint = distanciaEuclidiana(pontoOperacao, s.baricentro)
    const dist_ao_tm = distanciaEuclidiana(s.baricentro, nvoResult.baricentro_tm)

    mated_por_sprint.push({
      sprintId: s.sprintId,
      mated: mated_sprint,
      peso: s.peso_complexidade,
      distancia_ao_tm: dist_ao_tm,
    })

    soma_w_mated += s.peso_complexidade * mated_sprint
    soma_w += s.peso_complexidade
  }

  const mated_composto = soma_w_mated / soma_w

  // Sprint mais distante do TM
  let sprint_mais_distante: string | null = null
  let max_dist = 0
  for (const s of mated_por_sprint) {
    if (s.distancia_ao_tm > max_dist) {
      max_dist = s.distancia_ao_tm
      sprint_mais_distante = s.sprintId
    }
  }

  // Zona MATED
  const zona = classificarZonaMATED(mated_composto)

  return {
    mated_composto,
    mated_global,
    mated_por_sprint,
    sprint_mais_distante,
    zona,
  }
}

// ─── Amortecimento Proporcional ──────────────────────────────────────────────

/**
 * Calcula thresholds de amortecimento por sprint.
 * Sprints maiores (mais escopo) têm mais tolerância.
 *
 * @param fractais - fractais construídos
 * @param d_baseline - distância baseline (MATED no dia 0)
 * @param E_tm - escopo total do TM
 */
export function calcularThresholds(
  fractais: SprintFractal[],
  d_baseline: number,
  E_tm: number
): Map<string, { verde: number; amarelo: number; vermelho: number }> {
  const thresholds = new Map<string, { verde: number; amarelo: number; vermelho: number }>()

  for (const f of fractais) {
    const proporcao = f.E_prime / E_tm
    const base = d_baseline * proporcao

    thresholds.set(f.id, {
      verde: base * 1.0,
      amarelo: base * 1.5,
      vermelho: base * 2.0,
    })
  }

  return thresholds
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

export function distanciaEuclidiana(a: Ponto2D, b: Ponto2D): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function classificarZonaMATED(mated: number): 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE' {
  if (mated < 0.05) return 'OTIMO'
  if (mated < 0.15) return 'SEGURO'
  if (mated < 0.30) return 'RISCO'
  return 'CRISE'
}

/**
 * Calcula peso de complexidade de um sprint.
 * Peso = (tarefas no caminho crítico × duração média) / normalização.
 */
export function calcularPesoComplexidade(
  tarefas_criticas: number,
  duracao_media_horas: number,
  total_tarefas_criticas_projeto: number,
  duracao_media_projeto: number
): number {
  if (total_tarefas_criticas_projeto === 0 || duracao_media_projeto === 0) return 1

  return (tarefas_criticas * duracao_media_horas) /
    (total_tarefas_criticas_projeto * duracao_media_projeto)
}
