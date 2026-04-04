'use client'

// Story 13.2 — RiscosList: lista de riscos com filtro por categoria
// AC-2: exibe todos os riscos com filtro funcional por categoria

import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { getRiscosProjeto, deletarRisco, type RiscoProjeto, type CategoriaRisco } from '@/lib/api/riscos'
import { ScoreRCBadge } from './ScoreRCBadge'
import { DeleteRiscoDialog } from './DeleteRiscoDialog'

const CATEGORIAS: { value: CategoriaRisco | 'todas'; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'escopo', label: 'Escopo' },
    { value: 'prazo', label: 'Prazo' },
    { value: 'custo', label: 'Custo' },
    { value: 'qualidade', label: 'Qualidade' },
    { value: 'externo', label: 'Externo' },
]

const CATEGORIA_LABEL: Record<CategoriaRisco, string> = {
    escopo: 'Escopo',
    prazo: 'Prazo',
    custo: 'Custo',
    qualidade: 'Qualidade',
    externo: 'Externo',
}

interface RiscosListProps {
    projetoId: string
    refreshKey: number
}

export function RiscosList({ projetoId, refreshKey }: RiscosListProps) {
    const [riscos, setRiscos] = useState<RiscoProjeto[]>([])
    const [filtroCategoria, setFiltroCategoria] = useState<CategoriaRisco | 'todas'>('todas')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmRisco, setConfirmRisco] = useState<RiscoProjeto | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchRiscos = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getRiscosProjeto(projetoId)
            setRiscos(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao buscar riscos.')
        } finally {
            setLoading(false)
        }
    }, [projetoId])

    useEffect(() => {
        fetchRiscos()
    }, [fetchRiscos, refreshKey])

    async function handleDelete() {
        if (!confirmRisco) return
        setIsDeleting(true)
        try {
            await deletarRisco(confirmRisco.id)
            setRiscos(prev => prev.filter(r => r.id !== confirmRisco.id))
            setConfirmRisco(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao excluir risco.')
        } finally {
            setIsDeleting(false)
            setDeletingId(null)
        }
    }

    const riscosFiltrados = filtroCategoria === 'todas'
        ? riscos
        : riscos.filter(r => r.categoria === filtroCategoria)

    if (loading) {
        return <p className="text-sm text-slate-500 py-8 text-center">Carregando riscos…</p>
    }

    if (error) {
        return <p className="text-sm text-red-400 py-4">{error}</p>
    }

    return (
        <div className="space-y-4">
            {/* Filtro por categoria */}
            <div className="flex gap-2 flex-wrap">
                {CATEGORIAS.map(c => (
                    <button
                        key={c.value}
                        onClick={() => setFiltroCategoria(c.value)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            filtroCategoria === c.value
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-border text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {riscosFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                    {filtroCategoria === 'todas'
                        ? 'Nenhum risco cadastrado.'
                        : `Nenhum risco de categoria "${CATEGORIA_LABEL[filtroCategoria as CategoriaRisco]}" encontrado.`}
                </p>
            ) : (
                <div className="divide-y divide-border">
                    {riscosFiltrados.map(risco => (
                        <div
                            key={risco.id}
                            className="flex items-start justify-between gap-4 py-3"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-slate-100 truncate">
                                        {risco.titulo}
                                    </span>
                                    <span className="text-xs text-slate-500 px-1.5 py-0.5 rounded bg-surface-overlay border border-border">
                                        {CATEGORIA_LABEL[risco.categoria]}
                                    </span>
                                    <ScoreRCBadge score={risco.score_rc} />
                                </div>
                                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                    <span>P: {risco.probabilidade.toFixed(2)}</span>
                                    <span>I: {risco.impacto.toFixed(2)}</span>
                                    {risco.descricao && (
                                        <span className="truncate max-w-xs">{risco.descricao}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => { setDeletingId(risco.id); setConfirmRisco(risco) }}
                                disabled={deletingId === risco.id}
                                aria-label={`Excluir risco ${risco.titulo}`}
                                className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Diálogo de confirmação */}
            <DeleteRiscoDialog
                open={!!confirmRisco}
                titulo={confirmRisco?.titulo ?? ''}
                onConfirm={handleDelete}
                onCancel={() => { setConfirmRisco(null); setDeletingId(null) }}
                isDeleting={isDeleting}
            />
        </div>
    )
}
