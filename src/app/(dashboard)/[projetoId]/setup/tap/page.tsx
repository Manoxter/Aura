'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileText, CheckCircle2, Bot, Save, AlertTriangle, Eye, X, Pencil, Lock } from 'lucide-react'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { useProject, toTarefaData } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { SetupStepper } from '@/components/aura/SetupStepper'
import { useToast } from '@/hooks/useToast'

// Defaults de contingência por tipo de perfil (mapeado de aura_setor_config)
const CONTINGENCIA_DEFAULT_BY_PROFILE: Record<string, number> = {
    CONSTRUCAO: 15, // construção civil / infraestrutura — Flyvbjerg 2022
    TECH: 10,       // tecnologia — PMI Pulse 2024
    DEFAULT: 10,    // geral
}

// C3: Parser seguro para inputs numéricos monetários — rejeita silenciosamente strings inválidas
function parseCurrencyInput(raw: string): number {
    const cleaned = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
    const val = parseFloat(cleaned)
    return isNaN(val) ? 0 : Math.max(0, val)
}

export default function SetupTapPage({ params }: { params: { projetoId: string } }) {
    const router = useRouter()
    const { toast } = useToast()
    // UI States
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [file, setFile] = useState<File | null>(null)
    const [text, setText] = useState('')
    const [extracting, setExtracting] = useState(false)
    const [isExtracted, setIsExtracted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [proactiveMsg, setProactiveMsg] = useState('')
    const [showTapModal, setShowTapModal] = useState(false)

    // Local form state before saving to global context
    const [extractedData, setExtractedData] = useState<{
        nome_projeto: string;
        justificativa: string;
        objetivo_smart: string;
        escopo_sintetizado: string;
        orcamento_total: number;
        prazo_total: number;
        restricoes: string;
        tarefas?: { id: string; nome: string; duracao: number }[];
        // Story 3.0-A: novos campos CDT
        percentual_contingencia: number;
        data_inicio_real: string | null;
        // Story 7.0 — MASTERPLAN-X: Custo Base
        custo_mobilizacao: number;
        custo_reserva_contingencia: number;
        regime_trabalho: { horasPorDia: number; turnos: number; incluiSabado: boolean };
    } | null>(null)

    // Modo leitura — ativo quando TAP já está salva (retorno ao formulário)
    const [isViewMode, setIsViewMode] = useState(false)

    // Story 3.0-A: aviso se setor não mapeado
    const [setorNaoMapeado, setSetorNaoMapeado] = useState(false)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tap, setTap, setTarefas, setOrcamentoBase, setFuncoes, setMarcos, tenantId, loading: contextLoading, profileType, setCustoMobilizacao, setCustoReservaContingencia, setRegimeTrabalho, custoMobilizacao, custoReservaContingencia, regimeTrabalho } = useProject()
    const [lastId, setLastId] = useState<string>(params.projetoId)

    // Reset local states when changing projects (avoid Ghost Data from previous sessions)
    useEffect(() => {
        if (params.projetoId !== lastId) {
            setFile(null)
            setText('')
            setExtracting(false)
            setIsExtracted(false)
            setSaving(false)
            setIsDirty(false)
            setSaveStatus('idle')
            setProactiveMsg('')
            setExtractedData(null)
            setLastId(params.projetoId)
        }
    }, [params.projetoId, lastId])

    // Hydrate local state from context if available (returning to an existing project)
    useEffect(() => {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projetoId)

        // Trava crítica: Só hidrata se o ID no contexto bater com o ID na URL
        const isCorrectProject = tap?.projeto_id === params.projetoId

        const hasRealData = tap && tap.nome_projeto &&
                           tap.nome_projeto !== 'Novo Projeto (Rascunho)' &&
                           tap.nome_projeto !== 'Sem Nome'

        if (isUUID && isCorrectProject && hasRealData && !extractedData && !isExtracted) {
            setExtractedData({
                ...tap,
                percentual_contingencia: CONTINGENCIA_DEFAULT_BY_PROFILE[profileType] ?? 10,
                data_inicio_real: null,
                custo_mobilizacao: custoMobilizacao,
                custo_reserva_contingencia: custoReservaContingencia,
                regime_trabalho: regimeTrabalho,
            })
            setIsExtracted(true)
            setIsViewMode(true)  // ao retornar, mostra modo leitura por padrão
        }
    }, [tap, extractedData, isExtracted, params.projetoId, profileType, custoMobilizacao, custoReservaContingencia, regimeTrabalho])

    // Restaura texto bruto da TAP: localStorage (rápido) ou DB (fallback cross-device)
    useEffect(() => {
        if (!isExtracted || text) return

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projetoId)

        // 1. Tenta localStorage primeiro (instantâneo)
        const local = localStorage.getItem(`tap-raw-${params.projetoId}`)
        if (local) { setText(local); return }

        // 2. Fallback: busca do banco (tap_texto_original em config_localizacao)
        if (!isUUID) return
        supabase
            .from('projetos')
            .select('config_localizacao')
            .eq('id', params.projetoId)
            .maybeSingle()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data }: { data: any }) => {
                const tapTexto = data?.config_localizacao?.tap_texto_original
                if (tapTexto) {
                    setText(tapTexto)
                    localStorage.setItem(`tap-raw-${params.projetoId}`, tapTexto)
                }
            })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExtracted, params.projetoId])

    // Story 3.0-A: carregar campos CDT existentes do banco ao hidratar projeto salvo
    useEffect(() => {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projetoId)
        if (!isUUID) return

        async function loadCdtFields() {
            const { data } = await supabase
                .from('projetos')
                .select('percentual_contingencia, data_inicio_real, custo_mobilizacao, custo_reserva_contingencia, regime_trabalho')
                .eq('id', params.projetoId)
                .maybeSingle()

            if (data) {
                const defaultContingencia = CONTINGENCIA_DEFAULT_BY_PROFILE[profileType] ?? 10
                const pct = data.percentual_contingencia ?? defaultContingencia
                setSetorNaoMapeado(data.percentual_contingencia == null)
                const rt = data.regime_trabalho ?? { horasPorDia: 8, turnos: 1, incluiSabado: false }
                setExtractedData(prev => prev ? {
                    ...prev,
                    percentual_contingencia: pct,
                    data_inicio_real: data.data_inicio_real ?? null,
                    custo_mobilizacao: data.custo_mobilizacao ?? 0,
                    custo_reserva_contingencia: data.custo_reserva_contingencia ?? 0,
                    regime_trabalho: {
                        horasPorDia: rt.horasPorDia ?? 8,
                        turnos: rt.turnos ?? 1,
                        incluiSabado: rt.incluiSabado ?? false,
                    },
                } : prev)
            }
        }

        if (isExtracted) {
            loadCdtFields()
        }
    }, [params.projetoId, isExtracted, profileType])


    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            toast({ variant: 'info', message: 'Para PDFs, a engine de OCR será integrada na fase backend. Por favor, cole o texto na caixa abaixo por enquanto para testar a extração.' })
            setFile(null)
        }
    }

    const handleTextExtract = async () => {
        if (text.trim().length > 10) {
            setExtracting(true)
            try {
                // 1. DETERMINISTIC SCRIPT EXTRACTION (V6.2 PRIORITY)
                const { deterministicExtractor } = await import('@/lib/engine/extractors')
                const scriptValues = deterministicExtractor(text)
                
                // 2. IA EXTRACTION FOR SEMANTIC FIELDS
                const res = await authFetch('/api/ai/tap', {
                    method: 'POST',
                    body: JSON.stringify({ text })
                })
                const aiData = await res.json()

                console.log('[TAP] status:', res.status, 'ok:', res.ok)
                console.log('[TAP] aiData:', JSON.stringify(aiData).substring(0, 600))
                console.log('[TAP] scriptValues:', JSON.stringify(scriptValues))

                if (res.ok) {
                    // MERGE: Script values ALWAYS win for Budget/Deadline if non-zero
                    const finalOrcamento = scriptValues.orcamento > 0 ? scriptValues.orcamento : (aiData.orcamento_total || 0)
                    const finalPrazo = scriptValues.prazo > 0 ? scriptValues.prazo : (aiData.prazo_total || 0)

                    if (scriptValues.orcamento > 0 && aiData.orcamento_total && scriptValues.orcamento !== aiData.orcamento_total) {
                        console.warn(`[TAP] Extractor: ${scriptValues.orcamento} | Groq: ${aiData.orcamento_total} → usando extractor (prioridade)`)
                    }

                    // Detectar se a IA retornou fallback sem campos semânticos
                    const iaFalhou = aiData._fallback || (!aiData.justificativa && !aiData.objetivo_smart && !aiData.escopo_sintetizado)
                    if (iaFalhou) {
                        toast({ variant: 'warning', message: 'IA indisponível — orçamento e prazo extraídos automaticamente. Preencha os campos semânticos manualmente.' })
                    }

                    const defaultContingencia = CONTINGENCIA_DEFAULT_BY_PROFILE[profileType] ?? 10
                    setSetorNaoMapeado(!(profileType in CONTINGENCIA_DEFAULT_BY_PROFILE))
                    setExtractedData({
                        nome_projeto: scriptValues.nome || aiData.nome_projeto || 'Novo Projeto',
                        justificativa: aiData.justificativa || '',
                        objetivo_smart: aiData.objetivo_smart || '',
                        escopo_sintetizado: aiData.escopo_sintetizado || '',
                        orcamento_total: finalOrcamento,
                        prazo_total: finalPrazo,
                        restricoes: aiData.restricoes || '',
                        tarefas: aiData.tarefas || [],
                        percentual_contingencia: defaultContingencia,
                        data_inicio_real: null,
                        custo_mobilizacao: 0,
                        custo_reserva_contingencia: 0,
                        regime_trabalho: { horasPorDia: 8, turnos: 1, incluiSabado: false },
                    })
                    setIsExtracted(true)
                    setIsDirty(true)
                    localStorage.setItem(`tap-raw-${params.projetoId}`, text)
                } else {
                    // Fallback to script values only if AI fails (HTTP error)
                    toast({ variant: 'warning', message: `IA retornou erro ${res.status} — orçamento e prazo extraídos pelo script. Preencha os campos semânticos manualmente.` })
                    const defaultContingencia = CONTINGENCIA_DEFAULT_BY_PROFILE[profileType] ?? 10
                    setExtractedData({
                        nome_projeto: scriptValues.nome || 'Novo Projeto',
                        justificativa: '',
                        objetivo_smart: '',
                        escopo_sintetizado: '',
                        orcamento_total: scriptValues.orcamento || 0,
                        prazo_total: scriptValues.prazo || 0,
                        restricoes: '',
                        tarefas: [],
                        percentual_contingencia: defaultContingencia,
                        data_inicio_real: null,
                        custo_mobilizacao: 0,
                        custo_reserva_contingencia: 0,
                        regime_trabalho: { horasPorDia: 8, turnos: 1, incluiSabado: false },
                    })
                    setIsExtracted(true)
                    setIsDirty(true)
                    localStorage.setItem(`tap-raw-${params.projetoId}`, text)
                }
            } catch (err) {
                console.error(err)
                toast({ variant: 'warning', message: 'Falha na extração. Tentando modo de segurança...' })
            } finally {
                setExtracting(false)
            }
        } else {
            toast({ variant: 'warning', message: 'Por favor, insira um texto mais detalhado sobre o escopo do projeto.' })
        }
    }

    const handleSaveAndProceed = async () => {
        if (!extractedData) return

        const isUUIDCheck = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.projetoId)

        // Resolve tenantId: contexto (rápido) ou busca direta no banco (fallback)
        let effectiveTenantId = tenantId
        if (!effectiveTenantId && isUUIDCheck) {
            const { data: projMeta } = await supabase
                .from('projetos')
                .select('tenant_id')
                .eq('id', params.projetoId)
                .maybeSingle()
            effectiveTenantId = projMeta?.tenant_id ?? null
            if (effectiveTenantId) {
                console.log('[TAP] tenantId resolvido diretamente do banco:', effectiveTenantId)
            }
        }

        if (!effectiveTenantId) {
            toast({ variant: 'error', message: 'Erro: Tenant ID não encontrado. Tente atualizar a página ou verificar sua conexão.' })
            return
        }

        setSaving(true)
        setProactiveMsg('Salvando TAP Oficial...')

        // 1. Commit TAP to Global Memory
        const finalTap = {
            nome_projeto: extractedData.nome_projeto,
            justificativa: extractedData.justificativa,
            objetivo_smart: extractedData.objetivo_smart,
            escopo_sintetizado: extractedData.escopo_sintetizado,
            orcamento_total: extractedData.orcamento_total,
            prazo_total: extractedData.prazo_total,
            restricoes: extractedData.restricoes,
            tarefas: extractedData.tarefas || []
        }
        setTap(finalTap)
        // Story 7.0 — sync MASTERPLAN-X fields to context
        setCustoMobilizacao(extractedData.custo_mobilizacao ?? 0)
        setCustoReservaContingencia(extractedData.custo_reserva_contingencia ?? 0)
        setRegimeTrabalho(extractedData.regime_trabalho ?? { horasPorDia: 8, turnos: 1, incluiSabado: false })

        // 2. Trigger Deterministic Cascade (V6.3 Hierarchical Script-First)
        setProactiveMsg('Extraindo Hierarquia e Sincronizando...')
        try {
            const activeProjectId = params.projetoId
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeProjectId)

            // STEP A: Persist TAP Metadata to Supabase
            if (isUUID) {
                // Refresh session before write operations (prevents RLS silent failures)
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    toast({ variant: 'warning', message: 'Sessão expirada. Faça login novamente.' })
                    setSaving(false)
                    return
                }

                // Verify project access before update (also fetch config_localizacao to merge tap_texto)
                const { data: projectCheck, error: checkError } = await supabase
                    .from('projetos')
                    .select('id, tenant_id, config_localizacao')
                    .eq('id', activeProjectId)
                    .maybeSingle()

                if (checkError) {
                    toast({ variant: 'error', message: `Erro ao verificar projeto: ${checkError.message}. Código: ${checkError.code}` })
                    setSaving(false)
                    return
                }

                if (!projectCheck) {
                    toast({ variant: 'error', message: 'Projeto não encontrado ou sem permissão de acesso (RLS). Verifique se você está logado com a conta correta.' })
                    setSaving(false)
                    return
                }

                // Merge tap_texto_original no JSONB existente (sem migration)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const existingConfig = (projectCheck as any)?.config_localizacao || {}
                const configComTap = text ? { ...existingConfig, tap_texto_original: text } : existingConfig

                const { error: tapError } = await supabase
                    .from('projetos')
                    .update({
                        nome: finalTap.nome_projeto,
                        justificativa: finalTap.justificativa,
                        objetivo_smart: finalTap.objetivo_smart,
                        escopo_sintetizado: finalTap.escopo_sintetizado,
                        orcamento_total: finalTap.orcamento_total,
                        prazo_total: finalTap.prazo_total,
                        restricoes: finalTap.restricoes,
                        tap_extraida: true,
                        config_localizacao: configComTap,
                        // Story 3.0-A: novos campos CDT
                        percentual_contingencia: extractedData.percentual_contingencia,
                        data_inicio_real: extractedData.data_inicio_real || null,
                        // Story 7.0 — MASTERPLAN-X: Custo Base
                        custo_mobilizacao: extractedData.custo_mobilizacao ?? 0,
                        custo_reserva_contingencia: extractedData.custo_reserva_contingencia ?? 0,
                        regime_trabalho: extractedData.regime_trabalho ?? { horasPorDia: 8, turnos: 1, incluiSabado: false },
                        atualizado_em: new Date().toISOString()
                    })
                    .eq('id', activeProjectId)

                if (tapError) {
                    toast({ variant: 'error', message: `Erro ao salvar TAP: ${tapError.message}. Código: ${tapError.code}` })
                    throw tapError
                }
            }

            // STEP B: Hierarchical WBS Extraction from Raw Text (V6.3)
            const { wbsExtractor } = await import('@/lib/engine/extractors')
            const wbsDrafts = wbsExtractor(text)
            
            if (wbsDrafts.length > 0) {
                // Save to EAP Nodes (V6.4 Atomic Cascade)
                await supabase.from('tarefas').delete().eq('projeto_id', activeProjectId)
                await supabase.from('eap_nodes').delete().eq('projeto_id', activeProjectId)
                
                const { error: eapErr } = await supabase.from('eap_nodes').insert(
                    wbsDrafts.map(d => ({
                        id: d.id,
                        projeto_id: activeProjectId,
                        tenant_id: effectiveTenantId,
                        nome: d.nome,
                        pai_id: d.pai_id,
                        nivel: d.nivel
                    }))
                )
                if (eapErr) {
                    console.error('Error saving EAP nodes:', eapErr)
                    toast({ variant: 'warning', message: `Aviso: Erro ao salvar EAP: ${eapErr.message}. O save da TAP continuará.` })
                }

                // STEP C: Identify Leaf Nodes as Tasks
                const childrenIds = new Set(wbsDrafts.map(d => d.pai_id).filter(Boolean))
                const leafNodes = wbsDrafts.filter(d => !childrenIds.has(d.id))

                const tasksToInsert = leafNodes.map((t) => ({
                    id: t.id, // Reuse EAP ID for consistency
                    projeto_id: activeProjectId,
                    tenant_id: effectiveTenantId,
                    nome: t.nome,
                    duracao_estimada: t.duracao || 1, // P4: mínimo 1 dia — não inventar duração
                    status: 'planejado',
                    predecessoras: undefined // evita type mismatch uuid[] = jsonb
                }))

                const { error: taskError } = await supabase.from('tarefas').insert(tasksToInsert)
                if (taskError) console.error('Error saving tasks:', taskError)
                setTarefas(tasksToInsert.map(t => toTarefaData(t)))
            }

            // STEP C: Deterministic Budget Baseline + Seed custosTarefas proporcional
            if (finalTap.orcamento_total > 0) {
                // Distribuir custos proporcionalmente por duracao das tarefas-folha
                const childrenIds = new Set(wbsDrafts.map(d => d.pai_id).filter(Boolean))
                const leafs = wbsDrafts.filter(d => !childrenIds.has(d.id))
                const totalDuracao = leafs.reduce((sum, l) => sum + (l.duracao || 1), 0)
                const custosSeed: Record<string, number> = {}
                if (totalDuracao > 0) {
                    leafs.forEach(l => {
                        custosSeed[l.id] = Math.round((finalTap.orcamento_total * (l.duracao || 1)) / totalDuracao)
                    })
                }

                const { error: orcError } = await supabase
                    .from('orcamentos')
                    .upsert({
                        projeto_id: activeProjectId,
                        tenant_id: effectiveTenantId,
                        orcamento_base: finalTap.orcamento_total,
                        teto_tap: finalTap.orcamento_total,
                        contingencia_valor: finalTap.orcamento_total * 0.1,
                        custos_tarefas: custosSeed,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'projeto_id' })

                if (orcError) console.error('Error saving budget:', orcError)
                setOrcamentoBase(finalTap.orcamento_total)
            }

            // STEP D: Initial Milestones
            const milestones = [
                { projeto_id: activeProjectId, tenant_id: effectiveTenantId, nome: 'Início do Projeto', dia_estimado: 0 },
                { projeto_id: activeProjectId, tenant_id: effectiveTenantId, nome: 'Entrega Final', dia_estimado: finalTap.prazo_total }
            ]
            await supabase.from('marcos').delete().eq('projeto_id', activeProjectId)
            await supabase.from('marcos').insert(milestones)
            setMarcos(milestones)

            setProactiveMsg('Setup Base Finalizado! Redirecionando...')
            setSaveStatus('success')
            toast({ variant: 'success', message: 'TAP salva com sucesso!' })
            
            setTimeout(() => {
                router.push(`/${activeProjectId}/setup/wbs`)
            }, 800)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Cascade Error:', err)
            setSaveStatus('error')
            const msg = err?.message || String(err)
            setProactiveMsg(`Erro: ${msg}`)
            toast({ variant: 'error', message: `Erro no salvamento: ${msg}` })
        } finally {
            setSaving(false)
        }

    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInputClass = (val: any) => {
        const base = "w-full rounded-lg p-3 transition-all duration-300 outline-none border focus:ring-1 "
        if (!val || (typeof val === 'string' && val.trim() === '')) return base + "bg-slate-900 border-slate-800 text-slate-500" // Cinza
        if (isDirty) return base + "bg-slate-900 border-amber-500/50 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20" // Amarelo
        return base + "bg-slate-900 border-emerald-500/30 text-emerald-50 focus:border-emerald-500 focus:ring-emerald-500/20" // Verde
    }


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    Setup: TAP & Escopo
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Extração de dados iniciais via IA (Termo de Abertura do Projeto)</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-lg">
                        {!extracting && !isExtracted ? (
                            <div className="space-y-6">
                                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-700 rounded-2xl hover:bg-slate-800/50 hover:border-blue-500 transition-colors cursor-pointer">
                                    <UploadCloud className="h-10 w-10 text-slate-500 mb-4" />
                                    <span className="text-slate-300 font-medium text-lg">Selecione o PDF da TAP</span>
                                    <span className="text-slate-500 text-sm mt-1">Clique ou arraste e solte (Max 10MB)</span>
                                    <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                                </label>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-slate-800"></div>
                                    <span className="text-slate-500 font-medium text-sm">OU</span>
                                    <div className="flex-1 h-px bg-slate-800"></div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Cole o texto da TAP ou Escopo diretamente:</label>
                                    <textarea
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 h-32 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="Ex: O projeto consiste na construção de um galpão industrial com área de 20.000m²... Orçamento de 2.5MM e prazo de 180 dias..."
                                    ></textarea>
                                    <button
                                        onClick={handleTextExtract}
                                        className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                                    >
                                        Extrair Dados com IA
                                    </button>
                                </div>
                            </div>
                        ) : extracting ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full animate-ping absolute top-0 left-0" />
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin relative" />
                                </div>
                                <p className="text-slate-300 font-medium animate-pulse">Groq IA: Extraindo entidades e escopo...</p>
                            </div>
                        ) : extractedData && isViewMode ? (
                            /* ── Modo Leitura — TAP já salva ─────────────────────────────── */
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <Lock className="h-4 w-4" />
                                        <span className="text-sm font-semibold">TAP Salva — Modo Leitura</span>
                                    </div>
                                    <button
                                        onClick={() => setIsViewMode(false)}
                                        className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                                    >
                                        <Pencil className="h-3 w-3" /> Editar TAP
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: 'Nome do Projeto',   value: extractedData.nome_projeto },
                                        { label: 'Escopo',            value: extractedData.escopo_sintetizado },
                                        { label: 'Objetivo SMART',    value: extractedData.objetivo_smart },
                                        { label: 'Justificativa',     value: extractedData.justificativa },
                                        { label: 'Restrições',        value: extractedData.restricoes },
                                    ].map(({ label, value }) => value ? (
                                        <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                            <p className="text-sm text-slate-200 leading-relaxed">{value}</p>
                                        </div>
                                    ) : null)}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-4 text-center">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Orçamento</p>
                                        <p className="text-lg font-mono font-bold text-emerald-400 mt-1">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(extractedData.orcamento_total)}
                                        </p>
                                    </div>
                                    <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-4 text-center">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Prazo</p>
                                        <p className="text-lg font-mono font-bold text-blue-400 mt-1">{extractedData.prazo_total} dias</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contingência</p>
                                        <p className="text-lg font-mono font-bold text-slate-300 mt-1">{extractedData.percentual_contingencia ?? 10}%</p>
                                    </div>
                                </div>
                                {text && (
                                    <button
                                        onClick={() => setShowTapModal(true)}
                                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
                                    >
                                        <Eye className="h-3.5 w-3.5" /> Ver TAP Original
                                    </button>
                                )}
                            </div>
                        ) : extractedData && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between gap-3 text-emerald-400 bg-emerald-950/30 p-4 border border-emerald-900/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                                        <span className="font-medium">Extração concluída com sucesso. Revise o Resumo da TAP.</span>
                                    </div>
                                    {text && (
                                        <button
                                            onClick={() => setShowTapModal(true)}
                                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 border border-slate-700"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver TAP Original
                                        </button>
                                    )}
                                </div>

                                {/* Resumo Table Section */}
                                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 overflow-hidden">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Resumo Executivo (IA)</h3>
                                    <div className="flex flex-wrap gap-x-12 gap-y-6">
                                        <div className="space-y-1 min-w-[200px]">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Orçamento Base</p>
                                            <p className="text-xl font-mono text-emerald-400 break-words">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extractedData.orcamento_total)}
                                            </p>
                                        </div>
                                        <div className="space-y-1 min-w-[150px]">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Prazo Estimado</p>
                                            <p className="text-xl font-mono text-blue-400">
                                                {extractedData.prazo_total} <span className="text-xs text-slate-500">dias</span>
                                            </p>
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-[250px]">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Escopo Sintetizado</p>
                                            <p className="text-sm text-slate-300 leading-tight italic">
                                                &ldquo;{extractedData.escopo_sintetizado}&rdquo;
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nome do Projeto</label>
                                        <input type="text" className={getInputClass(extractedData.nome_projeto)}
                                            value={extractedData.nome_projeto}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, nome_projeto: e.target.value })
                                                setIsDirty(true)
                                            }} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Escopo Sintetizado (Resumo Executivo)</label>
                                        <input type="text" className={getInputClass(extractedData.escopo_sintetizado)}
                                            value={extractedData.escopo_sintetizado}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, escopo_sintetizado: e.target.value })
                                                setIsDirty(true)
                                            }} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Orçamento Total (BRL)</label>
                                            <input type="number" className={getInputClass(extractedData.orcamento_total)}
                                                value={extractedData.orcamento_total}
                                                onChange={(e) => {
                                                    setExtractedData({ ...extractedData, orcamento_total: parseCurrencyInput(e.target.value) })
                                                    setIsDirty(true)
                                                }} />
                                            {/* U5: display formatado para evitar ambiguidade em valores grandes */}
                                            {extractedData.orcamento_total > 0 && (
                                                <p className="text-[10px] text-slate-600 mt-1">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(extractedData.orcamento_total)}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Prazo Total (Dias)</label>
                                            <input type="number" className={getInputClass(extractedData.prazo_total)}
                                                value={extractedData.prazo_total}
                                                onChange={(e) => {
                                                    setExtractedData({ ...extractedData, prazo_total: parseInt(e.target.value) || 0 })
                                                    setIsDirty(true)
                                                }} />
                                        </div>
                                    </div>
                                    {/* Story 3.0-A: Reserva de Contingência */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                            Reserva de Contingência (%)
                                            <span className="text-[10px] text-slate-600 normal-case font-normal">Risco + Incerteza do projeto</span>
                                        </label>
                                        {setorNaoMapeado && (
                                            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 mt-1 mb-2">
                                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                                Setor não mapeado — usando 10% como padrão. Ajuste se necessário.
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 mt-2">
                                            <input
                                                type="range"
                                                min={0}
                                                max={40}
                                                step={1}
                                                value={extractedData.percentual_contingencia}
                                                onChange={(e) => {
                                                    setExtractedData({ ...extractedData, percentual_contingencia: parseInt(e.target.value) })
                                                    setIsDirty(true)
                                                }}
                                                className="flex-1 accent-amber-500"
                                            />
                                            <span className="text-lg font-mono text-amber-400 w-12 text-right">
                                                {extractedData.percentual_contingencia}%
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            Orçamento operacional = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                extractedData.orcamento_total * (1 - extractedData.percentual_contingencia / 100)
                                            )} (base para o Índice de Qualidade)
                                        </p>
                                    </div>

                                    {/* Story 3.0-A: Data de Início Real */}
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                            Data de Início Real
                                        </label>
                                        <input
                                            type="date"
                                            className={getInputClass(extractedData.data_inicio_real)}
                                            value={extractedData.data_inicio_real || ''}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, data_inicio_real: e.target.value || null })
                                                setIsDirty(true)
                                            }}
                                        />
                                        {!extractedData.data_inicio_real ? (
                                            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 mt-2">
                                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                                Data de início real não informada — usando data planejada. Atualize quando o projeto iniciar.
                                            </div>
                                        ) : extractedData.data_inicio_real > new Date().toISOString().split('T')[0] ? (
                                            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2 mt-2">
                                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                                Data de início está no futuro — isso gerará cálculos de CDT incorretos. Use a data planejada ou deixe em branco.
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Story 7.0 — MASTERPLAN-X: Custo Base (y₀ + reserva + regime) */}
                                    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            ⚡ Custo Base — Motor Físico v3.0
                                        </p>

                                        {/* y₀: custo mínimo irredutível */}
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                                y₀ — Custo de Mobilização (BRL)
                                                <span className="text-[10px] text-slate-600 normal-case font-normal">Antes da 1ª tarefa operacional</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                className={getInputClass(extractedData.custo_mobilizacao)}
                                                value={extractedData.custo_mobilizacao}
                                                onChange={(e) => {
                                                    setExtractedData({ ...extractedData, custo_mobilizacao: parseCurrencyInput(e.target.value) })
                                                    setIsDirty(true)
                                                }}
                                            />
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                Ex: licenças, procurement, canteiro. O custo nunca poderá ser comprimido abaixo deste valor (CEt inferior).
                                            </p>
                                        </div>

                                        {/* Reserva de contingência executiva */}
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                                Reserva de Contingência Executiva (BRL)
                                                <span className="text-[10px] text-slate-600 normal-case font-normal">Risco + Incerteza, acima do orçamento operacional</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                className={getInputClass(extractedData.custo_reserva_contingencia)}
                                                value={extractedData.custo_reserva_contingencia}
                                                onChange={(e) => {
                                                    setExtractedData({ ...extractedData, custo_reserva_contingencia: parseCurrencyInput(e.target.value) })
                                                    setIsDirty(true)
                                                }}
                                            />
                                        </div>

                                        {/* Regime de trabalho */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Horas/Dia</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={24}
                                                    className={getInputClass(extractedData.regime_trabalho.horasPorDia)}
                                                    value={extractedData.regime_trabalho.horasPorDia}
                                                    onChange={(e) => {
                                                        // C4: clamp 1–24 — evita divisão por zero em cálculos de DTE
                                                        const val = Math.max(1, Math.min(24, parseInt(e.target.value) || 8))
                                                        setExtractedData({ ...extractedData, regime_trabalho: { ...extractedData.regime_trabalho, horasPorDia: val } })
                                                        setIsDirty(true)
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Turnos</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={3}
                                                    className={getInputClass(extractedData.regime_trabalho.turnos)}
                                                    value={extractedData.regime_trabalho.turnos}
                                                    onChange={(e) => {
                                                        const val = Math.max(1, Math.min(3, parseInt(e.target.value) || 1))
                                                        setExtractedData({ ...extractedData, regime_trabalho: { ...extractedData.regime_trabalho, turnos: val } })
                                                        setIsDirty(true)
                                                    }}
                                                />
                                            </div>
                                            {/* U4: checkbox com container melhorado para toque */}
                                            <div className="flex flex-col justify-end">
                                                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Inclui Sábado</label>
                                                <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-blue-500 shrink-0"
                                                        checked={extractedData.regime_trabalho.incluiSabado}
                                                        onChange={(e) => {
                                                            setExtractedData({ ...extractedData, regime_trabalho: { ...extractedData.regime_trabalho, incluiSabado: e.target.checked } })
                                                            setIsDirty(true)
                                                        }}
                                                    />
                                                    <span className="text-xs text-slate-300 font-medium">{extractedData.regime_trabalho.incluiSabado ? 'Sim' : 'Não'}</span>
                                                </label>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-600">
                                            Regime usado para calcular o DTE (Dia de Trabalho Equivalente) em eventos atípicos.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Problema / Justificativa</label>
                                        <textarea className={getInputClass(extractedData.justificativa) + " h-24 resize-none"}
                                            value={extractedData.justificativa}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, justificativa: e.target.value })
                                                setIsDirty(true)
                                            }} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Objetivo SMART (Escopo)</label>
                                        <textarea className={getInputClass(extractedData.objetivo_smart) + " h-24 resize-none"}
                                            value={extractedData.objetivo_smart}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, objetivo_smart: e.target.value })
                                                setIsDirty(true)
                                            }} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Restrições Puxadas (Custo/Prazo/Física)</label>
                                        <textarea className={getInputClass(extractedData.restricoes) + " h-20 resize-none"}
                                            value={extractedData.restricoes}
                                            onChange={(e) => {
                                                setExtractedData({ ...extractedData, restricoes: e.target.value })
                                                setIsDirty(true)
                                            }} />
                                    </div>

                                    <div className="pt-4">
                                        <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-2">
                                            Tarefas Identificadas (Base para CPM)
                                            <span className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px]">{extractedData.tarefas?.length || 0}</span>
                                        </label>
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {extractedData.tarefas?.map((t: { id: string; nome: string; duracao: number }, idx: number) => (
                                                <div key={idx} className="flex gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                                                    <input
                                                        type="text"
                                                        value={t.nome}
                                                        className="flex-1 bg-transparent border-none text-xs text-slate-300 focus:outline-none"
                                                        onChange={(e) => {
                                                            const newTarefas = [...(extractedData.tarefas || [])]
                                                            newTarefas[idx].nome = e.target.value
                                                            setExtractedData({ ...extractedData, tarefas: newTarefas })
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={t.duracao}
                                                            className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-[10px] text-center text-blue-400 font-mono"
                                                            onChange={(e) => {
                                                                const newTarefas = [...(extractedData.tarefas || [])]
                                                                newTarefas[idx].duracao = parseInt(e.target.value) || 0
                                                                setExtractedData({ ...extractedData, tarefas: newTarefas })
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-slate-600">d</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                    <button onClick={() => setIsExtracted(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700">Refazer Extração</button>
                                    <button
                                        onClick={handleSaveAndProceed}
                                        disabled={saving}
                                        className={`w-full md:w-auto px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 relative overflow-hidden border shadow-xl hover:scale-[1.02] active:scale-95 duration-300 ${
                                            saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' :
                                            saveStatus === 'error' ? 'bg-rose-600 border-rose-500 text-white shadow-rose-500/20' :
                                            isDirty ? 'bg-amber-600 border-amber-500 text-white animate-pulse shadow-amber-500/20' :
                                            'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-blue-500/20'
                                        }`}
                                    >
                                        {saving ? (
                                            <>
                                                <div className="absolute inset-0 bg-indigo-600 flex items-center justify-center gap-3 text-sm font-bold z-10 w-full animate-pulse">
                                                    <Bot className="h-5 w-5" />
                                                    {proactiveMsg}
                                                </div>
                                                <div className="opacity-0">Confirmar e Seguinte</div>
                                            </>
                                        ) : saveStatus === 'success' ? (
                                            <>
                                                <CheckCircle2 className="h-6 w-6" />
                                                TAP Sincronizada!
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-6 w-6" />
                                                {isDirty ? 'Confirmar Alterações' : 'Salvar e Seguinte'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <AIInsightCard
                        contexto={{
                            modulo: 'Setup TAP',
                            dados: {
                                ...extractedData,
                                raw_text: text,
                                mode: 'AUDIT_ONLY'
                            },
                            projeto_id: params.projetoId
                        }}
                    />
                </div>
            </div>

            {/* Modal — TAP Original completa */}
            {showTapModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                TAP Original — Texto Completo
                            </h2>
                            <button
                                onClick={() => setShowTapModal(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
                        </div>
                        <div className="px-6 py-3 border-t border-slate-800 flex-shrink-0">
                            <p className="text-[11px] text-slate-600">Texto armazenado localmente neste navegador.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
