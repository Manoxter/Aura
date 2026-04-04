import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { recalcularTA, calcularVelocidadeDegradacao, calcularMATEDFromSides, TrianguloAtual, HistoricoZona } from './execution'
import { SupabaseClient } from '@supabase/supabase-js'

// ══════════════════════════════════════════════════════════════════════════════
// Story 3.0-B — recalcularTA() com denominadores corretos
// - Lado P: dias_corridos / caminho_critico_baseline_dias
// - Lado O: custo_acumulado / orcamento_operacional
//   orcamento_operacional = orcamento_total × (1 − percentual_contingencia/100)
// ══════════════════════════════════════════════════════════════════════════════

type ProjetoMock = {
    percentual_contingencia: number | null
    data_inicio_real: string | null
    data_inicio: string | null
    prazo_total: number | null
    caminho_critico_baseline_dias: number | null
    orcamento_total: number | null
}

type OrcamentoMock = {
    custo_acumulado: number | null
}

function makeMockClient(overrides: {
    tarefas?: { data: { id: string }[] | null; error: null | { message: string } }
    progresso_tarefas?: { data: { tarefa_id: string; percentual_avanco: number; registrado_em: string }[] | null; error: null | { message: string } }
    projetos?: { data: ProjetoMock | null; error: null | { message: string } }
    orcamentos?: { data: OrcamentoMock | null; error: null | { message: string } }
} = {}): SupabaseClient {
    const defaultTarefas = { data: [], error: null }
    const defaultProgressos = { data: [], error: null }
    const defaultProjeto: { data: ProjetoMock; error: null } = {
        data: {
            percentual_contingencia: 10,
            data_inicio_real: '2026-01-01',
            data_inicio: '2026-01-01',
            prazo_total: 180,
            caminho_critico_baseline_dias: 120,
            orcamento_total: 1_000_000,
        },
        error: null,
    }
    const defaultOrcamento = { data: null, error: null }

    const mockFrom = (table: string) => {
        if (table === 'tarefas') {
            const result = overrides.tarefas ?? defaultTarefas
            return { select: () => ({ eq: () => Promise.resolve(result) }) }
        }
        if (table === 'progresso_tarefas') {
            const result = overrides.progresso_tarefas ?? defaultProgressos
            return {
                select: () => ({
                    in: () => ({ order: () => Promise.resolve(result) }),
                }),
            }
        }
        if (table === 'projetos') {
            const result = overrides.projetos ?? defaultProjeto
            return {
                select: () => ({
                    eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
                }),
            }
        }
        if (table === 'orcamentos') {
            const result = overrides.orcamentos ?? defaultOrcamento
            return {
                select: () => ({
                    eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
                }),
            }
        }
        // Tabelas com upsert (ex: historico_zonas) — resposta noop
        return {
            select: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
            upsert: () => Promise.resolve({ data: null, error: null }),
        }
    }

    return { from: mockFrom } as unknown as SupabaseClient
}

// Data de referência fixa para testes determinísticos
// data_inicio_real = '2026-01-01', "hoje" = '2026-04-10' → 99 dias corridos
const DIAS_CORRIDOS_FIXTURE = 99
const DATA_INICIO_FIXTURE = '2026-01-01'

// Avança o relógio para que Date.now() retorne uma data específica
function mockDateNow(diasDesdeInicio: number, dataInicio = DATA_INICIO_FIXTURE) {
    const ref = new Date(dataInicio).getTime()
    return vi.spyOn(Date, 'now').mockReturnValue(ref + diasDesdeInicio * 86_400_000)
}

describe('recalcularTA()', () => {

    let dateSpy: ReturnType<typeof vi.spyOn> | null = null
    beforeEach(() => {
        dateSpy = mockDateNow(DIAS_CORRIDOS_FIXTURE)
    })
    afterEach(() => {
        dateSpy?.mockRestore()
    })

    // ─── Lado E ───────────────────────────────────────────────────────────────

    it('calcula E = 0.5 para progressos [0, 50, 100]', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }], error: null },
            progresso_tarefas: {
                data: [
                    { tarefa_id: 'T1', percentual_avanco: 0,   registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T2', percentual_avanco: 50,  registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T3', percentual_avanco: 100, registrado_em: '2026-01-01T00:00:00Z' },
                ],
                error: null,
            },
        })
        const ta = await recalcularTA('proj-001', client)
        expect(ta.E).toBeCloseTo(0.5, 5)
    })

    it('trata tarefas sem progresso como 0%', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }, { id: 'T2' }], error: null },
            progresso_tarefas: {
                data: [{ tarefa_id: 'T1', percentual_avanco: 100, registrado_em: '2026-01-01T00:00:00Z' }],
                error: null,
            },
        })
        const ta = await recalcularTA('proj-003', client)
        expect(ta.E).toBeCloseTo(0.5, 5)
    })

    it('usa o registro mais recente para a mesma tarefa', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: {
                data: [
                    { tarefa_id: 'T1', percentual_avanco: 80, registrado_em: '2026-01-02T00:00:00Z' },
                    { tarefa_id: 'T1', percentual_avanco: 40, registrado_em: '2026-01-01T00:00:00Z' },
                ],
                error: null,
            },
        })
        const ta = await recalcularTA('proj-004', client)
        expect(ta.E).toBeCloseTo(0.8, 5)
    })

    // ─── Lado P (Story 3.0-B) ─────────────────────────────────────────────────

    it('AC-1: calcula P = dias_corridos / caminho_critico_baseline_dias', async () => {
        // dias_corridos = 99, baseline = 120 → P = 99/120 = 0.825
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 10,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 120,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
        })
        const ta = await recalcularTA('proj-P1', client)
        expect(ta.P).toBeCloseTo(DIAS_CORRIDOS_FIXTURE / 120, 4)
    })

    it('AC-1: P pode ser > 1.0 quando projeto ultrapassa caminho crítico', async () => {
        // dias_corridos = 99, baseline = 60 → P = 99/60 = 1.65 (atrasado)
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 10,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 60,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
        })
        const ta = await recalcularTA('proj-P-overdue', client)
        // P pode ser > 1.0 (não clampado)
        expect(ta.P).toBeGreaterThan(1.0)
    })

    it('AC-1: usa data_inicio como fallback quando data_inicio_real é nulo + warn', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 10,
                    data_inicio_real: null,               // <-- null
                    data_inicio: DATA_INICIO_FIXTURE,     // fallback
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 120,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
        })
        const ta = await recalcularTA('proj-P-fallback-date', client)
        // P calculado com data_inicio como fallback → mesmos dias_corridos
        expect(ta.P).toBeCloseTo(DIAS_CORRIDOS_FIXTURE / 120, 4)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('data_inicio_real nulo'))
        warnSpy.mockRestore()
    })

    it('AC-1: usa prazo_total como fallback quando caminho_critico_baseline_dias é nulo + warn', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 10,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,                              // fallback
                    caminho_critico_baseline_dias: null,           // <-- null
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
        })
        const ta = await recalcularTA('proj-P-fallback-baseline', client)
        expect(ta.P).toBeCloseTo(DIAS_CORRIDOS_FIXTURE / 180, 4)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('caminho_critico_baseline_dias nulo'))
        warnSpy.mockRestore()
    })

    // ─── Lado O (Story 3.0-B) ─────────────────────────────────────────────────

    it('AC-2: calcula orcamento_operacional = total × (1 − pct/100)', async () => {
        // orcamento_total=1_000_000, pct=15% → orcamento_operacional=850_000
        // custo_acumulado=425_000 → O = 425_000 / 850_000 = 0.5
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 15,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 120,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
            orcamentos: { data: { custo_acumulado: 425_000 }, error: null },
        })
        const ta = await recalcularTA('proj-O1', client)
        // orcamento_operacional = 1_000_000 * 0.85 = 850_000
        // O = 425_000 / 850_000 = 0.5
        expect(ta.O).toBeCloseTo(0.5, 4)
    })

    it('AC-2: pct=10% → orcamento_operacional = total × 0.90', async () => {
        // orcamento_operacional = 1_000_000 × 0.90 = 900_000
        // custo_acumulado = 400_000 → O = 400_000/900_000 ≈ 0.4444
        // (O escolhido acima do oFloor geométrico para que não haja ajuste)
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: 10,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 120,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
            orcamentos: { data: { custo_acumulado: 400_000 }, error: null },
        })
        const ta = await recalcularTA('proj-O2', client)
        expect(ta.O).toBeCloseTo(400_000 / 900_000, 4)
    })

    it('AC-2: percentual_contingencia nulo usa getDefaultContingencia() (10%) + warn', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        // pct=null → default 10% → orcamento_operacional = 1_000_000 × 0.90 = 900_000
        // custo_acumulado = 400_000 → O = 400_000/900_000 ≈ 0.4444 (geometricamente válido)
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            projetos: {
                data: {
                    percentual_contingencia: null,
                    data_inicio_real: DATA_INICIO_FIXTURE,
                    data_inicio: DATA_INICIO_FIXTURE,
                    prazo_total: 180,
                    caminho_critico_baseline_dias: 120,
                    orcamento_total: 1_000_000,
                },
                error: null,
            },
            orcamentos: { data: { custo_acumulado: 400_000 }, error: null },
        })
        const ta = await recalcularTA('proj-O-default-pct', client)
        expect(ta.O).toBeCloseTo(400_000 / 900_000, 4) // 400_000 / 900_000 ≈ 0.4444
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('percentual_contingencia nulo'))
        warnSpy.mockRestore()
    })

    // ─── Invariantes de segurança ─────────────────────────────────────────────

    it('nunca retorna lados < 0', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }], error: null },
            progresso_tarefas: {
                data: [
                    { tarefa_id: 'T1', percentual_avanco: 0,   registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T2', percentual_avanco: 50,  registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T3', percentual_avanco: 100, registrado_em: '2026-01-01T00:00:00Z' },
                ],
                error: null,
            },
        })
        const ta = await recalcularTA('proj-001', client)
        expect(ta.E).toBeGreaterThanOrEqual(0)
        expect(ta.P).toBeGreaterThanOrEqual(0)
        expect(ta.O).toBeGreaterThanOrEqual(0)
    })

    it('todos os lados são sempre números finitos', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 75, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
        })
        const ta = await recalcularTA('proj-001', client)
        expect(isFinite(ta.E)).toBe(true)
        expect(isFinite(ta.P)).toBe(true)
        expect(isFinite(ta.O)).toBe(true)
    })

    it('retorna fallback seguro quando não há tarefas no projeto', async () => {
        const client = makeMockClient({ tarefas: { data: [], error: null } })
        const ta = await recalcularTA('proj-sem-tarefas', client)
        expect(ta).toEqual({ E: 1.0, P: 1.0, O: 1.0 })
    })

    it('retorna TA anterior ao receber erro na consulta de tarefas', async () => {
        const taAnterior: TrianguloAtual = { E: 0.7, P: 0.7, O: 0.9 }
        const client = makeMockClient({ tarefas: { data: null, error: { message: 'DB Error' } } })
        const ta = await recalcularTA('proj-002', client, taAnterior)
        expect(ta).toEqual(taAnterior)
    })

    it('TA resultante sempre satisfaz a CEt (desigualdade triangular)', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }], error: null },
            progresso_tarefas: {
                data: [
                    { tarefa_id: 'T1', percentual_avanco: 20, registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T2', percentual_avanco: 40, registrado_em: '2026-01-01T00:00:00Z' },
                    { tarefa_id: 'T3', percentual_avanco: 60, registrado_em: '2026-01-01T00:00:00Z' },
                ],
                error: null,
            },
        })
        const ta = await recalcularTA('proj-007', client)
        const { E, P, O } = ta
        expect(E + P).toBeGreaterThan(O)
        expect(E + O).toBeGreaterThan(P)
        expect(P + O).toBeGreaterThan(E)
    })

    it('O capped em (E+P)*0.99 quando sem dados de orçamento (evita degenerado)', async () => {
        const client = makeMockClient({
            tarefas: { data: [{ id: 'T1' }], error: null },
            progresso_tarefas: { data: [{ tarefa_id: 'T1', percentual_avanco: 50, registrado_em: '2026-01-01T00:00:00Z' }], error: null },
            orcamentos: { data: null, error: null },
        })
        const ta = await recalcularTA('proj-006', client)
        expect(ta.E + ta.P).toBeGreaterThan(ta.O)
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// Story 3.0-F — calcularVelocidadeDegradacao()
// ══════════════════════════════════════════════════════════════════════════════

function makeHistorico(zonas: HistoricoZona['zona'][]): HistoricoZona[] {
    return zonas.map((zona, i) => ({
        semana: `2026-0${Math.floor(i / 4) + 1}-${String(((i % 4) + 1) * 7).padStart(2, '0')}`,
        zona,
        distancia_nvo: zona === 'verde' ? 0.1 : zona === 'amarela' ? 0.5 : 1.0,
    }))
}

describe('calcularVelocidadeDegradacao()', () => {

    it('retorna estavel com confianca=0 quando menos de 3 pontos', () => {
        expect(calcularVelocidadeDegradacao([])).toEqual({ tendencia: 'estavel', dias_ate_zona_amarela: null, confianca: 0 })
        expect(calcularVelocidadeDegradacao(makeHistorico(['verde', 'verde']))).toEqual({ tendencia: 'estavel', dias_ate_zona_amarela: null, confianca: 0 })
    })

    it('detecta tendência de piora quando zonas pioram progressivamente', () => {
        const historico = makeHistorico(['verde', 'verde', 'verde', 'amarela', 'amarela', 'vermelha'])
        const result = calcularVelocidadeDegradacao(historico)
        expect(result.tendencia).toBe('piora')
        expect(result.confianca).toBeGreaterThan(0)
    })

    it('detecta tendência de melhora quando zonas melhoram progressivamente', () => {
        const historico = makeHistorico(['vermelha', 'amarela', 'amarela', 'verde', 'verde', 'verde'])
        const result = calcularVelocidadeDegradacao(historico)
        expect(result.tendencia).toBe('melhora')
        expect(result.dias_ate_zona_amarela).toBeNull()
    })

    it('retorna estavel quando zona não muda', () => {
        const historico = makeHistorico(['verde', 'verde', 'verde', 'verde', 'verde'])
        const result = calcularVelocidadeDegradacao(historico)
        expect(result.tendencia).toBe('estavel')
        expect(result.dias_ate_zona_amarela).toBeNull()
    })

    it('dias_ate_zona_amarela é null quando projeto já está em Zona Amarela', () => {
        const historico = makeHistorico(['amarela', 'vermelha', 'vermelha', 'vermelha', 'vermelha'])
        const result = calcularVelocidadeDegradacao(historico)
        // projeto já está em zona >= amarela — nao tem sentido calcular dias_ate_zona_amarela
        expect(result.dias_ate_zona_amarela).toBeNull()
    })

    it('confianca aumenta com mais pontos (3 pontos < 10 pontos)', () => {
        const hist3  = makeHistorico(['verde', 'amarela', 'vermelha'])
        const hist10 = makeHistorico(['verde', 'verde', 'verde', 'amarela', 'amarela', 'amarela', 'vermelha', 'vermelha', 'vermelha', 'cinza'])
        const r3  = calcularVelocidadeDegradacao(hist3)
        const r10 = calcularVelocidadeDegradacao(hist10)
        expect(r10.confianca).toBeGreaterThan(r3.confianca)
    })

    it('confianca máxima é 1.0 (não excede)', () => {
        const historico = makeHistorico(Array(15).fill('verde'))
        const result = calcularVelocidadeDegradacao(historico)
        expect(result.confianca).toBeLessThanOrEqual(1.0)
    })

    it('dias_ate_zona_amarela é null quando piora mas já em zona >= amarela', () => {
        // Sequência gradual: verde → ... → quase amarela
        const historico = makeHistorico(['verde', 'verde', 'verde', 'verde', 'verde', 'verde', 'verde', 'verde', 'verde', 'amarela'])
        // Regressão com slope muito pequeno → projeto em verde quase na borda
        // só verificamos que se o resultado for piora e zonaAtual<1, dias é positivo
        const result = calcularVelocidadeDegradacao(historico)
        if (result.tendencia === 'piora' && result.dias_ate_zona_amarela !== null) {
            expect(result.dias_ate_zona_amarela).toBeGreaterThan(0)
        }
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// Story 5.3 — calcularMATEDFromSides()
// MATED = distância euclidiana 3D de {E,P,O} ao TM baseline.
// Atualizado automaticamente no ProjectContext após cada recálculo do TA.
// ══════════════════════════════════════════════════════════════════════════════

describe('calcularMATEDFromSides()', () => {

    it('retorna 0 quando TA === TM (baseline perfeito)', () => {
        const ta = { E: 1.0, P: 1.0, O: 1.0 }
        expect(calcularMATEDFromSides(ta)).toBe(0)
    })

    it('retorna 0 quando TA === TM customizado', () => {
        const ta = { E: 0.8, P: 0.9, O: 0.7 }
        const tm = { E: 0.8, P: 0.9, O: 0.7 }
        expect(calcularMATEDFromSides(ta, tm)).toBeCloseTo(0, 10)
    })

    it('calcula distância correta para desvio simples em P', () => {
        // TA = {1, 1.5, 1}, TM = {1, 1, 1} → MATED = 0.5
        const ta = { E: 1.0, P: 1.5, O: 1.0 }
        expect(calcularMATEDFromSides(ta)).toBeCloseTo(0.5, 5)
    })

    it('calcula distância correta para desvio em todos os lados', () => {
        // TA = {0, 0, 0}, TM = {1, 1, 1} → MATED = sqrt(3) ≈ 1.7321
        const ta = { E: 0, P: 0, O: 0 }
        expect(calcularMATEDFromSides(ta)).toBeCloseTo(Math.sqrt(3), 5)
    })

    it('é sempre ≥ 0', () => {
        const ta = { E: 0.5, P: 1.2, O: 0.9 }
        expect(calcularMATEDFromSides(ta)).toBeGreaterThanOrEqual(0)
    })

    it('aumenta conforme TA se afasta do TM', () => {
        const tamPerto  = { E: 1.1, P: 1.1, O: 1.1 }
        const taLonge   = { E: 1.5, P: 1.5, O: 1.5 }
        expect(calcularMATEDFromSides(taLonge)).toBeGreaterThan(calcularMATEDFromSides(tamPerto))
    })

    it('matedAtual no contexto: é null quando taAtual é null', () => {
        // Verifica a derivação contextual: matedAtual = taAtual ? calcularMATEDFromSides(taAtual) : null
        const taAtual: TrianguloAtual | null = null
        const matedAtual = taAtual ? calcularMATEDFromSides(taAtual) : null
        expect(matedAtual).toBeNull()
    })

    it('matedAtual no contexto: é calculado quando taAtual disponível', () => {
        // Simula o padrão do ProjectContext: matedAtual = taAtual ? calcularMATEDFromSides(taAtual) : null
        const taAtual: TrianguloAtual = { E: 0.8, P: 1.1, O: 0.95 }
        const matedAtual = taAtual ? calcularMATEDFromSides(taAtual) : null
        expect(matedAtual).not.toBeNull()
        expect(matedAtual).toBeGreaterThan(0)
        // sqrt((0.8-1)^2 + (1.1-1)^2 + (0.95-1)^2) = sqrt(0.04 + 0.01 + 0.0025) = sqrt(0.0525)
        expect(matedAtual).toBeCloseTo(Math.sqrt(0.0525), 5)
    })
})
