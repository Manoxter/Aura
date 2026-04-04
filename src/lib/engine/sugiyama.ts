/**
 * Sugiyama Layout — Camadas + Barycenter Heuristic
 *
 * Posiciona nós de um grafo DAG em camadas usando o algoritmo Sugiyama:
 * 1. Atribuir camadas por profundidade máxima de dependência (longest path layering)
 * 2. Ordenar nós dentro de cada camada usando Barycenter (2 passes)
 * 3. Calcular posições (cx, cy) para cada nó
 *
 * Story 4.2 — Sprint PERT-V2
 */

import type { TarefaData } from './cpm'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NodePosition {
  cx: number
  cy: number
  layer: number
  indexInLayer: number
}

export interface SugiyamaConfig {
  /** Largura do nó retangular (padrão 64) */
  nodeW?: number
  /** Altura do nó retangular (padrão 36) */
  nodeH?: number
  /** Espaçamento horizontal entre camadas (padrão 80) */
  gapX?: number
  /** Espaçamento vertical entre nós da mesma camada (padrão 16) */
  gapY?: number
  /** Padding externo (padrão 32) */
  pad?: number
}

// ─── Função Principal ─────────────────────────────────────────────────────────

/**
 * Calcula as posições (cx, cy) para cada nó usando o algoritmo Sugiyama.
 *
 * @param tarefas - Lista de tarefas com dependências (IDs já resolvidos)
 * @param config  - Parâmetros de layout opcionais
 * @returns Map<taskId, NodePosition>
 */
export function computeSugiyamaLayout(
  tarefas: TarefaData[],
  config: SugiyamaConfig = {}
): Map<string, NodePosition> {
  const {
    nodeW = 64,
    nodeH = 36,
    gapX = 80,
    gapY = 16,
    pad = 32,
  } = config

  if (tarefas.length === 0) return new Map()

  const taskMap = new Map(tarefas.map(t => [t.id, t]))

  // ─── Passo 1: Atribuir camadas (longest path layering) ────────────────────
  const layerMap = new Map<string, number>()
  const visited = new Set<string>()

  function assignLayer(id: string, depth = new Set<string>()): number {
    if (layerMap.has(id)) return layerMap.get(id)!
    if (depth.has(id)) return 0  // cycle guard
    depth.add(id)

    const t = taskMap.get(id)
    if (!t || !t.dependencias || t.dependencias.length === 0) {
      layerMap.set(id, 0)
      return 0
    }

    let maxLayer = 0
    for (const depId of t.dependencias) {
      if (taskMap.has(depId)) {
        maxLayer = Math.max(maxLayer, assignLayer(depId, new Set(depth)) + 1)
      }
    }
    layerMap.set(id, maxLayer)
    visited.add(id)
    return maxLayer
  }

  tarefas.forEach(t => assignLayer(t.id))

  // ─── Passo 2: Agrupar por camada ──────────────────────────────────────────
  const byLayer = new Map<number, string[]>()
  tarefas.forEach(t => {
    const lv = layerMap.get(t.id) ?? 0
    if (!byLayer.has(lv)) byLayer.set(lv, [])
    byLayer.get(lv)!.push(t.id)
  })

  const maxLayer = Math.max(...Array.from(layerMap.values()), 0)

  // ─── Passo 3: Barycenter — top-down pass ─────────────────────────────────
  // Para cada camada > 0: ordenar nós pela média das posições dos predecessores
  const orderInLayer = new Map<string, number>()

  // Inicializar ordem como índice de chegada
  for (let lv = 0; lv <= maxLayer; lv++) {
    const group = byLayer.get(lv) || []
    group.forEach((id, idx) => orderInLayer.set(id, idx))
  }

  for (let pass = 0; pass < 2; pass++) {
    // Top-down: ordenar camada[lv] pela média das posições em camada[lv-1]
    for (let lv = 1; lv <= maxLayer; lv++) {
      const group = byLayer.get(lv) || []
      const scored = group.map(id => {
        const t = taskMap.get(id)!
        const predecessorsInPrevLayer = (t.dependencias || [])
          .filter(depId => layerMap.get(depId) === lv - 1)
        if (predecessorsInPrevLayer.length === 0) {
          return { id, score: orderInLayer.get(id) ?? 0 }
        }
        const avgPos = predecessorsInPrevLayer
          .map(depId => orderInLayer.get(depId) ?? 0)
          .reduce((a, b) => a + b, 0) / predecessorsInPrevLayer.length
        return { id, score: avgPos }
      })

      scored.sort((a, b) => a.score - b.score)
      scored.forEach(({ id }, idx) => orderInLayer.set(id, idx))
      byLayer.set(lv, scored.map(s => s.id))
    }

    // Bottom-up: ordenar camada[lv] pela média das posições em camada[lv+1]
    for (let lv = maxLayer - 1; lv >= 0; lv--) {
      const group = byLayer.get(lv) || []
      // Invert: buscar sucessores que estão na camada lv+1
      const successorsByNode = new Map<string, string[]>()
      ;(byLayer.get(lv + 1) || []).forEach(succId => {
        const succ = taskMap.get(succId)
        if (!succ) return
        ;(succ.dependencias || []).forEach(depId => {
          if (layerMap.get(depId) === lv) {
            if (!successorsByNode.has(depId)) successorsByNode.set(depId, [])
            successorsByNode.get(depId)!.push(succId)
          }
        })
      })

      const scored = group.map(id => {
        const successors = successorsByNode.get(id) || []
        if (successors.length === 0) return { id, score: orderInLayer.get(id) ?? 0 }
        const avgPos = successors
          .map(succId => orderInLayer.get(succId) ?? 0)
          .reduce((a, b) => a + b, 0) / successors.length
        return { id, score: avgPos }
      })

      scored.sort((a, b) => a.score - b.score)
      scored.forEach(({ id }, idx) => orderInLayer.set(id, idx))
      byLayer.set(lv, scored.map(s => s.id))
    }
  }

  // ─── Passo 4: Calcular posições (cx, cy) ─────────────────────────────────
  // Centrar verticalmente cada camada em relação à maior camada
  const maxNodesInLayer = Math.max(
    ...Array.from(byLayer.values()).map(g => g.length), 1
  )
  const totalHeight = maxNodesInLayer * (nodeH + gapY) - gapY

  const positions = new Map<string, NodePosition>()

  for (let lv = 0; lv <= maxLayer; lv++) {
    const group = byLayer.get(lv) || []
    const nInLayer = group.length
    const layerHeight = nInLayer * (nodeH + gapY) - gapY
    const offsetY = (totalHeight - layerHeight) / 2  // centrar na camada maior

    group.forEach((id, idx) => {
      const cx = pad + nodeW / 2 + lv * (nodeW + gapX)
      const cy = pad + nodeH / 2 + offsetY + idx * (nodeH + gapY)
      positions.set(id, { cx, cy, layer: lv, indexInLayer: idx })
    })
  }

  return positions
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Calcula dimensões do SVG a partir das posições calculadas */
export function computeSvgDimensions(
  positions: Map<string, NodePosition>,
  config: SugiyamaConfig = {}
): { width: number; height: number } {
  const { nodeW = 64, nodeH = 36, pad = 32 } = config

  if (positions.size === 0) return { width: 300, height: 200 }

  let maxCX = 0, maxCY = 0
  positions.forEach(({ cx, cy }) => {
    if (cx > maxCX) maxCX = cx
    if (cy > maxCY) maxCY = cy
  })

  return {
    width: maxCX + nodeW / 2 + pad,
    height: maxCY + nodeH / 2 + pad,
  }
}
