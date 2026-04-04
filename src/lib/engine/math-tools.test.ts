import { describe, it, expect } from 'vitest'
import { calculateEOQ, analyzeQueueMM1, monteCarloSimulation, calculateGravityCenter, calculateEMV } from './math-tools'

// ══════════════════════════════════════════════════════════════
// @aura-qa-auditor (Atlas) — Arsenal Matemático OR
// Auditoria completa dos modelos de Pesquisa Operacional do Aura
// ══════════════════════════════════════════════════════════════

describe('Arsenal Matemático OR (math-tools)', () => {

    // ─── 1. LEC / EOQ ────────────────────────────────────────
    describe('calculateEOQ', () => {
        it('calcula o lote econômico correto para parâmetros padrão', () => {
            // EOQ = sqrt(2 * 1000 * 50 / 2) = sqrt(50000) ≈ 223.6
            const result = calculateEOQ(1000, 50, 2)
            expect(result).toBeCloseTo(223.6, 0)
        })

        it('retorna 0 se custo de armazenagem for zero ou negativo', () => {
            expect(calculateEOQ(1000, 50, 0)).toBe(0)
            expect(calculateEOQ(1000, 50, -5)).toBe(0)
        })

        it('retorna 0 se demanda for negativa', () => {
            expect(calculateEOQ(-100, 50, 2)).toBe(0)
        })

        it('calcula corretamente com valores mínimos positivos', () => {
            // EOQ = sqrt(2 * 1 * 1 / 1) = sqrt(2) ≈ 1.414
            const result = calculateEOQ(1, 1, 1)
            expect(result).toBeCloseTo(1.414, 2)
        })
    })

    // ─── 2. Teoria das Filas M/M/1 ───────────────────────────
    describe('analyzeQueueMM1', () => {
        it('retorna sistema saudável quando lambda < mu (sem gargalo)', () => {
            // lambda=10, mu=20 => rho=0.5 (saudável)
            const result = analyzeQueueMM1(10, 20)
            expect(result.rho).toBeCloseTo(0.5)
            expect(result.Lq).toBeCloseTo(0.5)       // rho²/(1-rho)
            expect(result.Wq).toBeCloseTo(0.05)       // Lq/lambda
            expect(result.isBottleneck).toBe(false)
        })

        it('sinaliza gargalo quando rho >= 1 (sistema saturado)', () => {
            // lambda=20, mu=10 => rho=2 (saturado)
            const result = analyzeQueueMM1(20, 10)
            expect(result.rho).toBeGreaterThanOrEqual(1)
            expect(result.isBottleneck).toBe(true)
            expect(result.Lq).toBe(Infinity)
        })

        it('sinaliza gargalo quando rho é exatamente 1', () => {
            const result = analyzeQueueMM1(10, 10)
            expect(result.isBottleneck).toBe(true)
        })

        it('sinaliza gargalo quando mu é zero (divisão por zero)', () => {
            const result = analyzeQueueMM1(10, 0)
            expect(result.isBottleneck).toBe(true)
            expect(result.rho).toBe(1)
        })

        it('sinaliza gargalo quando rho > 0.85 (zona de risco Lean)', () => {
            // lambda=9, mu=10 => rho=0.9 > 0.85
            const result = analyzeQueueMM1(9, 10)
            expect(result.rho).toBeCloseTo(0.9)
            expect(result.isBottleneck).toBe(true)
        })
    })

    // ─── 3. Monte Carlo ──────────────────────────────────────
    describe('monteCarloSimulation', () => {
        it('retorna o número correto de iterações', () => {
            const result = monteCarloSimulation(100, 10, 500)
            expect(result.length).toBe(500)
        })

        it('a média da simulação se aproxima da duração base (lei dos grandes números)', () => {
            const base = 100
            const result = monteCarloSimulation(base, 10, 2000)
            const mean = result.reduce((a: number, b: number) => a + b, 0) / result.length
            // Com 2000 iterações, a média deve estar a ≤5% da base
            expect(mean).toBeGreaterThan(base * 0.95)
            expect(mean).toBeLessThan(base * 1.05)
        })

        it('não produz resultados negativos', () => {
            const result = monteCarloSimulation(10, 200, 200) // alta variância
            expect(result.every((r: number) => r >= 0)).toBe(true)
        })

        it('usa 1000 iterações por padrão', () => {
            const result = monteCarloSimulation(50, 15)
            expect(result.length).toBe(1000)
        })
    })

    // ─── 4. Centro de Gravidade ───────────────────────────────
    describe('calculateGravityCenter', () => {
        it('calcula o centro de gravidade de pontos com pesos iguais', () => {
            const points = [
                { x: 0, y: 0, weight: 1 },
                { x: 6, y: 0, weight: 1 },
                { x: 0, y: 6, weight: 1 },
            ]
            const result = calculateGravityCenter(points)
            expect(result.x).toBeCloseTo(2)
            expect(result.y).toBeCloseTo(2)
        })

        it('pondera corretamente com pesos diferentes', () => {
            // Dois pontos A=[0,0] peso 1, B=[10,0] peso 4
            // Centro = (0*1 + 10*4) / (1+4) = 40/5 = 8 no eixo x
            const points = [
                { x: 0, y: 0, weight: 1 },
                { x: 10, y: 0, weight: 4 },
            ]
            const result = calculateGravityCenter(points)
            expect(result.x).toBeCloseTo(8)
            expect(result.y).toBeCloseTo(0)
        })

        it('retorna {0,0} se soma dos pesos for zero', () => {
            const result = calculateGravityCenter([])
            expect(result.x).toBe(0)
            expect(result.y).toBe(0)
        })
    })

    // ─── 5. Valor Monetário Esperado (VME/EMV) ───────────────
    describe('calculateEMV', () => {
        it('soma corretamente o VME de cenários positivos', () => {
            // Cenário A: 50% de ganhar R$100k = R$50k
            // Cenário B: 30% de ganhar R$200k = R$60k
            // Total = R$110k
            const result = calculateEMV([
                { probability: 0.5, impact: 100000 },
                { probability: 0.3, impact: 200000 },
            ])
            expect(result).toBeCloseTo(110000)
        })

        it('trata impactos negativos (riscos) corretamente', () => {
            // 40% de perder R$50k = R$-20k
            const result = calculateEMV([
                { probability: 0.4, impact: -50000 },
            ])
            expect(result).toBeCloseTo(-20000)
        })

        it('retorna 0 para lista vazia', () => {
            expect(calculateEMV([])).toBe(0)
        })

        it('combina ganhos e perdas em cenários mistos', () => {
            const result = calculateEMV([
                { probability: 0.6, impact: 100000 }, // +60k
                { probability: 0.4, impact: -25000 },  // -10k
            ])
            expect(result).toBeCloseTo(50000)
        })
    })
})
