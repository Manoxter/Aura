import { describe, it, expect } from 'vitest'
import { calcularIQ } from './math'

// ══════════════════════════════════════════════════════════════
// Story 5.6 — Testes unitários para calcularIQ()
// ══════════════════════════════════════════════════════════════

describe('calcularIQ(areaTA, areaTM)', () => {
    it('retorna 100 quando área_TA === área_TM (execução perfeita)', () => {
        expect(calcularIQ(0.5, 0.5)).toBe(100)
    })

    it('retorna 120 quando área_TA é 20% maior que área_TM', () => {
        expect(calcularIQ(0.6, 0.5)).toBeCloseTo(120, 5)
    })

    it('retorna 80 quando área_TA é 20% menor que área_TM', () => {
        expect(calcularIQ(0.4, 0.5)).toBeCloseTo(80, 5)
    })

    it('retorna null quando areaTM === 0 (TM não configurado — divisão por zero)', () => {
        expect(calcularIQ(0.5, 0)).toBeNull()
    })

    it('retorna null quando areaTM === 0 e areaTA também é zero', () => {
        expect(calcularIQ(0, 0)).toBeNull()
    })

    it('retorna 0 quando areaTA === 0 e areaTM > 0 (projeto colapsado)', () => {
        expect(calcularIQ(0, 0.5)).toBe(0)
    })

    it('retorna 200 quando área_TA é o dobro de área_TM (expansão máxima)', () => {
        expect(calcularIQ(1.0, 0.5)).toBeCloseTo(200, 5)
    })

    it('funciona com valores pequenos (precisão numérica)', () => {
        const result = calcularIQ(0.001, 0.001)
        expect(result).toBeCloseTo(100, 5)
    })
})
