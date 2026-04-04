import { describe, it, expect } from 'vitest'
import { inverterCoordenadas, detectarRemissao, MSG_REMISSAO_POSITIVA, MSG_RISCO_CRITICO } from './modo-invertido'
import { sintetizarClairaut } from './clairaut'
import type { TrianguloCDT } from './math'
import type { ResultadoSC } from './clairaut'

// ══════════════════════════════════════════════════════════════
// Story 2.5 — inverterCoordenadas(): reflexão geométrica β/γ
// ══════════════════════════════════════════════════════════════

/** Equilátero normalizado: E=(0,0), P=(1,0), O=(0.5, 0.866) */
const TRI_EQ: TrianguloCDT = {
    E: { x: 0, y: 0 },
    P: { x: 1, y: 0 },
    O: { x: 0.5, y: 0.866 },
}

function ladosCDT(t: TrianguloCDT) {
    const E = Math.sqrt((t.E.x - t.P.x) ** 2 + (t.E.y - t.P.y) ** 2)
    const P = Math.sqrt((t.P.x - t.O.x) ** 2 + (t.P.y - t.O.y) ** 2)
    const O = Math.sqrt((t.E.x - t.O.x) ** 2 + (t.E.y - t.O.y) ** 2)
    return { E, P, O }
}

describe('inverterCoordenadas()', () => {
    it('resultado null → triangle inalterado', () => {
        const r = inverterCoordenadas(TRI_EQ, null)
        expect(r).toStrictEqual(TRI_EQ)
    })

    it('tipo agudo → triangle inalterado', () => {
        const sc = sintetizarClairaut(1, 1, 1)
        const r = inverterCoordenadas(TRI_EQ, sc)
        expect(r).toStrictEqual(TRI_EQ)
        expect(sc.tipo).toBe('agudo')
    })

    it('tipo singular → triangle inalterado', () => {
        // Ângulo reto: 3-4-5 right triangle (3² + 4² = 5²)
        const sc = sintetizarClairaut(3, 4, 5)
        const r = inverterCoordenadas(TRI_EQ, sc)
        expect(r).toStrictEqual(TRI_EQ)
        expect(sc.tipo).toBe('singular')
    })

    it('obtuso_beta → E refletido, P e O inalterados (custo em colapso)', () => {
        // E²+P² < O²: escopo²+prazo² < orcamento² → obtuso_beta (custo)
        // Exemplo: E=3, P=3, O=5.9 → E²+P²=18 < O²=34.81
        const sc = sintetizarClairaut(3, 3, 5.9)
        expect(sc.tipo).toBe('obtuso_beta')

        const E = 3
        const P = 3
        const O = 5.9
        const cosOmega = (E * E + P * P - O * O) / (2 * E * P)
        const sinOmega = Math.sqrt(Math.abs(1 - cosOmega * cosOmega))
        const tri: TrianguloCDT = {
            E: { x: 0, y: 0 },
            P: { x: E, y: 0 },
            O: { x: P * cosOmega, y: P * sinOmega },
        }

        const inv = inverterCoordenadas(tri, sc)
        // P e O inalterados
        expect(inv.P).toStrictEqual(tri.P)
        expect(inv.O).toStrictEqual(tri.O)
        // E foi refletido (diferente do original)
        expect(inv.E.x).not.toBeCloseTo(tri.E.x, 3)
    })

    it('obtuso_gamma → P refletido, E e O inalterados (prazo em colapso)', () => {
        // E²+O² < P²: escopo²+orcamento² < prazo² → obtuso_gamma (prazo)
        // Exemplo: E=3, O=3, P=5.9 → E²+O²=18 < P²=34.81
        const sc = sintetizarClairaut(3, 5.9, 3)
        expect(sc.tipo).toBe('obtuso_gamma')

        // Cria triângulo com os mesmos lados no plano 2D
        const E = 3
        const O = 3
        const P = 5.9
        const cosOmega = (E * E + P * P - O * O) / (2 * E * P)
        const sinOmega = Math.sqrt(1 - cosOmega * cosOmega)
        const tri: TrianguloCDT = {
            E: { x: 0, y: 0 },
            P: { x: E, y: 0 },
            O: { x: P * cosOmega, y: P * sinOmega },
        }

        const inv = inverterCoordenadas(tri, sc)
        // E e O inalterados
        expect(inv.E).toStrictEqual(tri.E)
        expect(inv.O).toStrictEqual(tri.O)
        // P foi refletido (diferente do original)
        expect(inv.P.x).not.toBeCloseTo(tri.P.x, 3)
    })

    it('beta: lados do triângulo invertido permanecem finitos e positivos', () => {
        const sc = sintetizarClairaut(3, 3, 5.9)
        const E = 3, P = 3, O = 5.9
        const cosOmega = (E * E + P * P - O * O) / (2 * E * P)
        const sinOmega = Math.sqrt(1 - cosOmega * cosOmega)
        const tri: TrianguloCDT = {
            E: { x: 0, y: 0 },
            P: { x: E, y: 0 },
            O: { x: P * cosOmega, y: P * sinOmega },
        }
        const inv = inverterCoordenadas(tri, sc)
        const lados = ladosCDT(inv)
        expect(isFinite(lados.E)).toBe(true)
        expect(isFinite(lados.P)).toBe(true)
        expect(isFinite(lados.O)).toBe(true)
        expect(lados.E).toBeGreaterThan(0)
    })
})

// ══════════════════════════════════════════════════════════════
// Story 2.7 — detectarRemissao(): detecção de Remissão β/γ→agudo
// ══════════════════════════════════════════════════════════════

const scAgudo: ResultadoSC = { tipo: 'agudo', alpha: 60, omega: 60, epsilon: 60, IR: 0, Ralpha: 0, Romega: 0 }
const scBeta: ResultadoSC = { tipo: 'obtuso_beta', alpha: 40, omega: 100, epsilon: 40, IR: 0.56, Ralpha: 0, Romega: 0.5 }
const scGamma: ResultadoSC = { tipo: 'obtuso_gamma', alpha: 100, omega: 40, epsilon: 40, IR: 0.56, Ralpha: 0.5, Romega: 0 }

describe('detectarRemissao()', () => {
    it('anterior null → remitiu: false', () => {
        expect(detectarRemissao(null, scAgudo).remitiu).toBe(false)
    })

    it('anterior agudo → remitiu: false (nunca estava em crise)', () => {
        expect(detectarRemissao(scAgudo, scAgudo).remitiu).toBe(false)
    })

    it('beta → agudo → remitiu: true, tipoAnterior: beta', () => {
        const r = detectarRemissao(scBeta, scAgudo)
        expect(r.remitiu).toBe(true)
        expect(r.tipoAnterior).toBe('beta')
    })

    it('gamma → agudo → remitiu: true, tipoAnterior: gamma', () => {
        const r = detectarRemissao(scGamma, scAgudo)
        expect(r.remitiu).toBe(true)
        expect(r.tipoAnterior).toBe('gamma')
    })

    it('beta → beta → remitiu: false (ainda em crise)', () => {
        expect(detectarRemissao(scBeta, scBeta).remitiu).toBe(false)
    })
})

// ══════════════════════════════════════════════════════════════
// Story 2.9 — MSG_REMISSAO_POSITIVA
// Mensagens de Crise Positiva para o Gabinete de Crise
// ══════════════════════════════════════════════════════════════

describe('MSG_REMISSAO_POSITIVA', () => {
    it('beta → mensagem não vazia com ≥ 20 chars', () => {
        expect(MSG_REMISSAO_POSITIVA.beta.length).toBeGreaterThanOrEqual(20)
    })

    it('gamma → mensagem não vazia com ≥ 20 chars', () => {
        expect(MSG_REMISSAO_POSITIVA.gamma.length).toBeGreaterThanOrEqual(20)
    })

    it('beta e gamma têm mensagens distintas', () => {
        expect(MSG_REMISSAO_POSITIVA.beta).not.toBe(MSG_REMISSAO_POSITIVA.gamma)
    })
})

// ══════════════════════════════════════════════════════════════
// Story 13.4 — MSG_RISCO_CRITICO
// Mensagem de alerta Prometeu Extrínseco para o Klauss
// ══════════════════════════════════════════════════════════════

describe('MSG_RISCO_CRITICO', () => {
    it('é uma string com ≥ 20 chars', () => {
        expect(typeof MSG_RISCO_CRITICO).toBe('string')
        expect(MSG_RISCO_CRITICO.length).toBeGreaterThanOrEqual(20)
    })

    it('menciona Prometeu Extrínseco (AC-4)', () => {
        expect(MSG_RISCO_CRITICO).toMatch(/Prometeu Extr/i)
    })

    it('contextualiza score_rc > 0.6 (AC-4)', () => {
        expect(MSG_RISCO_CRITICO).toMatch(/score_rc|0\.6/i)
    })
})
