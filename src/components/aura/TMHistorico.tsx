'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock, ChevronRight, Loader2, AlertTriangle, History } from 'lucide-react'
import { getHistoricoTM } from '@/lib/api/tm-versoes'
import type { VersaoTM } from '@/lib/api/tm-versoes'
import { areaTri } from '@/lib/engine/math'
import { cn } from '@/lib/utils'
import { ZONA_LABELS } from '@/lib/constants/cdt-labels'

// ═══════════════════════════════════════════════════════════════════════════
// TMHistorico — Timeline de versões do TM (Histórico de Pecados) (Story 5.4)
// Lista cronológica das versões com deltas de área e badge de zona MATED
// ═══════════════════════════════════════════════════════════════════════════

interface TMHistoricoProps {
    projetoId: string
    /** Chave para forçar recarregamento após novo aditivo ser registrado */
    refreshKey?: number
}

// ─── Badge de Zona MATED ──────────────────────────────────────────────────

type ZonaMATED = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

const ZONA_STYLES: Record<string, { className: string }> = {
    OTIMO:  { className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    SEGURO: { className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    RISCO:  { className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    CRISE:  { className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
}

function ZonaBadge({ zona }: { zona: string }) {
    const key = (zona?.toUpperCase() ?? 'RISCO') as ZonaMATED
    const config = ZONA_STYLES[key] ?? ZONA_STYLES['RISCO']
    const label = ZONA_LABELS[key]?.nome ?? key
    return (
        <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border',
            config.className
        )}>
            {label}
        </span>
    )
}

// ─── Delta de área ────────────────────────────────────────────────────────

interface DeltaAreaProps {
    versaoAtual: VersaoTM
    versaoAnterior: VersaoTM | null
}

function DeltaArea({ versaoAtual, versaoAnterior }: DeltaAreaProps) {
    const { lados } = versaoAtual
    const areaDepois = areaTri(lados.E_depois, lados.P_depois, lados.O_depois)

    if (!versaoAnterior) {
        return (
            <span className="text-xs text-slate-500 font-mono">
                Área: {areaDepois.toFixed(4)}
            </span>
        )
    }

    const { lados: ladosAnt } = versaoAnterior
    const areaAntes = areaTri(ladosAnt.E_depois, ladosAnt.P_depois, ladosAnt.O_depois)

    if (areaAntes <= 0) {
        return <span className="text-xs text-slate-600 font-mono">Δ área: —</span>
    }

    const deltaPct = ((areaDepois - areaAntes) / areaAntes) * 100
    const isUp = deltaPct > 0.01
    const isDown = deltaPct < -0.01

    return (
        <span className={cn(
            'text-xs font-mono font-bold',
            isUp ? 'text-rose-400' : isDown ? 'text-emerald-400' : 'text-slate-500'
        )}>
            {isUp ? '↑' : isDown ? '↓' : '='}
            {' '}{Math.abs(deltaPct).toFixed(1)}% área
        </span>
    )
}

// ─── Item de versão ───────────────────────────────────────────────────────

interface VersaoItemProps {
    versao: VersaoTM
    versaoAnterior: VersaoTM | null
    isLast: boolean
}

function VersaoItem({ versao, versaoAnterior, isLast }: VersaoItemProps) {
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

    const isInicial = versao.versao === 1

    return (
        <div className="relative flex gap-4">
            {/* Linha vertical da timeline */}
            {!isLast && (
                <div className="absolute left-4 top-10 bottom-0 w-px bg-slate-800" />
            )}

            {/* Ícone da versão */}
            <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold z-10',
                isInicial
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}>
                v{versao.versao}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">

                    {/* Header do item */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-300">
                                    {isInicial ? 'Versão Inicial (Baseline)' : `Aditivo #${versao.versao - 1}`}
                                </span>
                                <ZonaBadge zona={versao.zona_mated} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                <Clock className="h-3 w-3" />
                                {dataFormatada} às {horaFormatada}
                            </div>
                        </div>
                        <DeltaArea versaoAtual={versao} versaoAnterior={versaoAnterior} />
                    </div>

                    {/* Motivo */}
                    <p className="text-xs text-slate-400 leading-relaxed mb-3 italic">
                        &ldquo;{versao.motivo}&rdquo;
                    </p>

                    {/* Lados antes → depois */}
                    {!isInicial && (
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    { label: 'E', antes: versao.lados.E_antes, depois: versao.lados.E_depois },
                                    { label: 'P', antes: versao.lados.P_antes, depois: versao.lados.P_depois },
                                    { label: 'O', antes: versao.lados.O_antes, depois: versao.lados.O_depois },
                                ] as Array<{ label: string; antes: number; depois: number }>
                            ).map(({ label, antes, depois }) => {
                                const diff = depois - antes
                                const changed = Math.abs(diff) > 0.0001
                                return (
                                    <div key={label} className="bg-slate-950/60 rounded-lg p-2 text-center">
                                        <p className="text-[9px] text-slate-600 uppercase font-bold mb-1">{label}</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-mono">{antes.toFixed(1)}</span>
                                            <ChevronRight className="h-2.5 w-2.5 text-slate-700" />
                                            <span className={cn(
                                                'text-[10px] font-mono font-bold',
                                                changed
                                                    ? diff > 0 ? 'text-rose-400' : 'text-emerald-400'
                                                    : 'text-slate-500'
                                            )}>
                                                {depois.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {isInicial && (
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
                                    <span className="text-[10px] font-mono text-emerald-400">{valor.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────

export function TMHistorico({ projetoId, refreshKey = 0 }: TMHistoricoProps) {
    const [historico, setHistorico] = useState<VersaoTM[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState<string | null>(null)

    const carregar = useCallback(async () => {
        setCarregando(true)
        setErro(null)
        try {
            const dados = await getHistoricoTM(projetoId)
            setHistorico(dados)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Falha ao carregar histórico.'
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
                <span className="text-sm">Carregando histórico de aditivos...</span>
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
                <History className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum aditivo registrado ainda.</p>
                <p className="text-xs text-slate-700">
                    A versão inicial (v1) será criada ao finalizar o setup do projeto.
                </p>
            </div>
        )
    }

    // histórico já vem da mais recente para a mais antiga (ORDER BY versao DESC)
    // Para o delta, precisamos da versão "anterior" = versão com numero menor
    // Como o array está em ordem decrescente, versaoAnterior é o próximo item
    return (
        <div className="space-y-0">
            <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Histórico de Aditivos — {historico.length} versão{historico.length !== 1 ? 'ões' : ''}
                </h3>
            </div>

            <div className="relative">
                {historico.map((versao, idx) => {
                    // O item "anterior" ao atual (em termos cronológicos) é o próximo no array
                    const versaoAnterior = idx < historico.length - 1 ? historico[idx + 1] : null
                    const isLast = idx === historico.length - 1
                    return (
                        <VersaoItem
                            key={versao.id}
                            versao={versao}
                            versaoAnterior={versaoAnterior}
                            isLast={isLast}
                        />
                    )
                })}
            </div>
        </div>
    )
}
