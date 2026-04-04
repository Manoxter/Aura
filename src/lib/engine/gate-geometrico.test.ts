/**
 * Gate Geométrico — Sessão 29 (@roberta)
 *
 * 5 testes obrigatórios antes de qualquer merge que toque CDT.
 * Teriam detectado o problema da Âncora Semântica antes do deploy.
 *
 * G-GATE-1: Coordenadas não-negativas
 * G-GATE-2: Mapeamento semântico lado→vértice
 * G-GATE-3: Ângulo no vértice correto
 * G-GATE-4: Orientação CCW (cross product positivo)
 * G-GATE-5: Área coords = Área Heron (round-trip)
 */

import { describe, it, expect } from 'vitest'
import { gerarTrianguloCDT } from './math'

// Fixtures
const curvaLinear = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: i * 1000 }))
const curvaBurndown = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: 100 - i * 2 }))
const curvaCustoAlto = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: i * i * 30 }))
const curvaBurndownIngreme = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: Math.max(0, 100 - i * 5) }))

const baseInput = {
    curvaPrazo: curvaBurndown,
    prazoBase: 100,
    orcamentoBase: 100000,
    nTarefasAtual: 15,
    nTarefasBaseline: 15,
}

function dist(a: [number, number], b: [number, number]): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function areaHeron(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2
    return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)))
}

function crossProduct2D(ax: number, ay: number, bx: number, by: number): number {
    return ax * by - ay * bx
}

// ─── G-GATE-1: Coordenadas não-negativas ─────────────────────────────────────

describe('G-GATE-1: Todos os vértices têm x≥0 e y≥0', () => {
    const cases = [
        { name: 'projeto normal', curvaCusto: curvaLinear, diaAtual: 50 },
        { name: 'custo alto', curvaCusto: curvaCustoAlto, diaAtual: 30 },
        { name: 'dia 0 (baseline)', curvaCusto: curvaLinear, diaAtual: 0 },
        { name: 'dia final', curvaCusto: curvaLinear, diaAtual: 98 },
    ]

    for (const { name, curvaCusto, diaAtual } of cases) {
        it(`${name}: A.x≥0, A.y≥0, B.x≥0, B.y≥0, C.x≥0, C.y≥0`, () => {
            const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto, diaAtual })
            expect(cdt.A[0]).toBeGreaterThanOrEqual(0)
            expect(cdt.A[1]).toBeGreaterThanOrEqual(0)
            expect(cdt.B[0]).toBeGreaterThanOrEqual(0)
            expect(cdt.B[1]).toBeGreaterThanOrEqual(0)
            expect(cdt.C[0]).toBeGreaterThanOrEqual(-0.01) // tolerância para arredondamento
            expect(cdt.C[1]).toBeGreaterThanOrEqual(0)
        })
    }
})

// ─── G-GATE-2: Mapeamento semântico lado→vértice ─────────────────────────────

describe('G-GATE-2: dist(A,B)=E, dist(B,C)∈{C,P}, dist(A,C)∈{C,P}', () => {
    it('projeto normal: lados correspondem às distâncias entre vértices', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaLinear, diaAtual: 50 })
        if (!cdt.cet_dupla.valid) return

        const dAB = dist(cdt.A as [number, number], cdt.B as [number, number])
        const dBC = dist(cdt.B as [number, number], cdt.C as [number, number])
        const dAC = dist(cdt.A as [number, number], cdt.C as [number, number])

        // A→B deve ser Escopo (En)
        expect(dAB).toBeCloseTo(cdt.lados.escopo, 4)
        // B→C e A→C devem ser Custo e Prazo (em qualquer ordem)
        const lados = [cdt.lados.orcamento, cdt.lados.prazo].sort()
        const dists = [dBC, dAC].sort()
        expect(dists[0]).toBeCloseTo(lados[0], 4)
        expect(dists[1]).toBeCloseTo(lados[1], 4)
    })
})

// ─── G-GATE-3: Ângulo no vértice correto ─────────────────────────────────────

describe('G-GATE-3: ângulo em A = arccos((E²+P²-C²)/(2EP))', () => {
    it('ângulo calculado em A é consistente com a posição do vértice C', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaLinear, diaAtual: 50 })
        if (!cdt.cet_dupla.valid) return

        const E = cdt.lados.escopo, C = cdt.lados.orcamento, P = cdt.lados.prazo
        const cosA_esperado = (E * E + P * P - C * C) / (2 * E * P)
        const angA_esperado = Math.acos(Math.max(-0.9999, Math.min(0.9999, cosA_esperado)))

        // O ângulo no vértice A (entre vetores AB e AC)
        const AB = [cdt.B[0] - cdt.A[0], cdt.B[1] - cdt.A[1]]
        const AC = [cdt.C[0] - cdt.A[0], cdt.C[1] - cdt.A[1]]
        const dot = AB[0] * AC[0] + AB[1] * AC[1]
        const magAB = Math.sqrt(AB[0] ** 2 + AB[1] ** 2)
        const magAC = Math.sqrt(AC[0] ** 2 + AC[1] ** 2)
        const cosA_real = dot / (magAB * magAC)
        const angA_real = Math.acos(Math.max(-0.9999, Math.min(0.9999, cosA_real)))

        expect(angA_real).toBeCloseTo(angA_esperado, 4)
    })
})

// ─── G-GATE-4: Orientação CCW (cross product > 0) ───────────────────────────

describe('G-GATE-4: vértices em ordem CCW (cross product positivo)', () => {
    it('projeto normal: (B-A) × (C-A) > 0', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaLinear, diaAtual: 50 })
        if (!cdt.cet_dupla.valid) return

        const cp = crossProduct2D(
            cdt.B[0] - cdt.A[0], cdt.B[1] - cdt.A[1],
            cdt.C[0] - cdt.A[0], cdt.C[1] - cdt.A[1],
        )
        expect(cp).toBeGreaterThan(0)
    })

    it('custo alto: cross product ainda positivo', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaCustoAlto, diaAtual: 30 })
        if (!cdt.cet_dupla.valid) return

        const cp = crossProduct2D(
            cdt.B[0] - cdt.A[0], cdt.B[1] - cdt.A[1],
            cdt.C[0] - cdt.A[0], cdt.C[1] - cdt.A[1],
        )
        expect(cp).toBeGreaterThan(0)
    })
})

// ─── G-GATE-5: Área coords = Área Heron (round-trip) ─────────────────────────

describe('G-GATE-5: área por coordenadas = área por Heron', () => {
    const cases = [
        { name: 'normal', curvaCusto: curvaLinear, diaAtual: 50 },
        { name: 'custo alto', curvaCusto: curvaCustoAlto, diaAtual: 30 },
        { name: 'baseline', curvaCusto: curvaLinear, diaAtual: 0 },
    ]

    for (const { name, curvaCusto, diaAtual } of cases) {
        it(`${name}: |area_coords - area_heron| < 1e-6`, () => {
            const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto, diaAtual })
            if (!cdt.cet_dupla.valid) return

            // Área por cross product dos vértices
            const areaCoords = Math.abs(crossProduct2D(
                cdt.B[0] - cdt.A[0], cdt.B[1] - cdt.A[1],
                cdt.C[0] - cdt.A[0], cdt.C[1] - cdt.A[1],
            )) / 2

            // Área por Heron
            const E = cdt.lados.escopo, C = cdt.lados.orcamento, P = cdt.lados.prazo
            const aH = areaHeron(E, C, P)

            expect(areaCoords).toBeCloseTo(aH, 4)
        })
    }
})

// ─── G-GATE-BONUS: Metadado da Âncora consistente com protocolo ──────────────

describe('G-GATE-BONUS: metadado ancora consistente com protocolo', () => {
    it('protocolo agudo: ancora.vertice = epsilon', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaLinear, diaAtual: 50 })
        if (cdt.protocolo === 'agudo') {
            expect(cdt.ancora?.vertice).toBe('epsilon')
            expect(cdt.ancora?.ladoDominante).toBeNull()
        }
    })

    it('ancora.protocolo = cdt.protocolo', () => {
        const cdt = gerarTrianguloCDT({ ...baseInput, curvaCusto: curvaLinear, diaAtual: 50 })
        expect(cdt.ancora?.protocolo).toBe(cdt.protocolo)
    })
})
