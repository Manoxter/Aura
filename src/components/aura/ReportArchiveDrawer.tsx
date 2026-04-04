'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, X, Clock, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * ReportArchiveDrawer — Sprint Req G Sessão 27
 *
 * Painel lateral mostrando histórico de snapshots e versões TM.
 * Acessível via botão no Dashboard.
 */

interface VersionEntry {
    id: string
    versao: number
    criado_em: string
    motivo: string
    zona_mated: string
    area_baseline: number
}

const ZONA_COLORS: Record<string, string> = {
    OTIMO: 'text-emerald-400 bg-emerald-500/20',
    SEGURO: 'text-blue-400 bg-blue-500/20',
    RISCO: 'text-amber-400 bg-amber-500/20',
    CRISE: 'text-rose-400 bg-rose-500/20',
}

export function ReportArchiveDrawer({ projetoId, aberto, onClose }: {
    projetoId: string
    aberto: boolean
    onClose: () => void
}) {
    const [versoes, setVersoes] = useState<VersionEntry[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!aberto || !projetoId) return
        setLoading(true)
        supabase
            .from('triangulo_matriz_versoes')
            .select('id, versao, criado_em, motivo, zona_mated, area_baseline')
            .eq('projeto_id', projetoId)
            .order('versao', { ascending: false })
            .limit(20)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data }: any) => {
                setVersoes((data as VersionEntry[]) ?? [])
                setLoading(false)
            })
    }, [aberto, projetoId])

    if (!aberto) return null

    return (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] z-40 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        Arquivo de Relatórios
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                        <Clock className="h-5 w-5 animate-spin mr-2" />
                        Carregando...
                    </div>
                ) : versoes.length === 0 ? (
                    <div className="text-center py-12 text-slate-600">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Nenhum snapshot registrado</p>
                        <p className="text-xs mt-1 opacity-60">Registre um snapshot no TM ou Dashboard</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {versoes.map(v => {
                            const date = new Date(v.criado_em)
                            const zonaClass = ZONA_COLORS[v.zona_mated] ?? 'text-slate-400 bg-slate-500/20'
                            return (
                                <div key={v.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                                                v{v.versao}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${zonaClass}`}>
                                                {v.zona_mated}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">{v.motivo}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Shield className="h-3 w-3" />
                                            Área: {v.area_baseline.toFixed(4)}
                                        </span>
                                        <button className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold">
                                            <Download className="h-3 w-3" />
                                            HTML
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
