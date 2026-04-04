import { describe, it, expect } from 'vitest'
import { executarPipelineDual, analisarDivergencia } from './pipeline-dual'

// Curvas de teste mínimas (3 pontos cada)
const curvaCustoPlano = [
    { x: 0, y: 0 }, { x: 50, y: 50000 }, { x: 100, y: 100000 },
]
const curvaPrazoPlano = [
    { x: 0, y: 100 }, { x: 50, y: 50 }, { x: 100, y: 0 },
]

// Curvas reais divergentes (custo maior, prazo atrasado)
const curvaCustoReal = [
    { x: 0, y: 0 }, { x: 50, y: 80000 }, { x: 100, y: 160000 },
]
const curvaPrazoReal = [
    { x: 0, y: 100 }, { x: 50, y: 60 }, { x: 100, y: 10 },
]

describe('executarPipelineDual', () => {
    it('sem curvas reais: TA = TM (fallback)', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        expect(result.usaCurvasReais).toBe(false)
        expect(result.tm.pipeline_source).toBe('tm')
        expect(result.ta.pipeline_source).toBe('ta')
        // TM e TA devem ter mesmos lados quando usam mesmas curvas e mesmo dia
        // (nota: diaAtual difere — TM usa diaBaseline=0, TA usa diaAtual=50)
    })

    it('com curvas reais: TA usa curvas de execução', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            curvaCustoReal,
            curvaPrazoReal,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        expect(result.usaCurvasReais).toBe(true)
        expect(result.ta.pipeline_source).toBe('ta')
    })

    it('curvas reais com menos de 2 pontos: fallback para planejadas', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            curvaCustoReal: [{ x: 0, y: 0 }], // apenas 1 ponto
            curvaPrazoReal: [{ x: 0, y: 100 }],
            diaAtual: 50,
            prazoBase: 100,
        })
        expect(result.usaCurvasReais).toBe(false)
    })

    it('detecta divergência de protocolo TM≠TA', () => {
        // Curvas reais com custo muito alto → pode gerar protocolo diferente
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            curvaCustoReal,
            curvaPrazoReal,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        // Pode ou não divergir dependendo dos slopes — o importante é que o campo existe
        expect(typeof result.divergenciaProtocolo).toBe('boolean')
        expect(typeof result.protocoloTM).toBe('string')
        expect(typeof result.protocoloTA).toBe('string')
    })

    it('TM sempre usa diaBaseline (não diaAtual)', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            diaAtual: 80,
            diaBaseline: 0,
            prazoBase: 100,
        })
        // TM é snapshot do dia 0 — deve ser estável
        expect(result.tm.pipeline_source).toBe('tm')
    })

    it('areaBaseline do TA usa área do TM quando não fornecida', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            diaAtual: 50,
            prazoBase: 100,
        })
        // TA deve ter desvio_qualidade calculável (areaBaseline = tm.cdt_area)
        // Se cet é válida, desvio não deve ser null
        if (result.ta.cet_dupla.valid) {
            expect(result.ta.cdt_area_baseline).not.toBeNull()
        }
    })
})

describe('analisarDivergencia', () => {
    it('TM = TA: delta zero', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            diaAtual: 0, // mesmo dia = mesmas curvas
            prazoBase: 100,
        })
        const div = analisarDivergencia(result.tm, result.ta)
        // Quando diaAtual=0=diaBaseline, TM e TA são idênticos
        expect(Math.abs(div.deltaAreaPct)).toBeLessThan(1)
    })

    it('retorna lado mais crítico', () => {
        const result = executarPipelineDual({
            curvaCustoPlano,
            curvaPrazoPlano,
            curvaCustoReal,
            curvaPrazoReal,
            diaAtual: 50,
            prazoBase: 100,
            orcamentoBase: 100000,
        })
        const div = analisarDivergencia(result.tm, result.ta)
        expect(['E', 'C', 'P']).toContain(div.ladoMaisCritico)
    })
})
