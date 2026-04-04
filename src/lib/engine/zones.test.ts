import { describe, it, expect } from 'vitest'
import { classificarCandidatoCEt, LimitesZona } from './zones'

// ══════════════════════════════════════════════════════════════════════════════
// Story 3.0-C — classificarCandidatoCEt()
// Zonas: Verde / Amarela / Vermelha / Cinza / Nula
// ══════════════════════════════════════════════════════════════════════════════

/** Limites padrão para a maioria dos testes (contingência 15%) */
const LIMITES_BASE: LimitesZona = {
    caminho_critico_baseline_dias: 120,
    prazo_total_dias: 180,           // folga máx = 180/120 = 1.5
    percentual_contingencia: 15,     // limite O = 1.15
    orcamento_operacional: 850_000,  // orcamento_total=1_000_000 × 0.85
}

describe('classificarCandidatoCEt()', () => {

    // ─── Zona Verde ───────────────────────────────────────────────────────────

    it('AC-2: P=0.8, O=0.9 → Verde', () => {
        const r = classificarCandidatoCEt({ P: 0.8, O: 0.9 }, LIMITES_BASE)
        expect(r.zona).toBe('verde')
        expect(r.bloqueado).toBe(false)
        expect(r.dias_extra).toBe(0)
        expect(r.custo_extra_brl).toBe(0)
    })

    it('Verde: P=1.0, O=1.0 (limite exato do operacional)', () => {
        const r = classificarCandidatoCEt({ P: 1.0, O: 1.0 }, LIMITES_BASE)
        expect(r.zona).toBe('verde')
    })

    // ─── Zona Amarela ─────────────────────────────────────────────────────────

    it('AC-2: P=1.1 (dentro da folga) → Amarela', () => {
        const r = classificarCandidatoCEt({ P: 1.1, O: 0.9 }, LIMITES_BASE)
        expect(r.zona).toBe('amarela')
        expect(r.bloqueado).toBe(false)
        expect(r.dias_extra).toBeGreaterThan(0)
    })

    it('AC-2: O=1.1 (dentro da contingência 15%) → Amarela', () => {
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.1 }, LIMITES_BASE)
        expect(r.zona).toBe('amarela')
        expect(r.bloqueado).toBe(false)
        expect(r.custo_extra_brl).toBeGreaterThan(0)
    })

    it('Amarela quando P e O ambos levemente acima de 1.0', () => {
        const r = classificarCandidatoCEt({ P: 1.2, O: 1.05 }, LIMITES_BASE)
        expect(r.zona).toBe('amarela')
    })

    // ─── Zona Vermelha ────────────────────────────────────────────────────────

    it('AC-2: O=1.16 (esgota contingência 15% ±0.01) → Vermelha', () => {
        // limite O_contingencia = 1.15 → |1.16 - 1.15| = 0.01 ≤ 0.01
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.16 }, LIMITES_BASE)
        expect(r.zona).toBe('vermelha')
        expect(r.bloqueado).toBe(false)
        expect(r.consequencia).toContain('contingência')
    })

    it('Vermelha: P esgota folga (P = prazo_total / caminho_critico = 1.5)', () => {
        // limiteP_folga = 180/120 = 1.5
        const r = classificarCandidatoCEt({ P: 1.5, O: 0.9 }, LIMITES_BASE)
        expect(r.zona).toBe('vermelha')
        expect(r.bloqueado).toBe(false)
        expect(r.consequencia).toContain('prazo')
    })

    it('Vermelha: P e O ambos no limiar simultâneo', () => {
        const r = classificarCandidatoCEt({ P: 1.5, O: 1.15 }, LIMITES_BASE)
        expect(r.zona).toBe('vermelha')
        expect(r.consequencia).toContain('Prazo e orçamento')
    })

    // ─── Zona Cinza ───────────────────────────────────────────────────────────

    it('AC-2: P > prazo_total/caminho_critico → Cinza', () => {
        // limiteP_folga = 1.5 → P=1.8 > 1.5
        const r = classificarCandidatoCEt({ P: 1.8, O: 0.9 }, LIMITES_BASE)
        expect(r.zona).toBe('cinza')
        expect(r.bloqueado).toBe(false)
        expect(r.consequencia).toContain('janela contratual')
    })

    // ─── Zona Nula ────────────────────────────────────────────────────────────

    it('AC-2: O=1.20 (contingência 15%) → Nula, bloqueado=true', () => {
        // limite O_contingencia = 1.15 → O=1.20 > 1.15 + 0.01
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.20 }, LIMITES_BASE)
        expect(r.zona).toBe('nula')
        expect(r.bloqueado).toBe(true)
        expect(r.consequencia).toContain('bloqueada')
    })

    it('Nula tem prioridade sobre Cinza quando ambos ultrapassam limites', () => {
        const r = classificarCandidatoCEt({ P: 2.0, O: 1.25 }, LIMITES_BASE)
        expect(r.zona).toBe('nula')
        expect(r.bloqueado).toBe(true)
    })

    // ─── Desnormalização ──────────────────────────────────────────────────────

    it('AC-3: P=1.5, caminho=120 → prazo_real=180 dias, dias_extra=60', () => {
        const r = classificarCandidatoCEt({ P: 1.5, O: 0.9 }, LIMITES_BASE)
        expect(r.prazo_real_dias).toBeCloseTo(180, 4)
        expect(r.dias_extra).toBeCloseTo(60, 4)
    })

    it('AC-3: O=0.5, orcamento_operacional=850_000 → custo_real=425_000', () => {
        const r = classificarCandidatoCEt({ P: 0.8, O: 0.5 }, LIMITES_BASE)
        expect(r.custo_real_brl).toBeCloseTo(425_000, 0)
        expect(r.custo_extra_brl).toBe(0)
    })

    it('AC-3: O=1.1 → custo_extra_brl = 0.1 × orcamento_operacional', () => {
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.1 }, LIMITES_BASE)
        expect(r.custo_extra_brl).toBeCloseTo(0.1 * 850_000, 0)
    })

    // ─── Contingência 10% ────────────────────────────────────────────────────

    it('com pct=10%: O=1.05 → Amarela (dentro da contingência)', () => {
        const limites10: LimitesZona = { ...LIMITES_BASE, percentual_contingencia: 10, orcamento_operacional: 900_000 }
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.05 }, limites10)
        expect(r.zona).toBe('amarela')
    })

    it('com pct=10%: O=1.12 → Nula (acima de 1.10 + 0.01)', () => {
        const limites10: LimitesZona = { ...LIMITES_BASE, percentual_contingencia: 10, orcamento_operacional: 900_000 }
        // limite = 1.10, O=1.12 > 1.11
        const r = classificarCandidatoCEt({ P: 0.8, O: 1.12 }, limites10)
        expect(r.zona).toBe('nula')
        expect(r.bloqueado).toBe(true)
    })

})
