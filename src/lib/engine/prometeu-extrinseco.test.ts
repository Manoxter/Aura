import { describe, it, expect } from 'vitest'
import { calcularScoreRC, classificarScoreRC } from './prometeu-extrinseco'

// ══════════════════════════════════════════════════════════════
// Story 13.5 — calcularScoreRC() + classificarScoreRC()
// Fórmula: RC = 0.3·P + 0.3·I + 0.4·(P×I)
// ══════════════════════════════════════════════════════════════

describe('calcularScoreRC()', () => {
    it('score mínimo (P=0, I=0) → 0', () => {
        expect(calcularScoreRC(0, 0)).toBe(0)
    })

    it('score máximo (P=1, I=1) → 1 (0.3+0.3+0.4=1)', () => {
        expect(calcularScoreRC(1, 1)).toBe(1)
    })

    it('boundary 0.3: P=0.5, I=0.5 → 0.3+0.1=0.4 — acima de verde', () => {
        // RC = 0.3*0.5 + 0.3*0.5 + 0.4*0.25 = 0.15 + 0.15 + 0.10 = 0.40
        expect(calcularScoreRC(0.5, 0.5)).toBe(0.4)
    })

    it('valor inválido: probabilidade > 1 → lança erro', () => {
        expect(() => calcularScoreRC(1.1, 0.5)).toThrow('probabilidade deve estar em [0, 1]')
    })

    it('valor inválido: impacto negativo → lança erro', () => {
        expect(() => calcularScoreRC(0.5, -0.1)).toThrow('impacto deve estar em [0, 1]')
    })
})

describe('classificarScoreRC()', () => {
    it('score 0 → verde', () => {
        expect(classificarScoreRC(0)).toBe('verde')
    })

    it('score 0.29 → verde', () => {
        expect(classificarScoreRC(0.29)).toBe('verde')
    })

    it('score 0.3 → amarelo (boundary inclusivo)', () => {
        expect(classificarScoreRC(0.3)).toBe('amarelo')
    })

    it('score 0.6 → amarelo (boundary inclusivo)', () => {
        expect(classificarScoreRC(0.6)).toBe('amarelo')
    })

    it('score 0.61 → vermelho', () => {
        expect(classificarScoreRC(0.61)).toBe('vermelho')
    })

    it('score 1 → vermelho', () => {
        expect(classificarScoreRC(1)).toBe('vermelho')
    })
})
