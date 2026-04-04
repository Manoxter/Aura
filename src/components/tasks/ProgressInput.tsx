'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { saveProgresso } from '@/lib/api/progresso'
import { cn } from '@/lib/utils'

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastState {
    id: string
    message: string
    type: 'success' | 'error'
}

let toastContainer: ((toast: ToastState) => void) | null = null

function ProgressToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true))
        const timer = setTimeout(() => {
            setVisible(false)
            setTimeout(onDismiss, 300)
        }, 3000)
        return () => {
            cancelAnimationFrame(raf)
            clearTimeout(timer)
        }
    }, [onDismiss])

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300',
                toast.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/90 border-rose-500/30 text-rose-300',
                visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            )}
        >
            <span>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span>{toast.message}</span>
        </div>
    )
}

// ─── Toast Container (singleton, mounted once) ────────────────────────────────

export function ProgressToastContainer() {
    const [toasts, setToasts] = useState<ToastState[]>([])

    useEffect(() => {
        toastContainer = (toast: ToastState) => {
            setToasts(prev => [...prev, toast])
        }
        return () => {
            toastContainer = null
        }
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
            {toasts.map(t => (
                <ProgressToast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
        </div>
    )
}

function showToast(message: string, type: 'success' | 'error') {
    if (toastContainer) {
        toastContainer({ id: `toast-${Date.now()}`, message, type })
    }
}

// ─── ProgressInput ────────────────────────────────────────────────────────────

export interface ProgressInputProps {
    tarefaId: string
    tarefaNome?: string
    valorAtual: number
    onSave?: (novoValor: number) => void
    /** Compact variant: smaller input for Kanban cards */
    compact?: boolean
}

/**
 * Input numérico controlado (0–100) para registrar % de avanço de uma tarefa.
 *
 * - Usa stopPropagation() para não conflitar com drag-and-drop do Kanban
 * - Salva no blur ou Enter
 * - Mostra toast de confirmação após salvar
 * - Valida range 0-100 com mensagem de erro inline
 */
export function ProgressInput({
    tarefaId,
    tarefaNome,
    valorAtual,
    onSave,
    compact = false,
}: ProgressInputProps) {
    const [value, setValue] = useState<string>(String(valorAtual))
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync external prop changes
    useEffect(() => {
        setValue(String(valorAtual))
    }, [valorAtual])

    const validate = useCallback((raw: string): number | null => {
        const num = Number(raw)
        if (raw.trim() === '' || isNaN(num)) {
            setError('Valor deve ser numérico')
            return null
        }
        if (num < 0 || num > 100) {
            setError('Valor fora do intervalo (0–100)')
            return null
        }
        setError(null)
        return num
    }, [])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        setValue(raw)
        // Clear error on change
        if (error) validate(raw)
    }, [error, validate])

    const handleSave = useCallback(async () => {
        const num = validate(value)
        if (num === null) return

        setSaving(true)
        try {
            await saveProgresso(tarefaId, num)
            onSave?.(num)
            const nome = tarefaNome ? `'${tarefaNome}'` : 'selecionada'
            showToast(`Progresso da tarefa ${nome} atualizado para ${num}%`, 'success')
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar progresso'
            showToast(msg, 'error')
            setError(msg)
        } finally {
            setSaving(false)
        }
    }, [value, validate, tarefaId, tarefaNome, onSave])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation() // prevent drag-and-drop event hijacking
        if (e.key === 'Enter') {
            inputRef.current?.blur()
        }
        if (e.key === 'Escape') {
            setValue(String(valorAtual))
            setError(null)
            inputRef.current?.blur()
        }
    }, [valorAtual])

    const handleBlur = useCallback(() => {
        const num = validate(value)
        if (num !== null && num !== valorAtual) {
            handleSave()
        }
    }, [value, validate, valorAtual, handleSave])

    // Prevent drag events from propagating through the input
    const stopProp = useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation()
    }, [])

    if (compact) {
        return (
            <div
                className="mt-2"
                onClick={stopProp}
                onMouseDown={stopProp}
                onDragStart={stopProp}
            >
                <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-0.5">
                        <input
                            ref={inputRef}
                            type="number"
                            min={0}
                            max={100}
                            value={value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            onDragStart={stopProp}
                            disabled={saving}
                            className={cn(
                                'w-10 bg-slate-950 border rounded px-1 py-0.5 text-[10px] font-mono text-center outline-none',
                                'focus:border-blue-500 disabled:opacity-50 transition-colors',
                                error
                                    ? 'border-rose-500 text-rose-400'
                                    : 'border-slate-700 text-slate-300'
                            )}
                            aria-label="Percentual de avanço"
                        />
                        <span className="text-[9px] text-slate-600">%</span>
                    </div>
                </div>
                {error && (
                    <p className="text-[9px] text-rose-400 mt-0.5 leading-tight">{error}</p>
                )}
            </div>
        )
    }

    // Full variant (for table rows)
    return (
        <div
            className="flex flex-col gap-0.5"
            onClick={stopProp}
            onMouseDown={stopProp}
            onDragStart={stopProp}
        >
            <div className="flex items-center gap-1.5">
                <input
                    ref={inputRef}
                    type="number"
                    min={0}
                    max={100}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onDragStart={stopProp}
                    disabled={saving}
                    className={cn(
                        'w-14 bg-slate-950 border rounded-lg px-2 py-1 text-xs font-mono text-center outline-none',
                        'focus:border-blue-500 disabled:opacity-50 transition-colors',
                        error
                            ? 'border-rose-500 text-rose-400'
                            : 'border-slate-700 text-slate-300 hover:border-slate-600'
                    )}
                    aria-label="Percentual de avanço"
                />
                <span className="text-[10px] text-slate-600 font-mono">%</span>
                {saving && (
                    <span className="text-[9px] text-blue-400 animate-pulse">salvando...</span>
                )}
            </div>
            {error && (
                <p className="text-[9px] text-rose-400 leading-tight">{error}</p>
            )}
        </div>
    )
}
