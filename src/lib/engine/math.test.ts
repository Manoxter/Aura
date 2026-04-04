import { describe, it, expect } from 'vitest'
import { forwardPass, backwardPass, gerarTrianguloCDT, seedCustosTarefas, classificarZerosMurphy, regressaoPonderadaMurphy } from './math'
import type { Tarefa } from '../types'

// ══════════════════════════════════════════════════════════════
// @aura-math + @aura-qa-auditor (Atlas) — CPM & Motor CDT
// Valida o motor de agendamento (CPM) e geração do triângulo
// ══════════════════════════════════════════════════════════════

// Helper para gerar Tarefa mínima para os testes de CPM
function mkTarefa(id: string, ordem: number, duracao: number, predecessoras: string[] = []): Tarefa {
    return {
        id,
        projeto_id: 'test-proj',
        tenant_id: 'test-tenant',
        nome: `Tarefa ${id}`,
        ordem,
        duracao_estimada: duracao,
        duracao_realizada: null,
        es: null,
        ef: null,
        ls: null,
        lf: null,
        folga_total: null,
        folga_livre: null,
        no_caminho_critico: false,
        status: 'pendente',
        data_inicio_real: null,
        data_fim_real: null,
        predecessoras,
        concluida: false,
    }
}

describe('Motor CPM (Critical Path Method)', () => {

    // ─── forwardPass ──────────────────────────────────────────
    describe('forwardPass', () => {
        it('calcula ES=0 e EF=duracao para a primeira tarefa', () => {
            const tarefas = [mkTarefa('A', 1, 5)]
            const result = forwardPass(tarefas)
            expect(result[0].es).toBe(0)
            expect(result[0].ef).toBe(5)
        })

        it('propaga ES corretamente de predecessora para sucessora', () => {
            // A(5d) → B(3d): B deve começar após A terminar
            const tarefas = [
                mkTarefa('A', 1, 5),
                mkTarefa('B', 2, 3, ['A']),
            ]
            const result = forwardPass(tarefas)
            const A = result.find(t => t.id === 'A')!
            const B = result.find(t => t.id === 'B')!
            expect(A.es).toBe(0)
            expect(A.ef).toBe(5)
            expect(B.es).toBe(5)
            expect(B.ef).toBe(8)
        })

        it('usa o maior EF de múltiplas predecessoras (merge point)', () => {
            // A(5d) e B(8d) → C(3d): C só começa depois do maior entre EF(A) e EF(B)
            const tarefas = [
                mkTarefa('A', 1, 5),
                mkTarefa('B', 2, 8),
                mkTarefa('C', 3, 3, ['A', 'B']),
            ]
            const result = forwardPass(tarefas)
            const C = result.find(t => t.id === 'C')!
            expect(C.es).toBe(8) // max(EF_A=5, EF_B=8)
            expect(C.ef).toBe(11)
        })
    })

    // ─── backwardPass ─────────────────────────────────────────
    describe('backwardPass', () => {
        it('calcula LS e LF corretamente em rede simples A→B', () => {
            const tarefas = [
                mkTarefa('A', 1, 5),
                mkTarefa('B', 2, 3, ['A']),
            ]
            const afterFwd = forwardPass(tarefas)
            const result = backwardPass(afterFwd)
            const A = result.find(t => t.id === 'A')!
            const B = result.find(t => t.id === 'B')!
            // Duração total = 8 (EF de B)
            expect(B.lf).toBe(8)
            expect(B.ls).toBe(5)
            expect(A.lf).toBe(5) // B começa em 5, então A deve terminar em 5
            expect(A.ls).toBe(0)
        })

        it('identifica corretamente o caminho crítico (folga_total = 0)', () => {
            // A(5)→B(3): rede linear, todas críticas
            const tarefas = [
                mkTarefa('A', 1, 5),
                mkTarefa('B', 2, 3, ['A']),
            ]
            const afterFwd = forwardPass(tarefas)
            const result = backwardPass(afterFwd)
            result.forEach(t => {
                expect(t.folga_total).toBe(0)
                expect(t.no_caminho_critico).toBe(true)
            })
        })

        it('detecta tarefas não-críticas com folga positiva', () => {
            // A(5) e B(2) → C(3): B tem folga pois A é o gargalo
            const tarefas = [
                mkTarefa('A', 1, 5),
                mkTarefa('B', 2, 2),
                mkTarefa('C', 3, 3, ['A', 'B']),
            ]
            const afterFwd = forwardPass(tarefas)
            const result = backwardPass(afterFwd)
            const B = result.find(t => t.id === 'B')!
            expect(B.folga_total).toBe(3) // B pode demorar até 3 dias a mais
            expect(B.no_caminho_critico).toBe(false)
        })
    })
})

describe('Motor CDT — Triângulo Geodésico', () => {
    // Configura uma reta de orçamento e prazo padrão para os testes
    const retaOrc = { x1: 0, y1: 0, x2: 100, y2: 50000, metodo: 'OLS' }
    const retaPrazo = { a: 1.0, b: 0, metodo: 'OLS' }
    const bac = 1000000        // R$ 1M de orçamento
    const totalDias = 180      // 180 dias de projeto
    const contingenciaPct = 10 // 10% de reserva

    it('gera vértices A, B e C válidos (coordenadas finitas)', () => {
        const result = gerarTrianguloCDT(retaOrc, retaPrazo, bac, totalDias, contingenciaPct)
        expect(isFinite(result.A[0])).toBe(true)
        expect(isFinite(result.B[0])).toBe(true)
        expect(isFinite(result.C[0])).toBe(true)
    })

    it('a área do CDT é positiva para intensidades não-colineares', () => {
        const result = gerarTrianguloCDT(retaOrc, retaPrazo, bac, totalDias, contingenciaPct)
        expect(result.cdt_area).toBeGreaterThan(0)
    })

    it('a área do triângulo órtico é menor ou igual à área base', () => {
        const result = gerarTrianguloCDT(retaOrc, retaPrazo, bac, totalDias, contingenciaPct)
        expect(result.cdt_area_ortico).toBeLessThanOrEqual(result.cdt_area + 0.0001)
    })

    it('os lados retornados (E, O, P) estão dentro dos limites do PRD v6.1', () => {
        const result = gerarTrianguloCDT(retaOrc, retaPrazo, bac, totalDias, contingenciaPct)
        // E sempre = 1.0 (referência)
        expect(result.lados.escopo).toBe(1.0)
        // O: min 0.05, max 1 + contingência/100
        const maxO = 1 + contingenciaPct / 100
        expect(result.lados.orcamento).toBeGreaterThanOrEqual(0.05)
        expect(result.lados.orcamento).toBeLessThanOrEqual(maxO)
        // P: min 0.05, max 2.0
        expect(result.lados.prazo).toBeGreaterThanOrEqual(0.05)
        expect(result.lados.prazo).toBeLessThanOrEqual(2.0)
    })

    it('o baricentro é calculado como média dos 3 pés de altitude', () => {
        const result = gerarTrianguloCDT(retaOrc, retaPrazo, bac, totalDias, contingenciaPct)
        expect(Array.isArray(result.baricentro)).toBe(true)
        expect(result.baricentro.length).toBe(2)
        expect(isFinite(result.baricentro[0])).toBe(true)
        expect(isFinite(result.baricentro[1])).toBe(true)
    })

    it('resiste a dados extremos (BAC muito alto, dias mínimos)', () => {
        const retaOrcExtremo = { x1: 0, y1: 0, x2: 1, y2: 999999999, metodo: 'STRESS' }
        const result = gerarTrianguloCDT(retaOrcExtremo, { a: 2.0 }, 999999999, 1, 0)
        // Deve clampar sem explodir
        expect(isFinite(result.cdt_area)).toBe(true)
        expect(result.lados.orcamento).toBeLessThanOrEqual(1.0) // contingência 0%
    })
})

// ══════════════════════════════════════════════════════════════
// Story 1.6 — seedCustosTarefas(): distribuição proporcional M7
// ══════════════════════════════════════════════════════════════

function makeTarefa(id: string, duracao: number): Pick<Tarefa, 'id' | 'duracao_estimada'> {
    return { id, duracao_estimada: duracao }
}

describe('seedCustosTarefas()', () => {
    it('distribui proporcionalmente por duração: [2,3,5] → [200,300,500] com orçamento 1000', () => {
        const tarefas = [makeTarefa('a', 2), makeTarefa('b', 3), makeTarefa('c', 5)]
        const result = seedCustosTarefas(tarefas, 1000)
        expect(result['a']).toBeCloseTo(200, 5)
        expect(result['b']).toBeCloseTo(300, 5)
        expect(result['c']).toBeCloseTo(500, 5)
    })

    it('soma dos valores ≈ orcamentoBase', () => {
        const tarefas = [makeTarefa('x', 3), makeTarefa('y', 7)]
        const result = seedCustosTarefas(tarefas, 1500)
        const soma = Object.values(result).reduce((s, v) => s + v, 0)
        expect(soma).toBeCloseTo(1500, 5)
    })

    it('tarefas com durações iguais → distribuição igual', () => {
        const tarefas = [makeTarefa('a', 4), makeTarefa('b', 4), makeTarefa('c', 4)]
        const result = seedCustosTarefas(tarefas, 900)
        expect(result['a']).toBeCloseTo(300, 5)
        expect(result['b']).toBeCloseTo(300, 5)
        expect(result['c']).toBeCloseTo(300, 5)
    })

    it('orcamentoBase=0 → retorna {}', () => {
        const tarefas = [makeTarefa('a', 5)]
        expect(seedCustosTarefas(tarefas, 0)).toEqual({})
    })

    it('tarefas vazias → retorna {}', () => {
        expect(seedCustosTarefas([], 1000)).toEqual({})
    })

    it('todas as durações zero → distribuição igual', () => {
        const tarefas = [makeTarefa('a', 0), makeTarefa('b', 0)]
        const result = seedCustosTarefas(tarefas, 200)
        expect(result['a']).toBeCloseTo(100, 5)
        expect(result['b']).toBeCloseTo(100, 5)
    })

    it('orcamentoBase negativo → retorna {}', () => {
        const tarefas = [makeTarefa('a', 5)]
        expect(seedCustosTarefas(tarefas, -100)).toEqual({})
    })
})

// ══════════════════════════════════════════════════════════════
// Story 1.8 — classificarZerosMurphy() + regressaoPonderadaMurphy()
// ══════════════════════════════════════════════════════════════

describe('classificarZerosMurphy()', () => {
    it('ponto com y > 0 → tipo normal, peso 1.0', () => {
        const r = classificarZerosMurphy([{ x: 1, y: 5 }])
        expect(r[0].tipo).toBe('normal')
        expect(r[0].peso).toBe(1.0)
    })

    it('zero não planejado → tipo murphy, peso 1.8', () => {
        const r = classificarZerosMurphy([{ x: 3, y: 0 }])
        expect(r[0].tipo).toBe('murphy')
        expect(r[0].peso).toBe(1.8)
    })

    it('zero planejado (feriado) → tipo planejado, peso 0.0', () => {
        const r = classificarZerosMurphy([{ x: 3, y: 0 }], new Set([3]))
        expect(r[0].tipo).toBe('planejado')
        expect(r[0].peso).toBe(0.0)
    })

    it('série mista: classifica cada ponto corretamente', () => {
        const pts = [{ x: 1, y: 5 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 3 }]
        const r = classificarZerosMurphy(pts, new Set([3]))
        expect(r[0].tipo).toBe('normal')
        expect(r[1].tipo).toBe('murphy')  // zero não planejado
        expect(r[2].tipo).toBe('planejado') // zero planejado
        expect(r[3].tipo).toBe('normal')
    })
})

describe('regressaoPonderadaMurphy()', () => {
    it('sem zeros: resultado equivale a regressão normal', () => {
        const pts = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }]
        const r = regressaoPonderadaMurphy(pts)
        expect(r.a).toBeCloseTo(2.0, 1)
        expect(r.nMurphy).toBe(0)
        expect(r.nPlanejado).toBe(0)
    })

    it('zeros planejados são excluídos: contados em nPlanejado', () => {
        const pts = [{ x: 1, y: 2 }, { x: 2, y: 0 }, { x: 3, y: 6 }]
        const r = regressaoPonderadaMurphy(pts, new Set([2]))
        expect(r.nPlanejado).toBe(1)
        expect(r.nMurphy).toBe(0)
    })

    it('zeros Murphy aumentam a inclinação vs zeros planejados', () => {
        const pts = [{ x: 1, y: 2 }, { x: 2, y: 0 }, { x: 3, y: 6 }]
        const comMurphy = regressaoPonderadaMurphy(pts, new Set())        // zero é Murphy
        const semMurphy = regressaoPonderadaMurphy(pts, new Set([2]))     // zero é planejado
        // Murphy penaliza: inclinação maior (zero puxa a reta para baixo menos)
        expect(comMurphy.nMurphy).toBe(1)
        expect(semMurphy.nPlanejado).toBe(1)
    })

    it('série só de zeros planejados → a=0, b=0', () => {
        const pts = [{ x: 1, y: 0 }, { x: 2, y: 0 }]
        const r = regressaoPonderadaMurphy(pts, new Set([1, 2]))
        expect(r.a).toBe(0)
        expect(r.b).toBe(0)
    })

    it('lista vazia → a=0, b=0', () => {
        const r = regressaoPonderadaMurphy([])
        expect(r.a).toBe(0)
        expect(r.b).toBe(0)
    })
})
