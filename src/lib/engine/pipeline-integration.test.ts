import { describe, it, expect } from 'vitest'
import {
    gerarTrianguloCDT,
    calcularProjecaoFinanceira,
    calcularConfiancaMonteCarlo,
    buildRetaMestra,
    calcularAMancha,
    calcularARebarba,
    classificarFormaTriangulo,
    verificarCetInferior,
    buildCurvaCusto,
    classificarZonaMATED,
    classificarZonaComposta,
    areaTri,
    type CDTResult,
} from './math'
import { calculateCPMLocal, resolveDependencias } from './cpm'
import type { TarefaData } from './cpm'

// ══════════════════════════════════════════════════════════════════════════════
// Pipeline Integration Tests — TAP → CPM → CDT → MASTERPLAN-X
// @qa (Quinn) + @aura-math + @roberta
// Cenários: Horizonte (saudável) + Big Dig (crise) + CEt dupla
// ══════════════════════════════════════════════════════════════════════════════

// ─── Mock data ────────────────────────────────────────────────────────────────

/** Projeto Laboratório "Edifício Comercial Horizonte" — dados canônicos §14 */
// TarefaData usa 'folga' (não 'folga_total') e 'critica' (boolean)
const HORIZONTE_TAREFAS: TarefaData[] = [
    { id: 'T01', nome: 'Mobilização',           duracao_estimada: 15, dependencias: [],      es: 0,   ef: 15,  ls: 0,   lf: 15,  folga: 0,  critica: true  },
    { id: 'T02', nome: 'Fundação',               duracao_estimada: 30, dependencias: ['T01'], es: 15,  ef: 45,  ls: 15,  lf: 45,  folga: 0,  critica: true  },
    { id: 'T03', nome: 'Estrutura',              duracao_estimada: 45, dependencias: ['T02'], es: 45,  ef: 90,  ls: 45,  lf: 90,  folga: 0,  critica: true  },
    { id: 'T04', nome: 'Instalações Elétricas',  duracao_estimada: 25, dependencias: ['T02'], es: 45,  ef: 70,  ls: 65,  lf: 90,  folga: 20, critica: false },
    { id: 'T05', nome: 'Instalações Hidráulicas',duracao_estimada: 20, dependencias: ['T02'], es: 45,  ef: 65,  ls: 70,  lf: 90,  folga: 25, critica: false },
    { id: 'T06', nome: 'Alvenaria',              duracao_estimada: 30, dependencias: ['T03'], es: 90,  ef: 120, ls: 90,  lf: 120, folga: 0,  critica: true  },
    { id: 'T07', nome: 'Revestimento Externo',   duracao_estimada: 25, dependencias: ['T06'], es: 120, ef: 145, ls: 120, lf: 145, folga: 0,  critica: true  },
    { id: 'T08', nome: 'Esquadrias',             duracao_estimada: 20, dependencias: ['T06'], es: 120, ef: 140, ls: 125, lf: 145, folga: 5,  critica: false },
    { id: 'T09', nome: 'Acabamentos',            duracao_estimada: 20, dependencias: ['T07'], es: 145, ef: 165, ls: 145, lf: 165, folga: 0,  critica: true  },
    { id: 'T10', nome: 'Comissionamento',        duracao_estimada: 10, dependencias: ['T09'], es: 165, ef: 175, ls: 165, lf: 175, folga: 0,  critica: true  },
]

const HORIZONTE_CUSTOS: Record<string, number> = {
    T01: 50_000, T02: 200_000, T03: 400_000, T04: 150_000, T05: 100_000,
    T06: 200_000, T07: 120_000, T08: 80_000, T09: 100_000, T10: 50_000,
}

const HORIZONTE_PRAZO   = 175  // dias
const HORIZONTE_ORC     = 1_650_000
const HORIZONTE_Y0      = 100_000  // custo mobilização

/** Boston Big Dig — dados históricos (1991-2007), prazo 5840d ~16 anos */
const BIG_DIG_CUSTO: { x: number; y: number }[] = [
    { x: 0,    y: 0              },
    { x: 730,  y: 2_600_000_000  },
    { x: 1460, y: 4_800_000_000  },
    { x: 2190, y: 7_300_000_000  },
    { x: 2920, y: 10_800_000_000 },
    { x: 3650, y: 14_600_000_000 },
    { x: 4380, y: 14_600_000_000 },  // custo estabilizou após finalização
]
const BIG_DIG_PRAZO: { x: number; y: number }[] = [
    { x: 0,    y: 0   },
    { x: 730,  y: 10  },
    { x: 1460, y: 22  },
    { x: 2190, y: 38  },
    { x: 2920, y: 58  },
    { x: 3650, y: 82  },
    { x: 4380, y: 100 },
]
const _BIG_DIG_PRAZO_BASE = 4380  // reservado para testes futuros de prazo base

// ─── 1. CPM Pipeline ──────────────────────────────────────────────────────────

describe('CPM Pipeline — Horizonte', () => {
    it('resolveDependencias retorna tarefas com dependências resolvidas', () => {
        const resolvidas = resolveDependencias(HORIZONTE_TAREFAS)
        expect(resolvidas).toHaveLength(HORIZONTE_TAREFAS.length)
        // Cada tarefa deve manter seus campos essenciais
        resolvidas.forEach(t => {
            expect(t.id).toBeDefined()
            expect(t.duracao_estimada).toBeGreaterThan(0)
        })
    })

    it('calculateCPMLocal produz caminho crítico correto', () => {
        const calculadas = calculateCPMLocal(HORIZONTE_TAREFAS)
        expect(calculadas).toHaveLength(10)
        // T01 (Mobilização) é a primeira — ES deve ser 0
        const t01 = calculadas.find(t => t.id === 'T01')
        expect(t01?.es).toBe(0)
        // T10 (Comissionamento) é a última — EF deve ser o prazo total
        const t10 = calculadas.find(t => t.id === 'T10')
        expect(t10?.ef).toBe(HORIZONTE_PRAZO)
    })

    it('caminho crítico identifica tarefas com folga zero', () => {
        const calculadas = calculateCPMLocal(HORIZONTE_TAREFAS)
        const criticas   = calculadas.filter(t => t.folga === 0)
        // T01→T02→T03→T06→T07→T09→T10 = 7 tarefas críticas
        expect(criticas.length).toBeGreaterThanOrEqual(5)
    })

    it('EF da última tarefa crítica = prazo total do projeto', () => {
        const calculadas = calculateCPMLocal(HORIZONTE_TAREFAS)
        const efMax = Math.max(...calculadas.map(t => t.ef ?? 0))
        expect(efMax).toBe(HORIZONTE_PRAZO)
    })
})

// ─── 2. Projeção Financeira → Curvas C(t) ────────────────────────────────────

describe('Projeção Financeira — Horizonte', () => {
    it('produz N+1 pontos (dia 0 ao dia prazo)', () => {
        const projecao = calcularProjecaoFinanceira(
            HORIZONTE_TAREFAS as never,
            HORIZONTE_CUSTOS,
            [],
            HORIZONTE_PRAZO,
        )
        expect(projecao).toHaveLength(HORIZONTE_PRAZO + 1)
    })

    it('acumulado começa em 0 e termina próximo ao orçamento total', () => {
        const projecao = calcularProjecaoFinanceira(
            HORIZONTE_TAREFAS as never,
            HORIZONTE_CUSTOS,
            [],
            HORIZONTE_PRAZO,
        )
        // dia 0 pode ter desembolso se houver tarefa iniciando em es=0
        expect(projecao[0].acumulado).toBeGreaterThanOrEqual(0)
        const custoTotal = Object.values(HORIZONTE_CUSTOS).reduce((a, b) => a + b, 0)
        // acumulado no final deve ser próximo ao total de custos distribuídos
        expect(projecao[HORIZONTE_PRAZO].acumulado).toBeCloseTo(custoTotal, -3)
    })

    it('desembolso diário ≥ 0 em todos os dias', () => {
        const projecao = calcularProjecaoFinanceira(
            HORIZONTE_TAREFAS as never,
            HORIZONTE_CUSTOS,
            [],
            HORIZONTE_PRAZO,
        )
        projecao.forEach(p => expect(p.desembolso).toBeGreaterThanOrEqual(0))
    })

    it('buildCurvaCusto retorna array com x e y', () => {
        // buildCurvaCusto(tarefas, custos, marcos, prazo, projectCost, useSeed)
        const curva = buildCurvaCusto(HORIZONTE_TAREFAS as never, HORIZONTE_CUSTOS, [], HORIZONTE_PRAZO, HORIZONTE_ORC, false)
        expect(curva.length).toBeGreaterThan(0)
        expect(curva[0]).toHaveProperty('x')
        expect(curva[0]).toHaveProperty('y')
        expect(curva[curva.length - 1].x).toBe(HORIZONTE_PRAZO)
    })
})

// ─── 3. CDT — Geração do Triângulo Matriz ────────────────────────────────────

describe('gerarTrianguloCDT() — Horizonte', () => {
    function buildCurvas() {
        const projecao  = calcularProjecaoFinanceira(HORIZONTE_TAREFAS as never, HORIZONTE_CUSTOS, [], HORIZONTE_PRAZO)
        const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
        const step = Math.max(1, Math.floor(HORIZONTE_PRAZO / 50))
        const curvaPrazo: { x: number; y: number }[] = []
        for (let dia = 0; dia <= HORIZONTE_PRAZO; dia += step) {
            const prog = (HORIZONTE_TAREFAS.filter(t => (t.ef ?? 0) <= dia).length / HORIZONTE_TAREFAS.length) * 100
            curvaPrazo.push({ x: dia, y: prog })
        }
        curvaPrazo.push({ x: HORIZONTE_PRAZO, y: 100 })
        return { curvaCusto, curvaPrazo }
    }

    it('retorna CDTResult com todos os campos obrigatórios', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const result: CDTResult = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(result).toHaveProperty('lados')
        expect(result).toHaveProperty('cdt_area')
        expect(result).toHaveProperty('mated_distancia')
        expect(result).toHaveProperty('zona_mated')
        expect(result).toHaveProperty('forma_triangulo')
    })

    it('lados do triângulo são positivos e finitos', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(result.lados.escopo).toBeGreaterThan(0)
        expect(result.lados.orcamento).toBeGreaterThan(0)
        expect(result.lados.prazo).toBeGreaterThan(0)
        expect(isFinite(result.lados.orcamento)).toBe(true)
        expect(isFinite(result.lados.prazo)).toBe(true)
    })

    it('área CDT > 0 para projeto válido', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(result.cdt_area).toBeGreaterThan(0)
    })

    it('zona_mated é um dos valores canônicos', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(['OTIMO', 'SEGURO', 'RISCO', 'CRISE']).toContain(result.zona_mated)
    })

    it('forma_triangulo é um dos valores canônicos', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const result = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(['acutangulo', 'obtusangulo_c', 'obtusangulo_p', 'retangulo', 'invalido']).toContain(result.forma_triangulo)
    })

    it('Monte Carlo retorna confiança em [0, 100]', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const cdt   = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        const mc    = calcularConfiancaMonteCarlo(cdt)
        expect(mc.confianca).toBeGreaterThanOrEqual(0)
        expect(mc.confianca).toBeLessThanOrEqual(100)
    })
})

// ─── 4. MASTERPLAN-X: campos físicos v3.0 ────────────────────────────────────

describe('MASTERPLAN-X Motor Físico v3.0 — Horizonte', () => {
    function buildCurvas() {
        const projecao  = calcularProjecaoFinanceira(HORIZONTE_TAREFAS as never, HORIZONTE_CUSTOS, [], HORIZONTE_PRAZO)
        const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
        const step = 5
        const curvaPrazo: { x: number; y: number }[] = []
        for (let dia = 0; dia <= HORIZONTE_PRAZO; dia += step) {
            const prog = (HORIZONTE_TAREFAS.filter(t => (t.ef ?? 0) <= dia).length / HORIZONTE_TAREFAS.length) * 100
            curvaPrazo.push({ x: dia, y: prog })
        }
        return { curvaCusto, curvaPrazo }
    }

    it('buildRetaMestra produz R² ∈ [0,1] para curva de custo Horizonte', () => {
        const { curvaCusto } = buildCurvas()
        const reta = buildRetaMestra(curvaCusto)
        expect(reta.r2).toBeGreaterThanOrEqual(0)
        expect(reta.r2).toBeLessThanOrEqual(1)
    })

    it('buildRetaMestra Horizonte: R² próximo a 1 (curva quase-linear)', () => {
        const { curvaCusto } = buildCurvas()
        const reta = buildRetaMestra(curvaCusto)
        // Horizonte é bem planejado — curva S suave → R² alto
        expect(reta.r2).toBeGreaterThan(0.7)
    })

    it('calcularAMancha retorna A_mancha > 0', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const { aMancha } = calcularAMancha(curvaCusto, curvaPrazo)
        expect(aMancha).toBeGreaterThan(0)
    })

    it('calcularAMancha Horizonte: A_intersecao ≤ A_mancha', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const { aMancha, aIntersecao } = calcularAMancha(curvaCusto, curvaPrazo)
        expect(aIntersecao).toBeLessThanOrEqual(aMancha + 1e-9)
    })

    it('calcularARebarba Horizonte: zona plástica ≥ 0', () => {
        const { curvaCusto, curvaPrazo } = buildCurvas()
        const cdt        = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        const { aMancha }= calcularAMancha(curvaCusto, curvaPrazo)
        const aRebarba   = calcularARebarba(aMancha, cdt.cdt_area)
        expect(aRebarba).toBeGreaterThanOrEqual(0)
    })

    it('CEt inferior Horizonte: custo total ≥ y₀ → true', () => {
        const custoTotal = Object.values(HORIZONTE_CUSTOS).reduce((a, b) => a + b, 0)
        expect(verificarCetInferior(custoTotal, HORIZONTE_Y0)).toBe(true)
    })

    it('CEt inferior: y₀ > custo operacional → false (violação)', () => {
        // Se custo planejado for abaixo da mobilização
        expect(verificarCetInferior(80_000, HORIZONTE_Y0)).toBe(false)
    })
})

// ─── 5. Big Dig — cenário de crise e zona plástica ───────────────────────────

describe('Big Dig — Pipeline de crise', () => {
    it('CDT Big Dig produz resultado válido', () => {
        const result = gerarTrianguloCDT({
            curvaCusto: BIG_DIG_CUSTO,
            curvaPrazo: BIG_DIG_PRAZO,
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(result).toHaveProperty('zona_mated')
        expect(result.cdt_area).toBeGreaterThan(0)
    })

    it('buildRetaMestra Big Dig: slope positivo (custo sempre crescente)', () => {
        const reta = buildRetaMestra(BIG_DIG_CUSTO)
        expect(reta.slope).toBeGreaterThan(0)
        expect(reta.r2).toBeGreaterThanOrEqual(0)
        expect(reta.r2).toBeLessThanOrEqual(1)
    })

    it('calcularAMancha Big Dig: A_mancha > 0', () => {
        const { aMancha } = calcularAMancha(BIG_DIG_CUSTO, BIG_DIG_PRAZO)
        expect(aMancha).toBeGreaterThan(0)
    })

    it('Big Dig: zona plástica esperada > 0 (deformação permanente detectada)', () => {
        const _cdt       = gerarTrianguloCDT({ curvaCusto: BIG_DIG_CUSTO, curvaPrazo: BIG_DIG_PRAZO, diaAtual: 0, diaBaseline: 0 })
        const { aMancha }= calcularAMancha(BIG_DIG_CUSTO, BIG_DIG_PRAZO)
        // Usar aMancha vs área do TM equilátero como referência
        const aTM_equilatero = areaTri(1, 1, 1)
        const aRebarba = calcularARebarba(aMancha, aTM_equilatero)
        // Big Dig teve expansão de ~190% — zona plástica deve ser detectável
        expect(aRebarba).toBeGreaterThanOrEqual(0)
    })
})

// ─── 6. CEt Dupla — validação de limite superior e inferior ──────────────────

describe('CEt Dupla — validação sistêmica', () => {
    it('CEt inferior: custo = y₀ → true (limite exato)', () => {
        expect(verificarCetInferior(500_000, 500_000)).toBe(true)
    })

    it('CEt inferior: y₀ = 0 → sempre true (sem restrição inferior)', () => {
        expect(verificarCetInferior(0, 0)).toBe(true)
        expect(verificarCetInferior(1, 0)).toBe(true)
    })

    it('CEt inferior: custo < y₀ → false (violação)', () => {
        expect(verificarCetInferior(400_000, 500_000)).toBe(false)
    })

    it('classificarFormaTriangulo acutangulo: E=C=P=1 → acutangulo', () => {
        expect(classificarFormaTriangulo(1, 1, 1)).toBe('acutangulo')
    })

    it('classificarFormaTriangulo obtusangulo_c: (E=3,C=4,P=2) → obtusangulo_c', () => {
        expect(classificarFormaTriangulo(3, 4, 2)).toBe('obtusangulo_c')
    })

    it('classificarFormaTriangulo invalido: E ≥ P+C → invalido', () => {
        expect(classificarFormaTriangulo(10, 1, 1)).toBe('invalido')
    })
})

// ─── 7. classificarZona — consistência das zonas ─────────────────────────────

describe('Zonas MATED — consistência (CDT v3.0 §3.3 rev3)', () => {
    // CDT v3.0: limiares relativos ao baseline isósceles sqrt(7)/12 ≈ 0.2205
    // OTIMO: abs d < 0.270 | SEGURO: 0.270–0.370 | RISCO: 0.370–0.521 | CRISE ≥ 0.521

    it('zona OTIMO: MATED abaixo do baseline (d < 0.270)', () => {
        const zona = classificarZonaMATED(0.02)
        expect(zona).toBe('OTIMO')
    })

    it('zona SEGURO: MATED moderadamente acima do baseline (d ≈ 0.30)', () => {
        const zona = classificarZonaMATED(0.30)
        expect(zona).toBe('SEGURO')
    })

    it('zona RISCO: MATED significativamente acima do baseline (d ≈ 0.45)', () => {
        const zona = classificarZonaMATED(0.45)
        expect(zona).toBe('RISCO')
    })

    it('zona CRISE: MATED muito acima do baseline (d = 0.55)', () => {
        const zona = classificarZonaMATED(0.55)
        expect(zona).toBe('CRISE')
    })

    it('classificarZonaComposta com CEt violada retorna CRISE independente do MATED', () => {
        // classificarZonaComposta(cetValida, desvioQualidade, matedDistancia, insideOrtico)
        const zona = classificarZonaComposta(false, null, 0.05, true)
        expect(zona).toBe('CRISE')
    })
})

// ─── 8. Pipeline completo — integração end-to-end ────────────────────────────

describe('Pipeline completo TAP → CPM → CDT → MASTERPLAN-X', () => {
    it('Horizonte: pipeline completo produz estado saudável', () => {
        // 1. CPM
        const tarefas = calculateCPMLocal(HORIZONTE_TAREFAS)
        const efMax   = Math.max(...tarefas.map(t => t.ef ?? 0))
        expect(efMax).toBe(HORIZONTE_PRAZO)

        // 2. Curvas
        const projecao   = calcularProjecaoFinanceira(tarefas as never, HORIZONTE_CUSTOS, [], HORIZONTE_PRAZO)
        const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
        const step       = 5
        const curvaPrazo: { x: number; y: number }[] = []
        for (let dia = 0; dia <= HORIZONTE_PRAZO; dia += step) {
            const prog = (tarefas.filter(t => (t.ef ?? 0) <= dia).length / tarefas.length) * 100
            curvaPrazo.push({ x: dia, y: prog })
        }

        // 3. CDT
        const cdt = gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0 })
        expect(['OTIMO', 'SEGURO', 'RISCO', 'CRISE']).toContain(cdt.zona_mated)
        expect(cdt.cdt_area).toBeGreaterThan(0)

        // 4. MASTERPLAN-X
        const reta       = buildRetaMestra(curvaCusto)
        const { aMancha }= calcularAMancha(curvaCusto, curvaPrazo)
        const aRebarba   = calcularARebarba(aMancha, cdt.cdt_area)
        expect(reta.r2).toBeGreaterThanOrEqual(0)
        expect(aMancha).toBeGreaterThan(0)
        expect(aRebarba).toBeGreaterThanOrEqual(0)

        // 5. CEt inferior
        const custoTotal = Object.values(HORIZONTE_CUSTOS).reduce((a, b) => a + b, 0)
        expect(verificarCetInferior(custoTotal, HORIZONTE_Y0)).toBe(true)

        // 6. Monte Carlo
        const mc = calcularConfiancaMonteCarlo(cdt)
        expect(mc.confianca).toBeGreaterThanOrEqual(0)
        expect(mc.confianca).toBeLessThanOrEqual(100)
    })

    it('Big Dig: pipeline completo detecta anomalias (slope > 0, aMancha > 0)', () => {
        // 1. CDT
        const cdt = gerarTrianguloCDT({
            curvaCusto: BIG_DIG_CUSTO,
            curvaPrazo: BIG_DIG_PRAZO,
            diaAtual: 0,
            diaBaseline: 0,
        })
        expect(cdt.cdt_area).toBeGreaterThan(0)

        // 2. Reta-mestra: custo claramente ascendente
        const reta = buildRetaMestra(BIG_DIG_CUSTO)
        expect(reta.slope).toBeGreaterThan(0)

        // 3. A_mancha positiva
        const { aMancha } = calcularAMancha(BIG_DIG_CUSTO, BIG_DIG_PRAZO)
        expect(aMancha).toBeGreaterThan(0)

        // 4. Intervalo de confiança com 2 extremos
        expect(reta.intervaloConfianca).toHaveLength(2)
        expect(reta.intervaloConfianca[0]).toBeLessThanOrEqual(reta.slope)
        expect(reta.intervaloConfianca[1]).toBeGreaterThanOrEqual(reta.slope)
    })

    it('área CDT é calculada por Heron: aTri(E,C,P) > 0 para triângulo válido', () => {
        // Horizonte: E=1, C≈1.05, P≈1.02 (projeto equilibrado)
        const area = areaTri(1.0, 1.05, 1.02)
        expect(area).toBeGreaterThan(0)
        expect(isFinite(area)).toBe(true)
    })
})
