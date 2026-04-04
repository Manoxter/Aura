import { describe, it, expect } from 'vitest'
import {
    construirTriangulo,
    selecionarAncora,
    areaTrianguloAncorado,
    centroideAncorado,
    paraFormatoPlotter,
} from './ancora-semantica'

// ─── Helper: distância euclidiana ────────────────────────────────────────────
function dist(a: [number, number], b: [number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

// ─── Helper: área de Heron para comparação ───────────────────────────────────
function areaHeron(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2
    return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)))
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Triângulo equilátero: E=C=P=1
const EQ = { E: 1, C: 1, P: 1 }

// Triângulo acutângulo escaleno: E=1, C=1.3, P=1.2
const AGUDO = { E: 1, C: 1.3, P: 1.2 }

// Triângulo obtuso em custo (beta): C >> E, P → C²>E²+P²
// E=1, C=2.0, P=1.2 → C²=4 > E²+P²=1+1.44=2.44 ✓
const BETA = { E: 1, C: 2.0, P: 1.2 }

// Triângulo obtuso em prazo (gamma): P >> E, C → P²>E²+C²
// E=1, C=1.2, P=2.0 → P²=4 > E²+C²=1+1.44=2.44 ✓
const GAMMA = { E: 1, C: 1.2, P: 2.0 }

// Triângulo retângulo (singular): E²+P² = C² → C=sqrt(1+1.44)=sqrt(2.44)≈1.562
const SINGULAR = { E: 1, C: Math.sqrt(2.44), P: 1.2 }

// ─── Congruência SSS ─────────────────────────────────────────────────────────

describe('Congruência SSS: triângulo idêntico em todos os protocolos', () => {
    it('equilátero produz mesmos 3 lados em α, β, γ', () => {
        const a = construirTriangulo(EQ.E, EQ.C, EQ.P, 'agudo')
        const b = construirTriangulo(EQ.E, EQ.C, EQ.P, 'obtuso_beta')
        const g = construirTriangulo(EQ.E, EQ.C, EQ.P, 'obtuso_gamma')

        // Todos devem ter os mesmos 3 comprimentos de lado (permutação)
        const ladesA = [dist(a.V0, a.V1), dist(a.V0, a.V2), dist(a.V1, a.V2)].sort()
        const ladesB = [dist(b.V0, b.V1), dist(b.V0, b.V2), dist(b.V1, b.V2)].sort()
        const ladesG = [dist(g.V0, g.V1), dist(g.V0, g.V2), dist(g.V1, g.V2)].sort()

        for (let i = 0; i < 3; i++) {
            expect(ladesA[i]).toBeCloseTo(ladesB[i], 10)
            expect(ladesA[i]).toBeCloseTo(ladesG[i], 10)
        }
    })

    it('escaleno agudo: lados são {E, C, P} como conjunto', () => {
        const t = construirTriangulo(AGUDO.E, AGUDO.C, AGUDO.P, 'agudo')
        const lados = [dist(t.V0, t.V1), dist(t.V0, t.V2), dist(t.V1, t.V2)].sort()
        const esperado = [AGUDO.E, AGUDO.C, AGUDO.P].sort()
        for (let i = 0; i < 3; i++) {
            expect(lados[i]).toBeCloseTo(esperado[i], 10)
        }
    })

    it('beta: lados são {E, C, P} como conjunto', () => {
        const t = construirTriangulo(BETA.E, BETA.C, BETA.P, 'obtuso_beta')
        const lados = [dist(t.V0, t.V1), dist(t.V0, t.V2), dist(t.V1, t.V2)].sort()
        const esperado = [BETA.E, BETA.C, BETA.P].sort()
        for (let i = 0; i < 3; i++) {
            expect(lados[i]).toBeCloseTo(esperado[i], 10)
        }
    })

    it('gamma: lados são {E, C, P} como conjunto', () => {
        const t = construirTriangulo(GAMMA.E, GAMMA.C, GAMMA.P, 'obtuso_gamma')
        const lados = [dist(t.V0, t.V1), dist(t.V0, t.V2), dist(t.V1, t.V2)].sort()
        const esperado = [GAMMA.E, GAMMA.C, GAMMA.P].sort()
        for (let i = 0; i < 3; i++) {
            expect(lados[i]).toBeCloseTo(esperado[i], 10)
        }
    })

    it('singular: lados são {E, C, P} como conjunto', () => {
        const t = construirTriangulo(SINGULAR.E, SINGULAR.C, SINGULAR.P, 'singular')
        const lados = [dist(t.V0, t.V1), dist(t.V0, t.V2), dist(t.V1, t.V2)].sort()
        const esperado = [SINGULAR.E, SINGULAR.C, SINGULAR.P].sort()
        for (let i = 0; i < 3; i++) {
            expect(lados[i]).toBeCloseTo(esperado[i], 6)
        }
    })
})

// ─── Área preservada (Heron) ─────────────────────────────────────────────────

describe('Área preservada: Heron = cross-product para todos os protocolos', () => {
    const cases = [
        { name: 'equilátero', ...EQ, proto: 'agudo' as const },
        { name: 'agudo escaleno', ...AGUDO, proto: 'agudo' as const },
        { name: 'beta', ...BETA, proto: 'obtuso_beta' as const },
        { name: 'gamma', ...GAMMA, proto: 'obtuso_gamma' as const },
        { name: 'singular', ...SINGULAR, proto: 'singular' as const },
    ]

    for (const { name, E, C, P, proto } of cases) {
        it(`${name} (${proto}): área cross-product = Heron`, () => {
            const t = construirTriangulo(E, C, P, proto)
            const areaCP = areaTrianguloAncorado(t)
            const areaH = areaHeron(E, C, P)
            expect(areaCP).toBeCloseTo(areaH, 8)
        })
    }
})

// ─── Orientação por protocolo ────────────────────────────────────────────────

describe('Orientação visual por protocolo', () => {
    it('agudo: V2 abre para CIMA (y > 0)', () => {
        const t = construirTriangulo(AGUDO.E, AGUDO.C, AGUDO.P, 'agudo')
        expect(t.V2[1]).toBeGreaterThan(0)
    })

    it('beta: V2 abre para BAIXO (y < 0) — flipY', () => {
        const t = construirTriangulo(BETA.E, BETA.C, BETA.P, 'obtuso_beta')
        expect(t.V2[1]).toBeLessThan(0)
    })

    it('gamma: V2 abre para CIMA (y > 0) — sem flipY', () => {
        const t = construirTriangulo(GAMMA.E, GAMMA.C, GAMMA.P, 'obtuso_gamma')
        expect(t.V2[1]).toBeGreaterThan(0)
    })

    it('singular: V2 abre para CIMA (herda de α)', () => {
        const t = construirTriangulo(SINGULAR.E, SINGULAR.C, SINGULAR.P, 'singular')
        expect(t.V2[1]).toBeGreaterThan(0)
    })
})

// ─── Seleção de âncora ─────────────────────────────────────────────���────────

describe('selecionarAncora', () => {
    it('agudo: âncora = ε, base = C, angular = P, oposto = E', () => {
        const cfg = selecionarAncora(1, 1.3, 1.2, 'agudo')
        expect(cfg.vertice).toBe('epsilon')
        expect(cfg.a).toBe(1.3) // C na base
        expect(cfg.b).toBe(1.2) // P angular
        expect(cfg.c).toBe(1)   // E oposto
        expect(cfg.flipY).toBe(false)
    })

    it('beta: âncora = ω, base = E, angular = C, oposto = P, flipY=true', () => {
        const cfg = selecionarAncora(1, 2.0, 1.2, 'obtuso_beta')
        expect(cfg.vertice).toBe('omega')
        expect(cfg.a).toBe(1)   // E na base
        expect(cfg.b).toBe(2.0) // C angular (dominante)
        expect(cfg.c).toBe(1.2) // P oposto
        expect(cfg.flipY).toBe(true)
    })

    it('gamma: âncora = α, base = E, angular = P, oposto = C', () => {
        const cfg = selecionarAncora(1, 1.2, 2.0, 'obtuso_gamma')
        expect(cfg.vertice).toBe('alpha')
        expect(cfg.a).toBe(1)   // E na base
        expect(cfg.b).toBe(2.0) // P angular (dominante)
        expect(cfg.c).toBe(1.2) // C oposto
        expect(cfg.flipY).toBe(false)
    })

    it('singular: herda config de agudo (âncora = ε)', () => {
        const cfg = selecionarAncora(1, 1.5, 1.2, 'singular')
        expect(cfg.vertice).toBe('epsilon')
        expect(cfg.flipY).toBe(false)
    })
})

// ─── Mapa semântico ──────────────────────────────────────────────────────────

describe('Mapa semântico de lados', () => {
    it('agudo: V0V1=C, V0V2=P, V1V2=E', () => {
        const cfg = selecionarAncora(1, 1.3, 1.2, 'agudo')
        expect(cfg.mapaLados.V0V1).toBe('C')
        expect(cfg.mapaLados.V0V2).toBe('P')
        expect(cfg.mapaLados.V1V2).toBe('E')
    })

    it('beta: V0V1=E, V0V2=C, V1V2=P', () => {
        const cfg = selecionarAncora(1, 2.0, 1.2, 'obtuso_beta')
        expect(cfg.mapaLados.V0V1).toBe('E')
        expect(cfg.mapaLados.V0V2).toBe('C')
        expect(cfg.mapaLados.V1V2).toBe('P')
    })
})

// ─── Utilitários ─────────────────────────────────────────────────────────────

describe('centroideAncorado', () => {
    it('centróide é a média dos 3 vértices', () => {
        const t = construirTriangulo(AGUDO.E, AGUDO.C, AGUDO.P, 'agudo')
        const [cx, cy] = centroideAncorado(t)
        expect(cx).toBeCloseTo((t.V0[0] + t.V1[0] + t.V2[0]) / 3, 10)
        expect(cy).toBeCloseTo((t.V0[1] + t.V1[1] + t.V2[1]) / 3, 10)
    })
})

describe('paraFormatoPlotter', () => {
    it('converte para {A, B, C} com x/y', () => {
        const t = construirTriangulo(1, 1.3, 1.2, 'agudo')
        const fmt = paraFormatoPlotter(t)
        expect(fmt.A.x).toBe(t.V0[0])
        expect(fmt.A.y).toBe(t.V0[1])
        expect(fmt.B.x).toBe(t.V1[0])
        expect(fmt.B.y).toBe(t.V1[1])
        expect(fmt.C.x).toBe(t.V2[0])
        expect(fmt.C.y).toBe(t.V2[1])
    })
})

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('Edge cases', () => {
    it('triângulo isósceles (C=P): todos os protocolos produzem mesma área', () => {
        const E = 1, C = 1.4, P = 1.4
        const aH = areaHeron(E, C, P)
        for (const proto of ['agudo', 'obtuso_beta', 'obtuso_gamma', 'singular'] as const) {
            const t = construirTriangulo(E, C, P, proto)
            expect(areaTrianguloAncorado(t)).toBeCloseTo(aH, 8)
        }
    })

    it('triângulo muito obtuso (170°): não colapsa, área > 0', () => {
        // C muito grande: E=1, P=1.05, C=2.04 → ângulo ≈ 170°
        const E = 1, C = 2.04, P = 1.05
        const t = construirTriangulo(E, C, P, 'obtuso_beta')
        const area = areaTrianguloAncorado(t)
        expect(area).toBeGreaterThan(0)
        expect(isFinite(t.V2[0])).toBe(true)
        expect(isFinite(t.V2[1])).toBe(true)
    })

    it('V0 sempre na origem', () => {
        for (const proto of ['agudo', 'obtuso_beta', 'obtuso_gamma', 'singular'] as const) {
            const t = construirTriangulo(1, 1.3, 1.2, proto)
            expect(t.V0[0]).toBe(0)
            expect(t.V0[1]).toBe(0)
        }
    })

    it('V1 sempre no eixo X positivo', () => {
        for (const proto of ['agudo', 'obtuso_beta', 'obtuso_gamma', 'singular'] as const) {
            const t = construirTriangulo(1, 1.3, 1.2, proto)
            expect(t.V1[0]).toBeGreaterThan(0)
            expect(t.V1[1]).toBe(0)
        }
    })
})
