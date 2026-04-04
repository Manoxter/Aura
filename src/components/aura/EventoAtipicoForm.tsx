'use client'

// Story 7.0 — MASTERPLAN-X Sprint 2: EventoAtipicoForm
// Registro de eventos atípicos no dashboard operacional.
// Tipos: hora_extra (+h), paralisacao (-h), retrabalho (-h), aceleracao (+h)
// Salva na tabela `eventos_atipicos` via Supabase.

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp, Plus } from 'lucide-react'

type TipoEvento = 'hora_extra' | 'paralisacao' | 'retrabalho' | 'aceleracao'

interface EventoAtipicoFormProps {
    projetoId: string
    tenantId: string
    /** Callback chamado após registro com sucesso */
    onSaved?: () => void
}

const TIPO_CONFIG: Record<TipoEvento, { label: string; color: string; sinal: '+' | '-'; descricao: string }> = {
    hora_extra:   { label: 'Hora Extra',   color: 'emerald', sinal: '+', descricao: 'Compra prazo com custo adicional' },
    aceleracao:   { label: 'Aceleração',   color: 'blue',    sinal: '+', descricao: 'Recurso adicional ou fast-track' },
    paralisacao:  { label: 'Paralisação',  color: 'rose',    sinal: '-', descricao: 'Perde prazo sem ganho de custo' },
    retrabalho:   { label: 'Retrabalho',   color: 'amber',   sinal: '-', descricao: 'Reexecução de escopo já realizado' },
}

const COLOR_MAP: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
    blue:    'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
    rose:    'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
    amber:   'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
}

// UX: tempo suficiente para o usuário ler o feedback de sucesso antes do reset
const RESET_DELAY_MS = 1500

// Limite seguro para observações — evita inserts gigantes no BD
const OBS_MAX_CHARS = 1000

export function EventoAtipicoForm({ projetoId, tenantId, onSaved }: EventoAtipicoFormProps) {
    const [expanded, setExpanded] = useState(false)
    const [tipo, setTipo] = useState<TipoEvento>('hora_extra')
    const [dataEvento, setDataEvento] = useState(() => new Date().toISOString().split('T')[0])
    const [horas, setHoras] = useState<number>(2)
    const [horasInvalid, setHorasInvalid] = useState(false)
    const [fatorCusto, setFatorCusto] = useState<number>(1.5)
    const [fonteCusteio, setFonteCusteio] = useState<'operacional' | 'contingencia'>('operacional')
    const [intencional, setIntencional] = useState(true)
    const [observacao, setObservacao] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const cfg = TIPO_CONFIG[tipo]
    const horasEfetivas = cfg.sinal === '-' ? -Math.abs(horas) : Math.abs(horas)
    const custoCal = Math.abs(horas) * fatorCusto
    const obsRestantes = OBS_MAX_CHARS - observacao.length

    const handleHorasChange = (raw: string) => {
        const val = parseFloat(raw)
        if (isNaN(val) || val < 0.5) {
            setHorasInvalid(true)
            setHoras(isNaN(val) ? 0 : val)
        } else {
            setHorasInvalid(false)
            setHoras(val)
        }
    }

    const handleSave = async () => {
        if (!projetoId || !tenantId || horas < 0.5) return
        setSaving(true)
        setError(null)

        try {
            // C1: usar user.id real do auth — fallback para tenantId se sessão indisponível
            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id ?? tenantId

            const { error: err } = await supabase
                .from('eventos_atipicos')
                .insert({
                    projeto_id: projetoId,
                    data_evento: dataEvento,
                    tipo,
                    horas: horasEfetivas,
                    fator_custo: fatorCusto,
                    fonte_custeio: fonteCusteio,
                    intencional,
                    // C5: truncar observação antes do insert — evita payloads gigantes
                    observacao: observacao.trim().substring(0, OBS_MAX_CHARS) || null,
                    created_by: userId,
                })

            if (err) {
                // Classificar erro para mensagem útil ao usuário
                if (err.code === '42501') {
                    setError('Sem permissão para registrar eventos neste projeto.')
                } else if (err.message?.includes('foreign key')) {
                    setError('Projeto não encontrado. Recarregue a página.')
                } else {
                    setError(err.message)
                }
                return
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro inesperado ao salvar.')
            return
        } finally {
            setSaving(false)
        }

        setSaved(true)
        setTimeout(() => {
            setSaved(false)
            setObservacao('')
            setHoras(2)
            setHorasInvalid(false)
            setExpanded(false)
            onSaved?.()
        }, RESET_DELAY_MS)
    }

    return (
        <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl overflow-hidden">
            <button
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-200 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Registrar Evento Atípico
                </span>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Tipo de evento */}
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(TIPO_CONFIG) as TipoEvento[]).map((t) => {
                            const c = TIPO_CONFIG[t]
                            return (
                                <button
                                    key={t}
                                    onClick={() => setTipo(t)}
                                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all text-xs font-bold ${
                                        tipo === t
                                            ? COLOR_MAP[c.color]
                                            : 'bg-slate-800/50 border-slate-700/40 text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {/* U3: sr-only para screen readers */}
                                    <span>
                                        <span aria-hidden="true">{c.sinal === '+' ? '▲' : '▼'} </span>
                                        <span className="sr-only">{c.sinal === '+' ? 'Adição: ' : 'Subtração: '}</span>
                                        {c.label}
                                    </span>
                                    <span className="font-normal text-[10px] opacity-70 mt-0.5">{c.descricao}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Data e horas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="evento-data" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Data</label>
                            <input
                                id="evento-data"
                                type="date"
                                value={dataEvento}
                                onChange={(e) => setDataEvento(e.target.value)}
                                className="w-full mt-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="evento-horas" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                Horas <span className="normal-case font-normal text-slate-600">(mín. 0,5)</span>
                            </label>
                            <input
                                id="evento-horas"
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={horas}
                                onChange={(e) => handleHorasChange(e.target.value)}
                                className={`w-full mt-1 bg-slate-800 border rounded-lg px-3 py-2 text-xs focus:outline-none ${
                                    horasInvalid ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-slate-200 focus:border-blue-500'
                                }`}
                            />
                            {horasInvalid && (
                                <p className="text-[10px] text-rose-400 mt-1">Mínimo: 0,5 horas</p>
                            )}
                        </div>
                    </div>

                    {/* Fator custo — apenas para hora_extra / aceleracao */}
                    {(tipo === 'hora_extra' || tipo === 'aceleracao') && (
                        <div>
                            <label htmlFor="evento-fator" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                Fator de Custo <span className="normal-case font-normal">(1,5 = hora extra normal)</span>
                            </label>
                            <div className="flex items-center gap-3 mt-1">
                                <input
                                    id="evento-fator"
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    value={fatorCusto}
                                    onChange={(e) => setFatorCusto(parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500"
                                    aria-label={`Fator de custo: ${fatorCusto.toFixed(1)}× (mínimo 1,0 — máximo 3,0)`}
                                />
                                <span className="text-sm font-mono text-blue-400 w-10 text-right">{fatorCusto.toFixed(1)}×</span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">
                                Custo calculado: {custoCal.toFixed(1)} × taxa/hora
                            </p>
                        </div>
                    )}

                    {/* Fonte de custeio — M4: usa blue (consistente com o projeto) */}
                    <div className="flex gap-2">
                        {(['operacional', 'contingencia'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFonteCusteio(f)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                    fonteCusteio === f
                                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                                        : 'bg-slate-800/50 border-slate-700/40 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Intencional */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-blue-500"
                            checked={intencional}
                            onChange={(e) => setIntencional(e.target.checked)}
                        />
                        <span className="text-xs text-slate-400">
                            Evento planejado/controlado <span className="text-slate-600">(não penaliza R² da reta-mestra)</span>
                        </span>
                    </label>

                    {/* Observação — C5: limite de caracteres visível */}
                    <div>
                        <label htmlFor="evento-obs" className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex justify-between">
                            <span>Observação (opcional)</span>
                            <span className={obsRestantes < 100 ? 'text-amber-500' : 'text-slate-600'}>
                                {obsRestantes}/{OBS_MAX_CHARS}
                            </span>
                        </label>
                        <textarea
                            id="evento-obs"
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value.substring(0, OBS_MAX_CHARS))}
                            rows={2}
                            maxLength={OBS_MAX_CHARS}
                            className="w-full mt-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none"
                            placeholder="Contexto do evento..."
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/30 border border-rose-900/40 rounded-lg px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving || saved || horas < 0.5 || horasInvalid}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            saved
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40'
                        }`}
                    >
                        {saved ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Registrado!</>
                        ) : (
                            <><Plus className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Registrar Evento'}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
