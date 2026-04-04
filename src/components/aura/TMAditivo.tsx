'use client'

import { useState } from 'react'
import { X, ArrowUpDown, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { criarVersaoTM } from '@/lib/api/tm-versoes'
import type { LadosTM } from '@/lib/api/tm-versoes'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// TMAditivo — Formulário de aprovação de aditivo do Triângulo Meta (Story 5.4)
// Registra lados anteriores e novos + motivo obrigatório (mínimo 20 chars)
// ═══════════════════════════════════════════════════════════════════════════

interface TMAditipoProps {
    projetoId: string
    /** Lados atuais do TM (serão os "antes" do aditivo) */
    ladosAtuais: { E: number; P: number; O: number }
    /** Zona MATED atual do projeto */
    zonaMatedAtual: string
    onClose: () => void
    onSuccess: (novaVersao: number) => void
}

interface ToastState {
    message: string
    type: 'success' | 'error'
}

/** Formata um delta com seta e cor: ↑ verde ou ↓ vermelho */
function DeltaIndicator({ antes, depois }: { antes: number; depois: number }) {
    const diff = depois - antes
    const pct = antes > 0 ? ((diff / antes) * 100).toFixed(1) : '—'
    if (Math.abs(diff) < 0.0001) {
        return <span className="text-slate-500 text-xs font-mono">= sem alteração</span>
    }
    const isUp = diff > 0
    return (
        <span className={cn('text-xs font-mono font-bold', isUp ? 'text-rose-400' : 'text-emerald-400')}>
            {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(2)} ({isUp ? '+' : ''}{pct}%)
        </span>
    )
}

export function TMAditivo({ projetoId, ladosAtuais, zonaMatedAtual, onClose, onSuccess }: TMAditipoProps) {
    const [novoE, setNovoE] = useState<string>(String(ladosAtuais.E))
    const [novoP, setNovoP] = useState<string>(String(ladosAtuais.P))
    const [novoO, setNovoO] = useState<string>(String(ladosAtuais.O))
    const [motivo, setMotivo] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [toast, setToast] = useState<ToastState | null>(null)

    const MOTIVO_MIN = 20

    const eValor = parseFloat(novoE) || 0
    const pValor = parseFloat(novoP) || 0
    const oValor = parseFloat(novoO) || 0

    const motivoValido = motivo.trim().length >= MOTIVO_MIN
    const ladosValidos = eValor >= 0.1 && pValor >= 0.1 && oValor >= 0.1
    const podeAprovar = motivoValido && ladosValidos && !salvando

    function validarNumero(valor: string): boolean {
        const n = parseFloat(valor)
        return !isNaN(n) && n >= 0.1 && n <= 999999
    }

    async function handleAprovar() {
        if (!podeAprovar) return

        setSalvando(true)
        setToast(null)

        const lados: LadosTM = {
            E_antes: ladosAtuais.E,
            P_antes: ladosAtuais.P,
            O_antes: ladosAtuais.O,
            E_depois: eValor,
            P_depois: pValor,
            O_depois: oValor,
        }

        try {
            await criarVersaoTM(projetoId, lados, motivo, zonaMatedAtual)
            // Buscar a versão criada para o toast (aproximação: não temos o número exato aqui,
            // mas onSuccess pode buscar do backend)
            setToast({ message: 'Aditivo registrado com sucesso!', type: 'success' })
            setTimeout(() => {
                onSuccess(0) // 0 = sinaliza sucesso, página atualiza histórico
            }, 1500)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido ao registrar aditivo.'
            setToast({ message: msg, type: 'error' })
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500/10 p-2 rounded-xl">
                            <ArrowUpDown className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-100 text-lg">Registrar Aditivo</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                Histórico de Pecados — TM Versionado
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Lados atuais vs novos */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Novos Lados do TM
                        </p>

                        {(
                            [
                                { label: 'E — Escopo', atual: ladosAtuais.E, valor: novoE, setValor: setNovoE },
                                { label: 'P — Prazo', atual: ladosAtuais.P, valor: novoP, setValor: setNovoP },
                                { label: 'O — Orçamento', atual: ladosAtuais.O, valor: novoO, setValor: setNovoO },
                            ] as Array<{
                                label: string
                                atual: number
                                valor: string
                                setValor: (v: string) => void
                            }>
                        ).map(({ label, atual, valor, setValor }) => {
                            const novoNum = parseFloat(valor) || 0
                            const invalido = valor !== '' && !validarNumero(valor)
                            return (
                                <div key={label} className="grid grid-cols-3 items-center gap-3">
                                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-xs text-slate-600 font-mono w-16 text-right">
                                                {atual.toFixed(2)}
                                            </span>
                                            <span className="text-slate-700">→</span>
                                            <input
                                                type="number"
                                                min={0.1}
                                                max={999999}
                                                step={0.01}
                                                value={valor}
                                                onChange={(e) => setValor(e.target.value)}
                                                className={cn(
                                                    'w-24 bg-slate-950 border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none transition-colors',
                                                    invalido
                                                        ? 'border-rose-500 focus:border-rose-400'
                                                        : 'border-slate-700 focus:border-blue-500'
                                                )}
                                            />
                                        </div>
                                        <DeltaIndicator antes={atual} depois={novoNum} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Motivo */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Motivo do Aditivo
                            </p>
                            <span className={cn(
                                'text-[10px] font-mono font-bold',
                                motivoValido ? 'text-emerald-400' : 'text-slate-600'
                            )}>
                                {motivo.trim().length}/{MOTIVO_MIN} mín.
                            </span>
                        </div>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Descreva o motivo do aditivo... ex: 'Ampliação de escopo aprovada em reunião de stakeholders com inclusão de novo pavimento.'"
                            rows={4}
                            className={cn(
                                'w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-slate-300 outline-none resize-none transition-colors placeholder:text-slate-600',
                                motivoValido
                                    ? 'border-emerald-500/40 focus:border-emerald-500'
                                    : 'border-slate-700 focus:border-blue-500'
                            )}
                        />
                        {motivo.length > 0 && !motivoValido && (
                            <p className="text-[10px] text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Mínimo {MOTIVO_MIN} caracteres ({MOTIVO_MIN - motivo.trim().length} restantes)
                            </p>
                        )}
                    </div>

                    {/* Toast feedback */}
                    {toast && (
                        <div className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border text-sm',
                            toast.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        )}>
                            {toast.type === 'success'
                                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                : <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            }
                            {toast.message}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAprovar}
                            disabled={!podeAprovar}
                            className={cn(
                                'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                                podeAprovar
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            )}
                        >
                            {salvando
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
                                : <><CheckCircle2 className="h-4 w-4" /> Aprovar Aditivo</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
