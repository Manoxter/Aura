/**
 * Sierpinski Layout Engine — Malha Fractal Fixa
 *
 * A malha Sierpinski é a ESTRUTURA do projeto. Não muda depois de criada.
 * Sprints preenchem posições ↑ (para cima). TBZ ocupam posições ↓ (para baixo).
 *
 * Decisões: 20-23, 27, 30-34
 *
 * Regras:
 *   - Nível = ceil(log2(N)) onde N = sprints
 *   - Preenchimento backward: último sprint no topo (Ômega), primeiro na base-esquerda
 *   - Posições ↑ vazias = reserva (sprint futuro adicionável)
 *   - Posições ↓ = TBZ sempre (buffers de transição)
 *   - Castle propaga por adjacência geométrica na malha
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CellOrientation = 'up' | 'down'
export type CellRole = 'sprint' | 'tbz' | 'reserva'

export interface SierpinskiCell {
  /** Identificador único da célula na malha */
  cellId: string
  /** Nível na pirâmide (0 = base, nivel = topo) */
  row: number
  /** Posição horizontal dentro do nível */
  col: number
  /** Orientação: up = sprint/reserva, down = TBZ */
  orientation: CellOrientation
  /** Papel: sprint ativo, TBZ (buffer), ou reserva vazia */
  role: CellRole
  /** ID do sprint alocado (null se TBZ ou reserva) */
  sprintId: string | null
  /** Número do sprint (null se TBZ ou reserva) */
  sprintNumero: number | null
  /** IDs das células adjacentes (para Castle propagation) */
  adjacentes: string[]
  /** Coordenadas normalizadas para renderização SVG [0,1] */
  vertices: { x: number; y: number }[]
}

export interface SierpinskiLayout {
  /** Nível da malha Sierpinski */
  nivel: number
  /** Total de células (up + down) */
  totalCells: number
  /** Células ↑ disponíveis para sprints */
  upCells: number
  /** Células ↓ (TBZ) */
  downCells: number
  /** Sprints alocados */
  sprintsAlocados: number
  /** Reservas (↑ vazias) */
  reservas: number
  /** Todas as células da malha */
  cells: SierpinskiCell[]
}

// ─── Geração da Malha ────────────────────────────────────────────────────────

/**
 * Gera a malha Sierpinski completa para N sprints.
 *
 * @param nSprints - número de sprints do projeto
 * @param sprintIds - IDs dos sprints em ordem cronológica (S1 primeiro, Sn último)
 * @returns layout completo com células, adjacências e coordenadas
 */
export function sierpinskiLayout(nSprints: number, sprintIds: string[]): SierpinskiLayout {
  if (nSprints < 2) nSprints = 2

  const nivel = Math.max(1, Math.ceil(Math.log2(nSprints)))
  const cells: SierpinskiCell[] = []

  // Gerar todas as células recursivamente
  generateCells(cells, nivel, 0, 0, 1.0, 0, 0)

  // Separar up e down
  const upCells = cells.filter(c => c.orientation === 'up')
  const downCells = cells.filter(c => c.orientation === 'down')

  // Preenchimento backward: último sprint no topo, primeiro na base-esquerda
  // Ordenar upCells: topo primeiro, depois nível por nível descendo, esquerda para direita
  const sortedUp = [...upCells].sort((a, b) => {
    if (a.row !== b.row) return b.row - a.row // topo primeiro
    return a.col - b.col // esquerda primeiro dentro do nível
  })

  // Reverter sprintIds para preencher backward (último sprint = topo)
  const reversed = [...sprintIds].reverse()

  for (let i = 0; i < sortedUp.length; i++) {
    if (i < reversed.length) {
      sortedUp[i].role = 'sprint'
      sortedUp[i].sprintId = reversed[i]
      sortedUp[i].sprintNumero = nSprints - i
    } else {
      sortedUp[i].role = 'reserva'
    }
  }

  // Marcar todas as down como TBZ
  for (const c of downCells) {
    c.role = 'tbz'
  }

  // Calcular adjacências
  computeAdjacencies(cells)

  return {
    nivel,
    totalCells: cells.length,
    upCells: upCells.length,
    downCells: downCells.length,
    sprintsAlocados: Math.min(nSprints, upCells.length),
    reservas: Math.max(0, upCells.length - nSprints),
    cells,
  }
}

/**
 * Gera células recursivamente usando subdivisão Sierpinski.
 */
function generateCells(
  cells: SierpinskiCell[],
  level: number,
  row: number,
  col: number,
  size: number,
  baseX: number,
  baseY: number
): void {
  if (level === 0) {
    // Célula terminal ↑
    const cellId = `r${row}c${col}u`
    cells.push({
      cellId,
      row,
      col,
      orientation: 'up',
      role: 'reserva',
      sprintId: null,
      sprintNumero: null,
      adjacentes: [],
      vertices: triangleVerticesUp(baseX, baseY, size),
    })
    return
  }

  const halfSize = size / 2

  // Sub-triângulo inferior-esquerdo ↑
  generateCells(cells, level - 1, row, col * 2, halfSize, baseX, baseY)

  // Sub-triângulo inferior-direito ↑
  generateCells(cells, level - 1, row, col * 2 + 1, halfSize, baseX + halfSize, baseY)

  // Sub-triângulo superior ↑
  generateCells(cells, level - 1, row + 1, col, halfSize, baseX + halfSize / 2, baseY + halfSize * (Math.sqrt(3) / 2))

  // Triângulo central invertido ↓ (TBZ)
  // Sua base coincide com a base do sub-triângulo superior ↑
  // e as bases superiores dos dois sub-triângulos inferiores ↑
  const tbzBaseLeftX = baseX + halfSize / 2
  const tbzBaseY = baseY + halfSize * (Math.sqrt(3) / 2)
  const tbzId = `r${row}c${col}d`
  cells.push({
    cellId: tbzId,
    row,
    col,
    orientation: 'down',
    role: 'tbz',
    sprintId: null,
    sprintNumero: null,
    adjacentes: [],
    vertices: triangleVerticesDown(tbzBaseLeftX, tbzBaseY, halfSize),
  })
}

/**
 * Vértices de um triângulo apontando para cima.
 */
function triangleVerticesUp(baseX: number, baseY: number, size: number): { x: number; y: number }[] {
  const h = size * (Math.sqrt(3) / 2)
  return [
    { x: baseX, y: baseY },                    // base-esquerda
    { x: baseX + size, y: baseY },              // base-direita
    { x: baseX + size / 2, y: baseY + h },      // topo
  ]
}

/**
 * Vértices de um triângulo apontando para baixo (TBZ).
 * Base no topo, ponta embaixo. Vértices coincidem com os ↑ vizinhos.
 */
function triangleVerticesDown(baseLeftX: number, baseY: number, size: number): { x: number; y: number }[] {
  const h = size * (Math.sqrt(3) / 2)
  // TBZ central: base está na linha superior, ponta na linha inferior
  return [
    { x: baseLeftX, y: baseY },                     // base-esquerda (= topo do ↑ esquerdo)
    { x: baseLeftX + size, y: baseY },               // base-direita (= topo do ↑ direito)
    { x: baseLeftX + size / 2, y: baseY - h },       // ponta inferior (= base dos ↑)
  ]
}

/**
 * Computa adjacências: duas células são adjacentes se compartilham uma aresta.
 * Usa proximidade de vértices (tolerância 0.001).
 */
function computeAdjacencies(cells: SierpinskiCell[]): void {
  // Tolerância adaptativa: 5% do tamanho médio dos lados
  const allSizes = cells.map(c => {
    if (c.vertices.length < 2) return 0.1
    const dx = c.vertices[1].x - c.vertices[0].x
    const dy = c.vertices[1].y - c.vertices[0].y
    return Math.sqrt(dx * dx + dy * dy)
  })
  const avgSize = allSizes.reduce((a, b) => a + b, 0) / Math.max(allSizes.length, 1)
  const TOLERANCE = Math.max(0.05, avgSize * 0.1)

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const shared = countSharedVertices(cells[i].vertices, cells[j].vertices, TOLERANCE)
      if (shared >= 2) {
        // Compartilham aresta = adjacentes
        cells[i].adjacentes.push(cells[j].cellId)
        cells[j].adjacentes.push(cells[i].cellId)
      }
    }
  }
}

function countSharedVertices(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[],
  tol: number
): number {
  let count = 0
  for (const va of a) {
    for (const vb of b) {
      if (Math.abs(va.x - vb.x) < tol && Math.abs(va.y - vb.y) < tol) {
        count++
        break
      }
    }
  }
  return count
}

/**
 * Retorna a distância (em saltos de adjacência) entre duas células na malha.
 * Usado pelo Castle para calcular k na atenuação e^(-λk).
 * BFS simples.
 */
export function distanciaMalha(layout: SierpinskiLayout, fromId: string, toId: string): number {
  if (fromId === toId) return 0

  const cellMap = new Map(layout.cells.map(c => [c.cellId, c]))
  const visited = new Set<string>()
  const queue: { id: string; dist: number }[] = [{ id: fromId, dist: 0 }]
  visited.add(fromId)

  while (queue.length > 0) {
    const current = queue.shift()!
    const cell = cellMap.get(current.id)
    if (!cell) continue

    for (const adjId of cell.adjacentes) {
      if (adjId === toId) return current.dist + 1
      if (!visited.has(adjId)) {
        visited.add(adjId)
        queue.push({ id: adjId, dist: current.dist + 1 })
      }
    }
  }

  return Infinity // não conectados (não deveria acontecer)
}

/**
 * Dado um layout, retorna a ordem de propagação Castle a partir de uma célula.
 * Retorna células ordenadas por distância (BFS), com TBZ primeiro no mesmo nível.
 */
export function ordemPropagacaoCastle(
  layout: SierpinskiLayout,
  fromCellId: string
): { cellId: string; distancia: number; role: CellRole }[] {
  const cellMap = new Map(layout.cells.map(c => [c.cellId, c]))
  const visited = new Set<string>()
  const result: { cellId: string; distancia: number; role: CellRole }[] = []
  const queue: { id: string; dist: number }[] = [{ id: fromCellId, dist: 0 }]
  visited.add(fromCellId)

  while (queue.length > 0) {
    const current = queue.shift()!
    const cell = cellMap.get(current.id)
    if (!cell) continue

    if (current.id !== fromCellId) {
      result.push({
        cellId: current.id,
        distancia: current.dist,
        role: cell.role,
      })
    }

    // Priorizar TBZ adjacentes (buffers absorvem primeiro)
    const adjacentes = cell.adjacentes
      .map(id => ({ id, cell: cellMap.get(id)! }))
      .filter(a => a.cell && !visited.has(a.id))
      .sort((a, b) => {
        // TBZ primeiro
        if (a.cell.role === 'tbz' && b.cell.role !== 'tbz') return -1
        if (a.cell.role !== 'tbz' && b.cell.role === 'tbz') return 1
        return 0
      })

    for (const adj of adjacentes) {
      visited.add(adj.id)
      queue.push({ id: adj.id, dist: current.dist + 1 })
    }
  }

  return result
}
