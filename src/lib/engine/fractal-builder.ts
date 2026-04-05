/**
 * Fractal Builder — Construção Backward de Sprints Milestone-Driven
 *
 * O escopo de cada sprint = sua COBERTURA no calendário do projeto.
 * Os 3 lados (E', P', C') são proporcionais ao TM por regra de três.
 * O milestone (entrega) define o sprint e seus limites temporais.
 *
 * Construção é de trás para frente (CCPM backward):
 *   Ponto Ômega → último sprint → ... → primeiro sprint
 *
 * Decisões: 5, 6, 7, 11, 21-23, 35-38
 */

import { areaHeron, calcularAngulos, classificarForma, type TriangleShape } from './fractals'
import { checkCETDupla } from './crisis'
import type { FeverZone } from './buffer'

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Milestone = entrega de um sprint (define os limites do fractal) */
export interface Milestone {
  id: string
  nome: string
  /** Data de entrega (ISO) — construído backward a partir do Ômega */
  data_entrega: string
  /** Ordem backward: 1 = mais perto do Ômega, N = mais longe */
  ordem_backward: number
}

/** Dados de entrada para construir um sprint fractal */
export interface SprintInput {
  id: string
  nome: string
  /** Milestone (entrega) que define este sprint */
  milestone: Milestone
  /** Data de início do sprint (ISO) */
  data_inicio: string
  /** Data de fim do sprint = data_entrega do milestone */
  data_fim: string
  /** Horas totais de trabalho do sprint (soma das durações agressivas) */
  horas_trabalho: number
  /** Custo total planejado do sprint (soma dos custos agressivos) */
  custo_planejado: number
  /** Estado: futuro/ativo/concluido */
  estado: 'futuro' | 'ativo' | 'concluido'
  /** Horas realizadas até agora (execução real) */
  horas_realizadas: number
  /** Custo realizado até agora */
  custo_realizado: number
  /** Buffer original do sprint (horas, vindo do RSS) */
  buffer_original: number
  /** Buffer consumido (horas) */
  buffer_consumido: number
}

/** TM (Triângulo Mestre) normalizado */
export interface TMNormalizado {
  E: number   // sempre 1.0
  P: number   // prazo normalizado
  C: number   // custo normalizado
  /** Prazo total em horas */
  prazo_total_horas: number
  /** Custo total em R$ */
  custo_total_brl: number
  /** Escopo total em horas de trabalho */
  escopo_total_horas: number
  /** Área do TM (Heron) */
  area: number
}

/** Sprint como fractal proporcional ao TM */
export interface SprintFractal {
  id: string
  nome: string
  /** Número sequencial (1 = primeiro, N = último/Ômega) */
  numero: number
  /** Lados proporcionais ao TM (regra de 3) */
  E_prime: number   // escopo proporcional = E_tm × (horas_sprint / horas_total)
  P_prime: number   // prazo proporcional = P_tm × (dias_sprint / dias_total)
  C_prime: number   // custo proporcional = C_tm × (custo_sprint / custo_total)
  /** Razões (para teste de colinearidade) */
  razao_E: number
  razao_P: number
  razao_C: number
  /** Ângulos do fractal */
  alpha: number
  beta: number
  gamma: number
  /** Forma geométrica */
  forma: TriangleShape
  /** Área do fractal (Heron) */
  area: number
  /** CEt válida? */
  cet_valida: boolean
  /** Colinear ao TM? (razões ≈ iguais, ±5%) */
  colinear: boolean
  /** Desvio de colinearidade (0 = perfeito) */
  desvio_colinearidade: number
  /** Protocolo Clairaut detectado */
  protocolo_detectado: 'agudo' | 'obtuso_beta' | 'obtuso_gamma' | 'singular' | null
  /** Protocolo não-alfa iminente? */
  alerta_nao_alfa: boolean
  /** Sugestão de realocação (se não-alfa iminente) */
  sugestao_realocacao: string | null
  /** Datas */
  data_inicio: string
  data_fim: string
  /** Milestone */
  milestone: Milestone
  /** Estado */
  estado: 'futuro' | 'ativo' | 'concluido'
  /** Fever zone (derivada do buffer) */
  fever_zone: FeverZone
  /** Buffer */
  buffer_original: number
  buffer_consumido: number
  buffer_pct: number
}

/** Resultado da construção backward completa */
export interface FractalBuildResult {
  /** TM normalizado */
  tm: TMNormalizado
  /** Fractais construídos (ordenados backward: último primeiro) */
  fractais: SprintFractal[]
  /** Todos colineares? */
  todos_colineares: boolean
  /** Soma E' = E_tm? (verificação) */
  soma_E_valida: boolean
  /** Alertas de não-alfa */
  alertas_nao_alfa: string[]
  /** TBZ (buffers de transição entre sprints) */
  tbz: TBZInfo[]
}

export interface TBZInfo {
  /** Entre qual sprint e qual */
  entre_sprint_a: string
  entre_sprint_b: string
  /** Buffer em horas */
  buffer_horas: number
  /** Buffer em R$ */
  buffer_brl: number
  /** Consumido (%) */
  consumido_pct: number
}

// ─── Construção Backward ─────────────────────────────────────────────────────

/**
 * Constrói todos os fractais do projeto a partir do TM, backward.
 *
 * O escopo de cada sprint = sua cobertura no calendário do projeto.
 * Cada lado é proporcional ao TM por regra de três.
 * Milestones definem as entregas (fim de cada sprint).
 *
 * @param tm - Triângulo Mestre normalizado
 * @param sprints - dados de cada sprint (ordenados cronologicamente)
 * @param horasPorDia - regime de trabalho
 */
export function construirFractaisBackward(
  tm: TMNormalizado,
  sprints: SprintInput[],
  horasPorDia: number = 8
): FractalBuildResult {
  // Ordenar backward: último sprint primeiro (mais perto do Ômega)
  const sorted = [...sprints].sort((a, b) => {
    return new Date(b.data_fim).getTime() - new Date(a.data_fim).getTime()
  })

  const fractais: SprintFractal[] = []
  const alertas: string[] = []
  const tbzList: TBZInfo[] = []

  // Totais para razão
  const escopo_total = tm.escopo_total_horas
  const prazo_total = tm.prazo_total_horas
  const custo_total = tm.custo_total_brl

  for (let i = 0; i < sorted.length; i++) {
    const sprint = sorted[i]
    const numero = sorted.length - i // backward: primeiro processado = último sprint

    // ── Calcular cobertura no calendário ──────────────────────────────
    const diasSprint = diasUteis(sprint.data_inicio, sprint.data_fim)
    const horasSprint = diasSprint * horasPorDia
    const diasTotal = prazo_total / horasPorDia

    // ── Regra de 3: lados proporcionais ao TM ────────────────────────
    const razao_E = sprint.horas_trabalho / escopo_total
    const razao_P = horasSprint / prazo_total
    const razao_C = sprint.custo_planejado / custo_total

    const E_prime = tm.E * razao_E
    const P_prime = tm.P * razao_P
    const C_prime = tm.C * razao_C

    // ── CEt do fractal (dupla: bruto + normalizado) ──────────────────
    const cetResult = checkCETDupla(
      sprint.horas_trabalho, sprint.custo_planejado, horasSprint,
      E_prime, C_prime, P_prime
    )
    const cet_valida = cetResult.valid

    // ── Ângulos ──────────────────────────────────────────────────────
    const [alpha, beta, gamma] = calcularAngulos(E_prime, P_prime, C_prime)
    const forma = classificarForma(alpha, beta, gamma)

    // ── Área (Heron) ─────────────────────────────────────────────────
    const area = areaHeron(E_prime, P_prime, C_prime)

    // ── Colinearidade ────────────────────────────────────────────────
    const { colinear, desvio } = verificarColinearidade(razao_E, razao_P, razao_C)

    // ── Detecção de protocolo ────────────────────────────────────────
    let protocolo_detectado: SprintFractal['protocolo_detectado'] = null
    let alerta_nao_alfa = false
    let sugestao_realocacao: string | null = null

    if (alpha > 0 || beta > 0 || gamma > 0) {
      const maxAngle = Math.max(alpha, beta, gamma)

      if (maxAngle >= 90) {
        // Já é obtuso
        if (beta > 90 || gamma > 90) {
          protocolo_detectado = beta > gamma ? 'obtuso_beta' : 'obtuso_gamma'
        }
        alerta_nao_alfa = true
      } else if (maxAngle > 75) {
        // Iminente (entre 75° e 90°)
        alerta_nao_alfa = true
        protocolo_detectado = 'agudo' // ainda é agudo, mas iminente

        if (beta > gamma) {
          sugestao_realocacao = `Sprint ${numero}: custo pressionado (β=${beta.toFixed(1)}°). Sugestão: realocar recursos financeiros do sprint seguinte.`
        } else {
          sugestao_realocacao = `Sprint ${numero}: prazo pressionado (γ=${gamma.toFixed(1)}°). Sugestão: mover recurso do caminho não-crítico para o crítico.`
        }
        alertas.push(sugestao_realocacao)
      } else {
        protocolo_detectado = 'agudo'
      }
    }

    // ── Buffer ───────────────────────────────────────────────────────
    const buffer_pct = sprint.buffer_original > 0
      ? (sprint.buffer_consumido / sprint.buffer_original) * 100
      : 0

    // ── Fever zone ───────────────────────────────────────────────────
    let fever_zone: FeverZone = 'verde'
    if (buffer_pct < 0) fever_zone = 'azul' as FeverZone
    else if (buffer_pct <= 33) fever_zone = 'verde'
    else if (buffer_pct <= 66) fever_zone = 'amarelo'
    else if (buffer_pct <= 100) fever_zone = 'vermelho'
    else fever_zone = 'preto'

    fractais.push({
      id: sprint.id,
      nome: sprint.nome,
      numero,
      E_prime,
      P_prime,
      C_prime,
      razao_E,
      razao_P,
      razao_C,
      alpha,
      beta,
      gamma,
      forma,
      area,
      cet_valida,
      colinear,
      desvio_colinearidade: desvio,
      protocolo_detectado,
      alerta_nao_alfa,
      sugestao_realocacao,
      data_inicio: sprint.data_inicio,
      data_fim: sprint.data_fim,
      milestone: sprint.milestone,
      estado: sprint.estado,
      fever_zone,
      buffer_original: sprint.buffer_original,
      buffer_consumido: sprint.buffer_consumido,
      buffer_pct,
    })
  }

  // Reordenar cronologicamente para exibição
  fractais.sort((a, b) => a.numero - b.numero)

  // ── TBZ entre sprints consecutivos ─────────────────────────────────
  for (let i = 0; i < fractais.length - 1; i++) {
    const atual = fractais[i]
    const proximo = fractais[i + 1]

    const diasGap = diasUteis(atual.data_fim, proximo.data_inicio)
    const horasGap = diasGap * horasPorDia

    tbzList.push({
      entre_sprint_a: atual.id,
      entre_sprint_b: proximo.id,
      buffer_horas: horasGap,
      buffer_brl: 0, // calculado pelo CCPM quando disponível
      consumido_pct: 0,
    })
  }

  // ── Verificações globais ───────────────────────────────────────────
  const soma_E = fractais.reduce((acc, f) => acc + f.E_prime, 0)
  const soma_E_valida = Math.abs(soma_E - tm.E) < 0.05

  const todos_colineares = fractais.every(f => f.colinear)

  return {
    tm,
    fractais,
    todos_colineares,
    soma_E_valida,
    alertas_nao_alfa: alertas,
    tbz: tbzList,
  }
}

// ─── Funções Auxiliares ──────────────────────────────────────────────────────

/**
 * Verifica colinearidade: se as razões E/P/C são aproximadamente iguais.
 * Tolerância: ±5%
 */
export function verificarColinearidade(
  razao_E: number,
  razao_P: number,
  razao_C: number
): { colinear: boolean; desvio: number } {
  const media = (razao_E + razao_P + razao_C) / 3
  if (media === 0) return { colinear: true, desvio: 0 }

  const desvio_E = Math.abs(razao_E - media) / media
  const desvio_P = Math.abs(razao_P - media) / media
  const desvio_C = Math.abs(razao_C - media) / media

  const desvio_max = Math.max(desvio_E, desvio_P, desvio_C)

  return {
    colinear: desvio_max <= 0.05,
    desvio: desvio_max,
  }
}

/**
 * Calcula dias úteis entre duas datas (simplificado: exclui fins de semana).
 */
export function diasUteis(inicio: string, fim: string): number {
  const d1 = new Date(inicio)
  const d2 = new Date(fim)
  let count = 0
  const current = new Date(d1)

  while (current < d2) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++
    current.setDate(current.getDate() + 1)
  }

  return Math.max(1, count)
}

/**
 * Calcula redistribuição de sobras de um sprint para o seguinte.
 * Retorna novos valores de C' e P' do sprint receptor.
 */
export function calcularRedistribuicao(
  sobra_horas: number,
  sobra_brl: number,
  sprint_receptor: SprintFractal,
  tm: TMNormalizado
): { novo_P_prime: number; novo_C_prime: number; area_nova: number } {
  const horas_novas = sprint_receptor.P_prime * tm.prazo_total_horas / tm.P - sobra_horas
  const custo_novo = sprint_receptor.C_prime * tm.custo_total_brl / tm.C - sobra_brl

  const novo_P_prime = tm.P * (horas_novas / tm.prazo_total_horas)
  const novo_C_prime = tm.C * (custo_novo / tm.custo_total_brl)
  const area_nova = areaHeron(sprint_receptor.E_prime, novo_P_prime, novo_C_prime)

  return { novo_P_prime, novo_C_prime, area_nova }
}
