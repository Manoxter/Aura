import { describe, it, expect } from 'vitest'
import {
    calcularFormulaN,
    calcularCarga,
    detectarSobrecarga,
    type Contributor,
    type Alocacao,
} from './contributor'

// ─── D19: Fórmula N ────────────────────────────────────────────────────

describe('calcularFormulaN', () => {
    it('calcula N para tarefas simples', () => {
        const tarefas = [
            { duracao_minutos: 480, n_recursos_atuais: 1 }, // 8h × 1
            { duracao_minutos: 240, n_recursos_atuais: 2 }, // 4h × 2
        ]
        // Total = (480×1 + 240×2) / 60 = 16h
        // N = 16 / (8 × 5) = 0.4 → ceil = 1
        const result = calcularFormulaN(tarefas, 8, 5)
        expect(result.n_extra).toBe(1)
        expect(result.horas_totais).toBe(16)
        expect(result.fator_brooks).toBe(1.0) // N < 2
    })

    it('aplica fator Brooks 1.2 quando N >= 2', () => {
        const tarefas = [
            { duracao_minutos: 4800, n_recursos_atuais: 2 }, // 80h × 2
        ]
        // Total = 160h, N = 160 / (8×5) = 4 → Brooks 1.2 → 4.8 → ceil = 5
        const result = calcularFormulaN(tarefas, 8, 5)
        expect(result.fator_brooks).toBe(1.2)
        expect(result.n_extra).toBe(5)
    })

    it('retorna 0 para Te ou DTE zero', () => {
        const result = calcularFormulaN([{ duracao_minutos: 480, n_recursos_atuais: 1 }], 0, 5)
        expect(result.n_extra).toBe(0)
    })
})

// ─── Carga de Trabalho ──────────────────────────────────────────────────

describe('calcularCarga', () => {
    const dev: Contributor = {
        id: 'dev1',
        nome: 'Ana',
        especialidade: 'frontend',
        horas_dia: 8,
        fator_produtividade: 1.0,
    }

    it('calcula carga normal sem sobrecarga', () => {
        const alocacoes: Alocacao[] = [
            { tarefa_id: 'T1', contributor_id: 'dev1', dedicacao_pct: 50 },
        ]
        const carga = calcularCarga(dev, alocacoes, 10)
        expect(carga.horas_disponiveis).toBe(80) // 8h × 10 dias
        expect(carga.horas_alocadas).toBe(40) // 50% de 8h × 10 dias
        expect(carga.sobrecarregado).toBe(false)
    })

    it('detecta sobrecarga com múltiplas alocações', () => {
        const alocacoes: Alocacao[] = [
            { tarefa_id: 'T1', contributor_id: 'dev1', dedicacao_pct: 80 },
            { tarefa_id: 'T2', contributor_id: 'dev1', dedicacao_pct: 50 },
        ]
        const carga = calcularCarga(dev, alocacoes, 10)
        expect(carga.sobrecarregado).toBe(true) // 130% > 100%
    })

    it('aplica fator de produtividade', () => {
        const junior: Contributor = { ...dev, fator_produtividade: 0.8 }
        const carga = calcularCarga(junior, [], 10)
        expect(carga.horas_disponiveis).toBe(64) // 8h × 10 × 0.8
    })
})

// ─── Detecção de Sobrecarga ─────────────────────────────────────────────

describe('detectarSobrecarga', () => {
    it('retorna vazio quando nenhum contributor sobrecarregado', () => {
        const contributors: Contributor[] = [
            { id: 'dev1', nome: 'Ana', especialidade: 'fe', horas_dia: 8, fator_produtividade: 1.0 },
        ]
        const alocacoes: Alocacao[] = [
            { tarefa_id: 'T1', contributor_id: 'dev1', dedicacao_pct: 50 },
        ]
        expect(detectarSobrecarga(contributors, alocacoes, 10)).toHaveLength(0)
    })

    it('detecta contributors sobrecarregados', () => {
        const contributors: Contributor[] = [
            { id: 'dev1', nome: 'Ana', especialidade: 'fe', horas_dia: 8, fator_produtividade: 1.0 },
            { id: 'dev2', nome: 'Bob', especialidade: 'be', horas_dia: 8, fator_produtividade: 1.0 },
        ]
        const alocacoes: Alocacao[] = [
            { tarefa_id: 'T1', contributor_id: 'dev1', dedicacao_pct: 100 },
            { tarefa_id: 'T2', contributor_id: 'dev1', dedicacao_pct: 50 },  // dev1 = 150%
            { tarefa_id: 'T3', contributor_id: 'dev2', dedicacao_pct: 80 },  // dev2 OK
        ]
        const sobrecarga = detectarSobrecarga(contributors, alocacoes, 10)
        expect(sobrecarga).toHaveLength(1)
        expect(sobrecarga[0].contributor_id).toBe('dev1')
        expect(sobrecarga[0].excesso_pct).toBe(50) // 50% acima
    })
})
