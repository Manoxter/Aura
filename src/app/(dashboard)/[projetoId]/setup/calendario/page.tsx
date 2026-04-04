'use client'

import { useState, useEffect } from 'react'
import {
    Calendar as CalendarIcon,
    
    
    
    Plus,
    Trash2,
    Clock,
    Check,
    Save,
    Globe,
    
    
    
    ArrowRight,
    ShieldCheck,
    Siren,
    Flag,
    Coffee,
    Zap,
    X
} from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { getFeriadosNacionais, getFeriadosLocais, Holiday } from '@/lib/holidays'
import { INTERNATIONAL_REGIONS } from '@/lib/regions'
import { SetupStepper } from '@/components/aura/SetupStepper'
import { useToast } from '@/hooks/useToast'

type TabType = 'marcos' | 'regime' | 'localizacao' | 'interrupcoes'

export default function CalendarioPage() {
    const { projetoId } = useParams()
    const { toast } = useToast()
    const {
        marcos, setMarcos,
        isTapReady,
        regime: ctxRegime, setRegime: setCtxRegime,
        localizacao: ctxLoc, setLocalizacao: setCtxLoc,
        interrupcoes: ctxInterrupcoes, setInterrupcoes: setCtxInterrupcoes,
        dataInicio, setDataInicio,
        tenantId,
        prazoBase, orcamentoBase, dataBaseline, setDataBaseline,
        tap,
        loadProjectData // To refresh context after save
    } = useProject()
    const router = useRouter()
    
    const [activeTab, setActiveTab] = useState<TabType>('marcos')
    const [loading, setLoading] = useState(false)
    const [feriados, setFeriados] = useState<Holiday[]>([])
    const [showIntModal, setShowIntModal] = useState(false)
    const [showMarcoModal, setShowMarcoModal] = useState(false)
    const [newMarco, setNewMarco] = useState({ nome: '', dia_estimado: 0 })
    const [isDirty, setIsDirty] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [prazoCalc, setPrazoCalc] = useState<{ diasUteis: number, diasCalendario: number, fimPrevisto: string } | null>(null)
    const [applyAllRegime, setApplyAllRegime] = useState<string>('')
    const [applyNacionalRegime, setApplyNacionalRegime] = useState<string>('')
    const [applyEstadualRegime, setApplyEstadualRegime] = useState<string>('')
    const [applyMunicipalRegime, setApplyMunicipalRegime] = useState<string>('')
    const [applyNomeSelected, setApplyNomeSelected] = useState<string>('')
    const [applyNomeRegime, setApplyNomeRegime] = useState<string>('')
    const [bulkHoraInicio, setBulkHoraInicio] = useState<string>('08:00')
    const [bulkHoraFim, setBulkHoraFim] = useState<string>('12:00')
    const [newInt, setNewInt] = useState({ motivo: 'Atraso de Materiais', nota: '', dias: 1, data: new Date().toISOString().split('T')[0] })

    // Local states for editing
    const [regime, setRegime] = useState({
        horas_dia: 8,
        trabalha_sabado: false,
        trabalha_domingo: false,
        turnos: 1
    })

    const [loc, setLoc] = useState({
        pais: 'Brasil',
        estado: 'SP',
        cidade: 'São Paulo',
        incluir_feriados: true
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [interrupcoes, setInterrupcoes] = useState<any[]>([])

    // Sync from context when it loads
    useEffect(() => {
        if (ctxRegime) {
            setRegime(ctxRegime)
        } else {
            setRegime({ horas_dia: 8, trabalha_sabado: false, trabalha_domingo: false, turnos: 1 })
        }

        if (ctxLoc) {
            setLoc(ctxLoc)
            const startYear = dataInicio ? new Date(dataInicio + 'T00:00:00').getFullYear() : new Date().getFullYear()
            const endYear = dataInicio && tap?.prazo_total
                ? new Date(new Date(dataInicio + 'T00:00:00').getTime() + tap.prazo_total * 86400000).getFullYear()
                : startYear
            const h: Holiday[] = []
            for (let y = startYear; y <= endYear; y++) {
                h.push(...getFeriadosNacionais(y, ctxLoc.pais))
                h.push(...getFeriadosLocais(y, ctxLoc.estado, ctxLoc.cidade, ctxLoc.pais))
            }
            // Restore saved regime settings from feriados_overrides
            if (ctxLoc.feriados_overrides?.length) {
                const overrideMap = new Map<string, Holiday>(
                    ctxLoc.feriados_overrides.map((f: Holiday) => [f.data, f])
                )
                setFeriados(h.map(holiday => overrideMap.get(holiday.data) ?? holiday))
            } else {
                setFeriados(h)
            }
        } else {
            const defaultLoc = { pais: 'Brasil', estado: 'SP', cidade: 'São Paulo', incluir_feriados: true }
            setLoc(defaultLoc)
            const startYear = dataInicio ? new Date(dataInicio + 'T00:00:00').getFullYear() : new Date().getFullYear()
            const endYear = dataInicio && tap?.prazo_total
                ? new Date(new Date(dataInicio + 'T00:00:00').getTime() + tap.prazo_total * 86400000).getFullYear()
                : startYear
            const h: Holiday[] = []
            for (let y = startYear; y <= endYear; y++) {
                h.push(...getFeriadosNacionais(y, 'Brasil'))
                h.push(...getFeriadosLocais(y, 'SP', 'São Paulo', 'Brasil'))
            }
            setFeriados(h)
        }

        if (ctxInterrupcoes) {
            setInterrupcoes(ctxInterrupcoes)
        } else {
            setInterrupcoes([])
        }
    }, [ctxRegime, ctxLoc, ctxInterrupcoes, dataInicio, tap])

    // Calcula todos os anos que o projeto abrange (início → início + prazo_total)
    const getProjectYears = (startDateOverride?: string): number[] => {
        const dateStr = startDateOverride ?? dataInicio
        if (!dateStr || !tap?.prazo_total) return [new Date().getFullYear()]
        const start = new Date(dateStr + 'T00:00:00')
        const endYear = new Date(start.getTime() + (tap.prazo_total || 0) * 86400000).getFullYear()
        const years: number[] = []
        for (let y = start.getFullYear(); y <= endYear; y++) years.push(y)
        return years
    }

    // Update holidays when location changes locally — cobre TODOS os anos do projeto
    const updateHolidays = (newLoc: typeof loc, startDateOverride?: string) => {
        const years = getProjectYears(startDateOverride)
        const h: Holiday[] = []
        for (const year of years) {
            h.push(...getFeriadosNacionais(year, newLoc.pais))
            h.push(...getFeriadosLocais(year, newLoc.estado, newLoc.cidade, newLoc.pais))
        }
        // CAL-01: preserva overrides existentes ao recalcular feriados por mudança de localização
        const existingOverrideMap = new Map(feriados.filter(f => f.regime_especial).map(f => [f.data, f]))
        setFeriados(h.map(holiday => existingOverrideMap.get(holiday.data) ?? holiday))
    }

    const handleCountryChange = (pais: string) => {
        if (pais === 'Outros') {
            setLoc({ ...loc, pais: 'Outros', estado: 'Outros', cidade: 'Outros' })
            setFeriados([])
            return
        }
        const firstState = Object.keys(INTERNATIONAL_REGIONS[pais] || {})[0] || ''
        const firstCity = INTERNATIONAL_REGIONS[pais]?.[firstState]?.[0] || ''
        const newLoc = { ...loc, pais, estado: firstState, cidade: firstCity }
        setLoc(newLoc)
        setIsDirty(true)
        // Always update holidays when country changes
        updateHolidays(newLoc)
    }

    const handleStateChange = (estado: string) => {
        if (estado === 'Outros') {
            setLoc({ ...loc, estado: 'Outros', cidade: 'Outros' })
            setFeriados([])
            return
        }
        const firstCity = INTERNATIONAL_REGIONS[loc.pais]?.[estado]?.[0] || ''
        const newLoc = { ...loc, estado, cidade: firstCity }
        setLoc(newLoc)
        setIsDirty(true)
        // Always update holidays when state changes (captures state-specific holidays)
        updateHolidays(newLoc)
    }

    const handleCityChange = (cidade: string) => {
        const newLoc = { ...loc, cidade }
        setLoc(newLoc)
        setIsDirty(true)
        // Update holidays for city-specific ones
        updateHolidays(newLoc)
    }

    const toggleHolidays = (val: boolean) => {
        const newLoc = { ...loc, incluir_feriados: val }
        setLoc(newLoc)
        setIsDirty(true)
        if (val) {
            updateHolidays(newLoc)
        } else {
            setFeriados([])
        }
    }

    const applyByTipo = (tipo: string, val: 'folga' | 'meio_periodo' | 'plantao' | 'normal') => {
        const needsHoras = val === 'meio_periodo' || val === 'plantao'
        const newF = feriados.map(f => f.tipo !== tipo ? f : {
            ...f,
            regime_especial: val,
            trabalha: val !== 'folga',
            hora_inicio: needsHoras ? bulkHoraInicio : undefined,
            hora_fim: needsHoras ? bulkHoraFim : undefined,
        })
        setFeriados(newF)
        setIsDirty(true)
        setSaveStatus('idle')
    }

    // Aplica regime a TODAS as ocorrências do mesmo feriado (por nome) em todos os anos
    const applyByNome = (nome: string, val: 'folga' | 'meio_periodo' | 'plantao' | 'normal') => {
        const key = nome.toLowerCase().trim()
        const needsHoras = val === 'meio_periodo' || val === 'plantao'
        const newF = feriados.map(f => f.nome.toLowerCase().trim() !== key ? f : {
            ...f,
            regime_especial: val,
            trabalha: val !== 'folga',
            hora_inicio: needsHoras ? bulkHoraInicio : undefined,
            hora_fim: needsHoras ? bulkHoraFim : undefined,
        })
        setFeriados(newF)
        setIsDirty(true)
        setSaveStatus('idle')
    }

    // Lista de nomes únicos de feriados, ordenados por frequência desc (mais repetidos = mais anos)
    const feriadosUnicos = (() => {
        const counts = new Map<string, number>()
        feriados.forEach(f => counts.set(f.nome, (counts.get(f.nome) ?? 0) + 1))
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    })()

    const handleAddInt = () => {
        // CAL-03: garante que dias nunca seja negativo
        const safeInt = { ...newInt, dias: Math.max(0, newInt.dias) }
        setInterrupcoes([...interrupcoes, safeInt])
        setIsDirty(true)
        setSaveStatus('idle')
        setShowIntModal(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persistMarcos = async (list: any[]) => {
        const pid = Array.isArray(projetoId) ? projetoId[0] : projetoId
        if (!tenantId || !pid) return
        await supabase.from('marcos').delete().eq('projeto_id', pid)
        if (list.length > 0) {
            await supabase.from('marcos').insert(
                list.map(m => ({
                    projeto_id: pid,
                    tenant_id: tenantId,
                    nome: m.nome,
                    dia_estimado: m.dia_estimado,
                    concluida: m.concluida || false
                }))
            )
        }
    }

    const handleAddMarco = async () => {
        if (!newMarco.nome.trim()) return
        const id = `marco-${Date.now()}`
        const novo = { id, nome: newMarco.nome.trim(), dia_estimado: newMarco.dia_estimado, concluida: false }
        const updated = [...marcos, novo]
        // Atualiza UI imediatamente
        setMarcos(updated)
        setShowMarcoModal(false)
        setNewMarco({ nome: '', dia_estimado: 0 })
        // Persiste no banco
        try {
            await persistMarcos(updated)
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 2000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Erro ao salvar marco:', err)
            setSaveStatus('error')
            setTimeout(() => setSaveStatus('idle'), 3000)
        }
    }

    if (!isTapReady) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="h-20 w-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                    <ShieldCheck className="h-10 w-10 text-slate-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-100 mb-2">Setup Bloqueado</h1>
                <p className="text-slate-400 max-w-md mx-auto">
                    A definição de calendários e marcos exige que a TAP seja extraída e salva primeiro.
                </p>
                <button
                    onClick={() => router.push(`/${projetoId}/setup/tap`)}
                    className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
                >
                    Ir para Setup TAP
                </button>
            </div>
        )
    }

    const removeMarco = async (id: string) => {
        const updated = marcos.filter(m => m.id !== id)
        setMarcos(updated)
        try {
            await persistMarcos(updated)
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 2000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Erro ao remover marco:', err)
        }
    }

    const sortedMarcos = [...marcos].sort((a, b) => a.dia_estimado - b.dia_estimado)

    const handleSaveConfig = async () => {
        if (!tenantId) {
            toast({ variant: 'warning', message: 'Aguardando inicialização do ambiente... Tente novamente.' })
            return
        }

        setLoading(true)
        try {
            // Robust check: Ensure projeto exists before update
            const { data: projExists } = await supabase.from('projetos').select('id').eq('id', projetoId).single()
            if (!projExists) throw new Error('Projeto não encontrado no banco.')

            // 1. Persist localizacao and regime to Supabase 'projetos'
            const updatedLoc = { ...loc, feriados_overrides: feriados }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatePayload: Record<string, any> = {
                config_regime: regime,
                config_localizacao: updatedLoc,
                interrupcoes: interrupcoes,
                data_inicio: dataInicio
            }

            // Baseline auto-freeze: calcula dias úteis disponíveis
            // INDEPENDENTE do CPM — baseline = dias úteis dentro do prazo TAP
            // CAL-04: avisa se TAP ausente ou prazo_total = 0
            if (!tap?.prazo_total || tap.prazo_total <= 0) {
                toast({ variant: 'warning', message: 'Baseline não calculada: prazo total do TAP está ausente ou zerado. Defina o prazo total na etapa TAP.' })
            }
            if (dataInicio && tap?.prazo_total && tap.prazo_total > 0) {
                const tapDias = tap.prazo_total
                const startDate = new Date(dataInicio + 'T00:00:00')
                // CAL-02: Prioridade feriado/trabalha:
                // 1. regime_especial='folga' → dia de folga (maior prioridade)
                // 2. !regime_especial && !trabalha → folga padrão do feriado
                // 3. qualquer outro regime_especial (meio_periodo/plantao) → considera trabalhado
                const hDates = new Set(
                    feriados
                        .filter(h => h.regime_especial === 'folga' || (!h.regime_especial && !h.trabalha))
                        .map(h => h.data)
                )
                // CAL-05: iteramos por tapDias (dias calendário do TAP), contando apenas dias úteis
                // O contador d representa posição no calendário; workDays acumula apenas os úteis
                let workDays = 0
                for (let d = 0; d < tapDias; d++) {
                    const cur = new Date(startDate)
                    cur.setDate(startDate.getDate() + d)
                    const dow = cur.getDay()
                    const isOff = (dow === 0 && !regime.trabalha_domingo) || (dow === 6 && !regime.trabalha_sabado) || hDates.has(cur.toISOString().split('T')[0])
                    if (!isOff) workDays++
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const totalParadas = interrupcoes.reduce((acc: number, i: any) => acc + (i.dias || 0), 0)
                const diasUteisLiquidos = Math.max(workDays - totalParadas, 0)

                const baseline = {
                    prazo: diasUteisLiquidos,
                    prazo_calendario: tapDias,
                    orcamento: orcamentoBase || 0,
                    data: dataInicio,
                    tap_prazo: tap.prazo_total,
                    regime_snapshot: { ...regime },
                    frozen_at: new Date().toISOString()
                }
                updatePayload.data_baseline = baseline
                setDataBaseline(baseline)
            }

            const { error: pError } = await supabase.from('projetos')
                .update(updatePayload)
                .eq('id', projetoId)

            if (pError) throw pError

            // 2. Persist MARCOS (Milestones) - DELETE/INSERT pattern but with better error handling
            const { error: delError } = await supabase.from('marcos').delete().eq('projeto_id', projetoId)
            if (delError) throw delError

            if (marcos.length > 0) {
                const { error: mError } = await supabase.from('marcos').insert(
                    marcos.map(m => ({
                        projeto_id: projetoId,
                        tenant_id: tenantId,
                        nome: m.nome,
                        dia_estimado: m.dia_estimado,
                        concluida: m.concluida || false
                    }))
                )
                if (mError) throw mError
            }
            
            setCtxRegime(regime)
            setCtxLoc(updatedLoc)
            setCtxInterrupcoes(interrupcoes)

            setIsDirty(false)
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 3000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Erro ao salvar config:', err)
            setSaveStatus('error')
            toast({ variant: 'error', message: 'Falha ao salvar: ' + err.message })
        } finally {
            setLoading(false)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInputClass = (val: any) => {
        const base = "w-full rounded-xl p-3 transition-all duration-300 outline-none border focus:ring-1 "
        if (!val || (typeof val === 'string' && val.trim() === '')) return base + "bg-slate-950 border-slate-800 text-slate-500" // Cinza
        if (isDirty) return base + "bg-slate-950 border-amber-500/50 text-amber-50 focus:border-amber-500 focus:ring-amber-500/20" // Amarelo
        return base + "bg-slate-950 border-emerald-500/30 text-emerald-50 focus:border-emerald-500 focus:ring-emerald-500/20" // Verde
    }


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            {showIntModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6 text-rose-500">
                            <Siren className="h-6 w-6" />
                            <h3 className="text-xl font-bold">Registrar Interrupção</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo da Crise</label>
                                <select 
                                    value={newInt.motivo} 
                                    onChange={e => setNewInt({...newInt, motivo: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-rose-500"
                                >
                                    <option>Atraso de Materiais</option>
                                    <option>Falha de Mão de Obra</option>
                                    <option>Condições Climáticas</option>
                                    <option>Greve/Protesto</option>
                                    <option>Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dias de Parada</label>
                                <input 
                                    type="number" 
                                    value={newInt.dias} 
                                    onChange={e => setNewInt({...newInt, dias: parseInt(e.target.value) || 1})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-rose-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Justificativa (Nota)</label>
                                <textarea 
                                    value={newInt.nota} 
                                    onChange={e => setNewInt({...newInt, nota: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-rose-500 h-24 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowIntModal(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors font-medium">Cancelar</button>
                            <button onClick={handleAddInt} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20">Registrar Parada</button>
                        </div>
                    </div>
                </div>
            )}
            {showMarcoModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6 text-emerald-500">
                            <Flag className="h-6 w-6" />
                            <h3 className="text-xl font-bold">Adicionar Marco Crítico</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Marco</label>
                                <input
                                    type="text"
                                    value={newMarco.nome}
                                    onChange={e => setNewMarco({ ...newMarco, nome: e.target.value })}
                                    placeholder="Ex: M2 — Inauguração Ted Williams Tunnel"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prazo Estimado (dias a partir do início)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newMarco.dia_estimado}
                                    onChange={e => setNewMarco({ ...newMarco, dia_estimado: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Exemplo: para um marco em 12 meses use 365; em 84 meses use 2556.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => setShowMarcoModal(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors font-medium">Cancelar</button>
                            <button onClick={handleAddMarco} disabled={!newMarco.nome.trim()} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20">Adicionar Marco</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8 text-emerald-500" />
                        Calendário & Regime
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Configuração estratégica de disponibilidade e cronologia operacional.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    <button 
                        onClick={handleSaveConfig}
                        disabled={loading}
                        className={`w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 min-h-[56px] rounded-2xl text-base font-bold transition-colors border shadow-xl cursor-pointer ${
                            saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
                            saveStatus === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
                            isDirty ? 'bg-amber-600 border-amber-500 text-white' :
                            'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Sincronizando...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>
                                <Check className="h-6 w-6" />
                                Configurações Salvas!
                            </>
                        ) : (
                            <>
                                <Save className="h-6 w-6" />
                                {isDirty ? 'Confirmar Alterações' : 'Salvar Configurações'}
                            </>
                        )}
                    </button>

                    <button
                        onClick={async () => {
                            if (isDirty) await handleSaveConfig()
                            router.push(`/${projetoId}/setup/tarefas-diagramas`)
                        }}
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 min-h-[56px] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-base font-bold transition-colors shadow-xl cursor-pointer disabled:opacity-50"
                    >
                        {isDirty ? 'Salvar e Seguinte' : 'Seguinte'} <ArrowRight className="h-6 w-6" />
                    </button>
                </div>
            </header>

            {/* Tabs Navigation */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
                {[
                    { id: 'regime', label: 'Regime de Trabalho', icon: Clock },
                    { id: 'localizacao', label: 'Localização & Feriados', icon: Globe },
                    { id: 'marcos', label: 'Marcos Críticos', icon: Flag },
                    { id: 'interrupcoes', label: 'Log de Interrupções', icon: Siren },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'regime' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-emerald-400" /> Âncora Temporal
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-2 tracking-widest">Início Real do Projeto</label>
                                    <input 
                                        type="date" 
                                        value={dataInicio || ''} 
                                        onChange={e => {
                                            setDataInicio(e.target.value)
                                            setIsDirty(true)
                                            setSaveStatus('idle')
                                            // Recalcula feriados para todos os anos do projeto a partir da nova data
                                            if (loc.incluir_feriados) updateHolidays(loc, e.target.value)
                                        }}
                                        className="w-full bg-transparent border-none outline-none text-white font-mono text-xl"
                                    />
                                    <p className="text-xs text-slate-500 mt-2 italic">A data de início ancora os cálculos de ES/EF do CPM.</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white flex items-center gap-2 pt-4 border-t border-slate-800">
                                <Clock className="h-5 w-5 text-blue-400" /> Jornada de Trabalho
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Horas Úteis por Dia</label>
                                    <input type="number" min="1" max="24" value={regime.horas_dia} 
                                        onChange={e => {
                                            setRegime({...regime, horas_dia: parseInt(e.target.value) || 1})
                                            setIsDirty(true)
                                            setSaveStatus('idle')
                                        }} 
                                        className={getInputClass(regime.horas_dia)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Número de Turnos</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 2, 3].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setRegime({...regime, turnos: t})}
                                                className={`py-3 rounded-xl border font-bold transition-all ${regime.turnos === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                            >
                                                {t} {t === 1 ? 'Turno' : 'Turnos'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 italic">* O aumento de turnos multiplica a vazão operacional no cálculo do CPM.</p>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 shadow-sm">
                                    <span className="text-sm text-slate-300">Incluir Sábado na jornada</span>
                                    <input type="checkbox" checked={regime.trabalha_sabado} 
                                        onChange={e => {
                                            setRegime({...regime, trabalha_sabado: e.target.checked})
                                            setIsDirty(true)
                                            setSaveStatus('idle')
                                        }} className="w-5 h-5 accent-blue-600" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 shadow-sm">
                                    <span className="text-sm text-slate-300">Incluir Domingo (Regime 24/7)</span>
                                    <input type="checkbox" checked={regime.trabalha_domingo} 
                                        onChange={e => {
                                            setRegime({...regime, trabalha_domingo: e.target.checked})
                                            setIsDirty(true)
                                            setSaveStatus('idle')
                                        }} className="w-5 h-5 accent-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Coffee className="h-5 w-5 text-amber-400" /> Pausas Programadas
                            </h3>
                            <p className="text-sm text-slate-500">Configure horários de descanso ou manutenções periódicas que impactem a vazão do projeto.</p>
                            <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                                <Plus className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                                <span className="text-xs text-slate-600 font-bold uppercase">Adicionar Janela de Pausa</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'localizacao' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Globe className="h-5 w-5 text-emerald-400" /> Geografia & Feriados Automáticos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-slate-800 pb-8 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">País</label>
                                <select 
                                    value={loc.pais}
                                    onChange={e => handleCountryChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                >
                                    {Object.keys(INTERNATIONAL_REGIONS).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                    <option value="Outros">Outros / Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado / Província</label>
                                {loc.pais === 'Outros' ? (
                                    <input 
                                        type="text" 
                                        value={loc.estado} 
                                        onChange={e => setLoc({...loc, estado: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <select 
                                        value={loc.estado} 
                                        onChange={e => handleStateChange(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                    >
                                        {Object.keys(INTERNATIONAL_REGIONS[loc.pais] || {}).map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                        <option value="Outros">Outros</option>
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cidade</label>
                                {loc.estado === 'Outros' || loc.pais === 'Outros' ? (
                                    <input 
                                        type="text" 
                                        value={loc.cidade} 
                                        onChange={e => setLoc({...loc, cidade: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <select 
                                        value={loc.cidade} 
                                        onChange={e => handleCityChange(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                                    >
                                        {(INTERNATIONAL_REGIONS[loc.pais]?.[loc.estado] || []).map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                        <option value="Outros">Outros</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={loc.incluir_feriados}
                                        onChange={e => toggleHolidays(e.target.checked)}
                                        className="w-4 h-4 accent-emerald-500"
                                    />
                                    <h4 className="text-sm font-bold text-slate-300 uppercase">Feriados ({feriados.length})</h4>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {feriados.length > 0 && (
                                        <>
                                            <select
                                                value={applyAllRegime}
                                                onChange={e => {
                                                    const val = e.target.value as 'folga' | 'meio_periodo' | 'plantao' | 'normal'
                                                    if (!val) return
                                                    if (val === 'folga' || val === 'normal') {
                                                        const newF = feriados.map(f => ({ ...f, regime_especial: val, trabalha: val !== 'folga', hora_inicio: undefined, hora_fim: undefined }))
                                                        setFeriados(newF)
                                                        setIsDirty(true)
                                                        setSaveStatus('idle')
                                                        setApplyAllRegime('')
                                                    } else {
                                                        setApplyAllRegime(val)
                                                    }
                                                }}
                                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 min-h-[36px]"
                                            >
                                                <option value="" disabled>Aplicar regime a todos...</option>
                                                <option value="folga">Folga Total</option>
                                                <option value="meio_periodo">Meio Período</option>
                                                <option value="plantao">Plantão</option>
                                                <option value="normal">Dia Normal (trabalha)</option>
                                            </select>
                                            {(applyAllRegime === 'meio_periodo' || applyAllRegime === 'plantao') && (
                                                <>
                                                    <input type="time" value={bulkHoraInicio} onChange={e => setBulkHoraInicio(e.target.value)}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500" />
                                                    <span className="text-slate-600 text-xs">–</span>
                                                    <input type="time" value={bulkHoraFim} onChange={e => setBulkHoraFim(e.target.value)}
                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500" />
                                                    <button
                                                        onClick={() => {
                                                            const val = applyAllRegime as 'meio_periodo' | 'plantao'
                                                            const newF = feriados.map(f => ({ ...f, regime_especial: val, trabalha: true, hora_inicio: bulkHoraInicio, hora_fim: bulkHoraFim }))
                                                            setFeriados(newF)
                                                            setIsDirty(true)
                                                            setSaveStatus('idle')
                                                            setApplyAllRegime('')
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors whitespace-nowrap"
                                                    >
                                                        Aplicar a todos
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}
                                    <span className="text-xs text-slate-500">
                                        {getProjectYears().length > 1
                                            ? `${getProjectYears()[0]}–${getProjectYears().at(-1)}`
                                            : (getProjectYears()[0] ?? new Date().getFullYear())}
                                    </span>
                                </div>
                            </div>
                            {/* Aplicar por nome do feriado — cobre todas as ocorrências multi-ano */}
                            {feriadosUnicos.length > 0 && (
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-1">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mb-2">Aplicar regime por feriado (todos os anos)</p>
                                    <div className="flex gap-2 flex-wrap items-end">
                                        <div className="flex-1 min-w-[160px]">
                                            <p className="text-xs text-slate-600 mb-1">Feriado</p>
                                            <select
                                                value={applyNomeSelected}
                                                onChange={e => setApplyNomeSelected(e.target.value)}
                                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 w-full"
                                            >
                                                <option value="" disabled>Selecionar feriado...</option>
                                                {feriadosUnicos.map(([nome, count]) => (
                                                    <option key={nome} value={nome}>{nome} ({count}×)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 min-w-[130px]">
                                            <p className="text-xs text-slate-600 mb-1">Regime</p>
                                            <select
                                                value={applyNomeRegime}
                                                onChange={e => setApplyNomeRegime(e.target.value)}
                                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 w-full"
                                            >
                                                <option value="" disabled>Escolher...</option>
                                                <option value="folga">Folga Total</option>
                                                <option value="meio_periodo">Meio Período</option>
                                                <option value="plantao">Plantão</option>
                                                <option value="normal">Dia Normal</option>
                                            </select>
                                        </div>
                                        {(applyNomeRegime === 'meio_periodo' || applyNomeRegime === 'plantao') && (
                                            <>
                                                <div>
                                                    <p className="text-xs text-slate-600 mb-1">Início</p>
                                                    <input type="time" value={bulkHoraInicio} onChange={e => setBulkHoraInicio(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 w-full" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-600 mb-1">Fim</p>
                                                    <input type="time" value={bulkHoraFim} onChange={e => setBulkHoraFim(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 w-full" />
                                                </div>
                                            </>
                                        )}
                                        <button
                                            disabled={!applyNomeSelected || !applyNomeRegime}
                                            onClick={() => {
                                                applyByNome(applyNomeSelected, applyNomeRegime as 'folga' | 'meio_periodo' | 'plantao' | 'normal')
                                                setApplyNomeSelected('')
                                                setApplyNomeRegime('')
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Aplicar por tipo de feriado */}
                            {feriados.length > 0 && (
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-1">
                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Aplicar regime por tipo</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600">Horário (plantão/meio período):</span>
                                            <input type="time" value={bulkHoraInicio} onChange={e => setBulkHoraInicio(e.target.value)}
                                                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-300 outline-none focus:border-blue-500" />
                                            <span className="text-slate-600 text-xs">–</span>
                                            <input type="time" value={bulkHoraFim} onChange={e => setBulkHoraFim(e.target.value)}
                                                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-slate-300 outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { tipo: 'nacional', label: 'Nacionais', dot: 'bg-blue-500', state: applyNacionalRegime, setState: setApplyNacionalRegime },
                                            { tipo: 'estadual', label: 'Estaduais', dot: 'bg-amber-500', state: applyEstadualRegime, setState: setApplyEstadualRegime },
                                            { tipo: 'municipal', label: 'Municipais', dot: 'bg-emerald-500', state: applyMunicipalRegime, setState: setApplyMunicipalRegime },
                                        ] as { tipo: string; label: string; dot: string; state: string; setState: (v: string) => void }[]).map(({ tipo, label, dot, state, setState }) => {
                                            const count = feriados.filter(f => f.tipo === tipo).length
                                            if (count === 0) return null
                                            return (
                                                <div key={tipo} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                                                        <span className="text-xs text-slate-400 font-semibold">{label} ({count})</span>
                                                    </div>
                                                    <select
                                                        value={state}
                                                        onChange={e => {
                                                            const val = e.target.value as 'folga' | 'meio_periodo' | 'plantao' | 'normal'
                                                            if (!val) return
                                                            applyByTipo(tipo, val)
                                                            setState('')
                                                        }}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500 w-full"
                                                    >
                                                        <option value="" disabled>Aplicar...</option>
                                                        <option value="folga">Folga Total</option>
                                                        <option value="meio_periodo">Meio Período</option>
                                                        <option value="plantao">Plantão</option>
                                                        <option value="normal">Dia Normal</option>
                                                    </select>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {feriados.map((f, i) => {
                                    const regime = f.regime_especial || 'folga'
                                    const regimeColors: Record<string, string> = {
                                        folga: 'border-rose-500/30 bg-rose-950/20',
                                        meio_periodo: 'border-amber-500/30 bg-amber-950/20',
                                        plantao: 'border-blue-500/30 bg-blue-950/20',
                                        normal: 'border-emerald-500/30 bg-emerald-950/20',
                                    }
                                    return (
                                        <div key={i} className={`p-3 rounded-xl border transition-all ${regimeColors[regime]}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${f.tipo === 'nacional' ? 'bg-blue-500' : f.tipo === 'estadual' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-100 truncate">{f.nome}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{f.data.split('-').reverse().join('/')} — {f.tipo}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <select
                                                    value={regime}
                                                    onChange={e => {
                                                        const newF = [...feriados]
                                                        const val = e.target.value as Holiday['regime_especial']
                                                        newF[i] = {
                                                            ...newF[i],
                                                            regime_especial: val,
                                                            trabalha: val !== 'folga',
                                                            hora_inicio: val === 'meio_periodo' ? '08:00' : val === 'plantao' ? '06:00' : undefined,
                                                            hora_fim: val === 'meio_periodo' ? '12:00' : val === 'plantao' ? '22:00' : undefined,
                                                        }
                                                        setFeriados(newF)
                                                        setIsDirty(true)
                                                        setSaveStatus('idle')
                                                    }}
                                                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-blue-500"
                                                >
                                                    <option value="folga">Folga Total</option>
                                                    <option value="meio_periodo">Meio Periodo</option>
                                                    <option value="plantao">Plantao / Especial</option>
                                                    <option value="normal">Dia Normal (trabalha)</option>
                                                </select>
                                                {(regime === 'meio_periodo' || regime === 'plantao') && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="time"
                                                            value={f.hora_inicio || '08:00'}
                                                            onChange={e => {
                                                                const newF = [...feriados]
                                                                newF[i] = { ...newF[i], hora_inicio: e.target.value }
                                                                setFeriados(newF)
                                                                setIsDirty(true)
                                                            }}
                                                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-300 w-16 outline-none focus:border-blue-500"
                                                        />
                                                        <span className="text-xs text-slate-600">a</span>
                                                        <input
                                                            type="time"
                                                            value={f.hora_fim || '12:00'}
                                                            onChange={e => {
                                                                const newF = [...feriados]
                                                                newF[i] = { ...newF[i], hora_fim: e.target.value }
                                                                setFeriados(newF)
                                                                setIsDirty(true)
                                                            }}
                                                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-slate-300 w-16 outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <Globe className="h-6 w-6 text-blue-400" />
                            <div>
                                <p className="text-sm text-blue-200 font-semibold">Motor de Feriados Ativo</p>
                                <p className="text-xs text-blue-400/80">
                                    Os dias acima serão tratados como &quot;Não Úteis&quot; automaticamente no cálculo do cronograma CDT.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'marcos' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Flag className="h-5 w-5 text-emerald-400" /> Marcos Críticos do Projeto
                            </h3>
                            <button
                                type="button"
                                // eslint-disable-next-line react/no-unescaped-entities
                                onClick={() => setShowMarcoModal(true)}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                            >
                                <Plus className="h-4 w-4" /> Adicionar Marco
                            </button>
                        </div>
                        {sortedMarcos.length === 0 && (
                            <div className="border border-slate-800 rounded-2xl p-12 text-center text-slate-600">
                                Nenhum marco definido. Use "+ Adicionar Marco" para inserir os milestones do projeto.
                            </div>
                        )}
                        <div className="relative">
                            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-slate-800"></div>
                            <div className="space-y-8 relative">
                                {sortedMarcos.map((m, idx) => (
                                    <div key={m.id} className="flex gap-6 items-start group">
                                        <div className={`h-14 w-14 rounded-full border-4 border-slate-900 z-10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-emerald-600' : idx === sortedMarcos.length - 1 ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                            <Flag className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all flex justify-between items-center group/card">
                                            <div className="flex items-center gap-6">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-lg font-bold text-white">{m.nome}</h3>
                                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest border border-slate-700">
                                                            +{m.dia_estimado} DIAS
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mt-1 italic">Expectativa baseada no rascunho da TAP.</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-mono px-2 py-1 rounded ${m.concluida ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-900'}`}>
                                                        {m.concluida ? 'Concluido' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => removeMarco(m.id)} className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'interrupcoes' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
                         <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Siren className="h-5 w-5 text-rose-500" /> Log de Crises & Interrupções
                            </h3>
                            <button 
                                onClick={() => setShowIntModal(true)}
                                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            >
                                <Plus className="h-4 w-4" /> Registrar Parada Não Programada
                            </button>
                         </div>
                         <p className="text-sm text-slate-400">Pausas registradas aqui forçam o recálculo do Vértice de Prazo e acionam alertas no Gabinete de Crise.</p>
                         
                         {interrupcoes.length === 0 ? (
                            <div className="border border-slate-800 rounded-2xl p-12 text-center text-slate-600">
                                Nenhuma interrupção registrada neste projeto até o momento.
                            </div>
                         ) : (
                            <div className="space-y-3">
                                {interrupcoes.map((int, idx) => (
                                    <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <span className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded text-xs font-bold">PARADA</span>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">{int.motivo}</p>
                                                <p className="text-xs text-slate-500">Justificativa: {int.nota}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm font-mono text-slate-300">{int.dias} dias</p>
                                                <p className="text-xs text-slate-500">{int.data}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setInterrupcoes(interrupcoes.filter((_, i) => i !== idx))
                                                    setIsDirty(true)
                                                    setSaveStatus('idle')
                                                }}
                                                className="text-slate-600 hover:text-rose-500 transition-colors p-1 rounded"
                                                title="Excluir interrupção"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         )}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50" />
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Total de Marcos</div>
                        <div className="text-3xl font-bold text-white font-mono group-hover:text-emerald-400 transition-colors">{marcos?.length || 0}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-50" />
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Baseline (Dias Úteis)</div>
                        <div className="text-3xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors">{dataBaseline?.prazo || '—'} <span className="text-xs text-slate-500">dias</span></div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group text-rose-500">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-50" />
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Log de Crises</div>
                        <div className="text-3xl font-bold font-mono group-hover:text-rose-400 transition-colors">{interrupcoes?.length || 0}</div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={() => { setActiveTab('marcos'); setShowMarcoModal(true) }}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-5 min-h-[56px] bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/50 rounded-2xl font-bold transition-colors shadow-lg cursor-pointer"
                    >
                        <Flag className="h-5 w-5" />
                        + Marco
                    </button>
                    <button
                        onClick={async () => {
                            setLoading(true)
                            try {
                                // 1. Save config if dirty
                                if (isDirty || !dataBaseline) {
                                    await handleSaveConfig()
                                }

                                // 2. Calculate working days — INDEPENDENT of CPM
                                // Uses TAP prazo_total (calendar days from TAP) as reference
                                // This is the BASELINE: total working days available
                                if (!dataInicio) {
                                    toast({ variant: 'warning', message: 'Defina a Data de Início do projeto na aba Regime.' })
                                    setLoading(false)
                                    return
                                }

                                const tapPrazoDias = tap?.prazo_total || 0
                                if (tapPrazoDias <= 0) {
                                    toast({ variant: 'warning', message: 'Prazo total não definido na TAP. Volte ao TAP e preencha o prazo.' })
                                    setLoading(false)
                                    return
                                }

                                // Iterate over TAP calendar days counting working days
                                const start = new Date(dataInicio + 'T00:00:00')
                                const holidayDates = new Set(
                                    feriados
                                        .filter(h => h.regime_especial === 'folga' || (!h.regime_especial && !h.trabalha))
                                        .map(h => h.data)
                                )
                                // Pausas programadas (marcos com tipo pausa) + interrupções
                                const totalParadas = interrupcoes.reduce((acc: number, i: any) => acc + (i.dias || 0), 0)
// eslint-disable-next-line @typescript-eslint/no-explicit-any

                                let diasUteis = 0
                                // Iterate exactly tapPrazoDias calendar days
                                for (let d = 0; d < tapPrazoDias; d++) {
                                    const current = new Date(start)
                                    current.setDate(start.getDate() + d)
                                    const dow = current.getDay()
                                    const dateStr = current.toISOString().split('T')[0]

                                    const isWeekend = (dow === 0 && !regime.trabalha_domingo) || (dow === 6 && !regime.trabalha_sabado)
                                    const isHoliday = holidayDates.has(dateStr)

                                    if (!isWeekend && !isHoliday) {
                                        diasUteis++
                                    }
                                }

                                // Subtract interruptions from working days
                                const diasUteisLiquidos = Math.max(diasUteis - totalParadas, 0)

                                const endDate = new Date(start)
                                endDate.setDate(start.getDate() + tapPrazoDias - 1)
                                const fimPrevisto = endDate.toISOString().split('T')[0]

                                setPrazoCalc({
                                    diasUteis: diasUteisLiquidos,
                                    diasCalendario: tapPrazoDias,
                                    fimPrevisto
                                })

                                // Refresh context
                                await loadProjectData(projetoId as string)
                                setSaveStatus('success')
                                setTimeout(() => setSaveStatus('idle'), 3000)
                            } catch (err: any) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                toast({ variant: 'error', message: 'Erro ao calcular: ' + err.message })
                            } finally {
                                setLoading(false)
                            }
                        }}
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 min-h-[56px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-colors shadow-lg cursor-pointer"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Zap className="h-6 w-6" />
                        )}
                        {loading ? 'Calculando...' : 'Calcular Prazo do Projeto'}
                    </button>
                    <button
                        onClick={async () => {
                            if (isDirty) await handleSaveConfig()
                            router.push(`/${projetoId}/setup/tarefas-diagramas`)
                        }}
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 min-h-[56px] bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-colors shadow-lg cursor-pointer"
                    >
                        Seguinte <ArrowRight className="h-5 w-5" />
                    </button>
                </div>

            </div>

            {/* Resultado do cálculo de prazo — fora do flex para não sobrepor */}
            {prazoCalc && (
                <div className="mt-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="text-xs font-bold text-emerald-500 uppercase mb-3 tracking-widest">Baseline Calculada (Limite Superior da Função Prazo)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase">Dias Úteis Líquidos</div>
                            <div className="text-2xl font-bold text-emerald-400 font-mono">{prazoCalc.diasUteis}</div>
                            <div className="text-xs text-slate-600">Baseline = Limite Superior</div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase">Dias Calendário (TAP)</div>
                            <div className="text-2xl font-bold text-blue-400 font-mono">{prazoCalc.diasCalendario}</div>
                            <div className="text-xs text-slate-600">Prazo TAP = Teto Absoluto</div>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase">Fim Previsto</div>
                            <div className="text-lg font-bold text-white font-mono">{prazoCalc.fimPrevisto}</div>
                            <div className="text-xs text-slate-600">Data limite</div>
                        </div>
                    </div>
                    {/* Hierarquia visual */}
                    <div className="mt-3 pt-2 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
                        Hierarquia: <span className="text-blue-400">CPM {prazoBase || '?'}d (floor)</span> &lt; <span className="text-emerald-400">Baseline {prazoCalc.diasUteis}d (ceiling)</span> &lt; <span className="text-amber-400">TAP {prazoCalc.diasCalendario}d (cap)</span>.
                        Limites entre Baseline e TAP ativáveis durante gerenciamento desde que dentro da CEt.
                    </div>

                    {/* Buffer e Viabilidade */}
                    {prazoBase && prazoBase > 0 && (
                        <div className={`mt-3 p-3 rounded-xl border ${
                            prazoBase <= prazoCalc.diasUteis
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-rose-500/5 border-rose-500/20'
                        }`}>
                            {prazoBase <= prazoCalc.diasUteis ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-emerald-400 font-bold">✓ Projeto Viável</span>
                                    <span className="text-xs text-emerald-400 font-mono">Buffer: {prazoCalc.diasUteis - prazoBase}d (TOC)</span>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-rose-400 font-bold">✗ Projeto Inviável com este regime</span>
                                        <span className="text-xs text-rose-400 font-mono">Déficit: {prazoBase - prazoCalc.diasUteis}d</span>
                                    </div>
                                    <p className="text-xs text-rose-400/70 mt-1">
                                        CPM ({prazoBase}d) &gt; Baseline ({prazoCalc.diasUteis}d). Ajuste: adicionar turnos, incluir sábado/domingo, ou reduzir feriados/pausas.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
