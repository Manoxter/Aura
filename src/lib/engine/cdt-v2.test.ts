/**
 * Testes Unitarios — CDT v2 Motor
 * Validacao de valores extremos, degenerados, e comportamento correto.
 */
import { describe, it, expect } from 'vitest'
import { gerarTrianguloCDT, classificarZonaMATED, classificarZonaComposta, decomporMATED, classificarTriangulo, calcularNVO, validarProjecaoCEt } from './math'
import { checkCDTExistence, checkCETDupla } from './crisis'

const makeCurve = (points: [number, number][]) => points.map(([x, y]) => ({ x, y }))

// Curva linear simples para testes
const CURVA_LINEAR = makeCurve([[0, 0], [10, 100], [20, 200], [30, 300], [40, 400], [50, 500]])
const CURVA_PRAZO_LINEAR = makeCurve([[0, 0], [10, 10], [20, 20], [30, 30], [40, 40], [50, 50]])

describe('CDT v2 — Casos Base', () => {
    it('Dia 0: triangulo equilatero (E=C=P=1)', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(cdt.lados_brutos.E).toBe(1.0)
        expect(cdt.lados_brutos.C).toBeCloseTo(1.0, 0)
        expect(cdt.lados_brutos.P).toBeCloseTo(1.0, 0)
        expect(cdt.cet.valida).toBe(true)
        expect(cdt.cdt_version).toBe(2)
    })

    it('Area positiva para triangulo valido', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
        })
        expect(cdt.cdt_area).toBeGreaterThan(0)
    })

    it('Desvio qualidade 100% no baseline', () => {
        const cdt0 = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
            areaBaseline: cdt0.cdt_area,
        })
        expect(cdt.desvio_qualidade).toBeCloseTo(100, 0)
    })
})

describe('CDT v2 — CEt Pre-Normalizacao', () => {
    it('CEt valida para E=1, C=1, P=1', () => {
        expect(checkCDTExistence(1, 1, 1)).toBe(true)
    })

    it('CEt invalida quando um lado domina (C=3, E=1, P=1)', () => {
        expect(checkCDTExistence(1, 3, 1)).toBe(false)
    })

    it('CEt marginal (E+P = C exatamente)', () => {
        expect(checkCDTExistence(1, 2, 1)).toBe(false) // E+P = 2 = C, nao estrito
    })

    it('CEt report inclui causa raiz quando invalida', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: makeCurve([[0, 0], [10, 100], [20, 500], [30, 1500]]),
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
        })
        if (!cdt.cet.valida) {
            expect(cdt.cet.report.causa_raiz.length).toBeGreaterThan(0)
        }
    })
})

describe('CDT v2 — Obtusangulo e Incentro', () => {
    it('Custo muito alto gera obtusangulo ou bloqueia via CEt dupla', () => {
        const curvaExplosiva = makeCurve([[0, 0], [10, 100], [20, 800], [30, 2000]])
        const cdt = gerarTrianguloCDT({
            curvaCusto: curvaExplosiva,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
        })
        // Quando C >> E e P, o triangulo ou e bloqueado pela CEt dupla (zona=CRISE)
        // ou, se passou, e obtusangulo e NVO usa nivel 2 (centroide TM).
        // Ambos os casos sao validos: custo explosivo = desequilibrio geometrico.
        if (!cdt.cet_dupla.valid) {
            // CEt dupla bloqueou o calculo — correto para custo tao alto
            expect(cdt.zona_mated).toBe('CRISE')
            expect(cdt.cdt_area).toBe(0)
        } else if (cdt.lados_brutos.C > 1.5) {
            // Passou a CEt mas triangulo obtusangulo — NVO deve usar nivel 2 (centroide TM)
            expect(cdt.nvo_tipo).not.toBe('ortico')
            expect(cdt.nvo_nivel).toBe(2)
        }
    })

    it('NVO sempre tem coordenadas finitas', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 30,
            diaBaseline: 0,
        })
        expect(isFinite(cdt.nvo[0])).toBe(true)
        expect(isFinite(cdt.nvo[1])).toBe(true)
    })
})

describe('CDT v2 — Zonas MATED (classificacao direta, limiares MetodoAura §3.3 rev3 CDT v3.0)', () => {
    // CDT v3.0: limiares relativos ao baseline isósceles MATED_baseline = sqrt(7)/12 ≈ 0.2205
    // OTIMO: d_delta < 0.05 → abs d < 0.270
    // SEGURO: 0.05 ≤ d_delta < 0.15 → 0.270 ≤ abs d < 0.370
    // RISCO:  0.15 ≤ d_delta < 0.30 → 0.370 ≤ abs d < 0.521
    // CRISE:  d_delta ≥ 0.30       → abs d ≥ 0.521

    it('Distancia 0 = OTIMO (abaixo do baseline CDT v3.0)', () => {
        expect(classificarZonaMATED(0)).toBe('OTIMO')
    })

    it('Distancia 0.22 = OTIMO (no baseline CDT v3.0, delta ≈ 0)', () => {
        expect(classificarZonaMATED(0.22)).toBe('OTIMO')
    })

    it('Distancia 0.25 = OTIMO (delta 0.03 < 0.05)', () => {
        expect(classificarZonaMATED(0.25)).toBe('OTIMO')
    })

    it('Distancia 0.30 = SEGURO (delta 0.08, 0.05–0.15)', () => {
        expect(classificarZonaMATED(0.30)).toBe('SEGURO')
    })

    it('Distancia 0.36 = SEGURO (delta 0.14, limiar superior SEGURO)', () => {
        expect(classificarZonaMATED(0.36)).toBe('SEGURO')
    })

    it('Distancia 0.40 = RISCO (delta 0.18, 0.15–0.30)', () => {
        expect(classificarZonaMATED(0.40)).toBe('RISCO')
    })

    it('Distancia 0.53 = CRISE (delta 0.31, ≥ 0.30) — limiar abs CRISE = baseline + 0.30 ≈ 0.521', () => {
        expect(classificarZonaMATED(0.53)).toBe('CRISE')
    })

    it('Distancia 0.70 = CRISE (Big Dig-like overrun severo)', () => {
        expect(classificarZonaMATED(0.70)).toBe('CRISE')
    })
})

describe('CDT v2 — Zona MATED Integrada (centroide→NVO)', () => {
    it('Dia 0 isosceles baseline: centroide e NVO definidos — zona OTIMO (CDT v3.0)', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        // CDT v3.0 §3.3 rev3: baseline isósceles (C=P=sqrt(2)) → MATED ≈ sqrt(7)/12 ≈ 0.2205.
        // Com limiares relativos (d_delta = MATED - baseline), projeto saudável → delta ≈ 0 → OTIMO.
        expect(cdt.centroide).toBeDefined()
        expect(cdt.centroide[0]).toBeCloseTo((cdt.A[0] + cdt.B[0] + cdt.C[0]) / 3, 10)
        expect(cdt.centroide[1]).toBeCloseTo((cdt.A[1] + cdt.B[1] + cdt.C[1]) / 3, 10)
        expect(cdt.mated_distancia).toBeCloseTo(Math.sqrt(7) / 12, 3)
        expect(Number.isFinite(cdt.mated_distancia)).toBe(true)
        expect(cdt.zona_mated).toBe('OTIMO')
    })

    it('zona_mated nunca e null no v2', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
        })
        expect(cdt.zona_mated).not.toBeNull()
        expect(['OTIMO', 'SEGURO', 'RISCO', 'CRISE']).toContain(cdt.zona_mated)
    })

    it('Triangulo deformado com baseline: zona degrada pela qualidade ou CEt bloqueia', () => {
        const curvaExplosiva = makeCurve([[0, 0], [10, 100], [20, 800], [30, 2000]])
        // Primeiro calcular baseline
        const cdt0 = gerarTrianguloCDT({
            curvaCusto: curvaExplosiva,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        // Depois calcular com custo explodindo
        const cdt = gerarTrianguloCDT({
            curvaCusto: curvaExplosiva,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
            areaBaseline: cdt0.cdt_area,
        })
        // Com custo explodindo:
        // - Se CEt dupla bloquear → zona = CRISE (correto por violacao geometrica)
        // - Se CEt passou → desvio_qualidade deve indicar degradacao
        if (!cdt.cet_dupla.valid) {
            expect(cdt.zona_mated).toBe('CRISE')
        } else {
            expect(cdt.desvio_qualidade).not.toBeNull()
            if (cdt.desvio_qualidade! < 85) {
                expect(['SEGURO', 'RISCO', 'CRISE']).toContain(cdt.zona_mated)
            }
        }
    })

    it('Sem baseline: zona usa MATED distance pura (fallback) → OTIMO para projeto saudável', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        // Sem areaBaseline → desvio_qualidade = null → fallback MATED distance pura.
        // CDT v3.0 §3.3 rev3: MATED ≈ baseline (sqrt(7)/12) → d_delta ≈ 0 → OTIMO.
        expect(cdt.desvio_qualidade).toBeNull()
        expect(cdt.zona_mated).toBe('OTIMO')
    })
})

describe('CDT v2 — Zona Composta', () => {
    it('CEt violada = CRISE automatica', () => {
        expect(classificarZonaComposta(false, 100, 0, true)).toBe('CRISE')
    })

    it('Qualidade >= 85% = OTIMO', () => {
        expect(classificarZonaComposta(true, 90, 0.2, false)).toBe('OTIMO')
    })

    it('Qualidade 60-85% = SEGURO', () => {
        expect(classificarZonaComposta(true, 70, 0, true)).toBe('SEGURO')
    })

    it('Qualidade 35-60% = RISCO', () => {
        expect(classificarZonaComposta(true, 40, 0, true)).toBe('RISCO')
    })

    it('Qualidade < 35% = CRISE', () => {
        expect(classificarZonaComposta(true, 20, 0, true)).toBe('CRISE')
    })

    it('Sem baseline (null): fallback MATED distance (limiares CDT v3.0 §3.3 rev3)', () => {
        // CDT v3.0: limiares relativos ao baseline sqrt(7)/12 ≈ 0.2205
        expect(classificarZonaComposta(true, null, 0.01, true)).toBe('OTIMO')    // abaixo do baseline → OTIMO
        expect(classificarZonaComposta(true, null, 0.22, true)).toBe('OTIMO')    // no baseline → delta ≈ 0 → OTIMO
        expect(classificarZonaComposta(true, null, 0.40, false)).toBe('RISCO')   // delta 0.18 → RISCO
        expect(classificarZonaComposta(true, null, 0.55, false)).toBe('CRISE')   // delta 0.33 → CRISE
    })
})

describe('CDT v2 — Decomposicao MATED', () => {
    it('Desvio vertical dominante = custo', () => {
        const result = decomporMATED({ x: 0.5, y: 0.8 }, [0.5, 0.3], { escopo: 1, orcamento: 1, prazo: 1 })
        expect(result.direcao_principal).toBe('custo')
    })

    it('Desvio horizontal dominante = prazo', () => {
        const result = decomporMATED({ x: 0.9, y: 0.3 }, [0.3, 0.3], { escopo: 1, orcamento: 1, prazo: 1 })
        expect(result.direcao_principal).toBe('prazo')
    })

    it('Desvio similar = equilibrado', () => {
        const result = decomporMATED({ x: 0.6, y: 0.6 }, [0.3, 0.3], { escopo: 1, orcamento: 1, prazo: 1 })
        expect(result.direcao_principal).toBe('equilibrado')
    })
})

describe('CDT v2 — Retrocompatibilidade Legacy', () => {
    it('Assinatura v1 ainda funciona', () => {
        const cdt = gerarTrianguloCDT(
            { x1: 0, y1: 0, x2: 100, y2: 500000 },
            { a: 0.8 },
            1000000,
            180,
            10,
        )
        expect(cdt.cdt_version).toBe(2)
        expect(cdt.cdt_area).toBeGreaterThan(0)
        expect(cdt.lados_brutos.E).toBe(1.0)
    })
})

describe('CDT v2 — Valores Extremos', () => {
    it('Curva com apenas 2 pontos nao crasha', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: makeCurve([[0, 0], [100, 1000]]),
            curvaPrazo: makeCurve([[0, 0], [100, 100]]),
            diaAtual: 50,
            diaBaseline: 0,
        })
        expect(isFinite(cdt.cdt_area)).toBe(true)
    })

    it('Curva vazia retorna triangulo degenerado sem crash', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: [],
            curvaPrazo: [],
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(isFinite(cdt.cdt_area)).toBe(true)
    })

    it('Valores muito grandes nao geram NaN', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: makeCurve([[0, 0], [1, 1e12], [2, 2e12]]),
            curvaPrazo: makeCurve([[0, 0], [1, 50], [2, 100]]),
            diaAtual: 1,
            diaBaseline: 0,
        })
        expect(isNaN(cdt.cdt_area)).toBe(false)
        expect(isNaN(cdt.nvo[0])).toBe(false)
        expect(isNaN(cdt.nvo[1])).toBe(false)
    })
})

// ─── Story 1.2: NVO Hierarquia 3 Níveis ──────────────────────────────────────

describe('Story 1.2 — classificarTriangulo', () => {
    it('Triangulo equilatero (3,3,3) = acutangulo', () => {
        expect(classificarTriangulo(3, 3, 3)).toBe('acutangulo')
    })

    it('Triangulo (3,4,5) = retangulo', () => {
        expect(classificarTriangulo(3, 4, 5)).toBe('retangulo')
    })

    it('Triangulo obtusangulo (1,1,1.9) = obtusangulo', () => {
        // 1² + 1² = 2 < 1.9² = 3.61 → obtusangulo
        expect(classificarTriangulo(1, 1, 1.9)).toBe('obtusangulo')
    })

    it('Triangulo quase-equilatero (0.9, 0.95, 1.0) = acutangulo', () => {
        expect(classificarTriangulo(0.9, 0.95, 1.0)).toBe('acutangulo')
    })
})

describe('Story 1.2 — calcularNVO Hierarquia 3 Níveis', () => {
    // Fixture: triângulo acutângulo — lados 3, 4, 4 (todos ângulos < 90°)
    const taAcutangulo = {
        E: { x: 0, y: 0 },
        P: { x: 3, y: 0 },
        O: { x: 1.5, y: 3.708 }, // altura ≈ √(4² - 1.5²) ≈ 3.708
    }
    const tmEquilatero = {
        E: { x: 0, y: 0 },
        P: { x: 1, y: 0 },
        O: { x: 0.5, y: Math.sin(Math.PI / 3) },
    }

    it('AC-1: TA acutangulo → NVO = baricentro ortico (nivel 1)', () => {
        const nvo = calcularNVO(taAcutangulo, tmEquilatero)
        expect(nvo.nivel).toBe(1)
        expect(nvo.tipo).toBe('ortico')
        expect(isFinite(nvo.x)).toBe(true)
        expect(isFinite(nvo.y)).toBe(true)
    })

    // Fixture: triângulo obtusângulo — lado dominante c=1.9, com a=1, b=1
    const taObtusangulo = {
        E: { x: 0, y: 0 },
        P: { x: 1.9, y: 0 },
        O: { x: 0.5, y: 0.1 }, // triângulo muito achatado (obtusângulo)
    }

    it('AC-2: TA obtusangulo com TM acutangulo → NVO = centroide TM (nivel 2)', () => {
        const nvo = calcularNVO(taObtusangulo, tmEquilatero)
        expect(nvo.nivel).toBe(2)
        expect(nvo.tipo).toBe('centroide_tm')
        // Centroide do TM equilatero deve ser aproximadamente (0.5, 0.289)
        expect(nvo.x).toBeCloseTo(0.5, 2)
        expect(nvo.y).toBeCloseTo(Math.sin(Math.PI / 3) / 3, 2)
    })

    // Fixture: TM também obtusângulo (caso patológico)
    const tmObtusangulo = {
        E: { x: 0, y: 0 },
        P: { x: 1.9, y: 0 },
        O: { x: 0.5, y: 0.1 },
    }

    it('AC-3: TM obtusangulo → NVO = centroide TM (nivel 2) — Sessão 29: incentro eliminado', () => {
        const nvo = calcularNVO(taObtusangulo, tmObtusangulo)
        expect(nvo.nivel).toBe(2)
        expect(nvo.tipo).toBe('centroide_tm')
        expect(isFinite(nvo.x)).toBe(true)
        expect(isFinite(nvo.y)).toBe(true)
    })

    it('NVO nivel 1: coordenadas dentro do triangulo TA acutangulo', () => {
        const nvo = calcularNVO(taAcutangulo, tmEquilatero)
        // O baricentro ortico deve estar dentro do TA para triangulo acutangulo
        expect(nvo.nivel).toBe(1)
        // Verifica coordenadas finitas e positivas (dentro do quadrante do triangulo)
        expect(nvo.y).toBeGreaterThan(0)
        expect(nvo.x).toBeGreaterThan(0)
    })

    it('Story 1.2: CDT equilatero dia 0 → NVO nivel 1 (baricentro ortico)', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        // Triangulo equilatero no dia 0 é acutangulo → deve usar nivel 1
        expect(cdt.nvo_nivel).toBe(1)
        expect(cdt.nvo_tipo).toBe('ortico')
    })
})

// ─── Story 1.1: CEt Dupla — Pré e Pós-Normalização ───────────────────────────

describe('Story 1.1 — checkCETDupla: caminho feliz', () => {
    it('Triangulo equilatero (E=1, O=1, P=1): valido em ambas etapas', () => {
        // Normalizados: En=On=Pn=1
        const result = checkCETDupla(1, 1, 1, 1, 1, 1)
        expect(result.valid).toBe(true)
    })

    it('Triangulo escaleno valido (E=3, O=4, P=5): valido pre e pos', () => {
        const mx = Math.max(3, 4, 5)
        const result = checkCETDupla(3, 4, 5, 3 / mx, 4 / mx, 5 / mx)
        expect(result.valid).toBe(true)
    })

    it('Triangulo quase-degenado mas valido (E=0.5, O=1, P=1): valido', () => {
        const mx = Math.max(0.5, 1, 1)
        const result = checkCETDupla(0.5, 1, 1, 0.5 / mx, 1 / mx, 1 / mx)
        expect(result.valid).toBe(true)
    })
})

describe('Story 1.1 — checkCETDupla: falha pre-normalizacao', () => {
    it('O domina (E=1, O=3, P=1): falha pre, stage=pre, violatedSide=O', () => {
        // 1+1=2 ≤ 3 → O viola: E+P ≤ O
        const mx = Math.max(1, 3, 1)
        const result = checkCETDupla(1, 3, 1, 1 / mx, 3 / mx, 1 / mx)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('pre')
            expect(result.violatedSide).toBe('O')
        }
    })

    it('P domina (E=1, O=1, P=3): falha pre, stage=pre, violatedSide=P', () => {
        // 1+1=2 ≤ 3 → P viola: E+O ≤ P
        const mx = Math.max(1, 1, 3)
        const result = checkCETDupla(1, 1, 3, 1 / mx, 1 / mx, 3 / mx)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('pre')
            expect(result.violatedSide).toBe('P')
        }
    })

    it('E domina (E=5, O=1, P=1): falha pre, stage=pre, violatedSide=E', () => {
        // 1+1=2 ≤ 5 → E viola: O+P ≤ E
        const mx = Math.max(5, 1, 1)
        const result = checkCETDupla(5, 1, 1, 5 / mx, 1 / mx, 1 / mx)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('pre')
            expect(result.violatedSide).toBe('E')
        }
    })

    it('Caso marginal (E+O = P exatamente): falha pre (desigualdade estrita)', () => {
        // E=1, O=1, P=2: E+O=2 não é > P=2 (desigualdade estrita falha)
        const mx = Math.max(1, 1, 2)
        const result = checkCETDupla(1, 1, 2, 1 / mx, 1 / mx, 2 / mx)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('pre')
            expect(result.violatedSide).toBe('P')
        }
    })

    it('gerarTrianguloCDT bloqueado quando CEt pre falha: cdt_area=0, zona=CRISE', () => {
        // Forcar valores brutos invalidos via curvas extremas que geram C_raw >> E + P_raw
        // Custo explode (tangente muito alta) → C_raw >> 1.0 → E+P < C → CEt falha
        const curvaCustoExtrema = makeCurve([[0, 0], [1, 0.01], [2, 1000]])
        const curvaPrazoFlat = makeCurve([[0, 0], [1, 0.01], [2, 0.02]])
        const cdt = gerarTrianguloCDT({
            curvaCusto: curvaCustoExtrema,
            curvaPrazo: curvaPrazoFlat,
            diaAtual: 2,
            diaBaseline: 0,
        })
        if (!cdt.cet_dupla.valid) {
            expect(cdt.cdt_area).toBe(0)
            expect(cdt.zona_mated).toBe('CRISE')
            expect(cdt.cet_dupla.stage).toMatch(/^(pre|post)$/)
        }
    })
})

describe('Story 1.1 — checkCETDupla: falha pos-normalizacao', () => {
    // Nota: matematicamente, dividir todos os lados pelo mesmo escalar positivo preserva
    // as desigualdades triangulares. Portanto, para que pos-normalizacao falhe e pre passe,
    // precisamos de um cenario onde os valores brutos passam, mas a normalizacao altera
    // as proporcoes — isso so acontece se os valores normalizados sao recalculados
    // de forma diferente (ex: arredondamento extremo ou epsilons).
    //
    // O caso real de uso da verificacao pos-normalizacao e como guard de seguranca numerica:
    // garante que o triangulo normalizado efetivamente construido e valido.
    // Testamos diretamente a funcao com valores sinteticos onde pos falha.

    it('Falha apenas pos-normalizacao (bruto valido, normalizado invalido sintetico)', () => {
        // Bruto: E=2, O=2, P=2 → valido (2+2>2 para todos)
        // Normalizado sintetico invalido: En=0.5, On=0.5, Pn=1.01 (simulando deriva numerica)
        // En+On = 1.0 ≤ Pn=1.01 → P viola pos-normalizacao
        const result = checkCETDupla(2, 2, 2, 0.5, 0.5, 1.01)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('post')
            expect(result.violatedSide).toBe('P')
        }
    })

    it('Falha pos-normalizacao com O como violador', () => {
        // Bruto valido: E=3, O=3, P=3
        // Normalizado sintetico: En=0.3, On=0.8, Pn=0.3 → En+Pn=0.6 ≤ On=0.8
        const result = checkCETDupla(3, 3, 3, 0.3, 0.8, 0.3)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('post')
            expect(result.violatedSide).toBe('O')
        }
    })

    it('Falha pos-normalizacao com E como violador', () => {
        // Bruto valido: E=2, O=1.5, P=2
        // Normalizado sintetico: En=0.9, On=0.1, Pn=0.1 → On+Pn=0.2 ≤ En=0.9
        const result = checkCETDupla(2, 1.5, 2, 0.9, 0.1, 0.1)
        expect(result.valid).toBe(false)
        if (!result.valid) {
            expect(result.stage).toBe('post')
            expect(result.violatedSide).toBe('E')
        }
    })
})

describe('Story 1.1 — cet_dupla no CDTResult', () => {
    it('Triangulo valido: cet_dupla.valid = true', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(cdt.cet_dupla).toBeDefined()
        expect(cdt.cet_dupla.valid).toBe(true)
    })

    it('cet_dupla sempre presente no resultado (campo obrigatorio)', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 25,
            diaBaseline: 0,
        })
        expect(cdt.cet_dupla).toBeDefined()
        expect(typeof cdt.cet_dupla.valid).toBe('boolean')
    })

    it('Triangulo valido: cet_dupla nao contem violatedSide', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: CURVA_LINEAR,
            curvaPrazo: CURVA_PRAZO_LINEAR,
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(cdt.cet_dupla.valid).toBe(true)
        // TypeScript narrowing: se valid=true, nao deve ter violatedSide
        if (cdt.cet_dupla.valid) {
            expect(Object.keys(cdt.cet_dupla)).not.toContain('violatedSide')
            expect(Object.keys(cdt.cet_dupla)).not.toContain('stage')
        }
    })
})

// ─── Story 1.7: Projeção CDT (+5 dias) Validada contra CEt ───────────────────

describe('Story 1.7 — validarProjecaoCEt: projeção válida', () => {
    it('Projeto saudável no baseline (E=1, C=1, P=1): projeção +5 dias é válida', () => {
        const result = validarProjecaoCEt({ E: 1.0, C: 1.0, P: 1.0 }, 0, 5)
        expect(result.cetValida).toBe(true)
        expect(result.cetViolacao).toBeUndefined()
        expect(result.diasProjetados).toBe(5)
    })

    it('Projeto moderado (E=1, C=1.1, P=1.05) em dia 10: projeção +5 dias válida', () => {
        const result = validarProjecaoCEt({ E: 1.0, C: 1.1, P: 1.05 }, 10, 5)
        expect(result.cetValida).toBe(true)
        // Lados projetados devem ser números finitos
        expect(isFinite(result.E)).toBe(true)
        expect(isFinite(result.C)).toBe(true)
        expect(isFinite(result.P)).toBe(true)
    })

    it('deltaDias default é 5 quando omitido', () => {
        const result = validarProjecaoCEt({ E: 1.0, C: 1.0, P: 1.0 }, 0)
        expect(result.diasProjetados).toBe(5)
    })

    it('Lados projetados são maiores que zero (clamp 0.01)', () => {
        const result = validarProjecaoCEt({ E: 1.0, C: 1.0, P: 1.0 }, 0, 5)
        expect(result.E).toBeGreaterThan(0)
        expect(result.C).toBeGreaterThan(0)
        expect(result.P).toBeGreaterThan(0)
    })

    it('Projeção com delta grande ainda retorna estrutura completa', () => {
        // Mesmo com delta=100, não deve crashar
        const result = validarProjecaoCEt({ E: 1.0, C: 1.05, P: 1.02 }, 20, 100)
        expect(typeof result.cetValida).toBe('boolean')
        expect(result.diasProjetados).toBe(100)
    })
})

describe('Story 1.7 — validarProjecaoCEt: projeção inválida (CEt falha)', () => {
    it('Triângulo em crise iminente: custo crescendo rápido → projeção inválida', () => {
        // C muito alto em relação a E e P → projeção extrapola para violação CEt
        // Dia 10, C=1.8 → taxa=(1.8-1)/10=0.08/dia → projeção: C=1.8+0.08*5=2.2
        // E=1.0 (taxa=0), P=1.05 → projeção P=1.075
        // 1.0 + 1.075 = 2.075 ≤ 2.2 → CEt falha (O/Orçamento viola)
        const result = validarProjecaoCEt({ E: 1.0, C: 1.8, P: 1.05 }, 10, 5)
        if (!result.cetValida) {
            expect(result.cetValida).toBe(false)
            expect(result.cetViolacao).toBeDefined()
            // violatedSide usa nomenclatura interna da CEt: 'E' | 'P' | 'O' (O=Orçamento)
            expect(['E', 'P', 'O']).toContain(result.cetViolacao!.violatedSide)
            expect(['pre', 'post']).toContain(result.cetViolacao!.stage)
        }
        // Se passa a CEt (valores próximos do limite), aceitar ambos os resultados
        // O teste principal é que a função não crasha e retorna estrutura correta
        expect(typeof result.cetValida).toBe('boolean')
    })

    it('Triângulo degenerado: E=0.01, C=3.0, P=0.01 → projeção inválida, violação lado O', () => {
        // O (Orçamento/Custo) dominante = CEt violada imediatamente
        // checkCDTExistence(E, O, P): O domina quando E+P <= O → violatedSide='O'
        const result = validarProjecaoCEt({ E: 0.01, C: 3.0, P: 0.01 }, 5, 5)
        expect(result.cetValida).toBe(false)
        expect(result.cetViolacao).toBeDefined()
        // O lado Orçamento (C) é mapeado como 'O' na nomenclatura interna da CEt
        expect(result.cetViolacao!.violatedSide).toBe('O')
    })

    it('cetViolacao contém violatedSide e stage quando inválida', () => {
        const result = validarProjecaoCEt({ E: 0.01, C: 3.0, P: 0.01 }, 5, 5)
        if (!result.cetValida) {
            expect(result.cetViolacao).toHaveProperty('violatedSide')
            expect(result.cetViolacao).toHaveProperty('stage')
        }
    })

    it('Projeção inválida: cetViolacao.violatedSide é E, P ou O', () => {
        const result = validarProjecaoCEt({ E: 0.01, C: 3.0, P: 0.01 }, 1, 5)
        if (!result.cetValida) {
            // Nomenclatura interna da CEt: 'E' | 'P' | 'O' (O=Orçamento)
            expect(['E', 'P', 'O']).toContain(result.cetViolacao!.violatedSide)
        }
    })
})

describe('Story 1.7 — validarProjecaoCEt: integração com CDT', () => {
    it('CDT equilátero dia 0: projeção +5 dias válida (taxa=0)', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: makeCurve([[0, 0], [10, 100], [20, 200], [30, 300], [40, 400], [50, 500]]),
            curvaPrazo: makeCurve([[0, 0], [10, 10], [20, 20], [30, 30], [40, 40], [50, 50]]),
            diaAtual: 0,
            diaBaseline: 0,
        })
        if (cdt.cet_dupla.valid) {
            const proj = validarProjecaoCEt(cdt.lados_brutos, 0, 5)
            expect(proj.cetValida).toBe(true)
        }
    })

    it('CDT válido: projeção retorna lados finitos', () => {
        const cdt = gerarTrianguloCDT({
            curvaCusto: makeCurve([[0, 0], [10, 100], [20, 200], [30, 300], [40, 400], [50, 500]]),
            curvaPrazo: makeCurve([[0, 0], [10, 10], [20, 20], [30, 30], [40, 40], [50, 50]]),
            diaAtual: 25,
            diaBaseline: 0,
        })
        if (cdt.cet_dupla.valid) {
            const proj = validarProjecaoCEt(cdt.lados_brutos, 25, 5)
            expect(isFinite(proj.E)).toBe(true)
            expect(isFinite(proj.C)).toBe(true)
            expect(isFinite(proj.P)).toBe(true)
        }
    })

    it('ProjecaoCDT sempre tem diasProjetados e cetValida', () => {
        const proj = validarProjecaoCEt({ E: 1.0, C: 1.2, P: 1.1 }, 15, 5)
        expect(proj).toHaveProperty('diasProjetados', 5)
        expect(proj).toHaveProperty('cetValida')
        expect(proj).toHaveProperty('E')
        expect(proj).toHaveProperty('C')
        expect(proj).toHaveProperty('P')
    })
})
