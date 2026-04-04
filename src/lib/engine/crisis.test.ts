import { describe, it, expect } from 'vitest'
import { checkCDTExistence, generateCrisisReport } from './crisis'

// ══════════════════════════════════════════════════════════════
// @aura-qa-auditor (Atlas) — Motor de Crise Geométrica
// Testa a desigualdade triangular do Triângulo CDT e relatórios
// ══════════════════════════════════════════════════════════════

describe('Motor de Crise Geométrica (crisis)', () => {

    // ─── 1. checkCDTExistence ─────────────────────────────────
    describe('checkCDTExistence', () => {
        it('retorna true para um triângulo válido equilátero', () => {
            expect(checkCDTExistence(1, 1, 1)).toBe(true)
        })

        it('retorna true para triângulo escaleno válido', () => {
            // 3 + 4 > 5, 3 + 5 > 4, 4 + 5 > 3
            expect(checkCDTExistence(3, 4, 5)).toBe(true)
        })

        it('retorna false quando E + O <= P (Prazo excessivo - Overstretch)', () => {
            // 1 + 1 = 2, não > 3
            expect(checkCDTExistence(1, 1, 3)).toBe(false)
        })

        it('retorna false quando E + P <= O (Orçamento excessivo)', () => {
            // 1 + 1 = 2, não > 5
            expect(checkCDTExistence(1, 5, 1)).toBe(false)
        })

        it('retorna false quando O + P <= E (Escopo impossível - Sub-recurso)', () => {
            // 1 + 1 = 2, não > 5
            expect(checkCDTExistence(5, 1, 1)).toBe(false)
        })

        it('retorna false para triângulo degenerado (pontos colineares)', () => {
            // 1 + 2 = 3, não > 3
            expect(checkCDTExistence(1, 2, 3)).toBe(false)
        })
    })

    // ─── 2. generateCrisisReport ─────────────────────────────
    describe('generateCrisisReport', () => {
        it('gera relatório ESTÁVEL para triângulo válido', () => {
            const report = generateCrisisReport(1, 1, 1)
            expect(report.status).toBe('ESTÁVEL')
            expect(report.causa_raiz).toHaveLength(0)
            expect(report.rotas_de_escape).toHaveLength(0)
            expect(report.violacao_regra).toBe('')
        })

        it('gera relatório CRISE_GEOMÉTRICA para Prazo excessivo', () => {
            const report = generateCrisisReport(1, 1, 5)
            expect(report.status).toBe('CRISE_GEOMÉTRICA')
            expect(report.violacao_regra).toContain('E + O')
            expect(report.causa_raiz.length).toBeGreaterThan(0)
            expect(report.rotas_de_escape.length).toBeGreaterThan(0)
        })

        it('gera relatório CRISE_GEOMÉTRICA para Orçamento excessivo', () => {
            const report = generateCrisisReport(1, 5, 1)
            expect(report.status).toBe('CRISE_GEOMÉTRICA')
            expect(report.violacao_regra).toContain('E + P')
        })

        it('gera relatório CRISE_GEOMÉTRICA para Escopo impossível', () => {
            const report = generateCrisisReport(5, 1, 1)
            expect(report.status).toBe('CRISE_GEOMÉTRICA')
            expect(report.violacao_regra).toContain('O + P')
        })

        it('o relatório sempre contém um timestamp ISO válido', () => {
            const report = generateCrisisReport(1, 1, 1)
            expect(() => new Date(report.timestamp)).not.toThrow()
            expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0)
        })

        it('as rotas de escape têm IDs únicos e impacto positivo em crise', () => {
            const report = generateCrisisReport(1, 1, 5)
            const ids = report.rotas_de_escape.map(r => r.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length) // IDs únicos
            report.rotas_de_escape.forEach(rota => {
                expect(rota.impacto_mated).toBeGreaterThan(0)
            })
        })
    })
})
