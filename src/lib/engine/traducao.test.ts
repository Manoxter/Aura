import { describe, it, expect } from 'vitest'
import { traduzirCDT, type SituacaoProjetoTexto } from './traducao'
import type { CDTResult } from './math'

// ═══════════════════════════════════════════════════════════════════════════
// traducao.test.ts — RFN-4 AC6: testes unitários para traduzirCDT()
// ═══════════════════════════════════════════════════════════════════════════

// ─── Helper: cria CDTResult mínimo ────────────────────────────────────────
function makeCDT(overrides: Partial<CDTResult>): CDTResult {
    return {
        lados: { escopo: 1.0, orcamento: 1.0, prazo: 1.0 },
        angulos: { alpha: 60, beta: 60, gamma: 60 },
        cdt_area: 0.433,
        mated_distancia: 0.05,
        zona_mated: 'OTIMO',
        forma_triangulo: 'acutangulo',
        cet: { valida: true, report: null },
        cet_dupla: { valid: true },
        nvo: { x: 0.5, y: 0.433 },
        ...overrides,
    } as CDTResult
}

// ─── Zona ÓTIMO ────────────────────────────────────────────────────────────

describe('traduzirCDT — zona ÓTIMO', () => {
    it('retorna severidade ok e título de excelência', () => {
        const cdt = makeCDT({ zona_mated: 'OTIMO', forma_triangulo: 'acutangulo' })
        const r: SituacaoProjetoTexto = traduzirCDT(cdt)
        expect(r.severidade).toBe('ok')
        expect(r.titulo).toContain('excelência')
        expect(r.tendencia).toContain('Equilíbrio')
        expect(r.forma_natural).toContain('acutângulo')
    })

    it('ação recomendada é de manutenção (não urgência)', () => {
        const cdt = makeCDT({ zona_mated: 'OTIMO' })
        const r = traduzirCDT(cdt)
        expect(r.acao_recomendada).not.toMatch(/imediata|urgente|crise/i)
    })
})

// ─── Zona SEGURO ───────────────────────────────────────────────────────────

describe('traduzirCDT — zona SEGURO', () => {
    it('retorna severidade ok e título de execução controlada', () => {
        const cdt = makeCDT({ zona_mated: 'SEGURO', mated_distancia: 0.12 })
        const r = traduzirCDT(cdt)
        expect(r.severidade).toBe('ok')
        expect(r.titulo.toLowerCase()).toContain('controlad')
    })
})

// ─── Zona RISCO ────────────────────────────────────────────────────────────

describe('traduzirCDT — zona RISCO', () => {
    it('retorna severidade atencao', () => {
        const cdt = makeCDT({ zona_mated: 'RISCO', mated_distancia: 0.20, forma_triangulo: 'acutangulo' })
        const r = traduzirCDT(cdt)
        expect(r.severidade).toBe('atencao')
    })

    it('pressão de custo → ação foca em orçamento', () => {
        const cdt = makeCDT({
            zona_mated: 'RISCO',
            forma_triangulo: 'obtusangulo_c',
            lados: { escopo: 1.0, orcamento: 1.5, prazo: 1.05 },
        })
        const r = traduzirCDT(cdt)
        expect(r.tendencia).toContain('financeira')
        expect(r.acao_recomendada.toLowerCase()).toContain('custo')
    })

    it('pressão de prazo → ação foca em cronograma', () => {
        const cdt = makeCDT({
            zona_mated: 'RISCO',
            forma_triangulo: 'obtusangulo_p',
            lados: { escopo: 1.0, orcamento: 1.05, prazo: 1.5 },
        })
        const r = traduzirCDT(cdt)
        expect(r.tendencia).toContain('cronograma')
        expect(r.acao_recomendada.toLowerCase()).toMatch(/prazo|crítico|caminho/i)
    })
})

// ─── Zona CRISE ────────────────────────────────────────────────────────────

describe('traduzirCDT — zona CRISE', () => {
    it('retorna severidade critico e título de crise', () => {
        const cdt = makeCDT({ zona_mated: 'CRISE', mated_distancia: 0.40 })
        const r = traduzirCDT(cdt)
        expect(r.severidade).toBe('critico')
        expect(r.titulo.toLowerCase()).toContain('crise')
    })

    it('ação menciona War Room ou Gabinete de Crise', () => {
        const cdt = makeCDT({ zona_mated: 'CRISE' })
        const r = traduzirCDT(cdt)
        expect(r.acao_recomendada).toMatch(/War Room|Gabinete/i)
    })
})

// ─── CET violada ───────────────────────────────────────────────────────────

describe('traduzirCDT — CET violada', () => {
    it('ação menciona Gabinete de Crise e CET', () => {
        const cdt = makeCDT({
            zona_mated: 'CRISE',
            forma_triangulo: 'invalido',
            cet: { valida: false, report: null },
        })
        const r = traduzirCDT(cdt)
        expect(r.severidade).toBe('critico')
        expect(r.acao_recomendada).toMatch(/Gabinete|CET/i)
    })
})

// ─── Forma retângulo ───────────────────────────────────────────────────────

describe('traduzirCDT — forma retângulo', () => {
    it('tendência menciona ponto de inflexão', () => {
        const cdt = makeCDT({ zona_mated: 'RISCO', forma_triangulo: 'retangulo' })
        const r = traduzirCDT(cdt)
        expect(r.tendencia).toContain('inflexão')
        expect(r.acao_recomendada).toMatch(/TAP|Simulador/i)
    })
})

// ─── Estrutura do resultado ────────────────────────────────────────────────

describe('traduzirCDT — contrato de dados', () => {
    it('sempre retorna todos os campos definidos', () => {
        const zonas = ['OTIMO', 'SEGURO', 'RISCO', 'CRISE'] as const
        for (const zona of zonas) {
            const r = traduzirCDT(makeCDT({ zona_mated: zona }))
            expect(r.titulo).toBeTruthy()
            expect(r.descricao).toBeTruthy()
            expect(r.acao_recomendada).toBeTruthy()
            expect(['ok', 'atencao', 'critico']).toContain(r.severidade)
            expect(r.tendencia).toBeTruthy()
            expect(r.forma_natural).toBeTruthy()
        }
    })
})
