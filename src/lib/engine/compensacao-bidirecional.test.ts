import { describe, it, expect } from 'vitest'
import { calcularCompensacaoBidirecional, gerarRecomendacao } from './compensacao-bidirecional'
import type { CDTResult } from './math'

// Helper: CDTResult mínimo para teste
function mockCDT(lados: { E: number; C: number; P: number }, protocolo = 'agudo'): CDTResult {
    return {
        A: [0, 0], B: [lados.E, 0], C: [0.5, 0.5],
        centroide: [0.3, 0.2], baricentro: [0.3, 0.2],
        nvo: [0.3, 0.2], nvo_tipo: 'centroide_tm', nvo_nivel: 2,
        mated_distancia: 0.1, mated_inside_ortico: false,
        cdt_area: 0.5, cdt_area_ortico: 0.2, cdt_area_baseline: null,
        desvio_qualidade: null,
        lados: { escopo: lados.E, orcamento: lados.C, prazo: lados.P },
        lados_brutos: { E: lados.E, C: lados.C, P: lados.P },
        cet: { valida: true, report: null },
        cet_dupla: { valid: true },
        cet_projecao: null, zona_mated: 'SEGURO', cdt_version: 2,
        protocolo: protocolo as CDTResult['protocolo'],
    } as CDTResult
}

describe('calcularCompensacaoBidirecional', () => {
    it('TM = TA: deltas zero, neutro', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const ta = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(comp.delta_E).toBe(0)
        expect(comp.delta_C).toBe(0)
        expect(comp.delta_P).toBe(0)
        expect(comp.direcao).toBe('neutro')
        expect(comp.divergencia_protocolo).toBe(false)
    })

    it('custo explodiu: delta_C positivo, lado prioritário = C', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const ta = mockCDT({ E: 1.0, C: 2.0, P: 1.2 })
        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(comp.delta_C).toBeCloseTo(0.7, 5)
        expect(comp.delta_C_norm).toBeGreaterThan(0.5) // 70%/1.3 > 50%
        expect(comp.lado_prioritario).toBe('C')
        expect(comp.direcao).toBe('acima')
    })

    it('prazo encolheu: delta_P negativo', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.5 })
        const ta = mockCDT({ E: 1.0, C: 1.3, P: 0.8 })
        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(comp.delta_P).toBeCloseTo(-0.7, 5)
        expect(comp.lado_prioritario).toBe('P')
        expect(comp.direcao).toBe('abaixo')
    })

    it('divergência de protocolo detectada', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 }, 'agudo')
        const ta = mockCDT({ E: 1.0, C: 2.0, P: 1.2 }, 'obtuso_beta')
        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(comp.divergencia_protocolo).toBe(true)
    })

    it('normalização protege contra divisão por zero', () => {
        const tm = mockCDT({ E: 0, C: 0, P: 0 })
        const ta = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const comp = calcularCompensacaoBidirecional(tm, ta)
        expect(isFinite(comp.delta_E_norm)).toBe(true)
        expect(isFinite(comp.delta_C_norm)).toBe(true)
        expect(isFinite(comp.delta_P_norm)).toBe(true)
    })
})

describe('gerarRecomendacao', () => {
    it('dentro da tolerância: sem compensação', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const ta = mockCDT({ E: 1.0, C: 1.34, P: 1.2 }) // 3% de desvio
        const comp = calcularCompensacaoBidirecional(tm, ta)
        const rec = gerarRecomendacao(comp)
        expect(rec).toContain('tolerância')
    })

    it('divergência de protocolo: ALERTA', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 }, 'agudo')
        const ta = mockCDT({ E: 1.0, C: 2.5, P: 1.2 }, 'obtuso_beta')
        const comp = calcularCompensacaoBidirecional(tm, ta)
        const rec = gerarRecomendacao(comp)
        expect(rec).toContain('ALERTA')
        expect(rec).toContain('Custo')
    })

    it('desvio significativo sem mudança de protocolo: sugestão', () => {
        const tm = mockCDT({ E: 1.0, C: 1.3, P: 1.2 })
        const ta = mockCDT({ E: 1.0, C: 1.7, P: 1.2 }) // 30% desvio custo
        const comp = calcularCompensacaoBidirecional(tm, ta)
        const rec = gerarRecomendacao(comp)
        expect(rec).toContain('Custo')
        expect(rec).toContain('acima')
    })
})
