// src/lib/engine/burndown.test.ts
import { describe, it, expect } from 'vitest'

// Helper: compute burndown key points from tasks with ES/EF
// (mirrors the logic in funcoes/page.tsx generateBurndownData)
function computeBurndown(tarefas: { es: number; ef: number; duracao: number }[], T: number) {
  const totalWork = tarefas.reduce((sum, t) => sum + t.duracao, 0) || 1
  const keyTimes = Array.from(new Set([0, ...tarefas.map(t => t.ef), T])).sort((a, b) => a - b)
  return keyTimes.map(t => {
    const done = tarefas.filter(task => task.ef <= t).reduce((sum, task) => sum + task.duracao, 0)
    const remaining = Math.max(0, (1 - done / totalWork) * 100)
    return { x: t, y: parseFloat(remaining.toFixed(1)) }
  })
}

describe('Burndown ES/EF based', () => {
  it('AC-2: projeto com 3 tarefas paralelas gera burndown diferente da versão serializada', () => {
    // Parallel: Task A and B both start at ES=0, finish at EF=5; Task C starts ES=5, EF=10
    const parallel = [
      { es: 0, ef: 5, duracao: 5 },
      { es: 0, ef: 5, duracao: 5 },
      { es: 5, ef: 10, duracao: 5 },
    ]
    // Serial (same durations, but each starts after previous finishes):
    // Task A: ES=0, EF=5; Task B: ES=5, EF=10; Task C: ES=10, EF=15
    const serial = [
      { es: 0, ef: 5, duracao: 5 },
      { es: 5, ef: 10, duracao: 5 },
      { es: 10, ef: 15, duracao: 5 },
    ]
    const burnParallel = computeBurndown(parallel, 10)
    const burnSerial = computeBurndown(serial, 15)

    // At the midpoint of parallel (t=5): 2 tasks done out of 3 (66.7% done)
    const parallelAtT5 = burnParallel.find(p => p.x === 5)
    expect(parallelAtT5?.y).toBeCloseTo(33.3, 0) // 33.3% remaining

    // At midpoint of serial (t=5): only 1 task done out of 3 (33.3% done)
    const serialAtT5 = burnSerial.find(p => p.x === 5)
    expect(serialAtT5?.y).toBeCloseTo(66.7, 0) // 66.7% remaining

    // The two burndowns are different at t=5
    expect(parallelAtT5?.y).not.toEqual(serialAtT5?.y)
  })

  it('AC-3: projeto sequencial puro produz burndown com progresso constante por tarefa', () => {
    const sequential = [
      { es: 0, ef: 5, duracao: 5 },
      { es: 5, ef: 10, duracao: 5 },
      { es: 10, ef: 15, duracao: 5 },
    ]
    const burn = computeBurndown(sequential, 15)

    // At t=0: 100% remaining
    expect(burn.find(p => p.x === 0)?.y).toBe(100)
    // At t=5: 1 of 3 done = 66.7% remaining
    const atT5 = burn.find(p => p.x === 5)
    expect(atT5?.y).toBeCloseTo(66.7, 0)
    // At t=10: 2 of 3 done = 33.3% remaining
    const atT10 = burn.find(p => p.x === 10)
    expect(atT10?.y).toBeCloseTo(33.3, 0)
    // At t=15: 100% done = 0% remaining
    expect(burn.find(p => p.x === 15)?.y).toBe(0)
  })

  it('AC-1: x-axis usa ES/EF, não soma acumulada serial de durações', () => {
    // 2 parallel tasks with same duration
    // Serial sum approach would give keyTimes [0, 5, 10]
    // ES/EF approach: both tasks finish at EF=5, so keyTimes = [0, 5, T]
    const parallel = [
      { es: 0, ef: 5, duracao: 5 },
      { es: 0, ef: 5, duracao: 5 },
    ]
    const burn = computeBurndown(parallel, 5)
    // Key x values should be [0, 5] — not [0, 5, 10] from serial sum
    const xValues = burn.map(p => p.x)
    expect(xValues).toEqual([0, 5])
    // At t=5: both tasks done = 0% remaining
    expect(burn.find(p => p.x === 5)?.y).toBe(0)
  })

  it('all remaining = 100 at t=0 and 0 at project end', () => {
    const tarefas = [
      { es: 0, ef: 3, duracao: 3 },
      { es: 0, ef: 3, duracao: 3 },
      { es: 3, ef: 7, duracao: 4 },
    ]
    const burn = computeBurndown(tarefas, 7)
    expect(burn[0].y).toBe(100)
    expect(burn[burn.length - 1].y).toBe(0)
  })
})
