/**
 * mapper.test.ts — Story TEST-COVERAGE
 * Testa DimensionMapper: conversão coordenadas SVG ↔ métricas de projeto.
 */

import { describe, it, expect } from 'vitest'
import { DimensionMapper } from './mapper'

const PROJECT = { totalCost: 1_000_000, totalDuration: 365 }
const CANVAS = { width: 600, height: 400 }

describe('DimensionMapper', () => {
    describe('toProjectValues()', () => {
        it('ponto na origem → 0 dias, 0 custo', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            expect(m.toProjectValues({ x: 0, y: 0 })).toEqual({ dias: 0, custo: 0 })
        })

        it('ponto no canto superior direito → totalDuration dias, totalCost custo', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            const result = m.toProjectValues({ x: 600, y: 400 })
            expect(result.dias).toBe(365)
            expect(result.custo).toBe(1_000_000)
        })

        it('ponto no centro → metade do prazo e custo', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            const result = m.toProjectValues({ x: 300, y: 200 })
            expect(result.dias).toBe(Math.round(365 / 2))
            expect(result.custo).toBe(500_000)
        })

        it('clamp em 0 para coordenadas negativas', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            const result = m.toProjectValues({ x: -100, y: -50 })
            expect(result.dias).toBe(0)
            expect(result.custo).toBe(0)
        })

        it('arredonda para inteiro', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            // x = 1 → (1/600) * 365 = 0.608... → rounds to 1
            const result = m.toProjectValues({ x: 1, y: 0 })
            expect(Number.isInteger(result.dias)).toBe(true)
        })
    })

    describe('toCoordinate()', () => {
        it('0 dias, 0 custo → origem', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            expect(m.toCoordinate(0, 0)).toEqual({ x: 0, y: 0 })
        })

        it('totalDuration dias, totalCost custo → canvas máximo', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            expect(m.toCoordinate(365, 1_000_000)).toEqual({ x: 600, y: 400 })
        })

        it('metade do prazo e custo → centro do canvas', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            expect(m.toCoordinate(365 / 2, 500_000)).toEqual({ x: 300, y: 200 })
        })

        it('toProjectValues é inverso de toCoordinate (round-trip)', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            const original = { x: 240, y: 160 }
            const project = m.toProjectValues(original)
            const back = m.toCoordinate(project.dias, project.custo)
            // Tolerância de ±1 pixel por causa do arredondamento
            expect(Math.abs(back.x - original.x)).toBeLessThanOrEqual(1)
            expect(Math.abs(back.y - original.y)).toBeLessThanOrEqual(1)
        })
    })

    describe('formatCusto() [static]', () => {
        it('formata valor como BRL', () => {
            const result = DimensionMapper.formatCusto(1_500_000)
            expect(result).toContain('1')
            expect(result).toContain('500')
            // Contém símbolo de real ou "BRL"
            expect(result.includes('R$') || result.includes('BRL')).toBe(true)
        })

        it('formata zero corretamente', () => {
            const result = DimensionMapper.formatCusto(0)
            expect(result).toBeTruthy()
        })
    })

    describe('formatDias() [static]', () => {
        it('retorna "N dias"', () => {
            expect(DimensionMapper.formatDias(180)).toBe('180 dias')
        })

        it('retorna "0 dias" para zero', () => {
            expect(DimensionMapper.formatDias(0)).toBe('0 dias')
        })
    })

    describe('propriedades do construtor', () => {
        it('preserva project e canvas passados', () => {
            const m = new DimensionMapper(PROJECT, CANVAS)
            expect(m.project).toEqual(PROJECT)
            expect(m.canvas).toEqual(CANVAS)
        })
    })
})
