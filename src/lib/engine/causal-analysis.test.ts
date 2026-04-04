import { describe, it, expect } from 'vitest'
import { decompMATEDCausal, topCausas } from './causal-analysis'
import type { TarefaData } from './cpm'

// ═══════════════════════════════════════════════════════════════════════════
// causal-analysis.test.ts — Story 5.8
// Big Dig fixture com 3 tarefas críticas → ranking esperado
// ═══════════════════════════════════════════════════════════════════════════

/** Helper para criar TarefaData mínima */
function tarefa(id: string, nome: string, duracao: number, critica = true): TarefaData {
    return { id, nome, duracao_estimada: duracao, dependencias: [], es: 0, ef: duracao, ls: 0, lf: duracao, folga: 0, critica }
}

// Big Dig: TA bem desviado do TM (prazo dominante)
const TA_BIG_DIG = { escopo: 1.0, prazo: 2.67, orcamento: 5.62, mated_distancia: 1.45 }
const TM_IDEAL = { escopo: 1.0, prazo: 1.0, orcamento: 1.0 }

const TAREFAS_BIG_DIG: TarefaData[] = [
    tarefa('T1', 'Tunelamento Central', 60, true),
    tarefa('T2', 'Rampas Norte/Sul', 40, true),
    tarefa('T3', 'Desvios Rota 1', 20, true),
    tarefa('T4', 'Sinalização', 10, false),   // não crítica — deve ser excluída
]

// ─── decompMATEDCausal ────────────────────────────────────────────────────

describe('decompMATEDCausal', () => {
    it('retorna somente tarefas críticas (AC-5)', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        const ids = result.map(r => r.tarefaId)
        expect(ids).not.toContain('T4') // T4 não é crítica
        expect(ids).toHaveLength(3)
    })

    it('ordena por contribuição decrescente (maior primeiro)', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        // Tunelamento (60) > Rampas (40) > Desvios (20)
        expect(result[0].tarefaId).toBe('T1')
        expect(result[1].tarefaId).toBe('T2')
        expect(result[2].tarefaId).toBe('T3')
    })

    it('contribuições somam 100%', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        const total = result.reduce((acc, r) => acc + r.contribuicao_mated, 0)
        expect(total).toBeCloseTo(100, 1)
    })

    it('CausalResult tem campos corretos (AC-2)', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        for (const r of result) {
            expect(r).toHaveProperty('tarefaId')
            expect(r).toHaveProperty('nome')
            expect(r).toHaveProperty('contribuicao_mated')
            expect(['E', 'P', 'O']).toContain(r.dimensao)
        }
    })

    it('dimensão dominante = O quando orçamento desvia mais (Big Dig)', () => {
        // orcamento: |5.62 - 1.0| / 1.0 = 4.62 (maior desvio)
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        expect(result[0].dimensao).toBe('O')
    })

    it('dimensão = P quando prazo tem maior desvio', () => {
        const ta_prazo = { escopo: 1.0, prazo: 3.0, orcamento: 1.1, mated_distancia: 0.8 }
        const result = decompMATEDCausal({ ta: ta_prazo, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        expect(result[0].dimensao).toBe('P')
    })

    it('retorna vazio se não há tarefas críticas', () => {
        const semCriticas = TAREFAS_BIG_DIG.map(t => ({ ...t, critica: false }))
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: semCriticas })
        expect(result).toHaveLength(0)
    })

    it('retorna vazio se tarefas vazias', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: [] })
        expect(result).toHaveLength(0)
    })

    it('cada contribuição é proporcional à duração', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        // Total critico: 60+40+20=120
        // T1: 60/120 = 50%, T2: 40/120 = 33.3%, T3: 20/120 = 16.7%
        expect(result.find(r => r.tarefaId === 'T1')!.contribuicao_mated).toBeCloseTo(50, 1)
        expect(result.find(r => r.tarefaId === 'T2')!.contribuicao_mated).toBeCloseTo(33.3, 1)
        expect(result.find(r => r.tarefaId === 'T3')!.contribuicao_mated).toBeCloseTo(16.7, 1)
    })
})

// ─── topCausas ────────────────────────────────────────────────────────────

describe('topCausas', () => {
    it('retorna top 3 por default', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        const top = topCausas(result)
        expect(top).toHaveLength(3)
    })

    it('retorna top N configurável', () => {
        const result = decompMATEDCausal({ ta: TA_BIG_DIG, tm: TM_IDEAL, tarefas: TAREFAS_BIG_DIG })
        expect(topCausas(result, 1)).toHaveLength(1)
        expect(topCausas(result, 2)).toHaveLength(2)
    })
})
