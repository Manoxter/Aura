import { describe, it, expect } from 'vitest'
import {
    buildFeverPoint,
    buildFeverChart,
    FEVER_ZONES_DEFAULT,
} from './fever-chart'

describe('buildFeverPoint', () => {
    it('cria ponto com zona correta', () => {
        const point = buildFeverPoint('2026-04-01', 50, 20, { E: 1, P: 0.5, C: 0.5 })
        expect(point.zona).toBe('verde') // 20/50 = 0.4 <= 0.5
        expect(point.progresso_pct).toBe(50)
        expect(point.buffer_consumido_pct).toBe(20)
    })

    it('associa decision_id quando fornecido', () => {
        const point = buildFeverPoint('2026-04-01', 30, 40, { E: 1, P: 0.7, C: 0.3 }, 'D1')
        expect(point.decision_id).toBe('D1')
    })

    it('zona preto quando buffer >= 100%', () => {
        const point = buildFeverPoint('2026-04-01', 50, 100, { E: 1, P: 0.5, C: 0.5 })
        expect(point.zona).toBe('preto')
    })
})

describe('buildFeverChart', () => {
    it('constrói chart com trajetória', () => {
        const trajetoria = [
            buildFeverPoint('2026-04-01', 10, 5, { E: 1, P: 0.9, C: 0.1 }),
            buildFeverPoint('2026-04-08', 30, 15, { E: 1, P: 0.7, C: 0.3 }),
            buildFeverPoint('2026-04-15', 50, 30, { E: 1, P: 0.5, C: 0.5 }),
        ]
        const chart = buildFeverChart(trajetoria)

        expect(chart.trajetoria).toHaveLength(3)
        expect(chart.zona_atual).toBeTruthy()
        expect(chart.projecao).toBeNull() // sem projeção por default
        expect(chart.zonas).toEqual(FEVER_ZONES_DEFAULT)
    })

    it('zona verde para chart vazio', () => {
        const chart = buildFeverChart([])
        expect(chart.zona_atual).toBe('verde')
    })

    it('inclui projeção Monte Carlo quando solicitado', () => {
        const trajetoria = [
            buildFeverPoint('2026-04-01', 10, 5, { E: 1, P: 0.9, C: 0.1 }),
            buildFeverPoint('2026-04-08', 30, 15, { E: 1, P: 0.7, C: 0.3 }),
            buildFeverPoint('2026-04-15', 50, 30, { E: 1, P: 0.5, C: 0.5 }),
        ]
        const chart = buildFeverChart(trajetoria, true)

        expect(chart.projecao).not.toBeNull()
        expect(chart.projecao!.p50.length).toBeGreaterThan(0)
        expect(chart.projecao!.p80.length).toBeGreaterThan(0)
        expect(chart.projecao!.ic_lower.length).toBeGreaterThan(0)
        expect(chart.projecao!.ic_upper.length).toBeGreaterThan(0)
    })
})
