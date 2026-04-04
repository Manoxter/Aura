import { describe, it, expect } from 'vitest'
import {
    calcularDesvioAcumulado,
    buildFuncaoPrazoSetup,
    buildFuncaoCustoSetup,
    buildDecisionChips,
    buildSanfona,
    type FuncaoPonto,
} from './sanfona'
import type { Decision } from './decision'

function makeDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'D1',
        timestamp: '2026-04-05T12:00:00Z',
        tipo: 'aporte',
        descricao: 'Teste',
        delta_prazo: 0,
        delta_custo: 0,
        delta_escopo: 0,
        tarefa_id: null,
        sprint_id: null,
        zona_fever: null,
        ...overrides,
    }
}

describe('buildFuncaoPrazoSetup', () => {
    it('gera função decrescente de prazo_total até 0', () => {
        const pontos = buildFuncaoPrazoSetup(100, 10)
        expect(pontos).toHaveLength(11) // 0 a 10 inclusive
        expect(pontos[0].valor).toBe(100) // início: prazo total restante
        expect(pontos[10].valor).toBeCloseTo(0) // fim: 0 restante
    })
})

describe('buildFuncaoCustoSetup', () => {
    it('gera função crescente de 0 até orcamento (EVM Tech)', () => {
        const pontos = buildFuncaoCustoSetup(500000, 100, 10)
        expect(pontos[0].valor).toBeCloseTo(0)
        expect(pontos[10].valor).toBeCloseTo(500000)
    })
})

describe('calcularDesvioAcumulado', () => {
    it('retorna 0 quando setup === dashboard', () => {
        const setup: FuncaoPonto[] = [
            { t: 0, valor: 100 },
            { t: 50, valor: 50 },
            { t: 100, valor: 0 },
        ]
        const desvio = calcularDesvioAcumulado(setup, setup)
        expect(desvio).toBeCloseTo(0, 0)
    })

    it('retorna valor positivo quando dashboard diverge', () => {
        const setup: FuncaoPonto[] = [
            { t: 0, valor: 100 },
            { t: 100, valor: 0 },
        ]
        const dashboard: FuncaoPonto[] = [
            { t: 0, valor: 100 },
            { t: 100, valor: 20 }, // 20 a mais
        ]
        const desvio = calcularDesvioAcumulado(setup, dashboard)
        expect(desvio).toBeGreaterThan(0)
    })

    it('retorna 0 para arrays curtos', () => {
        expect(calcularDesvioAcumulado([{ t: 0, valor: 100 }], [{ t: 0, valor: 100 }])).toBe(0)
    })
})

describe('buildDecisionChips', () => {
    it('converte decisões em chips com t relativo', () => {
        const decisoes = [
            makeDecision({ id: 'D1', timestamp: '2026-04-05T12:00:00Z', delta_prazo: 3, delta_custo: 1000 }),
        ]
        const chips = buildDecisionChips(decisoes, '2026-04-01T00:00:00Z')
        expect(chips).toHaveLength(1)
        expect(chips[0].t).toBeCloseTo(4.5, 0) // ~4.5 dias depois
        expect(chips[0].delta_prazo).toBe(3)
    })
})

describe('buildSanfona', () => {
    it('constrói sanfona completa sem decisões', () => {
        const sanfona = buildSanfona(100, 500000, [], '2026-04-01')

        expect(sanfona.prazo.setup.length).toBeGreaterThan(0)
        expect(sanfona.custo.setup.length).toBeGreaterThan(0)
        expect(sanfona.prazo.desvio_acumulado).toBeCloseTo(0, 0)
        expect(sanfona.custo.desvio_acumulado).toBeCloseTo(0, 0)
        expect(sanfona.decisoes).toHaveLength(0)
        expect(sanfona.badge_desvio).toBeCloseTo(0, 0)
    })

    it('decisão desloca dashboard e aumenta desvio', () => {
        const decisoes = [
            makeDecision({ timestamp: '2026-04-15T12:00:00Z', delta_prazo: 10 }),
        ]
        const sanfona = buildSanfona(100, 500000, decisoes, '2026-04-01')

        expect(sanfona.prazo.desvio_acumulado).toBeGreaterThan(0)
        expect(sanfona.badge_desvio).toBeGreaterThan(0)
    })
})
