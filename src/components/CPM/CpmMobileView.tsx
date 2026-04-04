'use client'

import { Monitor } from 'lucide-react'

export interface CpmTask {
    id: string
    nome: string
    duracao_estimada: number
    es: number
    ef: number
    ls: number
    lf: number
    folga: number
    critica: boolean
    dependencias?: string[]
}

interface CpmMobileViewProps {
    tasks: CpmTask[]
    displayMap?: Map<string, string>
}

export function CpmMobileView({ tasks, displayMap }: CpmMobileViewProps) {
    const criticalTasks = tasks.filter(t => t.ef > 0 && t.folga === 0)
    const otherTasks = tasks.filter(t => !(t.ef > 0 && t.folga === 0))

    return (
        <div className="space-y-4">
            {/* Banner */}
            <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
                <Monitor className="h-4 w-4 text-blue-400 shrink-0" />
                <p className="text-xs text-slate-400">
                    Diagrama disponível em <span className="text-blue-400 font-semibold">tablet / desktop</span>. Use o botão <span className="font-semibold text-white">Tela Cheia</span> ou acesse em uma tela maior.
                </p>
            </div>

            {/* Critical tasks section */}
            {criticalTasks.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2 px-1">
                        Caminho Crítico ({criticalTasks.length} tarefas)
                    </h4>
                    <div className="space-y-2">
                        {criticalTasks.map(task => {
                            const displayId = displayMap?.get(task.id) || task.id
                            return (
                                <div
                                    key={task.id}
                                    className="bg-rose-950/20 border border-rose-500/20 rounded-xl px-4 py-3 flex items-start gap-3"
                                >
                                    <span className="shrink-0 font-mono text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded mt-0.5">
                                        {displayId}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 leading-snug">{task.nome}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <span className="text-[11px] text-slate-400 font-mono">{task.duracao_estimada}d</span>
                                            {task.ef > 0 && (
                                                <>
                                                    <span className="text-[11px] text-indigo-400 font-mono">ES:{task.es} EF:{task.ef}</span>
                                                    <span className="text-[11px] text-amber-400 font-mono">LS:{task.ls} LF:{task.lf}</span>
                                                </>
                                            )}
                                            <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                                                Crítico
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Other tasks section */}
            {otherTasks.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                        Demais Tarefas ({otherTasks.length})
                    </h4>
                    <div className="space-y-2">
                        {otherTasks.map(task => {
                            const displayId = displayMap?.get(task.id) || task.id
                            const folga = task.ef > 0 ? task.folga : null
                            const folgaColor = folga === null ? 'text-slate-500' : folga > 5 ? 'text-emerald-400' : 'text-blue-400'

                            return (
                                <div
                                    key={task.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-3"
                                >
                                    <span className="shrink-0 font-mono text-[11px] text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded mt-0.5">
                                        {displayId}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-300 leading-snug">{task.nome}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <span className="text-[11px] text-slate-400 font-mono">{task.duracao_estimada}d</span>
                                            {task.ef > 0 && (
                                                <span className="text-[11px] text-indigo-400 font-mono">ES:{task.es} EF:{task.ef}</span>
                                            )}
                                            {folga !== null && (
                                                <span className={`text-[11px] font-mono ${folgaColor}`}>
                                                    Folga: {folga}d
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {tasks.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p className="text-sm">Nenhuma tarefa. Clique em <strong className="text-slate-400">Gerar Diagramas</strong> para calcular o CPM.</p>
                </div>
            )}
        </div>
    )
}
