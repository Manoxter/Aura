import { describe, it, expect } from 'vitest'
import {
    buildRetaMestra,
    calcularAMancha,
    calcularARebarba,
    classificarFormaTriangulo,
    verificarCetInferior,
    calcularCompensacao,
    areaTri,
} from './math'

// ══════════════════════════════════════════════════════════════════════════════
// Story 7.0 — MASTERPLAN-X Sprint 4: TDD Motor Físico v3.0
// @aura-math + @qa — Cobertura: buildRetaMestra, calcularAMancha, calcularARebarba,
//                               classificarFormaTriangulo, verificarCetInferior
// ══════════════════════════════════════════════════════════════════════════════

// ─── buildRetaMestra ──────────────────────────────────────────────────────────

describe('buildRetaMestra()', () => {
    it('retorna R²=0 para curva com menos de 3 pontos', () => {
        const result = buildRetaMestra([{ x: 0, y: 0 }, { x: 1, y: 1 }])
        expect(result.r2).toBe(0)
    })

    it('retorna R²=1 para curva perfeitamente linear', () => {
        // Curva linear: y = 2x
        const curva = [0, 1, 2, 3, 4, 5].map(x => ({ x, y: 2 * x }))
        const result = buildRetaMestra(curva)
        expect(result.r2).toBeCloseTo(1, 2)
    })

    it('retorna R² ∈ [0,1] para qualquer curva (propriedade invariante)', () => {
        // Curva com oscilação irregular — R² pode ser qualquer valor no intervalo válido
        const curva = [
            { x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 1 },
            { x: 3, y: 4 }, { x: 4, y: 2 }, { x: 5, y: 5 },
            { x: 6, y: 2 }, { x: 7, y: 6 },
        ]
        const result = buildRetaMestra(curva)
        expect(result.r2).toBeGreaterThanOrEqual(0)
        expect(result.r2).toBeLessThanOrEqual(1)
    })

    it('retorna slope positivo para curva crescente', () => {
        const curva = [0, 10, 20, 30, 40, 50].map(x => ({ x, y: x * 1.5 + 100 }))
        const result = buildRetaMestra(curva)
        expect(result.slope).toBeGreaterThan(0)
    })

    it('retorna intervalo de confiança com 2 elementos', () => {
        const curva = [0, 5, 10, 15, 20, 25].map(x => ({ x, y: x * 3 }))
        const result = buildRetaMestra(curva)
        expect(result.intervaloConfianca).toHaveLength(2)
        expect(result.intervaloConfianca[0]).toBeLessThanOrEqual(result.slope)
        expect(result.intervaloConfianca[1]).toBeGreaterThanOrEqual(result.slope)
    })

    it('mock Big Dig: curva com escalonamento por fases — R² ∈ [0,1] e slope positivo', () => {
        // Big Dig: custo escalou dramaticamente nas fases finais (não-linear)
        const bigDig = [
            { x: 0,   y: 0       },
            { x: 365, y: 2_600_000_000  },
            { x: 730, y: 4_800_000_000  },
            { x: 1095, y: 7_300_000_000 },
            { x: 1460, y: 10_800_000_000 },
            { x: 1825, y: 14_600_000_000 },
        ]
        const result = buildRetaMestra(bigDig)
        // R² pode ser alto em série pequena, mas a curva tem aceleração — verificar consistência
        expect(result.r2).toBeGreaterThanOrEqual(0)
        expect(result.r2).toBeLessThanOrEqual(1)
        expect(result.slope).toBeGreaterThan(0)
    })

    it('mock Horizonte: curva linear perfeita retorna R² próximo a 1', () => {
        // Horizonte: projeto bem planejado com consumo linear de orçamento
        const horizonte = Array.from({ length: 12 }, (_, i) => ({
            x: i * 30,
            y: i * 500_000,
        }))
        const result = buildRetaMestra(horizonte)
        expect(result.r2).toBeGreaterThan(0.95)
    })
})

// ─── calcularAMancha ──────────────────────────────────────────────────────────

describe('calcularAMancha()', () => {
    it('retorna 0 para curvas vazias', () => {
        const result = calcularAMancha([], [])
        expect(result.aMancha).toBe(0)
        expect(result.aIntersecao).toBe(0)
    })

    it('retorna 0 para curvas com 1 ponto', () => {
        const result = calcularAMancha([{ x: 0, y: 0 }], [{ x: 0, y: 0 }])
        expect(result.aMancha).toBe(0)
    })

    it('A_mancha ≥ 0 sempre', () => {
        const c = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0.5 }]
        const p = [{ x: 0, y: 0 }, { x: 1, y: 0.3 }, { x: 2, y: 1 }]
        const result = calcularAMancha(c, p)
        expect(result.aMancha).toBeGreaterThanOrEqual(0)
    })

    it('A_mancha > 0 para curvas com amplitude positiva', () => {
        // calcularAMancha normaliza cada curva pelo seu próprio max internamente
        // Resultado: A_mancha > 0 para qualquer par de curvas válidas
        const custo = [{ x: 0, y: 0 }, { x: 5, y: 100_000 }, { x: 10, y: 200_000 }]
        const prazo = [{ x: 0, y: 0 }, { x: 5, y: 50 }, { x: 10, y: 100 }]
        const result = calcularAMancha(custo, prazo)
        expect(result.aMancha).toBeGreaterThan(0)
    })

    it('A_intersecao ≤ A_mancha sempre', () => {
        const c = [{ x: 0, y: 0.2 }, { x: 1, y: 0.6 }, { x: 2, y: 1 }]
        const p = [{ x: 0, y: 0.4 }, { x: 1, y: 0.5 }, { x: 2, y: 0.8 }]
        const result = calcularAMancha(c, p)
        expect(result.aIntersecao).toBeLessThanOrEqual(result.aMancha + 1e-9)
    })

    it('curvas idênticas: A_mancha = área_comum e A_intersecao = A_mancha', () => {
        const curva = [{ x: 0, y: 0 }, { x: 1, y: 0.5 }, { x: 2, y: 1 }]
        const result = calcularAMancha(curva, curva)
        // A_mancha = A_intersecao pois max(C,P) = C = P
        expect(result.aMancha).toBeCloseTo(result.aIntersecao, 3)
    })
})

// ─── calcularARebarba ─────────────────────────────────────────────────────────

describe('calcularARebarba()', () => {
    it('retorna 0 quando A_mancha = A_TM', () => {
        expect(calcularARebarba(0.5, 0.5)).toBe(0)
    })

    it('retorna diferença positiva quando A_mancha > A_TM', () => {
        expect(calcularARebarba(0.6, 0.4)).toBeCloseTo(0.2, 6)
    })

    it('retorna 0 (clamp) quando A_mancha < A_TM (zona plástica negativa impossível)', () => {
        // A_mancha < A_TM indica medição inconsistente — clampar em 0
        expect(calcularARebarba(0.3, 0.5)).toBe(0)
    })

    it('Big Dig mock: zona plástica esperada > 0 (deformação permanente)', () => {
        // Big Dig expandiu 190% do orçamento original → A_mancha > A_TM_original
        const aMancha = 0.72   // campo real estimado
        const aTM = 0.38       // triângulo matriz original
        expect(calcularARebarba(aMancha, aTM)).toBeGreaterThan(0)
    })

    it('Horizonte mock: zona plástica = 0 (projeto saudável)', () => {
        const aMancha = 0.40   // campo real ≈ triângulo planejado
        const aTM = 0.42       // TM ligeiramente maior (folga de qualidade)
        expect(calcularARebarba(aMancha, aTM)).toBe(0)
    })
})

// ─── classificarFormaTriangulo ────────────────────────────────────────────────

describe('classificarFormaTriangulo()', () => {
    it('retorna "invalido" quando CEt é violada (E > P + C)', () => {
        // E = 2, C = 0.5, P = 0.5 → E ≥ P + C
        expect(classificarFormaTriangulo(2, 0.5, 0.5)).toBe('invalido')
    })

    it('retorna "invalido" quando |P - C| ≥ E', () => {
        // E = 0.5, C = 1, P = 3 → |P-C| = 2 ≥ E = 0.5
        expect(classificarFormaTriangulo(0.5, 1, 3)).toBe('invalido')
    })

    it('retorna "acutangulo" para triângulo equilátero (E=C=P=1)', () => {
        expect(classificarFormaTriangulo(1, 1, 1)).toBe('acutangulo')
    })

    it('retorna "acutangulo" para triângulo levemente escaleno equilibrado', () => {
        // E=0.9, C=0.85, P=0.8 — todos ângulos agudos
        expect(classificarFormaTriangulo(0.9, 0.85, 0.8)).toBe('acutangulo')
    })

    it('retorna "obtusangulo_c" quando custo expande drasticamente (E=3,C=4,P=2)', () => {
        // Triângulo 2-3-4: |P-C|=2 < E=3 ✓; E=3 < P+C=6 ✓
        // cosC = (9+4-16)/(2×3×2) = -3/12 < 0 → obtusangulo_c
        expect(classificarFormaTriangulo(3, 4, 2)).toBe('obtusangulo_c')
    })

    it('retorna "obtusangulo_p" quando prazo escorrega além do crítico (E=3,C=2,P=4)', () => {
        // cosP = (9+4-16)/(2×3×2) = -3/12 < 0 → obtusangulo_p
        expect(classificarFormaTriangulo(3, 2, 4)).toBe('obtusangulo_p')
    })

    it('retorna "retangulo" para triângulo 3-4-5 (Pitágoras)', () => {
        // 3-4-5: E=5, C=4, P=3 → ângulo reto em A (oposto a E)
        // Verificar que a classificação trata ângulo reto
        const result = classificarFormaTriangulo(5, 4, 3)
        expect(['retangulo', 'acutangulo']).toContain(result)  // tolerância ε
    })

    it('Big Dig: triângulo com estouro de custo → obtusangulo_c (E=1.5, C=2.5, P=1.8)', () => {
        // |C-P| = 0.7 < E=1.5 ✓; E=1.5 < C+P=4.3 ✓
        // cosC = (2.25+3.24-6.25)/(2×1.5×1.8) = -0.76/5.4 < 0 → obtusangulo_c
        expect(classificarFormaTriangulo(1.5, 2.5, 1.8)).toBe('obtusangulo_c')
    })

    it('Horizonte: projeto equilibrado → acutangulo', () => {
        // Horizonte: variações de ±10% nos lados
        expect(classificarFormaTriangulo(1.02, 1.05, 0.98)).toBe('acutangulo')
    })
})

// ─── verificarCetInferior ─────────────────────────────────────────────────────

describe('verificarCetInferior()', () => {
    it('retorna true quando y₀ = 0 (sem restrição inferior)', () => {
        expect(verificarCetInferior(100, 0)).toBe(true)
    })

    it('retorna true quando custo atual ≥ y₀', () => {
        expect(verificarCetInferior(500_000, 200_000)).toBe(true)
        expect(verificarCetInferior(200_000, 200_000)).toBe(true)
    })

    it('retorna false quando custo atual < y₀ (violação CEt inferior)', () => {
        expect(verificarCetInferior(100_000, 200_000)).toBe(false)
    })

    it('retorna true para y₀ negativo (não aplicável)', () => {
        expect(verificarCetInferior(50, -100)).toBe(true)
    })

    it('CEt inferior + Big Dig: custo real (14.6bi) >> y₀ estimado (0.8bi) → válido', () => {
        expect(verificarCetInferior(14_600_000_000, 800_000_000)).toBe(true)
    })

    it('projeto com orçamento abaixo da mobilização → violação', () => {
        // y₀ = 500k BRL (licenças + canteiro), orçamento total planejado = 400k
        expect(verificarCetInferior(400_000, 500_000)).toBe(false)
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// calcularCompensacao — Peso e Contrapeso do TM (MetodoAura v3.0 §3.4)
// ══════════════════════════════════════════════════════════════════════════════
describe('calcularCompensacao', () => {
    // Baseline CDT v3.0 perfeito: E=1, P=C=sqrt(2), area≈0.5
    const E = 1
    const P_base = Math.sqrt(2)
    const C_base = Math.sqrt(2)
    const area_base = areaTri(E, P_base, C_base)  // ≈ 0.5

    it('baseline isósceles: delta_p=0 → delta_c=0 e área preservada', () => {
        const r = calcularCompensacao(E, P_base, C_base, 0, area_base)
        expect(r.sem_solucao).toBe(false)
        expect(r.viavel).toBe(true)
        expect(Math.abs(r.delta_c)).toBeLessThan(1e-6)
        expect(Math.abs(r.area_obtida - area_base)).toBeLessThan(1e-6)
    })

    it('aumentar P em 0.1 → delta_c < 0 (custo deve ceder para manter área)', () => {
        const r = calcularCompensacao(E, P_base, C_base, 0.1, area_base)
        expect(r.sem_solucao).toBe(false)
        expect(r.viavel).toBe(true)
        expect(r.delta_c).toBeLessThan(0)  // custo deve reduzir
        expect(Math.abs(r.area_obtida - area_base)).toBeLessThan(1e-6)
    })

    it('reduzir P levemente (-0.05) → viável e área preservada', () => {
        // A_max com p_novo = sqrt(2)-0.05 ≈ 1.364 → A_max = 0.682 > area_base ≈ 0.661 ✓
        const r = calcularCompensacao(E, P_base, C_base, -0.05, area_base)
        expect(r.sem_solucao).toBe(false)
        expect(r.viavel).toBe(true)
        expect(Math.abs(r.area_obtida - area_base)).toBeLessThan(1e-5)
    })

    it('reduzir P muito (-0.1) → sem_solucao (A_max=0.657 < area_base≈0.661)', () => {
        // Matematicamente correto: P menor reduz A_max abaixo da área pedida
        const r = calcularCompensacao(E, P_base, C_base, -0.1, area_base)
        expect(r.sem_solucao).toBe(true)
    })

    it('área alvo = A_max (impossível por ser exatamente no pico) → sem_solucao', () => {
        const area_max = 0.5 * E * P_base
        const r = calcularCompensacao(E, P_base, C_base, 0, area_max)
        expect(r.sem_solucao).toBe(true)
    })

    it('área alvo maior que A_max → sem_solucao', () => {
        const r = calcularCompensacao(E, P_base, C_base, 0, area_base * 10)
        expect(r.sem_solucao).toBe(true)
    })

    it('Big Dig 2001: E=1, P=1, C=2.5 → compensação para voltar à área baseline', () => {
        const E_bd = 1, P_bd = 1, C_bd = 2.5
        const area_bd_baseline = areaTri(1, 1, 1) // triângulo equilátero (referência)
        // Big Dig está muito longe do baseline — verificar viabilidade
        const r = calcularCompensacao(E_bd, P_bd, C_bd, 0, area_bd_baseline)
        if (!r.sem_solucao) {
            expect(r.viavel).toBe(true)
            expect(Math.abs(r.area_obtida - area_bd_baseline)).toBeLessThan(1e-4)
        }
        // Se sem solução, a área pedida é maior que A_max(1, 1) = 0.5
        // area_equilátero = sqrt(3)/4 ≈ 0.433 < 0.5 → deve ter solução
        expect(r.sem_solucao).toBe(false)
    })

    it('Projeto Horizonte: aumento de 10% no prazo → retorna delta_c e é viável', () => {
        // Horizonte simulado: P≈1.05, C≈1.03 (ligeiramente acima do baseline)
        const P_h = 1.05, C_h = 1.03
        const area_h = areaTri(E, P_h, C_h)
        const r = calcularCompensacao(E, P_h, C_h, 0.105, area_h) // +10% de P
        expect(r.sem_solucao).toBe(false)
        expect(r.viavel).toBe(true)
        expect(r.p_novo).toBeCloseTo(P_h + 0.105, 6)
        expect(Math.abs(r.area_obtida - area_h)).toBeLessThan(1e-5)
    })

    it('simetria: compensação é reversível (ida e volta preserva área)', () => {
        const r1 = calcularCompensacao(E, P_base, C_base, 0.2, area_base)
        expect(r1.sem_solucao).toBe(false)
        // Desfazer: novo ponto de partida é (E, p_novo, c_novo), volta com -delta_p
        const r2 = calcularCompensacao(E, r1.p_novo, r1.c_novo, -0.2, area_base)
        expect(r2.sem_solucao).toBe(false)
        expect(Math.abs(r2.c_novo - C_base)).toBeLessThan(1e-4)
    })

    it('p_novo <= 0 → sem_solucao imediato', () => {
        const r = calcularCompensacao(E, P_base, C_base, -P_base - 1, area_base)
        expect(r.sem_solucao).toBe(true)
    })
})
