/**
 * Castle de Cartas na Malha Sierpinski — Decisões 28, 29
 *
 * Propagação de impacto por ADJACÊNCIA GEOMÉTRICA na malha Sierpinski,
 * não por ordem cronológica dos sprints.
 *
 * Regras:
 *   1. TBZ absorve primeiro (é buffer, é pra isso)
 *   2. Se TBZ saturou → propaga para vizinhos ↑ com e^(-λk)
 *   3. Se vizinhos não absorvem → sobe na malha
 *   4. Se chega ao topo → TM deforma → CEt verifica → COLAPSO
 *   5. Sprints concluídos = cristalizados (ZERO impacto)
 */

import {
  type SierpinskiLayout,
  type SierpinskiCell,
  ordemPropagacaoCastle,
} from './sierpinski'
import { fatorAtenuacao, calcularSkewVisual } from './castle'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CastleCellState {
  cellId: string
  role: 'sprint' | 'tbz' | 'reserva'
  sprintId: string | null
  /** Estado do sprint (null para TBZ) */
  estado: 'concluido' | 'ativo' | 'futuro' | null
  /** Buffer original (horas) */
  buffer_original: number
  /** Buffer consumido (horas) */
  buffer_consumido: number
  /** Impacto recebido por propagação */
  impacto_recebido: number
  /** Skew visual (radianos) */
  skew_visual: number
  /** Cor (zona Fever) */
  fever_zone: 'azul' | 'verde' | 'amarelo' | 'vermelho' | 'preto'
}

export interface CastleSierpinskiResult {
  /** Estado de cada célula após propagação */
  cells: CastleCellState[]
  /** Impacto residual (não absorvido por nenhum buffer) */
  impacto_residual: number
  /** Estabilidade geral */
  estabilidade: 'estavel' | 'inclinado' | 'critico' | 'colapsado'
  /** Células que absorveram impacto (ordem de absorção) */
  cadeia_absorcao: string[]
  /** TM atingido? (impacto chegou ao topo) */
  tm_atingido: boolean
}

// ─── Propagação na Malha ─────────────────────────────────────────────────────

/**
 * Propaga impacto de uma decisão na malha Sierpinski.
 * Segue adjacência geométrica, TBZ absorve primeiro.
 *
 * @param layout - malha Sierpinski do projeto
 * @param cellStates - estado atual de cada célula (buffers, estados)
 * @param fromCellId - célula onde ocorreu o impacto (sprint ativo)
 * @param impacto - impacto em horas (positivo = atraso)
 * @param lambda - fator de atenuação (default 0.3)
 */
export function propagarNaMalha(
  layout: SierpinskiLayout,
  cellStates: Map<string, CastleCellState>,
  fromCellId: string,
  impacto: number,
  lambda: number = 0.3
): CastleSierpinskiResult {
  const resultado = new Map<string, CastleCellState>()
  for (const [k, v] of cellStates) {
    resultado.set(k, { ...v })
  }

  const cadeia_absorcao: string[] = []
  let impacto_residual = impacto
  let tm_atingido = false

  // Célula de origem recebe impacto total
  const origem = resultado.get(fromCellId)
  if (origem) {
    const buffer_disponivel = Math.max(0, origem.buffer_original - origem.buffer_consumido)
    const absorvido = Math.min(impacto, buffer_disponivel)
    origem.buffer_consumido += absorvido
    origem.impacto_recebido += impacto
    origem.skew_visual = calcularSkewVisual(origem.buffer_consumido, origem.buffer_original)
    origem.fever_zone = calcularFeverZoneFromBuffer(origem.buffer_consumido, origem.buffer_original)
    cadeia_absorcao.push(fromCellId)
    impacto_residual = impacto - absorvido
  }

  if (impacto_residual <= 0.01) {
    return buildResult(resultado, impacto_residual, cadeia_absorcao, tm_atingido)
  }

  // Propagar por adjacência (BFS com TBZ primeiro)
  const ordem = ordemPropagacaoCastle(layout, fromCellId)

  for (const item of ordem) {
    if (impacto_residual <= 0.01) break

    const cell = resultado.get(item.cellId)
    if (!cell) continue

    // Concluído = cristalizado, pula
    if (cell.estado === 'concluido') continue

    // Atenuação por distância na malha
    const atenuado = impacto_residual * fatorAtenuacao(item.distancia, lambda)
    if (atenuado < 0.01) break

    const buffer_disponivel = Math.max(0, cell.buffer_original - cell.buffer_consumido)
    const absorvido = Math.min(atenuado, buffer_disponivel)

    cell.buffer_consumido += absorvido
    cell.impacto_recebido += atenuado
    cell.skew_visual = calcularSkewVisual(cell.buffer_consumido, cell.buffer_original)
    cell.fever_zone = calcularFeverZoneFromBuffer(cell.buffer_consumido, cell.buffer_original)

    cadeia_absorcao.push(item.cellId)
    impacto_residual = atenuado - absorvido
  }

  // Se ainda tem residual → TM atingido
  if (impacto_residual > 0.01) {
    tm_atingido = true
  }

  return buildResult(resultado, impacto_residual, cadeia_absorcao, tm_atingido)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularFeverZoneFromBuffer(
  consumido: number,
  original: number
): CastleCellState['fever_zone'] {
  if (original <= 0) return 'verde'
  const pct = (consumido / original) * 100
  if (pct < 0) return 'azul'
  if (pct <= 33) return 'verde'
  if (pct <= 66) return 'amarelo'
  if (pct <= 100) return 'vermelho'
  return 'preto'
}

function buildResult(
  cells: Map<string, CastleCellState>,
  impacto_residual: number,
  cadeia_absorcao: string[],
  tm_atingido: boolean
): CastleSierpinskiResult {
  const cellArray = Array.from(cells.values())

  // Estabilidade
  const ativos = cellArray.filter(c => c.estado !== 'concluido' && c.role !== 'reserva')
  let estabilidade: CastleSierpinskiResult['estabilidade'] = 'estavel'

  if (tm_atingido || ativos.some(c => c.buffer_original > 0 && c.buffer_consumido >= c.buffer_original)) {
    estabilidade = 'colapsado'
  } else {
    const skews = ativos.map(c => Math.abs(c.skew_visual))
    const maxSkew = skews.length > 0 ? Math.max(...skews) : 0
    const mediaSkew = skews.length > 0 ? skews.reduce((a, b) => a + b, 0) / skews.length : 0

    if (maxSkew > 0.5) estabilidade = 'critico'
    else if (mediaSkew > 0.2) estabilidade = 'inclinado'
  }

  return {
    cells: cellArray,
    impacto_residual,
    estabilidade,
    cadeia_absorcao,
    tm_atingido,
  }
}

/**
 * Inicializa estados das células a partir do layout e dados dos sprints.
 */
export function inicializarCellStates(
  layout: SierpinskiLayout,
  sprintData: Map<string, {
    estado: 'concluido' | 'ativo' | 'futuro'
    buffer_original: number
    buffer_consumido: number
  }>,
  tbzBuffers: Map<string, { buffer_original: number; buffer_consumido: number }>
): Map<string, CastleCellState> {
  const states = new Map<string, CastleCellState>()

  for (const cell of layout.cells) {
    const state: CastleCellState = {
      cellId: cell.cellId,
      role: cell.role,
      sprintId: cell.sprintId,
      estado: null,
      buffer_original: 0,
      buffer_consumido: 0,
      impacto_recebido: 0,
      skew_visual: 0,
      fever_zone: 'verde',
    }

    if (cell.role === 'sprint' && cell.sprintId) {
      const data = sprintData.get(cell.sprintId)
      if (data) {
        state.estado = data.estado
        state.buffer_original = data.buffer_original
        state.buffer_consumido = data.buffer_consumido
        state.skew_visual = calcularSkewVisual(data.buffer_consumido, data.buffer_original)
        state.fever_zone = calcularFeverZoneFromBuffer(data.buffer_consumido, data.buffer_original)
      }
    } else if (cell.role === 'tbz') {
      const tbz = tbzBuffers.get(cell.cellId)
      if (tbz) {
        state.buffer_original = tbz.buffer_original
        state.buffer_consumido = tbz.buffer_consumido
        state.fever_zone = calcularFeverZoneFromBuffer(tbz.buffer_consumido, tbz.buffer_original)
      }
    }

    states.set(cell.cellId, state)
  }

  return states
}
