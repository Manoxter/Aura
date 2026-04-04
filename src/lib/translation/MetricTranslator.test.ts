import { describe, it, expect } from 'vitest'
import { translateLabel, translateTooltip, METRIC_LABELS } from './MetricTranslator'

// ══════════════════════════════════════════════════════════════
// Story 5.7 — Testes unitários para translateLabel() e translateTooltip()
// ══════════════════════════════════════════════════════════════

describe('translateLabel(metric, mode)', () => {
    it('retorna label PM para E: "Escopo"', () => {
        expect(translateLabel('E', 'pm')).toBe('Escopo')
    })

    it('retorna label tech para E: "E"', () => {
        expect(translateLabel('E', 'tech')).toBe('E')
    })

    it('retorna label PM para P: "Prazo"', () => {
        expect(translateLabel('P', 'pm')).toBe('Prazo')
    })

    it('retorna label tech para P: "P"', () => {
        expect(translateLabel('P', 'tech')).toBe('P')
    })

    it('retorna label PM para O: "Orçamento"', () => {
        expect(translateLabel('O', 'pm')).toBe('Orçamento')
    })

    it('retorna label tech para O: "O"', () => {
        expect(translateLabel('O', 'tech')).toBe('O')
    })

    it('retorna label PM para MATED: "Índice de Qualidade"', () => {
        expect(translateLabel('MATED', 'pm')).toBe('Índice de Qualidade')
    })

    it('retorna label tech para MATED: "MATED"', () => {
        expect(translateLabel('MATED', 'tech')).toBe('MATED')
    })

    it('retorna label PM para NVO: "Posição Ideal"', () => {
        expect(translateLabel('NVO', 'pm')).toBe('Posição Ideal')
    })

    it('retorna label PM para CEt: "Triângulo Válido"', () => {
        expect(translateLabel('CEt', 'pm')).toBe('Triângulo Válido')
    })

    it('retorna label PM para IQ: "Índice de Qualidade"', () => {
        expect(translateLabel('IQ', 'pm')).toBe('Índice de Qualidade')
    })

    it('fallback: retorna o próprio código para métrica desconhecida (pm)', () => {
        expect(translateLabel('UNKNOWN_METRIC', 'pm')).toBe('UNKNOWN_METRIC')
    })

    it('fallback: retorna o próprio código para métrica desconhecida (tech)', () => {
        expect(translateLabel('UNKNOWN_METRIC', 'tech')).toBe('UNKNOWN_METRIC')
    })
})

describe('translateTooltip(metric, mode)', () => {
    it('retorna tooltip PM para E com descrição gerencial', () => {
        const tooltip = translateTooltip('E', 'pm')
        expect(tooltip).toContain('tarefas')
    })

    it('retorna tooltip tech para E com descrição técnica', () => {
        const tooltip = translateTooltip('E', 'tech')
        expect(tooltip).toContain('vértice')
    })

    it('retorna tooltip PM para MATED com descrição gerencial', () => {
        const tooltip = translateTooltip('MATED', 'pm')
        expect(tooltip).toContain('distância')
    })

    it('retorna tooltip tech para MATED com referência à fórmula', () => {
        const tooltip = translateTooltip('MATED', 'tech')
        expect(tooltip).toContain('Euclidiana')
    })

    it('fallback: retorna string vazia para métrica desconhecida', () => {
        expect(translateTooltip('UNKNOWN_METRIC', 'pm')).toBe('')
    })
})

describe('METRIC_LABELS (cobertura completa)', () => {
    const metricsEsperadas = ['E', 'P', 'O', 'MATED', 'NVO', 'CEt', 'IQ']

    metricsEsperadas.forEach(metric => {
        it(`métrica "${metric}" possui labels para pm e tech`, () => {
            expect(METRIC_LABELS[metric]).toBeDefined()
            expect(typeof METRIC_LABELS[metric].pm).toBe('string')
            expect(METRIC_LABELS[metric].pm.length).toBeGreaterThan(0)
            expect(typeof METRIC_LABELS[metric].tech).toBe('string')
            expect(METRIC_LABELS[metric].tech.length).toBeGreaterThan(0)
        })
    })
})
