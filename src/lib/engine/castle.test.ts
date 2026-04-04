import { describe, it, expect } from 'vitest'
import {
    fatorAtenuacao,
    calcularSkewVisual,
    propagarImpacto,
    calcularEstadoCastelo,
    classificarEstabilidade,
    type CastleSprint,
} from './castle'

// ─── Helper ─────────────────────────────────────────────────────────────

function makeSprint(overrides: Partial<CastleSprint> & { id: string }): CastleSprint {
    return {
        numero: 1,
        estado: 'futuro',
        buffer_original: 10,
        buffer_consumido: 0,
        impacto_propagado: 0,
        skew_visual: 0,
        ...overrides,
    }
}

// ─── Atenuação Exponencial ──────────────────────────────────────────────

describe('fatorAtenuacao', () => {
    it('k=0 → fator = 1 (sem atenuação)', () => {
        expect(fatorAtenuacao(0)).toBe(1)
    })

    it('k=1 → fator ≈ 0.74 (λ=0.3)', () => {
        expect(fatorAtenuacao(1)).toBeCloseTo(0.741, 2)
    })

    it('fator diminui com k crescente', () => {
        const f1 = fatorAtenuacao(1)
        const f2 = fatorAtenuacao(2)
        const f5 = fatorAtenuacao(5)
        expect(f1).toBeGreaterThan(f2)
        expect(f2).toBeGreaterThan(f5)
    })

    it('lambda maior → decai mais rápido', () => {
        const lento = fatorAtenuacao(3, 0.1)
        const rapido = fatorAtenuacao(3, 0.5)
        expect(lento).toBeGreaterThan(rapido)
    })

    it('k negativo → fator = 1', () => {
        expect(fatorAtenuacao(-1)).toBe(1)
    })
})

// ─── Skew Visual ────────────────────────────────────────────────────────

describe('calcularSkewVisual', () => {
    it('retorna 0 quando buffer original = 0', () => {
        expect(calcularSkewVisual(5, 0)).toBe(0)
    })

    it('retorna 0 quando nada consumido', () => {
        expect(calcularSkewVisual(0, 10)).toBeCloseTo(0)
    })

    it('retorna valor negativo (inclinação esquerda)', () => {
        expect(calcularSkewVisual(5, 10)).toBeLessThan(0)
    })

    it('skew cresce com consumo', () => {
        const s1 = Math.abs(calcularSkewVisual(2, 10))
        const s2 = Math.abs(calcularSkewVisual(8, 10))
        expect(s2).toBeGreaterThan(s1)
    })

    it('buffer 100% consumido → skew ≈ -arctan(1) × 0.5 ≈ -0.393', () => {
        expect(calcularSkewVisual(10, 10)).toBeCloseTo(-0.393, 2)
    })
})

// ─── Propagação Direcional (D31) ────────────────────────────────────────

describe('propagarImpacto', () => {
    it('concluídos recebem ZERO impacto (cristalizados)', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'concluido', buffer_original: 10 }),
            makeSprint({ id: 'S2', numero: 2, estado: 'ativo', buffer_original: 10 }),
        ]
        const { sprints: resultado } = propagarImpacto(sprints, 5)
        expect(resultado[0].impacto_propagado).toBe(0) // concluído = cristalizado
        expect(resultado[1].impacto_propagado).toBe(5) // ativo recebe tudo
    })

    it('ativo recebe impacto total', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'ativo', buffer_original: 20 }),
            makeSprint({ id: 'S2', numero: 2, estado: 'futuro', buffer_original: 10 }),
        ]
        const { sprints: resultado } = propagarImpacto(sprints, 8)
        expect(resultado[0].impacto_propagado).toBe(8)
        expect(resultado[0].buffer_consumido).toBe(8) // absorveu tudo
    })

    it('propaga para futuros quando buffer do ativo esgota', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'ativo', buffer_original: 3 }),
            makeSprint({ id: 'S2', numero: 2, estado: 'futuro', buffer_original: 10 }),
            makeSprint({ id: 'S3', numero: 3, estado: 'futuro', buffer_original: 10 }),
        ]
        const { sprints: resultado } = propagarImpacto(sprints, 10)
        expect(resultado[0].buffer_consumido).toBe(3) // esgotou
        expect(resultado[1].impacto_propagado).toBeGreaterThan(0) // recebeu propagação
    })

    it('atenuação exponencial reduz impacto nos futuros', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'ativo', buffer_original: 0 }), // sem buffer
            makeSprint({ id: 'S2', numero: 2, estado: 'futuro', buffer_original: 100 }),
            makeSprint({ id: 'S3', numero: 3, estado: 'futuro', buffer_original: 100 }),
        ]
        const { sprints: resultado } = propagarImpacto(sprints, 10)
        // S2 recebe mais que S3 (atenuação)
        expect(resultado[1].impacto_propagado).toBeGreaterThan(resultado[2].impacto_propagado)
    })

    it('retorna impacto_residual quando nenhum buffer absorve', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'ativo', buffer_original: 0 }),
        ]
        const { impacto_residual } = propagarImpacto(sprints, 10)
        expect(impacto_residual).toBeGreaterThan(0)
    })

    it('sem sprint ativo → impacto_residual = impacto total', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', numero: 1, estado: 'concluido' }),
        ]
        const { impacto_residual } = propagarImpacto(sprints, 10)
        expect(impacto_residual).toBe(10)
    })
})

// ─── Estado do Castelo ──────────────────────────────────────────────────

describe('calcularEstadoCastelo', () => {
    it('concluídos têm skew = 0 (cristalizados)', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'concluido', buffer_consumido: 5, buffer_original: 10 }),
        ]
        const resultado = calcularEstadoCastelo(sprints)
        expect(resultado[0].skew_visual).toBe(0)
    })

    it('ativos e futuros têm skew proporcional ao buffer', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'ativo', buffer_consumido: 5, buffer_original: 10 }),
        ]
        const resultado = calcularEstadoCastelo(sprints)
        expect(resultado[0].skew_visual).toBeLessThan(0)
    })
})

// ─── Estabilidade ───────────────────────────────────────────────────────

describe('classificarEstabilidade', () => {
    it('estável quando todos concluídos', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'concluido' }),
        ]
        expect(classificarEstabilidade(sprints)).toBe('estavel')
    })

    it('estável quando buffers intocados', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'ativo', buffer_original: 10, buffer_consumido: 0 }),
            makeSprint({ id: 'S2', estado: 'futuro', buffer_original: 10, buffer_consumido: 0 }),
        ]
        expect(classificarEstabilidade(sprints)).toBe('estavel')
    })

    it('colapsado quando buffer esgotado em futuro', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'ativo', buffer_original: 10, buffer_consumido: 5 }),
            makeSprint({ id: 'S2', estado: 'futuro', buffer_original: 10, buffer_consumido: 10 }),
        ]
        expect(classificarEstabilidade(sprints)).toBe('colapsado')
    })

    it('inclinado com consumo alto', () => {
        const sprints: CastleSprint[] = [
            makeSprint({ id: 'S1', estado: 'ativo', buffer_original: 10, buffer_consumido: 7 }),
            makeSprint({ id: 'S2', estado: 'futuro', buffer_original: 10, buffer_consumido: 7 }),
            makeSprint({ id: 'S3', estado: 'futuro', buffer_original: 10, buffer_consumido: 7 }),
        ]
        expect(['inclinado', 'critico']).toContain(classificarEstabilidade(sprints))
    })
})
