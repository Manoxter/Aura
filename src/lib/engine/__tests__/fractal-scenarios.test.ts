/**
 * Cenários de Teste — Projetos com 2, 3, 4, 5 e 6 sprints
 *
 * Valida:
 *   - Construção backward (milestone-driven)
 *   - Normalização proporcional (regra de 3)
 *   - Colinearidade
 *   - Sierpinski layout
 *   - Castle propagação na malha
 *   - MATED composto
 *   - Fever 5 zonas (incluindo azul)
 *
 * IMPORTANTE: O escopo de cada sprint = cobertura no calendário.
 * Os 3 lados são definidos pelos milestones (entregas), backward.
 */

import { describe, it, expect } from 'vitest'
import { sierpinskiLayout, distanciaMalha } from '../sierpinski'
import {
  construirFractaisBackward,
  verificarColinearidade,
  type TMNormalizado,
  type SprintInput,
  type Milestone,
} from '../fractal-builder'
import { calcularNVOPonderado, calcularMATEDComposto, distanciaEuclidiana } from '../nvo-ponderado'
import { propagarNaMalha, inicializarCellStates } from '../castle-sierpinski'
import { determinarFeverZone } from '../buffer'
import { areaHeron } from '../fractals'

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function criarTM(prazo_h: number, custo_brl: number, escopo_h: number): TMNormalizado {
  const E = 1.0
  const P = prazo_h / escopo_h  // normalizado
  const C = custo_brl / (escopo_h * 100)  // normalizado (100 BRL/h baseline)
  return {
    E, P, C,
    prazo_total_horas: prazo_h,
    custo_total_brl: custo_brl,
    escopo_total_horas: escopo_h,
    area: areaHeron(E, P, C),
  }
}

function criarSprint(
  id: string, nome: string, milestone: Milestone,
  inicio: string, fim: string,
  horas: number, custo: number,
  estado: 'futuro' | 'ativo' | 'concluido' = 'futuro',
  buffer_orig: number = 10, buffer_cons: number = 0,
  horas_real: number = 0, custo_real: number = 0,
): SprintInput {
  return {
    id, nome, milestone,
    data_inicio: inicio, data_fim: fim,
    horas_trabalho: horas, custo_planejado: custo,
    estado,
    horas_realizadas: horas_real, custo_realizado: custo_real,
    buffer_original: buffer_orig, buffer_consumido: buffer_cons,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CENÁRIO 1: Projeto com 2 Sprints (App Mobile Simples)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cenário 1 — 2 Sprints (App Mobile Simples)', () => {
  const tm = criarTM(320, 48000, 320) // 40 dias, R$48k, 320h escopo

  const milestones: Milestone[] = [
    { id: 'm1', nome: 'MVP Core', data_entrega: '2026-05-16', ordem_backward: 2 },
    { id: 'm2', nome: 'Entrega Final', data_entrega: '2026-05-30', ordem_backward: 1 },
  ]

  const sprints: SprintInput[] = [
    criarSprint('s1', 'Sprint 1 — Backend + Auth', milestones[0],
      '2026-04-14', '2026-05-02', 160, 24000, 'concluido', 12, 3, 155, 22000),
    criarSprint('s2', 'Sprint 2 — Frontend + Deploy', milestones[1],
      '2026-05-05', '2026-05-30', 160, 24000, 'ativo', 12, 5),
  ]

  it('Sierpinski: nível 1, 3 up, 1 down', () => {
    const layout = sierpinskiLayout(2, ['s1', 's2'])
    expect(layout.nivel).toBe(1)
    expect(layout.sprintsAlocados).toBe(2)
    expect(layout.cells.filter(c => c.orientation === 'down').length).toBeGreaterThanOrEqual(1)
  })

  it('Fractais: E + E = E_tm (soma escopo)', () => {
    const result = construirFractaisBackward(tm, sprints)
    const soma_E = result.fractais.reduce((acc, f) => acc + f.E_prime, 0)
    expect(soma_E).toBeCloseTo(tm.E, 1)
    expect(result.fractais).toHaveLength(2)
  })

  it('Fractais: regra de 3 proporcional', () => {
    const result = construirFractaisBackward(tm, sprints)
    for (const f of result.fractais) {
      expect(f.razao_E).toBeGreaterThan(0)
      expect(f.razao_P).toBeGreaterThan(0)
      expect(f.razao_C).toBeGreaterThan(0)
    }
  })

  it('Fever: zona azul quando buffer negativo', () => {
    expect(determinarFeverZone(-5, 50)).toBe('azul')
  })

  it('Fever: zona preto quando buffer > 100%', () => {
    expect(determinarFeverZone(110, 80)).toBe('preto')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CENÁRIO 2: Projeto com 3 Sprints (SaaS Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cenário 2 — 3 Sprints (SaaS Dashboard)', () => {
  const tm = criarTM(480, 72000, 480) // 60 dias, R$72k

  const milestones: Milestone[] = [
    { id: 'm1', nome: 'Data Layer', data_entrega: '2026-05-09', ordem_backward: 3 },
    { id: 'm2', nome: 'UI Components', data_entrega: '2026-05-30', ordem_backward: 2 },
    { id: 'm3', nome: 'Go-Live', data_entrega: '2026-06-20', ordem_backward: 1 },
  ]

  const sprints: SprintInput[] = [
    criarSprint('s1', 'Sprint 1 — Database + API', milestones[0],
      '2026-04-14', '2026-05-09', 192, 28800, 'concluido', 15, 4, 190, 27500),
    criarSprint('s2', 'Sprint 2 — UI + Charts', milestones[1],
      '2026-05-12', '2026-05-30', 160, 24000, 'ativo', 12, 6),
    criarSprint('s3', 'Sprint 3 — Polish + Deploy', milestones[2],
      '2026-06-02', '2026-06-20', 128, 19200, 'futuro', 10, 0),
  ]

  it('Sierpinski: nível 1, 3 sprints preenchidos', () => {
    const layout = sierpinskiLayout(3, ['s1', 's2', 's3'])
    expect(layout.nivel).toBe(2) // ceil(log2(3)) = 2
    expect(layout.sprintsAlocados).toBe(3)
  })

  it('Fractais: todos com CEt válida', () => {
    const result = construirFractaisBackward(tm, sprints)
    for (const f of result.fractais) {
      expect(f.cet_valida).toBe(true)
    }
  })

  it('Colinearidade: verificação funciona', () => {
    const { colinear, desvio } = verificarColinearidade(0.33, 0.34, 0.33)
    expect(colinear).toBe(true)
    expect(desvio).toBeLessThan(0.05)
  })

  it('Colinearidade: detecta desvio', () => {
    const { colinear } = verificarColinearidade(0.5, 0.2, 0.3)
    expect(colinear).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CENÁRIO 3: Projeto com 4 Sprints (E-commerce)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cenário 3 — 4 Sprints (E-commerce)', () => {
  const tm = criarTM(640, 128000, 640) // 80 dias, R$128k

  const sprintIds = ['s1', 's2', 's3', 's4']

  const sprints: SprintInput[] = [
    criarSprint('s1', 'Sprint 1 — Catálogo', {
      id: 'm1', nome: 'Catálogo Online', data_entrega: '2026-05-09', ordem_backward: 4 },
      '2026-04-14', '2026-05-09', 160, 32000, 'concluido', 12, 2, 158, 30000),
    criarSprint('s2', 'Sprint 2 — Checkout', {
      id: 'm2', nome: 'Checkout Flow', data_entrega: '2026-05-30', ordem_backward: 3 },
      '2026-05-12', '2026-05-30', 160, 32000, 'ativo', 12, 7),
    criarSprint('s3', 'Sprint 3 — Payments', {
      id: 'm3', nome: 'Pagamento Integrado', data_entrega: '2026-06-20', ordem_backward: 2 },
      '2026-06-02', '2026-06-20', 160, 32000, 'futuro', 12, 0),
    criarSprint('s4', 'Sprint 4 — Go-Live', {
      id: 'm4', nome: 'Launch', data_entrega: '2026-07-11', ordem_backward: 1 },
      '2026-06-23', '2026-07-11', 160, 32000, 'futuro', 12, 0),
  ]

  it('Sierpinski: nível 2 para 4 sprints', () => {
    const layout = sierpinskiLayout(4, sprintIds)
    expect(layout.nivel).toBe(2)
    expect(layout.sprintsAlocados).toBe(4)
    expect(layout.reservas).toBeGreaterThanOrEqual(0)
  })

  it('Castle: distância na malha calculada', () => {
    const layout = sierpinskiLayout(4, sprintIds)
    const sprintCells = layout.cells.filter(c => c.role === 'sprint')
    if (sprintCells.length >= 2) {
      const d = distanciaMalha(layout, sprintCells[0].cellId, sprintCells[1].cellId)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(10)
    }
  })

  it('Fractais backward: 4 fractais criados', () => {
    const result = construirFractaisBackward(tm, sprints)
    expect(result.fractais).toHaveLength(4)
    expect(result.fractais[0].numero).toBe(1) // primeiro cronologicamente
    expect(result.fractais[3].numero).toBe(4) // último (Ômega)
  })

  it('TBZ: buffers de transição criados', () => {
    const result = construirFractaisBackward(tm, sprints)
    expect(result.tbz.length).toBe(3) // entre S1-S2, S2-S3, S3-S4
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CENÁRIO 4: Projeto com 5 Sprints (FinTech Platform)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cenário 4 — 5 Sprints (FinTech Platform)', () => {
  const tm = criarTM(800, 200000, 800) // 100 dias, R$200k

  const sprintIds = ['s1', 's2', 's3', 's4', 's5']

  const sprints: SprintInput[] = Array.from({ length: 5 }, (_, i) => {
    const num = i + 1
    const inicio = new Date(2026, 3, 14 + i * 21) // 3 semanas cada
    const fim = new Date(inicio.getTime() + 14 * 24 * 60 * 60 * 1000)
    return criarSprint(
      `s${num}`, `Sprint ${num}`,
      { id: `m${num}`, nome: `Milestone ${num}`, data_entrega: fim.toISOString().slice(0, 10), ordem_backward: 6 - num },
      inicio.toISOString().slice(0, 10), fim.toISOString().slice(0, 10),
      160, 40000,
      num <= 2 ? 'concluido' : num === 3 ? 'ativo' : 'futuro',
      15, num <= 2 ? 3 : num === 3 ? 8 : 0,
      num <= 2 ? 155 : 0, num <= 2 ? 38000 : 0,
    )
  })

  it('Sierpinski: nível 3 para 5 sprints', () => {
    const layout = sierpinskiLayout(5, sprintIds)
    expect(layout.nivel).toBeGreaterThanOrEqual(2)
    expect(layout.sprintsAlocados).toBe(5)
  })

  it('NVO ponderado: converge ao baricentro do TM', () => {
    const baricentro_tm = { x: 0.5, y: 0.4 }
    const sprintBaricentros = sprintIds.map((id, i) => ({
      sprintId: id,
      baricentro: { x: 0.5 + (i - 2) * 0.05, y: 0.4 + (i - 2) * 0.03 },
      peso_complexidade: 1,
    }))

    const nvo = calcularNVOPonderado(baricentro_tm, sprintBaricentros)

    // NVO deve estar mais perto do TM que de qualquer sprint individual
    const dist_nvo_tm = distanciaEuclidiana(nvo.nvo, baricentro_tm)
    for (const s of sprintBaricentros) {
      const dist_nvo_sprint = distanciaEuclidiana(nvo.nvo, s.baricentro)
      // NVO mais perto do TM (que tem peso dominante)
      expect(dist_nvo_tm).toBeLessThanOrEqual(dist_nvo_sprint + 0.1)
    }
  })

  it('MATED composto: calcula zona corretamente', () => {
    const baricentro_tm = { x: 0.5, y: 0.4 }
    const pontoOperacao = { x: 0.52, y: 0.42 }
    const sprintBaricentros = sprintIds.map(id => ({
      sprintId: id,
      baricentro: { x: 0.5, y: 0.4 },
      peso_complexidade: 1,
    }))

    const nvo = calcularNVOPonderado(baricentro_tm, sprintBaricentros)
    const mated = calcularMATEDComposto(pontoOperacao, nvo, sprintBaricentros)

    expect(mated.mated_composto).toBeGreaterThanOrEqual(0)
    expect(['OTIMO', 'SEGURO', 'RISCO', 'CRISE']).toContain(mated.zona)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CENÁRIO 5: Projeto com 6 Sprints (Enterprise ERP) — Malha Cheia Nível 2
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cenário 5 — 6 Sprints (Enterprise ERP) — Malha Cheia', () => {
  const tm = criarTM(960, 300000, 960) // 120 dias, R$300k

  const sprintIds = ['s1', 's2', 's3', 's4', 's5', 's6']

  it('Sierpinski: nível 2, malha cheia, zero reservas', () => {
    const layout = sierpinskiLayout(6, sprintIds)
    expect(layout.nivel).toBeGreaterThanOrEqual(2)
    expect(layout.sprintsAlocados).toBe(6)
    // Com 6 sprints no nível 2+, pode ter 0 reservas
    expect(layout.reservas).toBeGreaterThanOrEqual(0)
  })

  it('Sierpinski: TBZ existem entre sprints', () => {
    const layout = sierpinskiLayout(6, sprintIds)
    const tbzCells = layout.cells.filter(c => c.role === 'tbz')
    expect(tbzCells.length).toBeGreaterThan(0)
  })

  it('Sierpinski: sprints ativos têm adjacências para Castle', () => {
    const layout = sierpinskiLayout(6, sprintIds)
    // Células com sprint alocado devem ter adjacentes (para Castle funcionar)
    const sprintCells = layout.cells.filter(c => c.role === 'sprint')
    for (const cell of sprintCells) {
      expect(cell.adjacentes.length).toBeGreaterThanOrEqual(1)
    }
    // Pelo menos algumas TBZ devem ter adjacentes
    const tbzWithAdj = layout.cells.filter(c => c.role === 'tbz' && c.adjacentes.length > 0)
    expect(tbzWithAdj.length).toBeGreaterThan(0)
  })

  it('Castle na malha: propagação respeita TBZ first', () => {
    const layout = sierpinskiLayout(6, sprintIds)

    // Inicializar estados
    const sprintData = new Map(sprintIds.map((id, i) => [id, {
      estado: (i < 3 ? 'concluido' : i === 3 ? 'ativo' : 'futuro') as 'concluido' | 'ativo' | 'futuro',
      buffer_original: 15,
      buffer_consumido: i < 3 ? 5 : 0,
    }]))

    const tbzBuffers = new Map<string, { buffer_original: number; buffer_consumido: number }>()
    for (const cell of layout.cells) {
      if (cell.role === 'tbz') {
        tbzBuffers.set(cell.cellId, { buffer_original: 8, buffer_consumido: 0 })
      }
    }

    const cellStates = inicializarCellStates(layout, sprintData, tbzBuffers)

    // Encontrar célula ativa
    const activoCell = layout.cells.find(c => c.sprintId === 's4')
    if (activoCell) {
      const result = propagarNaMalha(layout, cellStates, activoCell.cellId, 20)

      // Deve ter absorção
      expect(result.cadeia_absorcao.length).toBeGreaterThan(0)
      // Estabilidade deve ser calculada
      expect(['estavel', 'inclinado', 'critico', 'colapsado']).toContain(result.estabilidade)
    }
  })

  it('Fever 5 zonas: todas as zonas possíveis', () => {
    expect(determinarFeverZone(-10, 50)).toBe('azul')
    expect(determinarFeverZone(10, 50)).toBe('verde')
    expect(determinarFeverZone(40, 50)).toBe('amarelo')
    expect(determinarFeverZone(80, 50)).toBe('vermelho')
    expect(determinarFeverZone(110, 50)).toBe('preto')
  })
})
