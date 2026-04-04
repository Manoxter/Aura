import { describe, it, expect } from 'vitest'
import {
    cortarEstimativa,
    cortarCusto,
    detectarConflitosRecurso,
    nivelarRecursos,
    identificarCadeiaCritica,
    calculateCCPM,
    precisaEscalacao,
    type TarefaCCPM,
} from './ccpm'

// ─── Helper ─────────────────────────────────────────────────────────────

function makeTarefa(overrides: Partial<TarefaCCPM> & { id: string }): TarefaCCPM {
    return {
        nome: overrides.id,
        duracao_estimada: 10,
        duracao_otimista: 5,
        duracao_segura: 10,
        custo_otimista: 500,
        custo_seguro: 1000,
        dependencias: [],
        es: 0, ef: 10, ls: 0, lf: 10, folga: 0, critica: true,
        recurso_id: null,
        recurso_nome: null,
        ...overrides,
    }
}

// ─── D1: Corte de Estimativa ────────────────────────────────────────────

describe('cortarEstimativa', () => {
    it('corta 50% por default (Goldratt)', () => {
        expect(cortarEstimativa(10)).toBe(5)
    })

    it('arredonda para cima', () => {
        expect(cortarEstimativa(7)).toBe(4) // ceil(3.5)
    })

    it('retorna mínimo 1 para duração <= 0', () => {
        expect(cortarEstimativa(0)).toBe(1)
        expect(cortarEstimativa(-5)).toBe(1)
    })

    it('aceita fator de corte customizado', () => {
        expect(cortarEstimativa(10, 0.7)).toBe(7)
    })

    it('duração 1 com fator 0.5 → mínimo 1', () => {
        expect(cortarEstimativa(1, 0.5)).toBe(1)
    })
})

describe('cortarCusto', () => {
    it('corta custo na proporção da duração', () => {
        expect(cortarCusto(1000, 10, 5)).toBe(500)
    })

    it('retorna 0 para custo zero', () => {
        expect(cortarCusto(0, 10, 5)).toBe(0)
    })

    it('retorna 0 para duração zero', () => {
        expect(cortarCusto(1000, 0, 5)).toBe(0)
    })
})

// ─── Conflito de Recurso ────────────────────────────────────────────────

describe('detectarConflitosRecurso', () => {
    it('detecta overlap temporal no mesmo recurso', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 10, recurso_id: 'R1' }),
            makeTarefa({ id: 'B', es: 5, ef: 15, recurso_id: 'R1' }),
        ]
        const conflitos = detectarConflitosRecurso(tarefas)
        expect(conflitos).toHaveLength(1)
        expect(conflitos[0].overlap_inicio).toBe(5)
        expect(conflitos[0].overlap_fim).toBe(10)
    })

    it('não detecta conflito sem overlap', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 10, recurso_id: 'R1' }),
            makeTarefa({ id: 'B', es: 10, ef: 20, recurso_id: 'R1' }),
        ]
        expect(detectarConflitosRecurso(tarefas)).toHaveLength(0)
    })

    it('não detecta conflito entre recursos diferentes', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 10, recurso_id: 'R1' }),
            makeTarefa({ id: 'B', es: 0, ef: 10, recurso_id: 'R2' }),
        ]
        expect(detectarConflitosRecurso(tarefas)).toHaveLength(0)
    })

    it('ignora tarefas sem recurso', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 10, recurso_id: null }),
            makeTarefa({ id: 'B', es: 0, ef: 10, recurso_id: null }),
        ]
        expect(detectarConflitosRecurso(tarefas)).toHaveLength(0)
    })
})

// ─── Nivelamento ────────────────────────────────────────────────────────

describe('nivelarRecursos', () => {
    it('resolve conflito atrasando tarefa com maior folga', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 10, ls: 0, lf: 10, folga: 0, recurso_id: 'R1' }),
            makeTarefa({ id: 'B', es: 0, ef: 10, ls: 5, lf: 15, folga: 5, recurso_id: 'R1' }),
        ]
        const niveladas = nivelarRecursos(tarefas)
        const b = niveladas.find(t => t.id === 'B')!
        expect(b.es).toBe(10) // Atrasada para após A
    })
})

// ─── Cadeia Crítica ─────────────────────────────────────────────────────

describe('identificarCadeiaCritica', () => {
    it('retorna array vazio para lista vazia', () => {
        expect(identificarCadeiaCritica([])).toEqual([])
    })

    it('identifica cadeia simples linear', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', es: 0, ef: 5, duracao_estimada: 5, dependencias: [] }),
            makeTarefa({ id: 'B', es: 5, ef: 10, duracao_estimada: 5, dependencias: ['A'] }),
            makeTarefa({ id: 'C', es: 10, ef: 15, duracao_estimada: 5, dependencias: ['B'] }),
        ]
        const cadeia = identificarCadeiaCritica(tarefas)
        expect(cadeia).toEqual(['A', 'B', 'C'])
    })
})

// ─── Pipeline CCPM ──────────────────────────────────────────────────────

describe('calculateCCPM', () => {
    it('retorna resultado vazio para lista vazia', () => {
        const result = calculateCCPM([])
        expect(result.tarefas).toHaveLength(0)
        expect(result.cadeia_critica).toHaveLength(0)
        expect(result.gordura_total).toBe(0)
    })

    it('corta estimativas e calcula gordura total', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', duracao_segura: 10, custo_seguro: 1000, dependencias: [] }),
            makeTarefa({ id: 'B', duracao_segura: 8, custo_seguro: 800, dependencias: ['A'] }),
        ]
        const result = calculateCCPM(tarefas, 0.5)
        // A: 10→5 (gordura 5), B: 8→4 (gordura 4)
        expect(result.gordura_total).toBe(9)
        expect(result.tarefas[0]?.duracao_estimada).toBeLessThan(10)
    })

    it('detecta conflitos de recurso', () => {
        const tarefas: TarefaCCPM[] = [
            makeTarefa({ id: 'A', duracao_segura: 10, custo_seguro: 1000, dependencias: [], recurso_id: 'R1' }),
            makeTarefa({ id: 'B', duracao_segura: 10, custo_seguro: 1000, dependencias: [], recurso_id: 'R1' }),
        ]
        const result = calculateCCPM(tarefas)
        expect(result.conflitos.length).toBeGreaterThan(0)
    })
})

// ─── D4: Temporizador 48h ───────────────────────────────────────────────

describe('precisaEscalacao', () => {
    it('retorna true quando tarefa excede 48h', () => {
        const inicio = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
        expect(precisaEscalacao(inicio)).toBe(true)
    })

    it('retorna false quando tarefa está dentro de 48h', () => {
        const inicio = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        expect(precisaEscalacao(inicio)).toBe(false)
    })

    it('retorna false para data inválida', () => {
        expect(precisaEscalacao('invalid')).toBe(false)
    })

    it('aceita limite customizado', () => {
        const inicio = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
        expect(precisaEscalacao(inicio, Date.now(), 24)).toBe(true)
    })
})
