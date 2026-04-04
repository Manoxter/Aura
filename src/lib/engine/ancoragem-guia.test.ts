import { describe, it, expect } from 'vitest'
import { calcularAncoragem, transformarSombras, type ManchaPoint } from './ancoragem-guia'

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Sombra simulada: fp decrescente (burndown), fc crescente (custo)
const manchaMock: ManchaPoint[] = [
    { t: 0.0, fp: 1.0, fc: 0.0 },
    { t: 0.2, fp: 0.8, fc: 0.2 },
    { t: 0.4, fp: 0.6, fc: 0.4 },
    { t: 0.6, fp: 0.4, fc: 0.6 },
    { t: 0.8, fp: 0.2, fc: 0.8 },
    { t: 1.0, fp: 0.0, fc: 1.0 },
]

// ─── calcularAncoragem ──────────────────────────────────────────────────────

describe('calcularAncoragem', () => {
    it('agudo: sem inversão, sem GUIA', () => {
        const a = calcularAncoragem('agudo')
        expect(a.direcaoCusto).toBe(1)
        expect(a.direcaoPrazo).toBe(1)
        expect(a.retaGuia).toBeNull()
        expect(a.labelCusto).toBe('Custo')
        expect(a.labelPrazo).toBe('Prazo')
    })

    it('singular: herda de agudo', () => {
        const a = calcularAncoragem('singular')
        expect(a.direcaoCusto).toBe(1)
        expect(a.direcaoPrazo).toBe(1)
        expect(a.retaGuia).toBeNull()
    })

    it('γ (obtuso_gamma): prazo=GUIA, custo inverte', () => {
        const a = calcularAncoragem('obtuso_gamma')
        expect(a.direcaoCusto).toBe(-1)
        expect(a.direcaoPrazo).toBe(1)
        expect(a.retaGuia).toBe('prazo')
        expect(a.labelCusto).toBe('Liquidez restante')
        expect(a.labelPrazo).toBe('Prazo')
    })

    it('β (obtuso_beta): custo=GUIA, prazo inverte', () => {
        const a = calcularAncoragem('obtuso_beta')
        expect(a.direcaoCusto).toBe(1)
        expect(a.direcaoPrazo).toBe(-1)
        expect(a.retaGuia).toBe('custo')
        expect(a.labelCusto).toBe('Custo')
        expect(a.labelPrazo).toBe('Margem de prazo')
    })
})

// ─── transformarSombras ─────────────────────────────────────────────────────

describe('transformarSombras', () => {
    it('agudo: sombra inalterada', () => {
        const result = transformarSombras(manchaMock, 'agudo')
        expect(result).toEqual(manchaMock)
    })

    it('singular: sombra inalterada', () => {
        const result = transformarSombras(manchaMock, 'singular')
        expect(result).toEqual(manchaMock)
    })

    it('γ: fp (GUIA) inalterado, fc (custo) reversa', () => {
        const result = transformarSombras(manchaMock, 'obtuso_gamma')

        // fp deve ser idêntico ao original (GUIA)
        for (let i = 0; i < manchaMock.length; i++) {
            expect(result[i].fp).toBe(manchaMock[i].fp)
            expect(result[i].t).toBe(manchaMock[i].t)
        }

        // fc deve ser o reverso: [0, 0.2, 0.4, 0.6, 0.8, 1.0] → [1.0, 0.8, 0.6, 0.4, 0.2, 0]
        expect(result[0].fc).toBe(1.0)  // era 0.0, agora é o último valor
        expect(result[1].fc).toBe(0.8)  // era 0.2, agora é o penúltimo
        expect(result[5].fc).toBe(0.0)  // era 1.0, agora é o primeiro
    })

    it('β: fc (GUIA) inalterado, fp (prazo) reversa', () => {
        const result = transformarSombras(manchaMock, 'obtuso_beta')

        // fc deve ser idêntico ao original (GUIA)
        for (let i = 0; i < manchaMock.length; i++) {
            expect(result[i].fc).toBe(manchaMock[i].fc)
            expect(result[i].t).toBe(manchaMock[i].t)
        }

        // fp deve ser o reverso: [1.0, 0.8, 0.6, 0.4, 0.2, 0] → [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        expect(result[0].fp).toBe(0.0)  // era 1.0
        expect(result[1].fp).toBe(0.2)  // era 0.8
        expect(result[5].fp).toBe(1.0)  // era 0.0
    })

    it('γ: custo invertido vira DECRESCENTE (Liquidez)', () => {
        const result = transformarSombras(manchaMock, 'obtuso_gamma')
        // Custo original crescente: fc[0]=0, fc[5]=1
        // Após reverse: fc[0]=1, fc[5]=0 → DECRESCENTE ✓ (Liquidez restante)
        expect(result[0].fc).toBeGreaterThan(result[result.length - 1].fc)
    })

    it('β: prazo invertido vira CRESCENTE (Margem)', () => {
        const result = transformarSombras(manchaMock, 'obtuso_beta')
        // Prazo original decrescente: fp[0]=1, fp[5]=0
        // Após reverse: fp[0]=0, fp[5]=1 → CRESCENTE ✓ (Margem de prazo)
        expect(result[0].fp).toBeLessThan(result[result.length - 1].fp)
    })

    it('área integral preservada (soma dos valores fp/fc inalterada)', () => {
        const somaFpOriginal = manchaMock.reduce((s, d) => s + d.fp, 0)
        const somaFcOriginal = manchaMock.reduce((s, d) => s + d.fc, 0)

        const resultGamma = transformarSombras(manchaMock, 'obtuso_gamma')
        const somaFpGamma = resultGamma.reduce((s, d) => s + d.fp, 0)
        const somaFcGamma = resultGamma.reduce((s, d) => s + d.fc, 0)
        expect(somaFpGamma).toBeCloseTo(somaFpOriginal, 10) // GUIA inalterado
        expect(somaFcGamma).toBeCloseTo(somaFcOriginal, 10) // reverse preserva soma

        const resultBeta = transformarSombras(manchaMock, 'obtuso_beta')
        const somaFpBeta = resultBeta.reduce((s, d) => s + d.fp, 0)
        const somaFcBeta = resultBeta.reduce((s, d) => s + d.fc, 0)
        expect(somaFpBeta).toBeCloseTo(somaFpOriginal, 10)
        expect(somaFcBeta).toBeCloseTo(somaFcOriginal, 10)
    })

    it('array vazio retorna vazio', () => {
        expect(transformarSombras([], 'obtuso_gamma')).toEqual([])
    })

    it('t (tempo) NUNCA muda em nenhum protocolo', () => {
        for (const proto of ['agudo', 'obtuso_beta', 'obtuso_gamma', 'singular'] as const) {
            const result = transformarSombras(manchaMock, proto)
            for (let i = 0; i < manchaMock.length; i++) {
                expect(result[i].t).toBe(manchaMock[i].t)
            }
        }
    })
})
