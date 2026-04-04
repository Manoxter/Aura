import { describe, it, expect } from 'vitest'
import {
    aplicarDecisao,
    replayDecisoes,
    criarEstadoInicial,
    calcularCustoAcumuladoEVM,
    calcularEVM,
    calcularCEtHierarquica,
    type Decision,
} from './decision'

function makeDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        id: 'D1',
        timestamp: '2026-04-01T12:00:00Z',
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

// ─── D21: Pipeline 3 Camadas ────────────────────────────────────────────

describe('aplicarDecisao', () => {
    it('aplica delta_prazo na camada 1', () => {
        const estado = criarEstadoInicial()
        const decision = makeDecision({ delta_prazo: 5 })
        const { estado: novo } = aplicarDecisao(estado, decision)
        expect(novo.prazo_acumulado).toBe(5)
        expect(novo.n_decisoes).toBe(1)
    })

    it('aplica delta_custo na camada 2', () => {
        const estado = criarEstadoInicial()
        const decision = makeDecision({ delta_custo: 10000 })
        const { estado: novo } = aplicarDecisao(estado, decision)
        expect(novo.custo_acumulado).toBe(10000)
    })

    it('aplica delta_escopo na camada 3', () => {
        const estado = criarEstadoInicial()
        const decision = makeDecision({ delta_escopo: -2 })
        const { estado: novo } = aplicarDecisao(estado, decision)
        expect(novo.escopo_delta).toBe(-2)
    })

    it('perfura as 3 camadas simultaneamente', () => {
        const estado = criarEstadoInicial()
        const decision = makeDecision({ delta_prazo: 3, delta_custo: 5000, delta_escopo: -1 })
        const { estado: novo, requer_recalculo_cdt, requer_recalculo_fever } = aplicarDecisao(estado, decision)

        expect(novo.prazo_acumulado).toBe(3)
        expect(novo.custo_acumulado).toBe(5000)
        expect(novo.escopo_delta).toBe(-1)
        expect(requer_recalculo_cdt).toBe(true)
        expect(requer_recalculo_fever).toBe(true)
    })

    it('atualiza desvio_integrado (D32: badge)', () => {
        const estado = criarEstadoInicial()
        const d = makeDecision({ delta_prazo: -3, delta_custo: 5000 })
        const { estado: novo } = aplicarDecisao(estado, d)
        expect(novo.desvio_integrado).toBe(5003) // |−3| + |5000|
    })
})

// ─── Replay ─────────────────────────────────────────────────────────────

describe('replayDecisoes', () => {
    it('acumula múltiplas decisões', () => {
        const decisoes: Decision[] = [
            makeDecision({ id: 'D1', delta_prazo: 2, delta_custo: 1000 }),
            makeDecision({ id: 'D2', delta_prazo: 3, delta_custo: 2000 }),
            makeDecision({ id: 'D3', delta_prazo: -1, delta_custo: 500, delta_escopo: -1 }),
        ]
        const estado = replayDecisoes(decisoes)
        expect(estado.prazo_acumulado).toBe(4) // 2+3-1
        expect(estado.custo_acumulado).toBe(3500) // 1000+2000+500
        expect(estado.escopo_delta).toBe(-1)
        expect(estado.n_decisoes).toBe(3)
    })

    it('retorna estado inicial para lista vazia', () => {
        const estado = replayDecisoes([])
        expect(estado).toEqual(criarEstadoInicial())
    })
})

// ─── D11: Custo Acumulado EVM ───────────────────────────────────────────

describe('calcularCustoAcumuladoEVM', () => {
    it('acumula custos progressivamente (crescente)', () => {
        expect(calcularCustoAcumuladoEVM([100, 200, 300])).toEqual([100, 300, 600])
    })

    it('retorna array vazio para entrada vazia', () => {
        expect(calcularCustoAcumuladoEVM([])).toEqual([])
    })

    it('lida com valor único', () => {
        expect(calcularCustoAcumuladoEVM([500])).toEqual([500])
    })
})

// ─── EVM Básico ─────────────────────────────────────────────────────────

describe('calcularEVM', () => {
    it('calcula SPI e CPI para projeto em dia e no budget', () => {
        const evm = calcularEVM(1000, 1000, 1000)
        expect(evm.spi).toBe(1)
        expect(evm.cpi).toBe(1)
        expect(evm.sv).toBe(0)
        expect(evm.cv).toBe(0)
    })

    it('SPI > 1 quando adiantado', () => {
        const evm = calcularEVM(1000, 1200, 1000)
        expect(evm.spi).toBe(1.2)
        expect(evm.sv).toBe(200)
    })

    it('CPI < 1 quando acima do orçamento', () => {
        const evm = calcularEVM(1000, 1000, 1500)
        expect(evm.cpi).toBeCloseTo(0.667, 2)
        expect(evm.cv).toBe(-500)
    })

    it('retorna 0 para PV ou AC zero', () => {
        expect(calcularEVM(0, 100, 100).spi).toBe(0)
        expect(calcularEVM(100, 100, 0).cpi).toBe(0)
    })
})

// ─── B5: CEt Hierárquica (D13, D14, D15) ───────────────────────────────

describe('calcularCEtHierarquica', () => {
    it('valida triângulo total válido', () => {
        const result = calcularCEtHierarquica([1, 1.2, 0.9], [], 10)
        expect(result.cet_total).toBe(true)
    })

    it('detecta CEt total violada (triângulo degenerado)', () => {
        const result = calcularCEtHierarquica([0.1, 0.1, 5], [], 10)
        expect(result.cet_total).toBe(false)
    })

    it('valida CEt por sprint', () => {
        const sprints: [number, number, number][] = [
            [1, 1, 1],       // válido
            [0.1, 0.1, 5],   // inválido
        ]
        const result = calcularCEtHierarquica([1, 1, 1], sprints, 10)
        expect(result.cet_sprints).toEqual([true, false])
    })

    it('D14: buffer > 25% é inválido', () => {
        const result = calcularCEtHierarquica([1, 1, 1], [], 30) // 30% > 25%
        expect(result.buffer_valido).toBe(false)
    })

    it('D14: buffer <= 25% é válido', () => {
        const result = calcularCEtHierarquica([1, 1, 1], [], 20) // 20% <= 25%
        expect(result.buffer_valido).toBe(true)
    })

    it('D15: CEt total falha → buffer_valido = false', () => {
        const result = calcularCEtHierarquica([0.1, 0.1, 5], [], 10)
        expect(result.buffer_valido).toBe(false)
    })
})
