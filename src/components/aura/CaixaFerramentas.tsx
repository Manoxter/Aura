'use client'

import { useState } from 'react'
import { Wrench, X, ChevronRight, Star } from 'lucide-react'

export type ZonaFerramentas = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE' | 'TODOS'

export interface Ferramenta {
    id: string
    nome: string
    sigla?: string
    descricao: string
    quando: string
    /** Zonas MATED onde esta ferramenta é mais relevante */
    zonas: ZonaFerramentas[]
    guia: string[]
}

interface CaixaFerramentasProps {
    ferramentas: Ferramenta[]
    /** ID da ferramenta recomendada pelo Klauss (destaque em âmbar) */
    klaussRecomenda?: string
    titulo?: string
    subtitulo?: string
}

const ZONA_CORES: Record<ZonaFerramentas, string> = {
    OTIMO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SEGURO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    RISCO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    CRISE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    TODOS: 'bg-slate-700/50 text-slate-400 border-slate-700',
}

export function CaixaFerramentas({
    ferramentas,
    klaussRecomenda,
    titulo = 'Caixa de Ferramentas',
    subtitulo = 'Selecione a ferramenta adequada ao contexto atual do projeto',
}: CaixaFerramentasProps) {
    const [selected, setSelected] = useState<Ferramenta | null>(null)

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-500/10 p-2 rounded-xl">
                    <Wrench className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-100">{titulo}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{subtitulo}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ferramentas.map((f) => {
                    const isRecomendada = f.id === klaussRecomenda
                    return (
                        <button
                            key={f.id}
                            onClick={() => setSelected(f)}
                            className={`relative text-left p-4 rounded-2xl border transition-all group ${
                                isRecomendada
                                    ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 hover:border-slate-700'
                            }`}
                        >
                            {isRecomendada && (
                                <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-amber-400 font-bold">
                                    <Star className="h-2.5 w-2.5" /> Klauss
                                </span>
                            )}
                            {f.sigla && (
                                <div className={`text-xs font-mono font-bold mb-1 ${isRecomendada ? 'text-amber-400' : 'text-indigo-400'}`}>
                                    {f.sigla}
                                </div>
                            )}
                            <p className={`text-[11px] font-bold leading-tight mb-1 ${isRecomendada ? 'text-amber-200' : 'text-slate-200'}`}>
                                {f.nome}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{f.descricao}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {f.zonas.map(z => (
                                    <span key={z} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${ZONA_CORES[z]}`}>
                                        {z}
                                    </span>
                                ))}
                            </div>
                            <div className={`mt-2 flex items-center gap-1 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${isRecomendada ? 'text-amber-400' : 'text-indigo-400'}`}>
                                Ver guia <ChevronRight className="h-2.5 w-2.5" />
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Modal de Guia */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-950 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in slide-in-from-bottom-4">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                {selected.sigla && (
                                    <div className="text-xs font-mono font-bold text-indigo-400 mb-1">{selected.sigla}</div>
                                )}
                                <h3 className="text-xl font-bold text-slate-100">{selected.nome}</h3>
                                <p className="text-sm text-slate-400 mt-1">{selected.quando}</p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="text-slate-600 hover:text-slate-300 transition-colors ml-4"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {selected.zonas.map(z => (
                                <span key={z} className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase ${ZONA_CORES[z]}`}>
                                    {z}
                                </span>
                            ))}
                        </div>

                        <ol className="space-y-3">
                            {selected.guia.map((passo, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-300">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{passo}</span>
                                </li>
                            ))}
                        </ol>

                        <button
                            onClick={() => setSelected(null)}
                            className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl text-sm font-bold transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
