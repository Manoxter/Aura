'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { getHistoricoRemissoes } from '@/lib/api/tm-versoes'
import type { VersaoTM } from '@/lib/api/tm-versoes'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// HistoricoRemissoes — Timeline de eventos de Remissão (Story 2.8)
// Registros onde o triângulo transitou de obtuso (β/γ) para acutângulo.
// Paralelo ao TMHistorico (Histórico de Pecados), mas para recuperações.
// ═══════════════════════════════════════════════════════════════════════════

interface HistoricoRemissoesProps {
    projetoId: string
    /** Chave para forçar recarregamento após nova remissão registrada */
    refreshKey?: number
}

// ─── Badge de tipo de remissão ────────────────────────────────────────────

function TipoBadge({ motivo }: { motivo: string }) {
    const isBeta = motivo.includes('β') || motivo.includes('beta')
    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border',
            isBeta
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        )}>
            {isBeta ? 'Regime β' : 'Regime γ'}
        </span>
    )
}

// ─── Item de remissão ─────────────────────────────────────────────────────

interface RemissaoItemProps {
    versao: VersaoTM
    isLast: boolean
}

function RemissaoItem({ versao, isLast }: RemissaoItemProps) {
    const data = new Date(versao.criado_em)
    const dataFormatada = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
    const horaFormatada = data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })

    return (
        <div className="relative flex gap-4">
            {/* Linha vertical da timeline */}
            {!isLast && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-800" />
            )}

            {/* Ícone da remissão */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 bg-teal-500/10 border-teal-500/30 text-teal-400">
                <RefreshCw className="h-3.5 w-3.5" />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-teal-300">
                                    Remissão detectada
                                </span>
                                <TipoBadge motivo={versao.motivo} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                <Clock className="h-3 w-3" />
                                {dataFormatada} às {horaFormatada}
                            </div>
                        </div>
                        <span className="text-[10px] font-mono text-teal-500">v{versao.versao}</span>
                    </div>

                    {/* Motivo */}
                    <p className="text-xs text-slate-400 leading-relaxed mb-3 italic">
                        &ldquo;{versao.motivo}&rdquo;
                    </p>

                    {/* Snapshot dos lados no momento da remissão */}
                    <div className="grid grid-cols-3 gap-2">
                        {(
                            [
                                { label: 'E', valor: versao.lados.E_depois },
                                { label: 'P', valor: versao.lados.P_depois },
                                { label: 'O', valor: versao.lados.O_depois },
                            ] as Array<{ label: string; valor: number }>
                        ).map(({ label, valor }) => (
                            <div key={label} className="bg-slate-950/60 rounded-lg p-2 text-center">
                                <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">{label}</p>
                                <span className="text-[10px] font-mono text-teal-400">{valor.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────

export function HistoricoRemissoes({ projetoId, refreshKey = 0 }: HistoricoRemissoesProps) {
    const [historico, setHistorico] = useState<VersaoTM[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    const carregar = useCallback(async () => {
        setCarregando(true)
        setErro(null)
        try {
            const dados = await getHistoricoRemissoes(projetoId)
            setHistorico(dados)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Falha ao carregar remissões.'
            setErro(msg)
        } finally {
            setCarregando(false)
        }
    }, [projetoId])

    useEffect(() => {
        carregar()
    }, [carregar, refreshKey])

    if (carregando) {
        return (
            <div className="flex items-center gap-3 p-6 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando histórico de remissões...</span>
            </div>
        )
    }

    if (erro) {
        return (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {erro}
            </div>
        )
    }

    if (historico.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-600">
                <RefreshCw className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma remissão registrada ainda.</p>
                <p className="text-xs text-slate-700">
                    Remissão ocorre quando o triângulo transita de obtuso (β/γ) para agudo.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-0">
            <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-4 w-4 text-teal-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Histórico de Remissões — {historico.length} evento{historico.length !== 1 ? 's' : ''}
                </h3>
            </div>

            <div className="relative">
                {historico.map((versao, idx) => (
                    <RemissaoItem
                        key={versao.id}
                        versao={versao}
                        isLast={idx === historico.length - 1}
                    />
                ))}
            </div>
        </div>
    )
}
