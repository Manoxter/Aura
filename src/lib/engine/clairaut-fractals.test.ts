import { describe, it, expect } from 'vitest'
import {
    determinarModoClairaut,
    aplicarClairautSprint,
    aplicarClairautFractais,
} from './clairaut-fractals'
import { buildSprintTriangle } from './fractals'

describe('determinarModoClairaut', () => {
    const sprint = buildSprintTriangle('S1', 'Sprint 1', 1, 50, 80, 20, '2026-04-01', '2026-04-14', 'ativo')

    it('último sprint → completo', () => {
        expect(determinarModoClairaut(sprint, true)).toBe('completo')
    })

    it('sprint não-último → simplificado', () => {
        expect(determinarModoClairaut(sprint, false)).toBe('simplificado')
    })

    it('TBZ → nenhum', () => {
        expect(determinarModoClairaut(sprint, true, true)).toBe('nenhum')
    })
})

describe('aplicarClairautSprint', () => {
    const sprint = buildSprintTriangle('S1', 'Sprint 1', 1, 30, 80, 20, '2026-04-01', '2026-04-14', 'ativo')

    it('modo completo retorna resultado + alpha', () => {
        const result = aplicarClairautSprint(sprint, 'completo')
        expect(result.modo).toBe('completo')
        expect(result.resultado).not.toBeNull()
        expect(result.alpha).toBeGreaterThan(0)
    })

    it('modo simplificado retorna apenas alpha', () => {
        const result = aplicarClairautSprint(sprint, 'simplificado')
        expect(result.modo).toBe('simplificado')
        expect(result.resultado).toBeNull()
        expect(result.alpha).toBeGreaterThan(0)
    })

    it('modo nenhum retorna tudo null', () => {
        const result = aplicarClairautSprint(sprint, 'nenhum')
        expect(result.modo).toBe('nenhum')
        expect(result.resultado).toBeNull()
        expect(result.alpha).toBeNull()
    })
})

describe('aplicarClairautFractais', () => {
    it('D23: TM total com Clairaut completo + último sprint completo', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 100, 100, 0, '2026-04-01', '2026-04-14', 'concluido'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 50, 80, 30, '2026-04-15', '2026-04-28', 'ativo'),
        ]

        const result = aplicarClairautFractais(sprints, { E: 1, P: 0.8, C: 0.9 })

        expect(result.tm_clairaut).toBeTruthy()
        expect(result.tm_clairaut.tipo).toBeTruthy()

        // S1 (não último) → simplificado
        expect(result.sprints[0].modo).toBe('simplificado')
        // S2 (último ativo) → completo
        expect(result.sprints[1].modo).toBe('completo')
    })

    it('todos planejados → nenhum último, todos simplificados', () => {
        const sprints = [
            buildSprintTriangle('S1', 'Sprint 1', 1, 0, 0, 0, '2026-04-01', '2026-04-14', 'planejado'),
            buildSprintTriangle('S2', 'Sprint 2', 2, 0, 0, 0, '2026-04-15', '2026-04-28', 'planejado'),
        ]

        const result = aplicarClairautFractais(sprints, { E: 1, P: 1, C: 1 })

        // Sem último ativo → todos simplificados
        result.sprints.forEach(s => {
            expect(s.modo).toBe('simplificado')
        })
    })
})
