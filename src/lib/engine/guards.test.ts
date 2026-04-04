import { describe, it, expect } from 'vitest'
import {
    isDeadZone,
    preClassificarProtocolo,
    calcularDiscriminante,
    clampCos,
    isVisualmenteViavel,
    forcarAnguloMinimo,
    classificarSlopeSign,
    safeSlopeSign,
    DELTA_CLASSIFICACAO,
    COS_CLAMP_MIN,
    COS_CLAMP_MAX,
    MIN_SIN_VISUAL,
    EPSILON_SLOPE,
} from './guards'

// ─── G1: Dead Zone ───────────────────────────────────────────────────────────

describe('G1: isDeadZone', () => {
    it('retorna true na fronteira beta (disc ≈ 1)', () => {
        // mc²=1.5, mp²=0.5 → disc=1.0 → fronteira exata
        expect(isDeadZone(1.5, 0.5)).toBe(true)
    })

    it('retorna true na fronteira gamma (disc ≈ -1)', () => {
        // mc²=0.5, mp²=1.5 → disc=-1.0 → fronteira exata
        expect(isDeadZone(0.5, 1.5)).toBe(true)
    })

    it('retorna false quando claramente beta (disc >> 1)', () => {
        // mc²=3.0, mp²=0.5 → disc=2.5 → bem acima de 1
        expect(isDeadZone(3.0, 0.5)).toBe(false)
    })

    it('retorna false quando claramente agudo (disc ≈ 0)', () => {
        // mc²=1.0, mp²=1.0 → disc=0 → equilibrado
        expect(isDeadZone(1.0, 1.0)).toBe(false)
    })

    it('respeita delta customizado', () => {
        // disc = 1.0, com delta=0.5 → dentro da dead zone
        expect(isDeadZone(1.5, 0.5, 0.5)).toBe(true)
        // disc = 1.0, com delta=0.001 → dentro
        expect(isDeadZone(1.5, 0.5, 0.001)).toBe(true)
    })
})

// ─── G2: Pré-classificação ───────────────────────────────────────────────────

describe('G2: preClassificarProtocolo', () => {
    it('retorna provavel_beta quando custo domina (mc²-mp² > 1+delta)', () => {
        // mc=2.0, mp=0.5 → mc²-mp²=4-0.25=3.75 >> 1
        expect(preClassificarProtocolo(2.0, 0.5)).toBe('provavel_beta')
    })

    it('retorna provavel_gamma quando prazo domina (mp²-mc² > 1+delta)', () => {
        // mc=0.5, mp=2.0 → mc²-mp²=0.25-4=-3.75 << -1
        expect(preClassificarProtocolo(0.5, 2.0)).toBe('provavel_gamma')
    })

    it('retorna neutro quando equilibrado', () => {
        // mc=1.0, mp=1.0 → disc=0
        expect(preClassificarProtocolo(1.0, 1.0)).toBe('neutro')
    })

    it('retorna neutro na dead zone (mc=1.1, mp=1.0 → disc=0.21 < 1)', () => {
        expect(preClassificarProtocolo(1.1, 1.0)).toBe('neutro')
    })

    it('retorna neutro para slopes zero', () => {
        expect(preClassificarProtocolo(0, 0)).toBe('neutro')
    })

    it('é algébricamente equivalente ao Clairaut para caso Big Dig', () => {
        // Caso real: mc=1.8, mp=0.9 → disc=3.24-0.81=2.43 > 1 → beta
        // Verificação: E=1, C=sqrt(1+3.24)=2.06, P=sqrt(1+0.81)=1.345
        // E²+P² = 1+1.81 = 2.81, C² = 4.24 → 2.81 < 4.24 → beta ✓
        expect(preClassificarProtocolo(1.8, 0.9)).toBe('provavel_beta')
    })
})

describe('calcularDiscriminante', () => {
    it('retorna mc²-mp²', () => {
        expect(calcularDiscriminante(2.0, 1.0)).toBe(3.0) // 4-1
    })

    it('positivo quando custo domina', () => {
        expect(calcularDiscriminante(1.5, 0.5)).toBeGreaterThan(0)
    })

    it('negativo quando prazo domina', () => {
        expect(calcularDiscriminante(0.5, 1.5)).toBeLessThan(0)
    })

    it('zero quando equilibrado', () => {
        expect(calcularDiscriminante(1.0, 1.0)).toBe(0)
    })
})

// ─── G3: Clamp Cos ───────────────────────────────────────────────────────────

describe('G3: clampCos', () => {
    it('não altera valores dentro do range', () => {
        expect(clampCos(0.5)).toBe(0.5)
        expect(clampCos(-0.5)).toBe(-0.5)
        expect(clampCos(0)).toBe(0)
    })

    it('clamp no limite superior', () => {
        expect(clampCos(1.0)).toBe(COS_CLAMP_MAX)
        expect(clampCos(1.5)).toBe(COS_CLAMP_MAX)
    })

    it('clamp no limite inferior', () => {
        expect(clampCos(-1.0)).toBe(COS_CLAMP_MIN)
        expect(clampCos(-1.5)).toBe(COS_CLAMP_MIN)
    })

    it('preserva valores próximos dos limites', () => {
        expect(clampCos(0.999)).toBe(0.999)
        expect(clampCos(-0.999)).toBe(-0.999)
    })
})

// ─── G4: Área Mínima Visual ──────────────────────────────────────────────────

describe('G4: isVisualmenteViavel', () => {
    it('triângulo normal é viável', () => {
        expect(isVisualmenteViavel(Math.sin(Math.PI / 3))).toBe(true) // 60°
    })

    it('triângulo quase colinear NÃO é viável', () => {
        expect(isVisualmenteViavel(Math.sin(0.01))).toBe(false) // ~0.57°
    })

    it('threshold exato', () => {
        expect(isVisualmenteViavel(MIN_SIN_VISUAL)).toBe(true)
        expect(isVisualmenteViavel(MIN_SIN_VISUAL - 0.001)).toBe(false)
    })
})

describe('G4: forcarAnguloMinimo', () => {
    it('não altera ângulos normais', () => {
        const ang = Math.PI / 3 // 60°
        expect(forcarAnguloMinimo(ang)).toBe(ang)
    })

    it('força ângulo mínimo para ângulos quase zero', () => {
        const result = forcarAnguloMinimo(0.005) // ~0.3°
        expect(Math.sin(result)).toBeGreaterThanOrEqual(MIN_SIN_VISUAL)
    })

    it('preserva lado obtuso para ângulos quase 180°', () => {
        const result = forcarAnguloMinimo(Math.PI - 0.005) // ~179.7°
        expect(result).toBeGreaterThan(Math.PI / 2)
        expect(Math.sin(result)).toBeGreaterThanOrEqual(MIN_SIN_VISUAL)
    })
})

// ─── G5: Slope Sign ──────────────────────────────────────────────────────────

describe('G5: classificarSlopeSign', () => {
    it('positivo para slope significativo > 0', () => {
        expect(classificarSlopeSign(0.5)).toBe('positive')
    })

    it('negativo para slope significativo < 0', () => {
        expect(classificarSlopeSign(-0.5)).toBe('negative')
    })

    it('zero para slope dentro do epsilon', () => {
        expect(classificarSlopeSign(0.00001)).toBe('zero')
        expect(classificarSlopeSign(-0.00001)).toBe('zero')
        expect(classificarSlopeSign(0)).toBe('zero')
    })
})

describe('G5: safeSlopeSign', () => {
    it('retorna sinal real quando slope é significativo', () => {
        expect(safeSlopeSign(0.5, 1)).toBe(1)
        expect(safeSlopeSign(-0.5, 1)).toBe(-1)
    })

    it('retorna default quando slope é indeterminado', () => {
        expect(safeSlopeSign(0.00001, 1)).toBe(1)   // default custo: positivo
        expect(safeSlopeSign(0.00001, -1)).toBe(-1)  // default prazo: negativo
    })
})

// ─── Integração: Fluxo completo de classificação ─────────────────────────────

describe('Fluxo integrado: slopes → pré-classificação → guards', () => {
    it('projeto saudável: mc≈mp → agudo, sem dead zone', () => {
        const mc = 0.8, mp = 0.8
        const pre = preClassificarProtocolo(mc, mp)
        const dz = isDeadZone(mc * mc, mp * mp)
        expect(pre).toBe('neutro')
        expect(dz).toBe(false)
    })

    it('projeto com custo explodindo: mc=2.5, mp=0.5 → beta', () => {
        const mc = 2.5, mp = 0.5
        const pre = preClassificarProtocolo(mc, mp)
        const disc = calcularDiscriminante(mc, mp)
        expect(pre).toBe('provavel_beta')
        expect(disc).toBeGreaterThan(1)
    })

    it('projeto com prazo em crashing: mc=0.5, mp=2.5 → gamma', () => {
        const mc = 0.5, mp = 2.5
        const pre = preClassificarProtocolo(mc, mp)
        expect(pre).toBe('provavel_gamma')
    })

    it('projeto na fronteira exata: mc²-mp²=1.0 → dead zone', () => {
        // mc²=1.5, mp²=0.5 → disc=1.0
        const mc = Math.sqrt(1.5), mp = Math.sqrt(0.5)
        const dz = isDeadZone(mc * mc, mp * mp)
        expect(dz).toBe(true)
    })
})
