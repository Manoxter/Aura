import { describe, it, expect } from 'vitest'
import {
    isRegistroRemissao,
    buildMotivoRemissao,
    REMISSAO_PREFIX,
} from './tm-versoes'

// ══════════════════════════════════════════════════════════════
// Story 2.8 — isRegistroRemissao() + buildMotivoRemissao()
// Funções puras do sistema de Histórico de Remissões
// ══════════════════════════════════════════════════════════════

describe('isRegistroRemissao()', () => {
    it('motivo vazio → false', () => {
        expect(isRegistroRemissao('')).toBe(false)
    })

    it('motivo de pecado (aditivo) → false', () => {
        expect(isRegistroRemissao('Aditivo escopo por mudança de requisito do cliente')).toBe(false)
    })

    it('motivo de remissão beta → true', () => {
        const motivo = buildMotivoRemissao('beta')
        expect(isRegistroRemissao(motivo)).toBe(true)
    })

    it('motivo com prefixo canônico → true', () => {
        expect(isRegistroRemissao(`${REMISSAO_PREFIX} — qualquer continuação`)).toBe(true)
    })
})

describe('buildMotivoRemissao()', () => {
    it('beta → contém β e tem ≥ 20 caracteres', () => {
        const m = buildMotivoRemissao('beta')
        expect(m).toContain('β')
        expect(m.length).toBeGreaterThanOrEqual(20)
    })

    it('gamma → contém γ e tem ≥ 20 caracteres', () => {
        const m = buildMotivoRemissao('gamma')
        expect(m).toContain('γ')
        expect(m.length).toBeGreaterThanOrEqual(20)
    })

    it('beta e gamma produzem motivos distintos', () => {
        expect(buildMotivoRemissao('beta')).not.toBe(buildMotivoRemissao('gamma'))
    })
})

// ══════════════════════════════════════════════════════════════
// Story 2.10 — VersaoTM.area_regime_obtuso (dado longitudinal)
// ══════════════════════════════════════════════════════════════

import type { VersaoTM } from './tm-versoes'

describe('VersaoTM.area_regime_obtuso (Story 2.10)', () => {
    it('campo opcional aceita undefined', () => {
        const v: VersaoTM = {
            id: '1', projeto_id: 'p', tenant_id: 't', versao: 1,
            area_baseline: 6, lados: { E_antes:3, P_antes:4, O_antes:5, E_depois:3, P_depois:4, O_depois:5 },
            motivo: '🔄 Remissão — Regime β recuperado', zona_mated: 'OTIMO', criado_em: '2026-01-01',
        }
        expect(v.area_regime_obtuso).toBeUndefined()
    })

    it('campo opcional aceita número positivo', () => {
        const v: VersaoTM = {
            id: '2', projeto_id: 'p', tenant_id: 't', versao: 2,
            area_baseline: 6, lados: { E_antes:3, P_antes:4, O_antes:5, E_depois:3, P_depois:4, O_depois:5 },
            motivo: '🔄 Remissão — Regime β recuperado', zona_mated: 'OTIMO', criado_em: '2026-01-01',
            area_regime_obtuso: 4.2,
        }
        expect(v.area_regime_obtuso).toBe(4.2)
    })
})
