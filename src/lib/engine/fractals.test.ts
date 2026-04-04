import { describe, it, expect } from 'vitest'
import {
    calcularAngulos,
    classificarForma,
    areaHeron,
    buildSprintTriangle,
    calcularSaudeGlobal,
    validarSprintsSequenciais,
} from './fractals'

// ─── Ângulos ────────────────────────────────────────────────────────────

describe('calcularAngulos', () => {
    it('triângulo equilátero → 60°, 60°, 60°', () => {
        const [a, b, g] = calcularAngulos(1, 1, 1)
        expect(a).toBeCloseTo(60, 0)
        expect(b).toBeCloseTo(60, 0)
        expect(g).toBeCloseTo(60, 0)
    })

    it('soma dos ângulos = 180°', () => {
        const [a, b, g] = calcularAngulos(1, 0.8, 0.6)
        expect(a + b + g).toBeCloseTo(180, 0)
    })

    it('retorna [0,0,0] para lados inválidos', () => {
        expect(calcularAngulos(0, 1, 1)).toEqual([0, 0, 0])
        expect(calcularAngulos(-1, 1, 1)).toEqual([0, 0, 0])
    })

    it('retorna [0,0,0] para triângulo degenerado', () => {
        expect(calcularAngulos(1, 1, 3)).toEqual([0, 0, 0])
    })

    it('D24: aceita triângulo obtusângulo', () => {
        const [a, b, g] = calcularAngulos(1, 0.3, 0.9)
        const maxAngulo = Math.max(a, b, g)
        expect(maxAngulo).toBeGreaterThan(90) // obtusângulo
    })
})

// ─── Forma ──────────────────────────────────────────────────────────────

describe('classificarForma', () => {
    it('equilátero para ângulos iguais', () => {
        expect(classificarForma(60, 60, 60)).toBe('equilatero')
    })

    it('isósceles para dois ângulos iguais', () => {
        expect(classificarForma(70, 70, 40)).toBe('isosceles')
    })

    it('D24: escaleno obtusângulo é válido', () => {
        expect(classificarForma(20, 130, 30)).toBe('escaleno_obtusangulo')
    })

    it('escaleno acutângulo', () => {
        expect(classificarForma(50, 70, 60)).toBe('escaleno_acutangulo')
    })

    it('degenerado para zeros', () => {
        expect(classificarForma(0, 0, 0)).toBe('degenerado')
    })
})

// ─── Área (Heron) ───────────────────────────────────────────────────────

describe('areaHeron', () => {
    it('triângulo equilátero unitário ≈ 0.433', () => {
        expect(areaHeron(1, 1, 1)).toBeCloseTo(0.433, 2)
    })

    it('triângulo degenerado → 0', () => {
        expect(areaHeron(1, 1, 3)).toBe(0)
    })

    it('triângulo retângulo 3-4-5 → 6', () => {
        expect(areaHeron(3, 4, 5)).toBeCloseTo(6, 5)
    })
})

// ─── Build Sprint Triangle ──────────────────────────────────────────────

describe('buildSprintTriangle', () => {
    it('constrói sprint com E=1 fixo', () => {
        const sprint = buildSprintTriangle(
            'S1', 'Sprint 1', 1,
            50, 40, 20,
            '2026-04-01', '2026-04-14', 'ativo'
        )
        expect(sprint.E).toBe(1.0)
        expect(sprint.P).toBeCloseTo(0.5)  // 1 - 50/100
        expect(sprint.C).toBeCloseTo(0.4)  // 40/100
        expect(sprint.status).toBe('ativo')
        expect(sprint.numero).toBe(1)
    })

    it('P decrescente: 100% progresso → P ≈ 0.01 (mínimo)', () => {
        const sprint = buildSprintTriangle(
            'S1', 'Sprint 1', 1,
            100, 50, 10,
            '2026-04-01', '2026-04-14', 'concluido'
        )
        expect(sprint.P).toBeCloseTo(0.01)
    })

    it('C crescente: 0% custo → C ≈ 0.01 (mínimo)', () => {
        const sprint = buildSprintTriangle(
            'S1', 'Sprint 1', 1,
            10, 0, 0,
            '2026-04-01', '2026-04-14', 'planejado'
        )
        expect(sprint.C).toBeCloseTo(0.01)
    })

    it('classifica forma corretamente', () => {
        // P=0.3 (70% progresso), C=0.8 (80% custo) → E=1, P=0.3, C=0.8 válido
        const sprint = buildSprintTriangle(
            'S1', 'Sprint 1', 1,
            70, 80, 25,
            '2026-04-01', '2026-04-14', 'ativo'
        )
        expect(sprint.forma).toBeTruthy()
        expect(sprint.alpha + sprint.beta + sprint.gamma).toBeCloseTo(180, 0)
    })
})

// ─── D12: Saúde Global ──────────────────────────────────────────────────

describe('calcularSaudeGlobal', () => {
    it('D12: saúde global usa totais, não média', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 80, 60, 10, '2026-04-01', '2026-04-14', 'concluido'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 20, 30, 70, '2026-04-15', '2026-04-28', 'ativo'),
        ]
        // 30% progresso → P=0.7, 80% custo → C=0.8 → triângulo E=1,P=0.7,C=0.8 válido
        const saude = calcularSaudeGlobal(sprints, 30, 80, 40)

        expect(saude.E_total).toBe(1.0)
        expect(saude.P_total).toBeCloseTo(0.7)
        expect(saude.C_total).toBeCloseTo(0.8)
        expect(saude.area_global).toBeGreaterThan(0)
    })

    it('contabiliza sprints por zona', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 80, 60, 10, '2026-04-01', '2026-04-14', 'concluido'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 20, 30, 70, '2026-04-15', '2026-04-28', 'ativo'),
        ]
        const saude = calcularSaudeGlobal(sprints, 50, 45, 40)

        const total = Object.values(saude.sprints_por_zona).reduce((a, b) => a + b, 0)
        expect(total).toBe(2)
    })
})

// ─── D9: Sprints Sequenciais ────────────────────────────────────────────

describe('validarSprintsSequenciais', () => {
    it('retorna vazio para sprints sequenciais', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 100, 100, 0, '2026-04-01', '2026-04-14', 'concluido'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 50, 50, 20, '2026-04-15', '2026-04-28', 'ativo'),
        ]
        expect(validarSprintsSequenciais(sprints)).toHaveLength(0)
    })

    it('detecta sobreposição', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 100, 100, 0, '2026-04-01', '2026-04-14', 'concluido'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 50, 50, 20, '2026-04-10', '2026-04-28', 'ativo'),
        ]
        const conflitos = validarSprintsSequenciais(sprints)
        expect(conflitos).toHaveLength(1)
        expect(conflitos[0].sprint_a).toBe('S1')
        expect(conflitos[0].sprint_b).toBe('S2')
    })
})
