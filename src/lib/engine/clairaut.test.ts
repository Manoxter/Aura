import { describe, it, expect } from 'vitest'
import {
  sintetizarClairaut,
  cliparProjecao,
  aplicarInvarianteVisual,
} from './clairaut'

// ══════════════════════════════════════════════════════════════════════
// @aura-math + @roberta — Síntese de Clairaut: Motor SC
// Story 2.0-engine — Sprint SC-FOUNDATION
// ══════════════════════════════════════════════════════════════════════

describe('sintetizarClairaut', () => {

  // ─── 1. Triângulo Agudo ────────────────────────────────────────────
  describe('Protocolo Agudo', () => {
    it('classifica triângulo equilátero como agudo', () => {
      const r = sintetizarClairaut(3, 3, 3)
      expect(r.tipo).toBe('agudo')
    })

    it('ângulos equilátero são aproximadamente 60°', () => {
      const r = sintetizarClairaut(3, 3, 3)
      expect(r.alpha).toBeCloseTo(60, 5)
      expect(r.omega).toBeCloseTo(60, 5)
      expect(r.epsilon).toBeCloseTo(60, 5)
    })

    it('soma dos ângulos é 180° (triângulo escaleno agudo)', () => {
      const r = sintetizarClairaut(5, 6, 7)
      expect(r.alpha + r.omega + r.epsilon).toBeCloseTo(180, 5)
    })

    it('IR mínimo quando epsilon = 60° (equilátero)', () => {
      const r = sintetizarClairaut(3, 3, 3)
      // IR = 1 - (60/90) = 1/3 ≈ 0.333
      expect(r.IR).toBeCloseTo(1 / 3, 5)
    })

    it('não há beta nem gamma no agudo', () => {
      const r = sintetizarClairaut(5, 6, 7)
      expect(r.beta).toBeUndefined()
      expect(r.gamma).toBeUndefined()
    })
  })

  // ─── 2. Protocolo β (obtuso_beta) — custo em colapso ──────────────
  describe('Protocolo β — obtuso_beta (custo em colapso)', () => {
    it('classifica triângulo com E²+P²<O² como obtuso_beta (O dominante)', () => {
      // E=3, P=4, O=6 → E²+P²=25, O²=36 → 25 < 36 → obtuso_beta
      const r = sintetizarClairaut(3, 4, 6)
      expect(r.tipo).toBe('obtuso_beta')
    })

    it('omega > 90° no obtuso_beta (ângulo oposto a O)', () => {
      const r = sintetizarClairaut(3, 4, 6)
      expect(r.omega).toBeGreaterThan(90)
    })

    it('retorna parâmetros beta com transformacao_m = reflect', () => {
      const r = sintetizarClairaut(3, 4, 6)
      expect(r.beta).toBeDefined()
      expect(r.beta!.transformacao_m).toBe('reflect')
    })

    it('b_prime = lado O (orçamento disponível)', () => {
      const r = sintetizarClairaut(3, 4, 6)
      expect(r.beta!.b_prime).toBe(6) // O = 6
    })

    it('t_ancora é numérico', () => {
      const r = sintetizarClairaut(3, 4, 6)
      expect(typeof r.beta!.t_ancora).toBe('number')
    })
  })

  // ─── 3. Protocolo γ (obtuso_gamma) — prazo em colapso ─────────────
  describe('Protocolo γ — obtuso_gamma (prazo em colapso)', () => {
    it('classifica triângulo com E²+O²<P² como obtuso_gamma (P dominante)', () => {
      // E=3, O=4, P=6 → E²+O²=25, P²=36 → 25 < 36 → obtuso_gamma
      const r = sintetizarClairaut(3, 6, 4)
      expect(r.tipo).toBe('obtuso_gamma')
    })

    it('alpha > 90° no obtuso_gamma (ângulo oposto a P)', () => {
      const r = sintetizarClairaut(3, 6, 4)
      expect(r.alpha).toBeGreaterThan(90)
    })

    it('retorna parâmetros gamma', () => {
      const r = sintetizarClairaut(3, 6, 4)
      expect(r.gamma).toBeDefined()
    })

    it('v_origem = mínimo dos lados', () => {
      const r = sintetizarClairaut(3, 6, 4)
      expect(r.gamma!.v_origem).toBe(3) // min(3,6,4) = 3
    })

    it('delta_translacao = |P - v_origem|', () => {
      const r = sintetizarClairaut(3, 6, 4)
      expect(r.gamma!.delta_translacao).toBeCloseTo(Math.abs(6 - 3), 10)
    })
  })

  // ─── 4. Estado Singular ───────────────────────────────────────────
  describe('Estado Singular (pré-gate)', () => {
    it('detecta singular quando ângulo epsilon = 90° (triângulo 3-4-5)', () => {
      // 3-4-5: ângulo reto oposto a 5 (= epsilon no vértice P-O, oposto a E)
      // Se E=5, P=3, O=4 → cos(epsilon) = (P²+O²-E²)/(2PO) = (9+16-25)/24 = 0 → epsilon=90°
      const r = sintetizarClairaut(5, 3, 4)
      expect(r.tipo).toBe('singular')
    })

    it('detecta singular quando ângulo alpha = 90°', () => {
      // alpha = ângulo vértice E-O, oposto P: cos α = (E²+O²-P²)/(2EO) = 0
      // E=3, O=4, P=5 → E²+O²=25 = P² → alpha = 90°
      const r = sintetizarClairaut(3, 5, 4)
      expect(r.tipo).toBe('singular')
    })

    it('detecta singular quando ângulo omega = 90°', () => {
      // omega = ângulo vértice E-P, oposto O: cos ω = (E²+P²-O²)/(2EP) = 0
      // E=3, P=4, O=5 → E²+P²=25 = O² → omega = 90°
      const r = sintetizarClairaut(3, 4, 5)
      expect(r.tipo).toBe('singular')
    })

    it('não tem beta nem gamma no singular', () => {
      const r = sintetizarClairaut(3, 4, 5)
      expect(r.beta).toBeUndefined()
      expect(r.gamma).toBeUndefined()
    })

    it('tolerância: ângulo 89.995° NÃO é singular', () => {
      // Triângulo levemente fora do reto — não deve ser singular
      // Usamos triângulo 3-4-5.001 que quebra a singularidade
      const r = sintetizarClairaut(3, 4.001, 5)
      expect(r.tipo).not.toBe('singular')
    })
  })

  // ─── 5. Prometeu Intrínseco ───────────────────────────────────────
  describe('Prometeu Intrínseco — IR, Rα, Rω', () => {
    it('IR = 0 quando epsilon = 90° (Estado Singular)', () => {
      const r = sintetizarClairaut(5, 3, 4)
      expect(r.tipo).toBe('singular')
      // IR = 1 - 90/90 = 0
      expect(r.IR).toBeCloseTo(0, 5)
    })

    it('IR = 1/3 quando epsilon = 60° (equilátero)', () => {
      const r = sintetizarClairaut(3, 3, 3)
      expect(r.IR).toBeCloseTo(1 / 3, 5)
    })

    it('Ralpha = 0 quando alpha <= 45°', () => {
      // E=5, O=5, P=3 → cos α = (25+25-9)/(50) = 0.82 → α ≈ 34.9° < 45°
      const r = sintetizarClairaut(5, 3, 5)
      expect(r.alpha).toBeLessThan(45)
      expect(r.Ralpha).toBe(0)
    })

    it('Ralpha = 1 quando alpha = 90°', () => {
      // alpha = 90° → Rα = (90-45)/45 = 1
      const r = sintetizarClairaut(3, 5, 4) // alpha = 90° (singular)
      // No singular também calcula
      expect(r.Ralpha).toBeCloseTo(1, 5)
    })

    it('Romega = 0 quando omega <= 45°', () => {
      // E=5, P=5, O=3 → cos ω = (25+25-9)/(50) = 0.82 → ω ≈ 34.9° < 45°
      const r = sintetizarClairaut(5, 5, 3)
      expect(r.omega).toBeLessThan(45)
      expect(r.Romega).toBe(0)
    })

    it('IR sempre em [0, 1]', () => {
      const casos = [
        [3, 4, 5], [3, 3, 3], [5, 6, 7], [3, 4, 6], [3, 6, 4],
      ] as const
      for (const [E, P, O] of casos) {
        const r = sintetizarClairaut(E, P, O)
        expect(r.IR).toBeGreaterThanOrEqual(0)
        expect(r.IR).toBeLessThanOrEqual(1)
      }
    })
  })

  // ─── 6. Estabilidade Numérica ─────────────────────────────────────
  describe('Estabilidade numérica', () => {
    it('não produz NaN para valores de ponto flutuante', () => {
      const r = sintetizarClairaut(1.0001, 1.0002, 1.0003)
      expect(Number.isNaN(r.alpha)).toBe(false)
      expect(Number.isNaN(r.omega)).toBe(false)
      expect(Number.isNaN(r.epsilon)).toBe(false)
    })

    it('não produz NaN para lados grandes', () => {
      const r = sintetizarClairaut(100000, 99999, 100001)
      expect(Number.isNaN(r.IR)).toBe(false)
    })
  })
})

// ─── cliparProjecao ────────────────────────────────────────────────
describe('cliparProjecao', () => {
  it('retorna o valor quando dentro dos limites', () => {
    expect(cliparProjecao(5, 0, 10)).toBe(5)
  })

  it('clipa no limite máximo', () => {
    expect(cliparProjecao(15, 0, 10)).toBe(10)
  })

  it('clipa no limite mínimo', () => {
    expect(cliparProjecao(-3, 0, 10)).toBe(0)
  })
})

// ─── aplicarInvarianteVisual ───────────────────────────────────────
describe('aplicarInvarianteVisual', () => {
  it('clipa todos os pontos dentro do maior lado', () => {
    const pontos = [0, 3, 7, 10]
    const resultado = aplicarInvarianteVisual(pontos, 5, 6, 7)
    // limiteMax = max(5,6,7) = 7
    expect(resultado).toEqual([0, 3, 7, 7])
  })
})
