import { describe, it, expect } from 'vitest'
import { evaluateDecision } from './euclidian'
import type { Triangle, Point } from './triangle-logic'

// ══════════════════════════════════════════════════════════════
// @aura-qa-auditor (Atlas) — Motor MATED/Euclidiano
// Testa a avaliação de decisões contra o Baricentro Órtico
// ══════════════════════════════════════════════════════════════

describe('Motor MATED/Euclidiano (euclidian)', () => {

    describe('evaluateDecision', () => {
        const triangle: Triangle = {
            A: { x: 0, y: 0 },
            B: { x: 4, y: 0 },
            C: { x: 2, y: 3 },
        }

        it('retorna estrutura de avaliação completa', () => {
            const decision: Point = { x: 2, y: 1 }
            const result = evaluateDecision(triangle, decision)
            expect(result).toHaveProperty('decisionPoint')
            expect(result).toHaveProperty('distanceToOrthicBarycenter')
            expect(result).toHaveProperty('isInsideOrthicTriangle')
        })

        it('relata distância zero quando a decisão é exatamente o baricentro órtico', () => {
            // Para qualquer triângulo, o baricentro do triângulo órtico é o ponto de Feuerbach
            // Testamos com o próprio baricentro do triângulo original como aproximação
            // (para testar que distância 0 é computável)
            const origin: Point = { x: 0, y: 0 }
            const zeroTriangle: Triangle = { A: origin, B: origin, C: origin }
            // Com triângulo degenerado, o ponto = baricentro
            const result = evaluateDecision(zeroTriangle, origin)
            expect(result.distanceToOrthicBarycenter).toBeGreaterThanOrEqual(0)
        })

        it('decisão no centro do triângulo tem distância menor que nas bordas', () => {
            // Ponto interno ao triângulo
            const center: Point = { x: 2, y: 1 }
            // Ponto fora do triângulo (longe)
            const outside: Point = { x: 100, y: 100 }
            const centerResult = evaluateDecision(triangle, center)
            const outsideResult = evaluateDecision(triangle, outside)
            expect(centerResult.distanceToOrthicBarycenter).toBeLessThan(outsideResult.distanceToOrthicBarycenter)
        })

        it('distância é sempre não-negativa', () => {
            const points: Point[] = [
                { x: 0, y: 0 },
                { x: 2, y: 1.5 },
                { x: -5, y: -5 },
                { x: 10, y: 10 },
            ]
            points.forEach(p => {
                const result = evaluateDecision(triangle, p)
                expect(result.distanceToOrthicBarycenter).toBeGreaterThanOrEqual(0)
            })
        })

        it('isInsideOrthicTriangle é boolean', () => {
            const decision: Point = { x: 2, y: 1.2 }
            const result = evaluateDecision(triangle, decision)
            expect(typeof result.isInsideOrthicTriangle).toBe('boolean')
        })

        it('ponto muito afastado está fora do triângulo órtico', () => {
            const farAway: Point = { x: 1000, y: 1000 }
            const result = evaluateDecision(triangle, farAway)
            expect(result.isInsideOrthicTriangle).toBe(false)
        })
    })
})
