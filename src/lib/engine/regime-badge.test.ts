import { describe, it, expect } from 'vitest'
import { badgeRegimeObtuso, badgeConsumoReserva } from './regime-badge'
import type { ResultadoSC } from './clairaut'

// ══════════════════════════════════════════════════════════════
// Story 2.1 — badgeRegimeObtuso(): metadados do badge de regime
// ══════════════════════════════════════════════════════════════

const base: ResultadoSC = {
    tipo: 'agudo',
    alpha: 60,
    omega: 60,
    epsilon: 60,
    IR: 0,
    Ralpha: 0,
    Romega: 0,
}

describe('badgeRegimeObtuso()', () => {
    it('resultado null → badge inativo', () => {
        const b = badgeRegimeObtuso(null)
        expect(b.ativo).toBe(false)
        expect(b.tipo).toBeNull()
        expect(b.simbolo).toBe('')
        expect(b.pressao).toBeNull()
    })

    it('tipo agudo → badge inativo', () => {
        const b = badgeRegimeObtuso({ ...base, tipo: 'agudo' })
        expect(b.ativo).toBe(false)
        expect(b.tipo).toBeNull()
    })

    it('tipo singular → badge inativo (estado degenerado)', () => {
        const b = badgeRegimeObtuso({ ...base, tipo: 'singular' })
        expect(b.ativo).toBe(false)
        expect(b.tipo).toBeNull()
    })

    it('tipo obtuso_beta → badge ativo, pressão custo', () => {
        const b = badgeRegimeObtuso({ ...base, tipo: 'obtuso_beta' })
        expect(b.ativo).toBe(true)
        expect(b.tipo).toBe('beta')
        expect(b.simbolo).toBe('β')
        expect(b.label).toBe('Regime β')
        expect(b.pressao).toBe('custo')
    })

    it('tipo obtuso_gamma → badge ativo, pressão prazo', () => {
        const b = badgeRegimeObtuso({ ...base, tipo: 'obtuso_gamma' })
        expect(b.ativo).toBe(true)
        expect(b.tipo).toBe('gamma')
        expect(b.simbolo).toBe('γ')
        expect(b.label).toBe('Regime γ')
        expect(b.pressao).toBe('prazo')
    })
})

// ══════════════════════════════════════════════════════════════
// Story 2.3 — badgeConsumoReserva(): badge de consumo de reserva
// ══════════════════════════════════════════════════════════════

describe('badgeConsumoReserva()', () => {
    it('resultado null → badge inativo', () => {
        const b = badgeConsumoReserva(null)
        expect(b.ativo).toBe(false)
        expect(b.nivel).toBeNull()
    })

    it('Ralpha = 0 → badge inativo (sem pressão)', () => {
        const b = badgeConsumoReserva({ ...base, Ralpha: 0 })
        expect(b.ativo).toBe(false)
    })

    it('Ralpha = 0.2 → nivel baixo, label "Reserva parcial"', () => {
        const b = badgeConsumoReserva({ ...base, Ralpha: 0.2 })
        expect(b.ativo).toBe(true)
        expect(b.nivel).toBe('baixo')
        expect(b.label).toBe('Reserva parcial')
    })

    it('Ralpha = 0.5 → nivel moderado, label "Consumindo reserva"', () => {
        const b = badgeConsumoReserva({ ...base, Ralpha: 0.5 })
        expect(b.ativo).toBe(true)
        expect(b.nivel).toBe('moderado')
        expect(b.label).toBe('Consumindo reserva')
    })

    it('Ralpha = 0.9 → nivel critico, label "Reserva crítica"', () => {
        const b = badgeConsumoReserva({ ...base, Ralpha: 0.9 })
        expect(b.ativo).toBe(true)
        expect(b.nivel).toBe('critico')
        expect(b.label).toBe('Reserva crítica')
    })
})
