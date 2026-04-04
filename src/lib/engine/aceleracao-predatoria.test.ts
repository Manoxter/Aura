import { describe, it, expect } from 'vitest'
import { detectarAceleracaoPredatoria } from './alertas'
import type { TAPoint } from './alertas'

// ═══════════════════════════════════════════════════════════════════════════
// aceleracao-predatoria.test.ts — Story 5.10
// Detectar padrão: ângulo E–P fecha ≥5% E IQ cai ≥3% em 2 passos consecutivos
// ═══════════════════════════════════════════════════════════════════════════

/** Helper: cria TAPoint com ângulo E–P controlado */
function ponto(E: number, P: number, O: number, iq: number): TAPoint {
    return { E, P, O, iq }
}

// ─── Padrão predatório detectado ─────────────────────────────────────────

describe('detectarAceleracaoPredatoria — detecta padrão', () => {
    it('detecta quando ângulo fecha ≥5% E IQ cai ≥3%', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),   // ângulo = atan2(1.0, 1.0) = 45°
            ponto(1.0, 0.80, 1.0, 0.75),   // ângulo = atan2(0.80, 1.0) < 45° (fecha), IQ caiu
        ]
        // atan2(0.80, 1.0) / atan2(1.0, 1.0) ≈ 0.675 / 0.785 ≈ 0.86 < 0.95 → ângulo fechou
        // IQ: 0.75 / 0.80 = 0.9375 < 0.97 → IQ caiu
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).not.toBeNull()
        expect(result!.tipo).toBe('aceleracao_predatoria')
    })

    it('retorna ângulos e IQs corretos no resultado', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),
            ponto(1.0, 0.80, 1.0, 0.75),
        ]
        const result = detectarAceleracaoPredatoria(historico)!
        expect(result.iq_anterior).toBeCloseTo(0.80)
        expect(result.iq_atual).toBeCloseTo(0.75)
        expect(result.anguloEP_anterior).toBeCloseTo(Math.atan2(1.0, 1.0))
        expect(result.anguloEP_atual).toBeCloseTo(Math.atan2(0.80, 1.0))
    })

    it('usa último par do histórico (3+ pontos)', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 0.5, 1.0, 0.90),   // ponto antigo — não deve ser usado
            ponto(1.0, 1.0, 1.0, 0.80),   // t-1
            ponto(1.0, 0.80, 1.0, 0.75),  // t — predatório
        ]
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).not.toBeNull()
    })
})

// ─── Padrão NÃO predatório ────────────────────────────────────────────────

describe('detectarAceleracaoPredatoria — não detecta', () => {
    it('retorna null com histórico de 1 ponto', () => {
        const historico: TAPoint[] = [ponto(1.0, 1.0, 1.0, 0.80)]
        expect(detectarAceleracaoPredatoria(historico)).toBeNull()
    })

    it('retorna null com histórico vazio', () => {
        expect(detectarAceleracaoPredatoria([])).toBeNull()
    })

    it('retorna null quando ângulo fecha mas IQ mantido (aceleração legítima)', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),
            ponto(1.0, 0.80, 1.0, 0.80),   // IQ estável — não é predatório
        ]
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).toBeNull()
    })

    it('retorna null quando IQ cai mas ângulo não fecha', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),
            ponto(1.0, 1.0, 1.0, 0.75),   // IQ caiu mas ângulo igual (E e P iguais)
        ]
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).toBeNull()
    })

    it('retorna null quando queda de ângulo < 5% (dentro da tolerância)', () => {
        // ângulo cai apenas 3% — não deve acionar
        const anguloBase = Math.atan2(1.0, 1.0)  // ~0.785 rad
        const P_leve = Math.tan(anguloBase * 0.97)  // P que gera queda de 3%
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),
            ponto(1.0, P_leve, 1.0, 0.75),  // ângulo caiu < 5%
        ]
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).toBeNull()
    })

    it('retorna null quando queda de IQ < 3% (dentro da tolerância)', () => {
        const historico: TAPoint[] = [
            ponto(1.0, 1.0, 1.0, 0.80),
            ponto(1.0, 0.80, 1.0, 0.79),   // IQ caiu só 1.25% — não aciona
        ]
        const result = detectarAceleracaoPredatoria(historico)
        expect(result).toBeNull()
    })
})
