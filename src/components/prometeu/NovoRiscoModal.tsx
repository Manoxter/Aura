'use client'

// Story 13.2 — NovoRiscoModal: formulário de criação de risco
// AC-3: campos título, categoria, probabilidade (0-1), impacto (0-1), descrição opcional

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { upsertRiscoProjeto, type CategoriaRisco } from '@/lib/api/riscos'

const CATEGORIAS: { value: CategoriaRisco; label: string }[] = [
    { value: 'escopo', label: 'Escopo' },
    { value: 'prazo', label: 'Prazo' },
    { value: 'custo', label: 'Custo' },
    { value: 'qualidade', label: 'Qualidade' },
    { value: 'externo', label: 'Externo' },
]

interface NovoRiscoModalProps {
    open: boolean
    projetoId: string
    onClose: () => void
    onCreated: () => void
}

export function NovoRiscoModal({ open, projetoId, onClose, onCreated }: NovoRiscoModalProps) {
    const [titulo, setTitulo] = useState('')
    const [categoria, setCategoria] = useState<CategoriaRisco>('escopo')
    const [probabilidade, setProbabilidade] = useState('')
    const [impacto, setImpacto] = useState('')
    const [descricao, setDescricao] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    function reset() {
        setTitulo('')
        setCategoria('escopo')
        setProbabilidade('')
        setImpacto('')
        setDescricao('')
        setError(null)
    }

    function handleClose() {
        reset()
        onClose()
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const prob = parseFloat(probabilidade)
        const imp = parseFloat(impacto)

        if (!titulo.trim()) { setError('Título é obrigatório.'); return }
        if (isNaN(prob) || prob < 0 || prob > 1) { setError('Probabilidade deve ser entre 0 e 1.'); return }
        if (isNaN(imp) || imp < 0 || imp > 1) { setError('Impacto deve ser entre 0 e 1.'); return }

        setSaving(true)
        try {
            await upsertRiscoProjeto({
                projetoId,
                titulo: titulo.trim(),
                categoria,
                probabilidade: prob,
                impacto: imp,
                descricao: descricao.trim() || undefined,
            })
            reset()
            onCreated()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao criar risco.')
        } finally {
            setSaving(false)
        }
    }

    const inputClass = 'w-full bg-surface-overlay border border-border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
    const labelClass = 'block text-xs text-slate-400 mb-1'

    return (
        <Modal isOpen={open} onClose={handleClose} title="Novo Risco" maxWidth="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelClass}>Título *</label>
                    <input
                        type="text"
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        placeholder="Descreva o risco brevemente"
                        className={inputClass}
                        maxLength={200}
                        required
                    />
                </div>

                <div>
                    <label className={labelClass}>Categoria *</label>
                    <select
                        value={categoria}
                        onChange={e => setCategoria(e.target.value as CategoriaRisco)}
                        className={inputClass}
                    >
                        {CATEGORIAS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Probabilidade * (0–1)</label>
                        <input
                            type="number"
                            value={probabilidade}
                            onChange={e => setProbabilidade(e.target.value)}
                            placeholder="0.0 – 1.0"
                            min="0"
                            max="1"
                            step="0.01"
                            className={inputClass}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Impacto * (0–1)</label>
                        <input
                            type="number"
                            value={impacto}
                            onChange={e => setImpacto(e.target.value)}
                            placeholder="0.0 – 1.0"
                            min="0"
                            max="1"
                            step="0.01"
                            className={inputClass}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Descrição (opcional)</label>
                    <textarea
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Detalhes adicionais sobre o risco…"
                        rows={3}
                        className={`${inputClass} resize-none`}
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-surface-overlay text-slate-300 hover:text-slate-100 hover:bg-surface-raised transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Salvando…' : 'Criar risco'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
