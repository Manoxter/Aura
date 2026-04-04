'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { recalcularTA, calcularMATEDFromSides, TrianguloAtual } from '@/lib/engine/execution'
import { calcularIQ, areaTri } from '@/lib/engine/math'
import { parseCustosTarefas } from '@/lib/schemas'

export type TAPData = {
    projeto_id?: string // Trava de segurança para evitar Ghost Data
    nome_projeto: string
    justificativa: string
    objetivo_smart: string
    escopo_sintetizado: string
    orcamento_total: number
    prazo_total: number
    restricoes: string
    tarefas?: { id: string; nome: string; duracao: number }[]
    /** Percentual de contingência orçamentária do projeto (ex: 10 = 10%). Null = usa default setorial */
    percentual_contingencia?: number | null
    /** Setor do projeto para fallback de contingência */
    setor?: string | null
}

export type TarefaData = {
    id: string
    nome: string
    duracao_estimada: number
    duracao_realizada?: number | null
    status?: string
    dependencias: string[]
    es: number
    ef: number
    ls: number
    lf: number
    folga: number
    critica: boolean
}

// P2: shape canônico do row Supabase — evita `as any` no pipeline de carga
type TarefaRow = {
    id: string
    nome: string
    duracao_estimada: number | null
    duracao_realizada: number | null
    status: string | null
    predecessoras: string[] | null
    es: number | null
    ef: number | null
    ls: number | null
    lf: number | null
    folga_total: number | null
    no_caminho_critico: boolean | null
}

/**
 * Mapper: converte dados brutos (Supabase ou TAP extraction) para TarefaData.
 * Elimina a necessidade de `as any` em todo o pipeline.
 */
export function toTarefaData(raw: {
    id: string;
    nome: string;
    duracao_estimada?: number;
    duracao?: number;
    predecessoras?: string[];
    dependencias?: string[];
    es?: number;
    ef?: number;
    ls?: number;
    lf?: number;
    folga_total?: number;
    folga?: number;
    no_caminho_critico?: boolean;
    critica?: boolean;
    status?: string;
    duracao_realizada?: number | null;
}): TarefaData {
    // v4.1: Number() em TODOS os campos numéricos — Supabase `numeric` retorna STRING.
    // Sem conversão, Math.max(..."255","240") funciona por coerção mas downstream pode falhar.
    return {
        id: raw.id,
        nome: raw.nome,
        duracao_estimada: Number(raw.duracao_estimada ?? raw.duracao) || 1,
        duracao_realizada: raw.duracao_realizada != null ? Number(raw.duracao_realizada) : null,
        status: raw.status ?? 'pendente',
        dependencias: raw.predecessoras ?? raw.dependencias ?? [],
        es: Number(raw.es) || 0,
        ef: Number(raw.ef) || 0,
        ls: Number(raw.ls) || 0,
        lf: Number(raw.lf) || 0,
        folga: Number(raw.folga_total ?? raw.folga) || 0,
        critica: raw.no_caminho_critico ?? raw.critica ?? false,
    }
}

type ProjectContextType = {
    tap: TAPData | null
    setTap: (tap: TAPData) => void
    tarefas: TarefaData[]
    setTarefas: (tarefas: TarefaData[]) => void
    orcamentoBase: number | null
    setOrcamentoBase: (orcamento: number) => void
    prazoBase: number | null
    setPrazoBase: (prazo: number) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    funcoes: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFuncoes: (funcoes: any[]) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcos: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMarcos: (marcos: any[]) => void
    tenantId: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regime: any | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRegime: (regime: any) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    localizacao: any | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLocalizacao: (loc: any) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interrupcoes: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setInterrupcoes: (interrupcoes: any[]) => void
    custosTarefas: Record<string, number>
    setCustosTarefas: (custos: Record<string, number>) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feriados: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFeriados: (feriados: any[]) => void
    dataInicio: string | null
    setDataInicio: (data: string | null) => void
    /** FIX-C2: Data de início real (D7b Story 3.0) — pode ser null se projeto não iniciou */
    dataInicioReal: string | null
    /** Caminho crítico congelado no primeiro save CPM (baseline imutável para o motor) */
    caminhoCriticoBaseline: number | null
    /** Área do CDT baseline (orcamentos.cdt_area_baseline) — referência para desvio_qualidade */
    cdtAreaBaseline: number | null
    loadProjectData: (id: string) => Promise<void>
    // Story 5.2 — Triângulo Atual (TA) de execução
    taAtual: TrianguloAtual | null
    refreshTA: () => Promise<void>
    // Story 5.6 — Índice de Qualidade (IQ = área_TA / área_TM × 100%)
    iq: number | null
    // Story 5.3 — MATED: distância euclidiana do TA ao TM baseline {1,1,1}
    matedAtual: number | null
    // Derived states
    isTapReady: boolean
    isEapReady: boolean
    isCpmReady: boolean
    isOrcamentoReady: boolean
    isFuncoesPrazoReady: boolean
    isFuncoesCustoReady: boolean
    isFuncoesReady: boolean
    isCalendarioReady: boolean
    isMotorReady: boolean
    loading: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataBaseline: any | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDataBaseline: (data: any) => void
    // Prazo hierarchy (MetodoAura): CPM ≤ Baseline ≤ TAP
    prazoLimiteSuperior: number | null
    bufferProjeto: number | null      // Baseline - CPM (margem TOC)
    isProjetoViavel: boolean | null   // CPM ≤ Baseline? null = indeterminado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataReancorada: any | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDataReancorada: (data: any) => void
    eapCount: number
    setEapCount: (count: number) => void
    // M1 — Lado E Dinâmico: baseline de escopo (tarefas CPM no 1º save)
    nTarefasBaseline: number | null
    setNTarefasBaseline: (n: number | null) => void
    // C2 (K2) — modelo de burndown persistido por projeto
    modeloBurndown: 'linear' | 'quadratica' | 'cubica'
    setModeloBurndown: (m: 'linear' | 'quadratica' | 'cubica') => void
    plan: 'START' | 'PRO' | 'ELITE'
    profileType: 'TECH' | 'CONSTRUCAO' | 'DEFAULT'
    themeSkin: 'CLASSIC' | 'HIGH_CONTRAST' | 'MINIMAL'
    setThemeSkin: (skin: 'CLASSIC' | 'HIGH_CONTRAST' | 'MINIMAL') => void
    getLabel: (key: 'projeto' | 'equipe' | 'custo' | 'prazo') => string
    // MASTERPLAN-X §2 — MetodoAura v3.0
    /** y₀: custo mínimo irredutível comprometido antes da 1ª tarefa operacional */
    custoMobilizacao: number
    setCustoMobilizacao: (v: number) => void
    /** Reserva de contingência acima do orçamento operacional */
    custoReservaContingencia: number
    setCustoReservaContingencia: (v: number) => void
    /** Regime de trabalho: horasPorDia, turnos, incluiSabado */
    regimeTrabalho: { horasPorDia: number; turnos: number; incluiSabado: boolean }
    setRegimeTrabalho: (r: { horasPorDia: number; turnos: number; incluiSabado: boolean }) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const params = useParams()
    const projetoId = params?.projetoId as string | undefined

    const [tap, setTap] = useState<TAPData | null>(null)
    const [tarefas, setTarefas] = useState<TarefaData[]>([])
    const [orcamentoBase, setOrcamentoBase] = useState<number | null>(null)
    const [prazoBase, setPrazoBase] = useState<number | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [funcoes, setFuncoes] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [marcos, setMarcos] = useState<any[]>([])
    const [tenantId, setTenantId] = useState<string | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [regime, setRegime] = useState<any | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [localizacao, setLocalizacao] = useState<any | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [interrupcoes, setInterrupcoes] = useState<any[]>([])
    const [custosTarefas, setCustosTarefas] = useState<Record<string, number>>({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [feriados, setFeriados] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dataBaseline, setDataBaseline] = useState<any | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dataReancorada, setDataReancorada] = useState<any | null>(null)
    const [eapCount, setEapCount] = useState<number>(0)
    const [nTarefasBaseline, setNTarefasBaseline] = useState<number | null>(null)
    const [dataInicioReal, setDataInicioReal] = useState<string | null>(null)
    const [caminhoCriticoBaseline, setCaminhoCriticoBaseline] = useState<number | null>(null)
    const [cdtAreaBaseline, setCdtAreaBaseline] = useState<number | null>(null)
    const [modeloBurndown, setModeloBurndown] = useState<'linear' | 'quadratica' | 'cubica'>('linear')
    const [plan, setPlan] = useState<'START' | 'PRO' | 'ELITE'>('START')
    const [profileType, setProfileType] = useState<'TECH' | 'CONSTRUCAO' | 'DEFAULT'>('TECH')
    const [themeSkin, setThemeSkin] = useState<'CLASSIC' | 'HIGH_CONTRAST' | 'MINIMAL'>('CLASSIC')
    const [dataInicio, setDataInicio] = useState<string | null>(null)
    // MASTERPLAN-X §2 — MetodoAura v3.0
    const [custoMobilizacao, setCustoMobilizacao] = useState<number>(0)
    const [custoReservaContingencia, setCustoReservaContingencia] = useState<number>(0)
    const [regimeTrabalho, setRegimeTrabalho] = useState<{ horasPorDia: number; turnos: number; incluiSabado: boolean }>({ horasPorDia: 8, turnos: 1, incluiSabado: false })
    const [loading, setLoading] = useState(false)
    // Story 5.2 — Triângulo Atual de execução (null = ainda não calculado)
    const [taAtual, setTaAtual] = useState<TrianguloAtual | null>(null)

    const getLabel = useCallback((key: 'projeto' | 'equipe' | 'custo' | 'prazo') => {
        const labels: Record<string, Record<string, string>> = {
            CONSTRUCAO: {
                projeto: 'Obra',
                equipe: 'Canteiro',
                custo: 'Verba',
                prazo: 'Entrega'
            },
            TECH: {
                projeto: 'Squad',
                equipe: 'Devs',
                custo: 'Burn Rate',
                prazo: 'Sprint'
            },
            DEFAULT: {
                projeto: 'Projeto',
                equipe: 'Equipe',
                custo: 'Custo',
                prazo: 'Prazo'
            }
        }
        return labels[profileType]?.[key] || labels.DEFAULT[key]
    }, [profileType])

    // Sync total duration whenever tasks change — CTX-16: usa apenas tarefas do caminho crítico (folga=0)
    useEffect(() => {
        if (tarefas.length > 0) {
            const criticas = tarefas.filter(t => t.folga === 0 && (t.ef || 0) > 0)
            const base = criticas.length > 0
                ? Math.max(...criticas.map(t => t.ef))
                : Math.max(...tarefas.map(t => t.ef || 0), 0)
            setPrazoBase(base > 0 ? base : null)
        } else {
            setPrazoBase(null)
        }
    }, [tarefas])

    // Derived states with Ghost Data protection
    const isIdMatch = tap?.projeto_id === projetoId
    const isTapReady = isIdMatch && tap !== null && (tap.nome_projeto?.trim() || '') !== ''
    const isEapReady = isIdMatch && eapCount > 0 
    const isCpmReady = isIdMatch && tarefas.length > 0 && tarefas.some(t => t.ef > 0) && tarefas.every(t => t.ef > 0 || t.duracao_estimada === 0)
    const isOrcamentoReady = isIdMatch && orcamentoBase !== null && orcamentoBase > 0
    const isFuncoesPrazoReady = isIdMatch && funcoes.some(f => f.tipo === 'crashing' || f.tipo === 'prazo')
    const isFuncoesCustoReady = isIdMatch && (Object.keys(custosTarefas).length > 0 || funcoes.some(f => f.tipo === 'custo'))
    const isFuncoesReady = isFuncoesPrazoReady || isFuncoesCustoReady // Either one allows motor start
    const isCalendarioReady = isIdMatch && dataInicio !== null // Milestones are optional

    // ═══ Prazo Hierarchy (MetodoAura) ═══
    // CPM_duration (floor) < Baseline (ceiling) < TAP_prazo (absolute cap)
    //
    // prazoBase       = CPM critical path duration (forward/backward pass)
    // dataBaseline.prazo = working days from calendar (INDEPENDENT of CPM)
    // tap.prazo_total = original TAP deadline (calendar days)
    //
    // Buffer = Baseline - CPM (TOC project buffer)
    // Viável = CPM ≤ Baseline (project is feasible with current regime)
    // Limits between Baseline and TAP activatable during management IF within CEt
    // Limits outside CEt → discarded (logged)

    const baselinePrazo = dataBaseline?.prazo ?? null
    const tapPrazo = tap?.prazo_total ?? null

    const prazoLimiteSuperior = (() => {
        if (baselinePrazo && baselinePrazo > 0) return baselinePrazo
        if (tapPrazo && tapPrazo > 0) return tapPrazo
        return prazoBase
    })()

    // Buffer de Projeto (TOC): margem de absorção de variabilidade
    const bufferProjeto = (() => {
        if (!prazoBase || prazoBase <= 0 || !baselinePrazo || baselinePrazo <= 0) return null
        return baselinePrazo - prazoBase
    })()

    // Viabilidade: CPM ≤ Baseline?
    const isProjetoViavel = (() => {
        if (!prazoBase || prazoBase <= 0 || !baselinePrazo || baselinePrazo <= 0) return null
        return prazoBase <= baselinePrazo
    })()

    // CTX-18: isMotorReady bloqueia se projeto for explicitamente inviável (isProjetoViavel=false)
    // null = indeterminado (sem baseline ainda) → não bloqueia
    const isMotorReady = isTapReady && isEapReady && isCpmReady && isOrcamentoReady && isFuncoesReady && isCalendarioReady && isProjetoViavel !== false

    const [lastProjetoId, setLastProjetoId] = useState<string | null>(null)

    /**
     * Story 5.2 — Recalcula o Triângulo Atual (TA) de execução e atualiza o contexto.
     * Usa o projetoId da URL (via useParams). No-op se não houver projetoId válido.
     */
    // CTX-20: useRef evita stale closure de taAtual em double-click
    const taAtualRef = useRef(taAtual)
    useEffect(() => { taAtualRef.current = taAtual }, [taAtual])

    const refreshTA = useCallback(async () => {
        if (!projetoId) return
        const novoTA = await recalcularTA(projetoId, supabase, taAtualRef.current ?? undefined)
        setTaAtual(novoTA)
    }, [projetoId])

    // Reset all context data
    const resetContext = useCallback(() => {
        setTap(null)
        setTarefas([])
        setOrcamentoBase(null)
        setPrazoBase(null)
        setFuncoes([])
        setMarcos([])
        setTenantId(null)
        setRegime(null)
        setLocalizacao(null)
        setInterrupcoes([])
        setCustosTarefas({})
        setDataBaseline(null)
        setDataReancorada(null)
        setDataInicio(null)
        setDataInicioReal(null)
        setCaminhoCriticoBaseline(null)
        setCdtAreaBaseline(null)
        setFeriados([])
        setEapCount(0)
        setNTarefasBaseline(null)
        setModeloBurndown('linear')
        setTaAtual(null)
        // CTX-14: reset plan/profileType/themeSkin para defaults
        setPlan('START')
        setProfileType('TECH')
        setThemeSkin('CLASSIC')
        setLoading(false)
    }, [])

    // Critical Patch: Reset Context when ProjectID changes or becomes generic
    useEffect(() => {
        if (projetoId !== lastProjetoId) {
            resetContext()
            setLastProjetoId(projetoId || null)
        }
    }, [projetoId, lastProjetoId, resetContext])

    // CTX-02: ref para cancelar requests stale em navegação rápida A→B
    const loadTokenRef = useRef(0)

    // Load project data
    const loadProjectData = useCallback(async (id: string) => {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        if (!isUUID) {
            console.error('[ProjectContext] ❌ ID de projeto inválido:', id)
            return
        }

        const token = ++loadTokenRef.current
        setLoading(true)
        try {
            // Check auth session first
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: { session } } = await supabase.auth.getSession()

            // 1. Fetch Project Metadata
            const response = await supabase
                .from('projetos')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            const project = response.data
            const pError = response.error

            // CTX-02: aborta se uma navegação mais recente já iniciou novo load
            if (token !== loadTokenRef.current) return

            if (pError) {
                console.error('[ProjectContext] ❌ Erro ao buscar projeto:', pError)
                setTenantId(null)
            } else if (project) {
                // ... rest of the logic
                const meta = project.config_localizacao?.metadata_tap || {}
                setTap({
                    projeto_id: id,
                    nome_projeto: project.nome || 'Sem Nome',
                    justificativa: project.justificativa || meta.justificativa || project.descricao || '',
                    objetivo_smart: project.objetivo_smart || meta.objetivo_smart || '',
                    escopo_sintetizado: project.escopo_sintetizado || meta.escopo_sintetizado || project.descricao || '',
                    orcamento_total: project.orcamento_total || meta.orcamento_total || 0,
                    prazo_total: project.prazo_total || meta.prazo_total || 0,
                    restricoes: project.restricoes || meta.restricoes || '',
                    percentual_contingencia: project.percentual_contingencia ?? null,
                    setor: project.setor ?? null,
                })
                setTenantId(project.tenant_id)
                setRegime(project.config_regime)
                setLocalizacao(project.config_localizacao)
                if (project.config_localizacao?.feriados_overrides) {
                    setFeriados(project.config_localizacao.feriados_overrides)
                }
                setInterrupcoes(project.interrupcoes || [])
                // CTX-07: valida estrutura antes de setar — evita NaN em cálculos se .prazo ausente
                const rawBaseline = project.data_baseline
                const safeBaseline = rawBaseline && typeof rawBaseline === 'object' && typeof rawBaseline.prazo === 'number'
                    ? rawBaseline
                    : null
                setDataBaseline(safeBaseline)
                setDataReancorada(project.data_reancorada)
                setDataInicio(project.data_inicio || null)
                setDataInicioReal(project.data_inicio_real || null)
                setNTarefasBaseline(project.n_tarefas_baseline ?? null)
                setCaminhoCriticoBaseline(project.caminho_critico_baseline_dias ?? null)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setModeloBurndown((project.modelo_burndown as any) ?? 'linear')
                // MASTERPLAN-X §2 — MetodoAura v3.0
                setCustoMobilizacao(project.custo_mobilizacao ?? 0)
                setCustoReservaContingencia(project.custo_reserva_contingencia ?? 0)
                if (project.regime_trabalho) {
                    setRegimeTrabalho({
                        horasPorDia: project.regime_trabalho.horasPorDia ?? 8,
                        turnos: project.regime_trabalho.turnos ?? 1,
                        incluiSabado: project.regime_trabalho.incluiSabado ?? false,
                    })
                }
                
                // Track timestamps for audit if needed (with fallbacks)
                if (!project.tenant_id) {
                    console.error('[ProjectContext] ⚠️ Alerta: tenant_id nulo para o projeto:', id)
                } else {
                    // Fetch Tenant Data - trying both plan_tier and plan to be resilient
                    const { data: tenantData, error: tError } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('id', project.tenant_id)
                        .maybeSingle()
                    
                    if (tError) {
                        console.error('[ProjectContext] ❌ Erro ao buscar tenant:', tError)
                        // Even if tenant fails, we proceed with default plan to avoid blocking
                        setPlan('START')
                        setProfileType('TECH')
                    } else if (tenantData) {
                        // Fallback logic for column naming: PRD says plan_tier, some DBs have plan
                        const planTier = tenantData.plan_tier || tenantData.plan || 'START'
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setPlan(planTier as any)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setProfileType(tenantData.profile_type as any || 'TECH')
                    }
                }
            } else {
                console.warn('[ProjectContext] ⚠️ Projeto não encontrado. Verificando acesso geral...')
                // Ghost Detection
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { data: list } = await supabase.from('projetos').select('id')
                setTenantId(null)
            }

            // 2. Fetch Tasks
            const { data: dbTarefas, error: tError } = await supabase
                .from('tarefas')
                .select('*')
                .eq('projeto_id', id)

            if (tError) {
                console.error('[ProjectContext] ❌ Erro ao buscar tarefas:', tError)
            } else if (dbTarefas) {
                setTarefas((dbTarefas as TarefaRow[]).map(t => toTarefaData({
                    id: t.id,
                    nome: t.nome,
                    duracao_estimada: t.duracao_estimada ?? undefined,
                    duracao_realizada: t.duracao_realizada ?? undefined,
                    status: t.status ?? undefined,
                    predecessoras: t.predecessoras ?? undefined,
                    es: t.es ?? undefined,
                    ef: t.ef ?? undefined,
                    ls: t.ls ?? undefined,
                    lf: t.lf ?? undefined,
                    folga_total: t.folga_total ?? undefined,
                    no_caminho_critico: t.no_caminho_critico ?? undefined,
                })))
            }

            const { data: dbMarcos } = await supabase.from('marcos').select('*').eq('projeto_id', id)
            if (dbMarcos) setMarcos(dbMarcos)

            const { data: dbFuncoes } = await supabase.from('funcoes_compressao').select('*').eq('projeto_id', id)
            if (dbFuncoes) setFuncoes(dbFuncoes)

            const { count: eapTotal } = await supabase.from('eap_nodes').select('*', { count: 'exact', head: true }).eq('projeto_id', id)
            setEapCount(eapTotal || 0)

            // 3. Fetch Budget Data
            const { data: dbOrcamento } = await supabase
                .from('orcamentos')
                .select('*')
                .eq('projeto_id', id)
                .maybeSingle()

            if (dbOrcamento) {
                // v4.1: Number() obrigatório — Supabase retorna `numeric` como STRING
                // "0" é truthy em JS, mascarava orcamento_base. Number("0")=0 é falsy → fallthrough correto.
                const orcValue = Number(dbOrcamento.teto_tap) || Number(dbOrcamento.orcamento_base) || 0
                setOrcamentoBase(orcValue)
                setCustosTarefas(parseCustosTarefas(dbOrcamento.custos_tarefas))
                setCdtAreaBaseline(dbOrcamento.cdt_area_baseline ?? null)

                // Patch TAP state if it came empty from projetos table
                setTap(prev => prev ? {
                    ...prev,
                    orcamento_total: prev.orcamento_total || orcValue
                } : null)
            } else if (project?.tenant_id) {
                // CTX-05: cria registro vazio para evitar custosTarefas sempre {}
                await supabase.from('orcamentos').insert({
                    projeto_id: id,
                    tenant_id: project.tenant_id,
                    custos_tarefas: {},
                }).select().maybeSingle()
                setCustosTarefas({})
            }
            
            // Final duration sync for TAP summary
            if (dbTarefas && dbTarefas.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const totalDays = Math.max(...dbTarefas.map((t: any) => t.ef || 0), 0)
                setTap(prev => prev ? { 
                    ...prev, 
                    prazo_total: prev.prazo_total || totalDays 
                } : null)
            }

        } catch (err) {
            console.error('[ProjectContext] 💥 Erro inesperado no ProjectProvider:', err)
        } finally {
            setLoading(false)
        }
    }, [resetContext])

    // Auto-load project data when projetoId changes or tenantId is null
    useEffect(() => {
        if (projetoId && tenantId === null && !loading) {
            loadProjectData(projetoId)
        }
    }, [projetoId, tenantId, loadProjectData, loading])

    // Story 5.6 — IQ: área_TA / área_TM × 100%
    // TM = triângulo meta CDT v3.0 (isósceles: E=1, C=P=sqrt(2) — baseline isósceles)
    // areaTM = areaTri(1, sqrt(2), sqrt(2)) ≈ 0.6614 (não mais equilátero 0.4330)
    const iq = (() => {
        if (!taAtual) return null
        const areaTM = areaTri(1, Math.sqrt(2), Math.sqrt(2))   // CDT v3.0 isosceles baseline: ~0.6614
        const areaTA = areaTri(taAtual.E, taAtual.P, taAtual.O)
        return calcularIQ(areaTA, areaTM)
    })()

    // Story 5.3 — MATED: distância euclidiana do TA ao TM baseline {1,1,1}
    // Atualizado automaticamente a cada recálculo do TA via refreshTA()
    const matedAtual = taAtual ? calcularMATEDFromSides(taAtual) : null

    // CTX-10: setter de modeloBurndown que persiste no DB automaticamente
    const setModeloBurndownDB = useCallback(async (m: 'linear' | 'quadratica' | 'cubica') => {
        setModeloBurndown(m)
        if (projetoId) {
            await supabase.from('projetos').update({ modelo_burndown: m }).eq('id', projetoId)
        }
    }, [projetoId])

    const value = {
        tap, setTap, tarefas, setTarefas, orcamentoBase, setOrcamentoBase,
        prazoBase, setPrazoBase, funcoes, setFuncoes, marcos, setMarcos,
        tenantId, regime, setRegime, localizacao, setLocalizacao,
        interrupcoes, setInterrupcoes, custosTarefas, setCustosTarefas,
        loadProjectData,
        isTapReady, isEapReady, isCpmReady, isOrcamentoReady,
        isFuncoesPrazoReady, isFuncoesCustoReady, isFuncoesReady,
        isCalendarioReady, isMotorReady, prazoLimiteSuperior, bufferProjeto, isProjetoViavel,
        loading,
        dataBaseline, setDataBaseline,
        dataReancorada, setDataReancorada,
        eapCount, setEapCount,
        nTarefasBaseline, setNTarefasBaseline,
        modeloBurndown, setModeloBurndown: setModeloBurndownDB,
        dataInicio, setDataInicio,
        dataInicioReal,
        caminhoCriticoBaseline,
        cdtAreaBaseline,
        feriados, setFeriados,
        plan, profileType,
        themeSkin, setThemeSkin, getLabel,
        // Story 5.2
        taAtual, refreshTA,
        // Story 5.6
        iq,
        // Story 5.3
        matedAtual,
        // MASTERPLAN-X §2 — MetodoAura v3.0
        custoMobilizacao, setCustoMobilizacao,
        custoReservaContingencia, setCustoReservaContingencia,
        regimeTrabalho, setRegimeTrabalho,
    }

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProject() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider')
    }
    return context
}
