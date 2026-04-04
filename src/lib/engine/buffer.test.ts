import { describe, it, expect } from 'vitest'
import {
    calcularBufferRSS,
    calcularProjectBuffer,
    calcularCostBuffer,
    calcularFeedingBuffers,
    truncarBufferCEt,
    calcularConsumoBuffer,
    determinarFeverZone,
    calcularBuffers,
} from './buffer'
import type { TarefaCCPM } from './ccpm'

function makeTarefa(overrides: Partial<TarefaCCPM> & { id: string }): TarefaCCPM {
    return {
        nome: overrides.id,
        duracao_estimada: 5,
        duracao_otimista: 5,
        duracao_segura: 10,
        custo_otimista: 500,
        custo_seguro: 1000,
        dependencias: [],
        es: 0, ef: 5, ls: 0, lf: 5, folga: 0, critica: true,
        recurso_id: null,
        recurso_nome: null,
        ...overrides,
    }
}

// ─── RSS ────────────────────────────────────────────────────────────────

describe('calcularBufferRSS', () => {
    it('retorna 0 para array vazio', () => {
        expect(calcularBufferRSS([])).toBe(0)
    })

    it('calcula sqrt(sum(si²)) — D2', () => {
        // sqrt(3² + 4²) = sqrt(25) = 5
        expect(calcularBufferRSS([3, 4])).toBe(5)
    })

    it('arredonda para cima', () => {
        // sqrt(2² + 3²) = sqrt(13) ≈ 3.6 → ceil = 4
        expect(calcularBufferRSS([2, 3])).toBe(4)
    })

    it('lida com gordura única', () => {
        expect(calcularBufferRSS([7])).toBe(7)
    })
})

// ─── Project Buffer ─────────────────────────────────────────────────────

describe('calcularProjectBuffer', () => {
    it('calcula PB a partir de tarefas da cadeia', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', duracao_segura: 10, duracao_otimista: 5 }), // gordura 5
            makeTarefa({ id: 'B', duracao_segura: 8, duracao_otimista: 4 }),  // gordura 4
        ]
        const pb = calcularProjectBuffer(tarefas)
        // sqrt(5² + 4²) = sqrt(41) ≈ 6.4 → ceil = 7
        expect(pb.tamanho).toBe(7)
        expect(pb.gorduras).toEqual([5, 4])
        expect(pb.consumido_pct).toBe(0)
    })
})

// ─── Cost Buffer ────────────────────────────────────────────────────────

describe('calcularCostBuffer', () => {
    it('calcula CB com RSS — D6', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', custo_seguro: 1000, custo_otimista: 700 }), // 300
            makeTarefa({ id: 'B', custo_seguro: 500, custo_otimista: 100 }),  // 400
        ]
        const cb = calcularCostBuffer(tarefas)
        // sqrt(300² + 400²) = sqrt(250000) = 500
        expect(cb.tamanho).toBe(500)
    })
})

// ─── Feeding Buffers ────────────────────────────────────────────────────

describe('calcularFeedingBuffers', () => {
    it('calcula feeding buffer para caminho não-crítico', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'NC1', duracao_segura: 6, duracao_otimista: 3, dependencias: [], es: 0, ef: 3 }),
            makeTarefa({ id: 'CC1', duracao_segura: 10, duracao_otimista: 5, dependencias: ['NC1'], es: 3, ef: 8 }),
        ]
        const fbs = calcularFeedingBuffers(tarefas, ['CC1'])
        expect(fbs).toHaveLength(1)
        expect(fbs[0].tarefa_juncao).toBe('CC1')
        expect(fbs[0].caminho).toEqual(['NC1'])
    })

    it('retorna vazio quando todas predecessoras são cadeia crítica', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', dependencias: [] }),
            makeTarefa({ id: 'B', dependencias: ['A'] }),
        ]
        const fbs = calcularFeedingBuffers(tarefas, ['A', 'B'])
        expect(fbs).toHaveLength(0)
    })
})

// ─── D14: Truncamento CEt ───────────────────────────────────────────────

describe('truncarBufferCEt', () => {
    it('trunca buffer quando excede 25% do baseline', () => {
        // baseline=100, limite 1.25 → margem máx = 25
        expect(truncarBufferCEt(30, 100)).toBe(25)
    })

    it('mantém buffer quando dentro do limite', () => {
        expect(truncarBufferCEt(20, 100)).toBe(20)
    })

    it('retorna buffer original para baseline 0', () => {
        expect(truncarBufferCEt(10, 0)).toBe(10)
    })
})

// ─── Consumo de Buffer ──────────────────────────────────────────────────

describe('calcularConsumoBuffer', () => {
    it('retorna 0% quando sem atraso', () => {
        expect(calcularConsumoBuffer(0, 10)).toBe(0)
    })

    it('retorna 50% quando metade consumida', () => {
        expect(calcularConsumoBuffer(5, 10)).toBe(50)
    })

    it('retorna 100% quando buffer esgotado', () => {
        expect(calcularConsumoBuffer(10, 10)).toBe(100)
    })

    it('retorna > 100% quando excede buffer', () => {
        expect(calcularConsumoBuffer(15, 10)).toBe(150)
    })

    it('retorna 100% para buffer 0 com atraso', () => {
        expect(calcularConsumoBuffer(5, 0)).toBe(100)
    })
})

// ─── Fever Chart Zones (D10, D29) ───────────────────────────────────────

describe('determinarFeverZone', () => {
    it('PRETO quando buffer >= 100% consumido', () => {
        expect(determinarFeverZone(100, 50)).toBe('preto')
        expect(determinarFeverZone(150, 80)).toBe('preto')
    })

    it('VERDE quando consumo/progresso <= 0.5', () => {
        expect(determinarFeverZone(25, 50)).toBe('verde')
    })

    it('AMARELO quando consumo/progresso entre 0.5 e 1.0', () => {
        expect(determinarFeverZone(40, 50)).toBe('amarelo')
    })

    it('VERMELHO quando consumo/progresso > 1.0', () => {
        expect(determinarFeverZone(60, 30)).toBe('vermelho')
    })

    it('usa consumido_pct diretamente quando progresso = 0', () => {
        expect(determinarFeverZone(10, 0)).toBe('vermelho')
    })
})

// ─── Pipeline Completo ──────────────────────────────────────────────────

describe('calcularBuffers', () => {
    it('retorna PB, CB e FBs completos', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', duracao_segura: 10, duracao_otimista: 5, custo_seguro: 1000, custo_otimista: 500, dependencias: [] }),
            makeTarefa({ id: 'B', duracao_segura: 8, duracao_otimista: 4, custo_seguro: 800, custo_otimista: 400, dependencias: ['A'] }),
        ]
        const result = calcularBuffers(tarefas, ['A', 'B'], 20, 5000)

        expect(result.project_buffer.tamanho).toBeGreaterThan(0)
        expect(result.cost_buffer.tamanho).toBeGreaterThan(0)
        expect(result.feeding_buffers).toHaveLength(0) // todas são cadeia crítica
    })
})
