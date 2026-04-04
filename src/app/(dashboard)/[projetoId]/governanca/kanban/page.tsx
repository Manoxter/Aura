'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Columns3, GripVertical, CheckCircle2, Clock, AlertTriangle, PlayCircle } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { ProgressInput, ProgressToastContainer } from '@/components/tasks/ProgressInput'
import { getUltimoProgresso } from '@/lib/api/progresso'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

type Tarefa = {
    id: string
    nome: string
    status: string
    duracao_estimada: number
    no_caminho_critico: boolean
    percentual_avanco: number
}

const COLUMNS = [
    { key: 'planejado', label: '📋 A Fazer', color: 'border-slate-700', bg: 'bg-slate-950/30', icon: Clock },
    { key: 'em_andamento', label: '🔄 Em Execução', color: 'border-blue-500', bg: 'bg-blue-500/5', icon: PlayCircle },
    { key: 'concluido', label: '✅ Concluído', color: 'border-emerald-500', bg: 'bg-emerald-500/5', icon: CheckCircle2 },
    { key: 'bloqueado', label: '🚫 Impedido', color: 'border-rose-500', bg: 'bg-rose-500/5', icon: AlertTriangle },
]

function KanbanPageContent() {
    const { projetoId } = useParams()
    const { tenantId, tarefas: contextTarefas } = useProject()
    const [tarefas, setTarefas] = useState<Tarefa[]>([])
    const [loading, setLoading] = useState(true)

    // Suppress unused variable warnings for context values
    void tenantId; void contextTarefas

    useEffect(() => {
        if (projetoId) loadTarefas()
    }, [projetoId])

    async function loadTarefas() {
        const { data } = await supabase
            .from('tarefas')
            .select('id, nome, status, duracao_estimada, no_caminho_critico')
            .eq('projeto_id', projetoId)
            .order('id_string', { ascending: true })
        if (!data) { setLoading(false); return }

        // Load last progress for each task
        const tarefasComProgresso = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.map(async (t: any) => ({
                ...t,
                percentual_avanco: await getUltimoProgresso(t.id),
            }))
        )
        setTarefas(tarefasComProgresso)
        setLoading(false)
    }

    async function moveTask(taskId: string, newStatus: string) {
        // Optimistic UI
        setTarefas(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

        const { error } = await supabase.from('tarefas').update({ status: newStatus }).eq('id', taskId)
        if (error) {
            console.error('Erro ao mover tarefa:', error)
            loadTarefas() // Revert
        }
    }

    const handleProgressSaved = useCallback((tarefaId: string, novoValor: number) => {
        setTarefas(prev => prev.map(t =>
            t.id === tarefaId ? { ...t, percentual_avanco: novoValor } : t
        ))
    }, [])

    const stats = useMemo(() => {
        const total = tarefas.length
        const concluido = tarefas.filter(t => t.status === 'concluido').length
        return {
            percentual: total > 0 ? (concluido / total) * 100 : 0,
            concluido,
            total
        }
    }, [tarefas])

    if (loading) return <div className="text-slate-400 p-8 animate-pulse">Carregando Fluxo de Trabalho...</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <ProgressToastContainer />
            <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Columns3 className="h-8 w-8 text-blue-500" />
                        Board de Execução
                    </h1>
                    <p className="text-slate-400 mt-2">Visão tática das atividades vinculadas ao caminho crítico do CPM.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Progresso Real</p>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-emerald-500 font-mono">{stats.percentual.toFixed(0)}%</span>
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${stats.percentual}%` }}></div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {COLUMNS.map(col => {
                    const colTasks = tarefas.filter(t => (t.status || 'planejado') === col.key)
                    const Icon = col.icon
                    return (
                        <div
                            key={col.key}
                            className={`flex flex-col rounded-2xl border-t-4 ${col.color} ${col.bg} min-h-[600px] border-x border-b border-slate-800 transition-all`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                const taskId = e.dataTransfer.getData('taskId')
                                if (taskId) moveTask(taskId, col.key)
                            }}
                        >
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {col.label}
                                </h3>
                                <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-lg font-mono">
                                    {colTasks.length}
                                </span>
                            </div>

                            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                {colTasks.map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-grab hover:border-slate-600 transition group hover:shadow-lg active:scale-95"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 opacity-0 group-hover:opacity-100 transition">
                                                <GripVertical className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-100 font-bold leading-snug truncate">{task.nome}</p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                                                        <span className="text-xs text-slate-500 font-mono">{task.duracao_estimada}d</span>
                                                    </div>
                                                    {task.no_caminho_critico && (
                                                        <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold uppercase">CRÍTICO</span>
                                                    )}
                                                </div>
                                                <ProgressInput
                                                    tarefaId={task.id}
                                                    tarefaNome={task.nome}
                                                    valorAtual={task.percentual_avanco}
                                                    onSave={(v) => handleProgressSaved(task.id, v)}
                                                    compact
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function KanbanPage() {
    return (
        <ErrorBoundary>
            <KanbanPageContent />
        </ErrorBoundary>
    )
}
