'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Clock, LayoutDashboard, GitMerge, Plus, Trash2, ArrowRight, Save, Layers, ChevronDown, ChevronRight, BarChart3, Sparkles, Maximize2, X, DollarSign, Lock, Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { EmptyState, TasksEmptyIllustration, CpmEmptyIllustration } from '@/components/ui/EmptyState'
import { useProject, TarefaData } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SetupStepper } from '@/components/aura/SetupStepper'
import { calculateCPMLocal, findAllCriticalPaths, extractEapCode, sanitizeTaskName, buildDisplayMap, type CriticalPath } from '@/lib/engine/cpm'
import { computeSugiyamaLayout, computeSvgDimensions } from '@/lib/engine/sugiyama'
import { CpmMobileView } from '@/components/CPM/CpmMobileView'
import { useToast } from '@/hooks/useToast'
import { criarVersaoInicial } from '@/lib/api/tm-versoes'

// ─── Fullscreen Modal Wrapper ───

function DiagramModal({ title, open, onClose, children }: { title: string, open: boolean, onClose: () => void, children: React.ReactNode }) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <GitMerge className="h-5 w-5 text-indigo-400" />
                    {title}
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
                {children}
            </div>
        </div>
    )
}

// ─── HTML Gantt (CSS grid, responsive, selectable text) ───

function GanttHTML({ tarefas, criticalPaths, displayMap }: { tarefas: TarefaData[], criticalPaths: CriticalPath[], displayMap: Map<string, string> }) {
    const primaryPathIds = new Set(criticalPaths[0]?.tasks.map(t => t.id) || [])
    const maxEF = Math.max(...tarefas.map(t => t.ef), 1)
    const scale = (val: number) => (val / maxEF) * 100

    return (
        <div className="space-y-1">
            {/* Timeline header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-56 shrink-0" />
                <div className="flex-1 flex justify-between text-[10px] font-mono text-slate-500 px-1">
                    <span>0</span>
                    {[0.25, 0.5, 0.75].map(p => <span key={p}>{Math.round(maxEF * p)}d</span>)}
                    <span>{maxEF}d</span>
                </div>
            </div>
            {/* Bars */}
            {tarefas.map(t => {
                const isPrimary = primaryPathIds.has(t.id)
                const isCrit = !isPrimary && t.ef > 0 && t.folga === 0
                const sem = getSemaphore(t, isPrimary, isCrit)
                return (
                    <div key={t.id} className={`flex items-center gap-2 group py-1 rounded-lg transition-colors ${isPrimary ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}`}
                        title={`${t.nome}\nDuração: ${t.duracao_estimada}d | ES:${t.es}→EF:${t.ef}\nFolga: ${t.folga} | ${sem.label}`}>
                        {/* Semaphore dot + Label */}
                        <div className={`w-56 shrink-0 text-right pr-2 text-xs truncate flex items-center justify-end gap-1.5 ${isPrimary ? 'text-rose-400 font-bold' : isCrit ? 'text-amber-400' : 'text-slate-400'}`}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sem.stroke }} />
                            <span className="font-mono text-[10px] shrink-0">{displayMap.get(t.id)}</span>
                            <span className="truncate">{t.nome.length > 22 ? t.nome.slice(0, 20) + '..' : t.nome}</span>
                        </div>
                        {/* Bar container */}
                        <div className="flex-1 relative h-8 bg-slate-900/50 rounded">
                            {t.folga > 0 && (
                                <div className="absolute top-0.5 h-7 rounded bg-slate-800/40"
                                    style={{ left: `${scale(t.ls)}%`, width: `${Math.max(scale(t.duracao_estimada), 1)}%` }} />
                            )}
                            <div className={`absolute top-0.5 h-7 rounded flex items-center justify-center transition-all ${sem.barColor}`}
                                style={{ left: `${scale(t.es)}%`, width: `${Math.max(scale(t.duracao_estimada), 1.5)}%` }}>
                                <span className="text-[10px] font-mono text-white font-bold drop-shadow">{t.duracao_estimada}d</span>
                            </div>
                            {/* Hover info */}
                            <div className="absolute right-1 top-0.5 h-7 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className={`text-[9px] font-mono px-1 rounded ${t.folga === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    F:{t.folga}
                                </span>
                                <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                                    {t.es}→{t.ef}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
            {/* Legend — semáforo */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-600 inline-block" /> Crítico (Folga=0)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> Risco (Crítico alt.)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Normal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Folgado (&gt;5d)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-700 rounded inline-block" /> Folga (LS→LF)</span>
            </div>
        </div>
    )
}

// ─── Semaphore color helper ───

function getSemaphore(t: TarefaData, isPrimary: boolean, isCrit: boolean): { fill: string, stroke: string, barColor: string, label: string } {
    // Semaphore: red=critical, amber=at risk, blue=on track, emerald=completed (future: link kanban)
    if (isPrimary) return { fill: '#1c0a0e', stroke: '#e11d48', barColor: 'bg-rose-600/80', label: 'Crítico' }
    if (isCrit) return { fill: '#1a1000', stroke: '#d97706', barColor: 'bg-amber-600/70', label: 'Risco' }
    if (t.folga > 5) return { fill: '#022c22', stroke: '#059669', barColor: 'bg-emerald-600/70', label: 'Folgado' }
    return { fill: '#0f172a', stroke: '#3b82f6', barColor: 'bg-blue-600/70', label: 'Normal' }
}

// ─── PERT Diagram v2 — Sugiyama layout + compact rect nodes (Stories 4.2 + 4.3) ───

const PERT_NODE_W = 64
const PERT_NODE_H = 36

function PERTDiagram({ tarefas, criticalPaths, displayMap }: { tarefas: TarefaData[], criticalPaths: CriticalPath[], displayMap: Map<string, string> }) {
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const dragging = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setZoom(z => Math.max(0.2, Math.min(3, z * delta)))
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener('wheel', handleWheel, { passive: false })
        return () => el.removeEventListener('wheel', handleWheel)
    }, [handleWheel])

    const handleMouseDown = (e: React.MouseEvent) => {
        dragging.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging.current) return
        setPan({ x: dragging.current.panX + (e.clientX - dragging.current.startX), y: dragging.current.panY + (e.clientY - dragging.current.startY) })
    }
    const handleMouseUp = () => { dragging.current = null }

    const primaryPathIds = new Set(criticalPaths[0]?.tasks.map(t => t.id) || [])
    const allCriticalIds = new Set(criticalPaths.flatMap(p => p.tasks.map(t => t.id)))

    // Story 4.2: Sugiyama layout com barycenter heuristic
    const n = tarefas.length
    const gapX = n > 30 ? 48 : n > 15 ? 64 : 80
    const gapY = n > 30 ? 10 : n > 15 ? 14 : 16

    const positions = useMemo(
        () => computeSugiyamaLayout(tarefas, { nodeW: PERT_NODE_W, nodeH: PERT_NODE_H, gapX, gapY }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tarefas]
    )
    const { width: svgW, height: svgH } = computeSvgDimensions(positions, { nodeW: PERT_NODE_W, nodeH: PERT_NODE_H })

    // Reverse display map para resolver IDs das dependências
    const reverseDisplay = useMemo(() => {
        const m = new Map<string, string>()
        displayMap.forEach((display, real) => m.set(display.toLowerCase(), real))
        tarefas.forEach(t => m.set(t.id, t.id))
        return m
    }, [displayMap, tarefas])

    const hw = PERT_NODE_W / 2
    const hh = PERT_NODE_H / 2

    return (
        <div>
            {/* Zoom controls */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-mono transition-colors" title="Zoom in">+</button>
                <button onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-mono transition-colors" title="Zoom out">−</button>
                <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs transition-colors" title="Reset">↺</button>
                <span className="text-[10px] text-slate-600 font-mono">{Math.round(zoom * 100)}%</span>
                <span className="text-[10px] text-slate-700 ml-1">Scroll = zoom · Arrastar = pan</span>
            </div>
            <div
                ref={containerRef}
                className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
                style={{ minHeight: '400px', maxHeight: '70vh' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
            <svg width={svgW} height={svgH} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', display: 'block' }}>
                <defs>
                    {/* Arrowhead markers — Story 4.4 */}
                    <marker id="ah-crit" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 9 3.5, 0 7" fill="#f43f5e" />
                    </marker>
                    <marker id="ah-risk" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 9 3.5, 0 7" fill="#fb923c" />
                    </marker>
                    <marker id="ah" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 9 3.5, 0 7" fill="#475569" />
                    </marker>
                </defs>

                {/* Arrows — sai da borda direita do nó predecessor, chega à borda esquerda do sucessor */}
                {tarefas.map(t => (t.dependencias || []).map(depId => {
                    const resolvedDepId = reverseDisplay.get(depId) || reverseDisplay.get(depId.toLowerCase()) || depId
                    const from = positions.get(resolvedDepId), to = positions.get(t.id)
                    if (!from || !to) return null
                    const isPrimary = primaryPathIds.has(resolvedDepId) && primaryPathIds.has(t.id)
                    const isCrit = allCriticalIds.has(resolvedDepId) && allCriticalIds.has(t.id)

                    // Saída: centro-direita do nó from; Entrada: centro-esquerda do nó to
                    const x1 = from.cx + hw
                    const y1 = from.cy
                    const x2 = to.cx - hw - 9  // 9 = arrowhead offset
                    const y2 = to.cy

                    // Curva suave quando nós estão em camadas não-adjacentes ou mesma camada
                    const dx = x2 - x1
                    const cpX = x1 + dx * 0.5

                    const arrowColor = isPrimary ? '#f43f5e' : isCrit ? '#fb923c' : '#475569'
                    const markerId = isPrimary ? 'ah-crit' : isCrit ? 'ah-risk' : 'ah'
                    return (
                        <path key={`${resolvedDepId}->${t.id}`}
                            d={`M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`}
                            fill="none"
                            stroke={arrowColor}
                            strokeWidth={isPrimary ? 2.5 : isCrit ? 2 : 1.5}
                            strokeDasharray={isCrit && !isPrimary ? '5 3' : undefined}
                            markerEnd={`url(#${markerId})`}
                        />
                    )
                }))}

                {/* Story 4.3: Compact rect nodes (rounded rectangle, ID + duration) */}
                {tarefas.map(t => {
                    const pos = positions.get(t.id)
                    if (!pos) return null
                    const isPrimary = primaryPathIds.has(t.id)
                    const isCrit = allCriticalIds.has(t.id)
                    const isSlack = t.ef > 0 && t.folga > 5
                    const displayId = (displayMap.get(t.id) || t.id).slice(0, 8)

                    const stroke = isPrimary ? '#f43f5e' : isCrit ? '#fb923c' : isSlack ? '#059669' : '#475569'
                    const fill = isPrimary ? '#1c0a0e' : isCrit ? '#1a0f00' : isSlack ? '#022c22' : '#0f172a'
                    const textColor = isPrimary ? '#fda4af' : isCrit ? '#fdba74' : isSlack ? '#6ee7b7' : '#94a3b8'
                    const durColor = isPrimary ? '#f43f5e88' : isCrit ? '#fb923c88' : '#47556988'

                    return (
                        <g key={t.id} className="cursor-pointer">
                            <title>{`${displayId} — ${t.nome}\nDuração: ${t.duracao_estimada}d | ES:${t.es} EF:${t.ef} | LS:${t.ls} LF:${t.lf} | Folga:${t.folga}`}</title>
                            {/* Rounded rectangle */}
                            <rect
                                x={pos.cx - hw} y={pos.cy - hh}
                                width={PERT_NODE_W} height={PERT_NODE_H}
                                rx={6} ry={6}
                                fill={fill} stroke={stroke}
                                strokeWidth={isPrimary ? 2.5 : 1.5}
                            />
                            {/* Task ID — top half */}
                            <text
                                x={pos.cx} y={pos.cy - 5}
                                fill={textColor}
                                fontSize={10} fontFamily="monospace" fontWeight="bold"
                                textAnchor="middle" dominantBaseline="middle"
                            >
                                {displayId}
                            </text>
                            {/* Duration — bottom half */}
                            <text
                                x={pos.cx} y={pos.cy + 9}
                                fill={durColor}
                                fontSize={9} fontFamily="monospace"
                                textAnchor="middle" dominantBaseline="middle"
                            >
                                {t.duracao_estimada}d
                            </text>
                        </g>
                    )
                })}
            </svg>
            </div>
        </div>
    )
}

// ─── Critical Path Selector — PMBOK multi-path panel ───

function CriticalPathSelector({
    criticalPaths,
    selectedIndex,
    onSelect,
    displayMap,
}: {
    criticalPaths: CriticalPath[]
    selectedIndex: number
    onSelect: (i: number) => void
    displayMap: Map<string, string>
}) {
    if (criticalPaths.length <= 1) return null
    return (
        <div className="px-4 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="text-amber-400 font-bold">{criticalPaths.length} Caminhos Críticos Detectados</span>
                <span className="hidden sm:inline">— PMBOK: prioridade pela tarefa de maior duração individual</span>
            </div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                {criticalPaths.map((path, i) => {
                    const isSelected = i === selectedIndex
                    const ids = path.tasks.map(t => displayMap.get(t.id) || t.id)
                    return (
                        <button
                            key={i}
                            onClick={() => onSelect(i)}
                            className={`flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-xs transition-colors w-full ${isSelected ? 'bg-rose-950/40 border border-rose-500/30' : 'hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            {/* Rank badge */}
                            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                {i + 1}
                            </span>
                            {/* Total duration */}
                            <span className={`shrink-0 font-mono text-[11px] w-10 ${isSelected ? 'text-rose-300' : 'text-slate-500'}`}>
                                {path.totalDuration}d
                            </span>
                            {/* Max task duration (PMBOK ranking criterion) */}
                            <span className={`shrink-0 text-[10px] w-16 ${isSelected ? 'text-amber-300' : 'text-slate-600'}`}>
                                max: {path.maxTaskDuration}d
                            </span>
                            {/* Task ID chain */}
                            <span className={`truncate font-mono text-[10px] ${isSelected ? 'text-rose-400/80' : 'text-slate-600'}`}>
                                {ids.join(' → ')}
                            </span>
                            {/* PMBOK badge for rank 1 */}
                            {i === 0 && (
                                <span className="shrink-0 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                    PMBOK
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Critical Path Panel — box abaixo do PERT ───

function CriticalPathPanel({
    criticalPaths,
    displayMap,
}: {
    criticalPaths: CriticalPath[]
    displayMap: Map<string, string>
}) {
    if (criticalPaths.length === 0) return null
    return (
        <div className="mx-4 mb-4 mt-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {criticalPaths.length === 1 ? 'Caminho Crítico' : `${criticalPaths.length} Caminhos Críticos`}
                </span>
                <span className="text-[10px] text-slate-600">— PMBOK: ordenado pela maior tarefa individual</span>
            </div>
            <div className="divide-y divide-slate-800/60">
                {criticalPaths.map((path, i) => {
                    const isPrimary = i === 0
                    // Highlight the task with max duration in the chain
                    const longestTask = path.tasks.reduce((a, b) => a.duracao_estimada >= b.duracao_estimada ? a : b)
                    return (
                        <div key={i} className={`px-4 py-2.5 flex items-start gap-3 ${isPrimary ? 'bg-rose-950/20' : 'bg-transparent'}`}>
                            {/* Rank badge */}
                            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isPrimary ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                {/* Chain of IDs */}
                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                    {path.tasks.map((t, ti) => {
                                        const dispId = displayMap.get(t.id) || t.id
                                        const isLongest = t.id === longestTask.id
                                        return (
                                            <span key={t.id} className="flex items-center gap-1">
                                                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                                                    isLongest
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                                                        : isPrimary
                                                            ? 'bg-rose-900/40 text-rose-300'
                                                            : 'bg-slate-800/60 text-slate-400'
                                                }`}>
                                                    {dispId}
                                                    {isLongest && <span className="ml-1 text-[9px] text-amber-400">★{t.duracao_estimada}d</span>}
                                                </span>
                                                {ti < path.tasks.length - 1 && (
                                                    <span className={`text-[10px] ${isPrimary ? 'text-rose-600' : 'text-slate-600'}`}>→</span>
                                                )}
                                            </span>
                                        )
                                    })}
                                </div>
                                {/* Stats row */}
                                <div className="flex items-center gap-3 text-[10px]">
                                    <span className={`font-mono ${isPrimary ? 'text-rose-400' : 'text-slate-500'}`}>
                                        Total: <strong>{path.totalDuration}d</strong>
                                    </span>
                                    <span className={`font-mono ${isPrimary ? 'text-amber-400' : 'text-slate-600'}`}>
                                        Maior tarefa: <strong>{path.maxTaskDuration}d</strong>
                                    </span>
                                    <span className={`font-mono text-slate-600`}>
                                        {path.tasks.length} tarefas
                                    </span>
                                    {isPrimary && (
                                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                            PMBOK Primário
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Legacy Gantt SVG (kept for fullscreen) ───

function GanttDiagram({ tarefas, criticalPaths, displayMap }: { tarefas: TarefaData[], criticalPaths: CriticalPath[], displayMap: Map<string, string> }) {
    const primaryPathIds = new Set(criticalPaths[0]?.tasks.map(t => t.id) || [])
    const maxEF = Math.max(...tarefas.map(t => t.ef), 1)

    const barH = 28
    const gapY = 6
    const labelW = 200
    const chartW = 700
    const padX = 20
    const padY = 40
    const totalH = padY + tarefas.length * (barH + gapY) + 20
    const totalW = labelW + chartW + padX * 2

    const scale = (val: number) => (val / maxEF) * chartW

    return (
        <div className="overflow-auto">
            <svg width={totalW} height={totalH}>
                {/* Header */}
                <text x={labelW + padX} y={20} fill="#94a3b8" fontSize="11" fontFamily="monospace">0</text>
                <text x={labelW + padX + chartW} y={20} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="end">{maxEF}d</text>
                <line x1={labelW + padX} y1={28} x2={labelW + padX + chartW} y2={28} stroke="#1e293b" strokeWidth={1} />
                {[0.2, 0.4, 0.6, 0.8].map(pct => (
                    <g key={pct}>
                        <line x1={labelW + padX + chartW * pct} y1={28} x2={labelW + padX + chartW * pct} y2={totalH - 10} stroke="#1e293b" strokeWidth={1} strokeDasharray="4 4" />
                        <text x={labelW + padX + chartW * pct} y={20} fill="#475569" fontSize="10" fontFamily="monospace" textAnchor="middle">{Math.round(maxEF * pct)}</text>
                    </g>
                ))}
                {/* Bars */}
                {tarefas.map((t, i) => {
                    const y = padY + i * (barH + gapY)
                    const isPrimary = primaryPathIds.has(t.id)
                    const barX = labelW + padX + scale(t.es)
                    const barW = Math.max(scale(t.duracao_estimada), 4)
                    return (
                        <g key={t.id}>
                            <text x={labelW - 4} y={y + barH / 2 + 4} fill={isPrimary ? '#fb7185' : '#cbd5e1'} fontSize="12" textAnchor="end" fontWeight={isPrimary ? 'bold' : 'normal'}>
                                {displayMap.get(t.id) || t.id} — {t.nome.length > 20 ? t.nome.slice(0, 18) + '..' : t.nome}
                            </text>
                            {t.folga > 0 && (
                                <rect x={labelW + padX + scale(t.ls)} y={y + 2} width={Math.max(scale(t.duracao_estimada), 4)} height={barH - 4} rx={6} fill="#1e293b" opacity={0.5} />
                            )}
                            <rect x={barX} y={y + 2} width={barW} height={barH - 4}
                                rx={6}
                                fill={isPrimary ? '#e11d48' : (t.ef > 0 && t.folga === 0) ? '#d97706' : '#3b82f6'}
                                opacity={0.85}
                            />
                            {/* Duration text */}
                            <text x={barX + barW / 2} y={y + barH / 2 + 4} fill="#fff" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                                {t.duracao_estimada}d
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ─── Cost Chart (SVG Cartesian Plane — Função Custo por Tarefa) ───

function formatBRL(n: number): string {
    if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$${(n / 1_000).toFixed(0)}k`
    return `R$${n}`
}

function CostChart({ tarefas, custos, displayMap, criticalPaths, onHoverDay, onClickDay }: {
    tarefas: TarefaData[]
    custos: Record<string, number>
    displayMap: Map<string, string>
    criticalPaths: CriticalPath[]
    onHoverDay?: (day: number | null) => void
    onClickDay?: (day: number) => void
}) {
    const criticalIds = new Set(criticalPaths[0]?.tasks.map(t => t.id) || [])
    const hasCPM = tarefas.some(t => t.ef > 0)
    const ordered = hasCPM
        ? [...tarefas].sort((a, b) => a.es !== b.es ? a.es - b.es : a.nome.localeCompare(b.nome))
        : tarefas
    const costs = ordered.map(t => custos[t.id] || 0)
    const totalCusto = costs.reduce((s, c) => s + c, 0)
    const maxCost = Math.max(...costs, 1)

    if (totalCusto === 0) {
        return (
            <div className="text-center py-16 text-slate-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum custo definido.</p>
                <p className="text-xs mt-1 text-slate-600">Acesse <strong className="text-slate-500">EAP → Tabela de Custos</strong>, preencha os valores e clique em &quot;Exportar Custos&quot;.</p>
            </div>
        )
    }

    // SVG layout
    const W = 800
    const H = 320
    const padL = 88
    const padR = 24
    const padT = 28
    const padB = 70
    const chartW = W - padL - padR
    const chartH = H - padT - padB
    const n = ordered.length
    const barW = Math.max(6, Math.min(36, chartW / n - 6))
    const barSlot = chartW / n

    const scaleY = (v: number) => padT + chartH - (v / maxCost) * chartH

    // Cumulative cost S-curve
    let acc = 0
    const cumul = costs.map(c => { acc += c; return acc })
    const maxCumul = acc || 1

    const yTicks = [0, 0.25, 0.5, 0.75, 1]

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: Math.max(500, n * 40 + 120), cursor: onHoverDay ? 'crosshair' : 'default' }}
                onMouseMove={(e) => {
                    if (!onHoverDay) return
                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
                    const svgX = (e.clientX - rect.left) / rect.width * W
                    let closestIdx = 0; let closestDist = Infinity
                    ordered.forEach((_, i) => {
                        const cx = padL + i * barSlot + barSlot / 2
                        const dist = Math.abs(svgX - cx)
                        if (dist < closestDist) { closestDist = dist; closestIdx = i }
                    })
                    const t = ordered[closestIdx]
                    if (t.ef > 0) onHoverDay(Math.round((t.es + t.ef) / 2))
                }}
                onMouseLeave={() => onHoverDay?.(null)}
                onClick={(e) => {
                    if (!onClickDay) return
                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
                    const svgX = (e.clientX - rect.left) / rect.width * W
                    let closestIdx = 0; let closestDist = Infinity
                    ordered.forEach((_, i) => {
                        const cx = padL + i * barSlot + barSlot / 2
                        const dist = Math.abs(svgX - cx)
                        if (dist < closestDist) { closestDist = dist; closestIdx = i }
                    })
                    const t = ordered[closestIdx]
                    if (t.ef > 0) onClickDay(Math.round((t.es + t.ef) / 2))
                }}
            >
                {/* Gridlines + Y-axis labels */}
                {yTicks.map(pct => {
                    const y = scaleY(maxCost * pct)
                    return (
                        <g key={pct}>
                            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(100,116,139,0.18)" strokeWidth="1" />
                            <text x={padL - 6} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                                {formatBRL(maxCost * pct)}
                            </text>
                        </g>
                    )
                })}

                {/* Axes */}
                <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#334155" strokeWidth="1.5" />
                <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#334155" strokeWidth="1.5" />

                {/* Bars */}
                {ordered.map((t, i) => {
                    const cost = costs[i]
                    const cx = padL + i * barSlot + barSlot / 2
                    const bx = cx - barW / 2
                    const bh = cost > 0 ? (cost / maxCost) * chartH : 2
                    const by = padT + chartH - bh
                    const isCrit = criticalIds.has(t.id)
                    return (
                        <g key={t.id}>
                            <rect x={bx} y={by} width={barW} height={bh}
                                fill={isCrit ? 'rgba(239,68,68,0.75)' : 'rgba(99,102,241,0.7)'}
                                rx="2"
                            />
                            {cost > 0 && (
                                <text x={cx} y={by - 4} fill="#94a3b8" fontSize="9" textAnchor="middle">
                                    {formatBRL(cost)}
                                </text>
                            )}
                            <text
                                x={cx} y={padT + chartH + 14}
                                fill="#64748b" fontSize="10" textAnchor="end"
                                transform={`rotate(-40,${cx},${padT + chartH + 14})`}
                            >
                                {displayMap.get(t.id) || t.id.slice(0, 6)}
                            </text>
                        </g>
                    )
                })}

                {/* Cumulative S-curve */}
                <polyline
                    points={ordered.map((_, i) => {
                        const x = padL + i * barSlot + barSlot / 2
                        const y = padT + chartH - (cumul[i] / maxCumul) * chartH
                        return `${x},${y}`
                    }).join(' ')}
                    fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" opacity="0.85"
                />

                {/* Y-axis title */}
                <text x={14} y={padT + chartH / 2} fill="#94a3b8" fontSize="11" textAnchor="middle"
                    transform={`rotate(-90,14,${padT + chartH / 2})`}>
                    Custo (R$)
                </text>

                {/* Legend */}
                <rect x={W - 170} y={padT + 4} width="10" height="8" fill="rgba(239,68,68,0.75)" rx="1" />
                <text x={W - 156} y={padT + 12} fill="#94a3b8" fontSize="10">Tarefa Crítica</text>
                <rect x={W - 170} y={padT + 20} width="10" height="8" fill="rgba(99,102,241,0.7)" rx="1" />
                <text x={W - 156} y={padT + 28} fill="#94a3b8" fontSize="10">Tarefa Normal</text>
                <line x1={W - 170} y1={padT + 40} x2={W - 160} y2={padT + 40} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" />
                <text x={W - 156} y={padT + 44} fill="#94a3b8" fontSize="10">Custo Acumulado</text>

                {/* Footer total */}
                <text x={W / 2} y={H - 6} fill="#64748b" fontSize="11" textAnchor="middle">
                    {`Total: ${formatBRL(totalCusto)} · ${n} pacote${n !== 1 ? 's' : ''}${hasCPM ? ' · ordenado por ES (início precoce)' : ''}`}
                </text>
            </svg>
        </div>
    )
}

// ─── GanttLupa — Stories 4.6–4.9 ───

/** Escala adaptativa: seleciona unidade mais legível conforme duração total (Story 4.9) */
function getTimeUnit(maxEF: number): { divisor: number; formatDay: (d: number) => string } {
    if (maxEF <= 60) return { divisor: 1, formatDay: (d) => `Dia ${d}` }
    if (maxEF <= 400) return { divisor: 7, formatDay: (d) => `Sem ${Math.round(d / 7)}` }
    if (maxEF <= 1200) return { divisor: 30, formatDay: (d) => `Mês ${Math.round(d / 30)}` }
    return { divisor: 365, formatDay: (d) => `Ano ${(d / 365).toFixed(1)}` }
}

/**
 * GanttLupa — overlay Gantt magnifier abaixo da Função Custo.
 * Estado normal: apenas eixo temporal fino com ticks adaptativos.
 * Quando activeDay != null: overlay com barras ±15% da janela temporal.
 */
function GanttLupa({ tarefas, criticalPaths, displayMap, activeDay, maxEF, pinned, onUnpin }: {
    tarefas: TarefaData[]
    criticalPaths: CriticalPath[]
    displayMap: Map<string, string>
    activeDay: number | null
    maxEF: number
    pinned: boolean
    onUnpin: () => void
}) {
    const { formatDay } = getTimeUnit(maxEF)
    const primaryIds = new Set(criticalPaths[0]?.tasks.map(t => t.id) || [])

    // Janela ±15% centrada em activeDay (Story 4.6)
    const windowStart = activeDay != null ? Math.max(0, activeDay * 0.85) : 0
    const windowEnd = activeDay != null ? Math.min(maxEF, activeDay * 1.15) : maxEF
    const activeTasks = activeDay != null
        ? tarefas.filter(t => t.ef > windowStart && t.es < windowEnd)
        : []

    // 5 ticks adaptativos para o eixo base (Story 4.9)
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(p * maxEF))

    return (
        <div className="mt-4 select-none">
            {/* Eixo temporal fino — estado normal (AC-1 Story 4.6) */}
            <div className="relative flex items-end pb-5 h-7">
                <div className="absolute inset-x-0 top-2 h-px bg-slate-700" />
                {ticks.map((tick, i) => {
                    const pct = maxEF > 0 ? (tick / maxEF) * 100 : 0
                    return (
                        <div
                            key={i}
                            className="absolute flex flex-col items-center"
                            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                        >
                            <div className="w-px h-2 bg-slate-600 mt-1" />
                            <span className="text-[9px] font-mono text-slate-500 mt-0.5 whitespace-nowrap">
                                {formatDay(tick)}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Overlay lupa (Story 4.6 / 4.7 / 4.8) */}
            {activeDay !== null && (
                <div className="border border-slate-700 rounded-xl bg-slate-900/95 shadow-2xl overflow-hidden" style={{ maxWidth: 320 }}>
                    {/* Header (Story 4.7 AC-5 + Story 4.8 AC-4) */}
                    <div className="px-3 py-2 bg-slate-800/80 flex items-center justify-between border-b border-slate-700 gap-2">
                        <span className="text-xs font-mono text-slate-300">
                            {formatDay(activeDay)} · {activeTasks.length} tarefa{activeTasks.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {pinned && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">📌 Fixado</span>
                            )}
                            <button
                                onClick={onUnpin}
                                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                                title="Fechar lupa"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                    {/* Barras Gantt (Story 4.7 AC-1–4) */}
                    <div className="p-2 space-y-0.5">
                        {activeTasks.length === 0 ? (
                            <span className="text-[10px] text-slate-500 px-1">Nenhuma tarefa nesta janela</span>
                        ) : (
                            activeTasks.map(t => {
                                const isCrit = primaryIds.has(t.id) || t.folga === 0
                                const code = displayMap.get(t.id) ?? t.id.slice(0, 4)
                                const fullLabel = `${code} ${t.nome}`
                                const label = fullLabel.length > 10 ? fullLabel.slice(0, 10) + '…' : fullLabel
                                return (
                                    <div key={t.id} className="flex items-center gap-1.5" title={`${t.nome} (${t.es}→${t.ef}, F:${t.folga})`}>
                                        <div className={`h-3 w-1.5 rounded-sm shrink-0 ${isCrit ? 'bg-red-500/70' : 'bg-slate-500/50'}`} />
                                        <span className="text-[9px] font-mono text-slate-400">{label}</span>
                                        <span className="text-[8px] font-mono text-slate-600 ml-auto shrink-0">{t.duracao_estimada}d</span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main CPM Page ───

export default function CPMPage() {
    const params = useParams()
    const projetoId = Array.isArray(params.projetoId) ? params.projetoId[0] : (params.projetoId ?? '')
    const router = useRouter()
    const { toast } = useToast()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isTapReady, tarefas, setTarefas, prazoBase, prazoLimiteSuperior, bufferProjeto, isProjetoViavel, tenantId, dataBaseline, tap, nTarefasBaseline, setNTarefasBaseline, custosTarefas, setCustosTarefas } = useProject()
    const [isGenerating, setIsGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [error, setError] = useState('')
    const [isInferring, setIsInferring] = useState(false)
    const [fullscreenDiagram, setFullscreenDiagram] = useState<'pert' | 'gantt' | null>(null)
    const [activeTab, setActiveTab] = useState<'tabela' | 'pert' | 'gantt' | 'custos'>('tabela')
    const [custosEap, setCustosEap] = useState<Record<string, number>>({})
    const [eapGroups, setEapGroups] = useState<Map<string, string>>(new Map())
    // ── GanttLupa hover state (Stories 4.6–4.8) ──
    const [hoveredDay, setHoveredDay] = useState<number | null>(null)
    const [fixedDay, setFixedDay] = useState<number | null>(null)

    // Load EAP costs exported from EAP → Tabela de Custos
    useEffect(() => {
        if (!projetoId) return
        const stored = localStorage.getItem(`aura_eap_custos_${projetoId}`)
        if (stored) {
            try { setCustosEap(JSON.parse(stored)) } catch {}
        }
    }, [projetoId])
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [syncedFromWBS, setSyncedFromWBS] = useState(false)
    // ── EAP Export Notification Banner ──
    type EapBannerRow = { code: string; nome: string; duracao: number | null; custo: number | null; dependencias: string[] }
    const [eapBannerRows, setEapBannerRows] = useState<EapBannerRow[] | null>(null)
    const [showEapBannerDetail, setShowEapBannerDetail] = useState(false)
    useEffect(() => {
        if (!projetoId) return
        // B3: Skip banner if user previously dismissed it
        const dismissed = localStorage.getItem(`aura_eap_banner_dismissed_${projetoId}`)
        if (dismissed) return
        const stored = localStorage.getItem(`aura_eap_tabela_${projetoId}`)
        if (stored) {
            try {
                const rows = JSON.parse(stored) as EapBannerRow[]
                if (Array.isArray(rows) && rows.length > 0) setEapBannerRows(rows)
            } catch {}
        }
    }, [projetoId])

    const handleAcceptEapBanner = () => {
        if (!eapBannerRows) return
        const rev = new Map<string, string>()
        displayMap.forEach((display, real) => rev.set(display.toLowerCase(), real))
        tarefas.forEach(t => rev.set(t.id.toLowerCase(), t.id))
        eapBannerRows.filter(r => !tarefas.some(t =>
            (displayMap.get(t.id) || '').toLowerCase() === r.code.toLowerCase() ||
            t.id.toLowerCase() === r.code.toLowerCase()
        )).forEach(r => rev.set(r.code.toLowerCase(), r.code))
        const resolvePred = (c: string) => rev.get(c.toLowerCase()) || c
        let updated = [...tarefas]
        for (const row of eapBannerRows) {
            const existing = tarefas.find(t =>
                (displayMap.get(t.id) || '').toLowerCase() === row.code.toLowerCase() ||
                t.id.toLowerCase() === row.code.toLowerCase()
            )
            const preds = (row.dependencias || []).map(resolvePred)
            if (existing) {
                updated = updated.map(t => t.id !== existing.id ? t : {
                    ...t,
                    nome: row.nome || t.nome,
                    duracao_estimada: row.duracao && row.duracao > 0 ? row.duracao : t.duracao_estimada,
                    dependencias: preds.length > 0 ? preds : t.dependencias,
                    es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false
                })
            } else {
                updated.push({ id: row.code, nome: row.nome, duracao_estimada: row.duracao || 1, dependencias: preds, es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false })
            }
        }
        setTarefas(updated)
        setIsDirty(true); setSaveStatus('idle')
        setEapBannerRows(null)
        setShowEapBannerDetail(false)
    }

    const handleCopyEapTsv = () => {
        if (!eapBannerRows) return
        const header = 'Cód.\tNome\tDuração\tPredecessoras'
        const rows = eapBannerRows.map(r => `${r.code}\t${r.nome}\t${r.duracao ?? ''}\t${(r.dependencias || []).join(', ')}`)
        navigator.clipboard.writeText([header, ...rows].join('\n')).then(() => {
            setShowEapBannerDetail(false)
            setShowTableImport(true)
        })
    }

    // ── Importar Tabela CPM ──
    const [showTableImport, setShowTableImport] = useState(false)
    const importTextRef = useRef<HTMLTextAreaElement>(null)
    const importDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [hasImportText, setHasImportText] = useState(false)
    const [tableImportPreview, setTableImportPreview] = useState<Array<{
        code: string; nome: string; duracao: number; predecessoras: string[]
        es?: number; ef?: number; ls?: number; lf?: number; folga?: number
        critica?: boolean; custo?: number
        status: 'match' | 'new'; taskId?: string
    }> | null>(null)

    // ── Mobile detection (< 768px = md breakpoint) ──
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        setIsMobile(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const criticalPaths = useMemo(() => findAllCriticalPaths(tarefas), [tarefas])
    const displayMap = useMemo(() => buildDisplayMap(tarefas), [tarefas])
    const [selectedPathIndex, setSelectedPathIndex] = useState(0)
    // Reorder so selected path is always at index 0 (primary) for diagram components
    const orderedPaths = useMemo(() => {
        if (selectedPathIndex === 0 || criticalPaths.length === 0) return criticalPaths
        return [criticalPaths[selectedPathIndex], ...criticalPaths.filter((_, i) => i !== selectedPathIndex)]
    }, [criticalPaths, selectedPathIndex])
    const hasCPMData = tarefas.length > 0 && tarefas.some(t => t.ef > 0)
    // Hierarchical mode: all task IDs are EAP codes (e.g. "1.1.1")
    const isHierarchical = useMemo(
        () => tarefas.length > 0 && tarefas.every(t => /^\d+(?:\.\d+)+$/.test(t.id)),
        [tarefas]
    )

    const toggleGroup = (code: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(code)) next.delete(code)
            else next.add(code)
            return next
        })
    }

    // Empty State
    if (!isTapReady) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md shadow-xl">
                    <LayoutDashboard className="h-12 w-12 text-slate-500 mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-bold text-slate-200 mb-2">Aguardando TAP</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        A malha de tarefas do projeto requer o Termo de Abertura (TAP) preenchido para que a IA possa gerar o cronograma base.
                    </p>
                    <Link href={`/${projetoId}/setup/tap`} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
                        Ir para o TAP
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        )
    }

    const handleCalculateCPM = () => {
        setError('')
        try {
            // Validação: predecessoras devem referenciar IDs existentes
            const hasDeps = tarefas.some(t => (t.dependencias || []).length > 0)
            if (!hasDeps) {
                setError('Nenhuma predecessora definida. Use "Gerar Predecessoras" primeiro ou defina manualmente na coluna Pred.')
                return
            }

            // Resolve display IDs (T1.0, T01, etc.) to real IDs before calculation
            const dMap = buildDisplayMap(tarefas)
            const reverseDisplay = new Map<string, string>()
            dMap.forEach((display, real) => {
                reverseDisplay.set(display.toLowerCase(), real)
                reverseDisplay.set(display, real)
            })
            // Also map each real ID to itself
            tarefas.forEach(t => reverseDisplay.set(t.id, t.id))

            const resolved = tarefas.map(t => ({
                ...t,
                dependencias: (t.dependencias || []).map(d => reverseDisplay.get(d) || reverseDisplay.get(d.toLowerCase()) || d)
            }))

            // Cálculo local determinístico (forward + backward pass)
            const processed = calculateCPMLocal(resolved)

            // Validação
            const maxEF = Math.max(...processed.map(t => t.ef), 0)
            if (maxEF === 0) {
                const validIds = new Set(tarefas.map(t => t.id))
                const invalidDeps = resolved.flatMap(t => (t.dependencias || []).filter(d => !validIds.has(d)))
                setError(`Nenhum caminho válido. ${invalidDeps.length} predecessoras não resolvidas: ${invalidDeps.slice(0, 5).join(', ')}`)
                return
            }

            setTarefas(processed)
            setIsDirty(true)
            setSaveStatus('idle')
            setActiveTab('gantt')

            // Story 3.0-A: salvar caminho_critico_baseline_dias na primeira vez
            // REGRA: nunca sobrescrever se já preenchido (WHERE IS NULL)
            if (projetoId && maxEF > 0) {
                supabase
                    .from('projetos')
                    .update({ caminho_critico_baseline_dias: maxEF })
                    .eq('id', projetoId)
                    .is('caminho_critico_baseline_dias', null)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then(({ error }: { error: any }) => {
                        if (error) console.warn('[CPM] Falha ao salvar caminho_critico_baseline_dias:', error.message)
                        else console.info(`[CPM] caminho_critico_baseline_dias = ${maxEF} dias (baseline imutável registrado)`)
                    })
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(`Erro no cálculo CPM: ${err.message}`)
        }
    }

    const handleSyncFromWBS = async () => {
        setIsGenerating(true)
        setError('')
        try {
            const { data: nodes, error: eapError } = await supabase
                .from('eap_nodes')
                .select('*')
                .eq('projeto_id', projetoId)

            if (eapError) throw eapError
            if (!nodes || nodes.length === 0) throw new Error('EAP/WBS não encontrada ou vazia. Configure a EAP primeiro.')

            // Identify leaf nodes (nodes that are NOT a pai_id of any other node)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parentIds = new Set(nodes.map((n: any) => n.pai_id).filter(Boolean))
            // Determine minimum task nivel dynamically:
            // If the EAP has nodes at nivel >= 3 (3-level structure), tasks must be at nivel >= 3.
            // This prevents nivel-2 section headers from being imported when the EAP is deep.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const maxNivel = Math.max(...nodes.map((n: any) => n.nivel ?? 0), 0)
            const minTaskNivel = maxNivel >= 3 ? 3 : 2
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const leafNodes = nodes.filter((n: any) =>
                !parentIds.has(n.id) &&
                (n.nivel == null || n.nivel >= minTaskNivel)
            )

            if (leafNodes.length === 0) throw new Error('Nenhum pacote de trabalho (nível folha) encontrado na EAP.')

            // Extract EAP codes from node names or build hierarchical IDs
            // Group leaves by parent for fallback numbering
            const parentGroups = new Map<string, typeof leafNodes>()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            leafNodes.forEach((leaf: any) => {
                const pid = leaf.pai_id || 'root'
                if (!parentGroups.has(pid)) parentGroups.set(pid, [])
                parentGroups.get(pid)!.push(leaf)
            })
            const parentOrder = Array.from(parentGroups.keys())

            // Pré-passo: constrói mapa nodeUUID → T-code para resolver deps na segunda passagem
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nodeToTaskId = new Map<string, string>()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            leafNodes.forEach((leaf: any) => {
                const code = extractEapCode(leaf.nome)
                if (code) { nodeToTaskId.set(leaf.id, code); return }
                const pid = leaf.pai_id || 'root'
                const parentIdx = parentOrder.indexOf(pid) + 1
                const siblings = parentGroups.get(pid)!
                const childIdx = siblings.indexOf(leaf)
                nodeToTaskId.set(leaf.id, `T${parentIdx}.${childIdx}`)
            })

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newTarefas = leafNodes.map((leaf: any) => {
                // Try to extract EAP code from nome (e.g. "1.1.1 Licenciamento...")
                const eapCode = extractEapCode(leaf.nome)
                const rawNome = eapCode ? leaf.nome.slice(leaf.nome.indexOf(' ') + 1).trim() : leaf.nome
                const cleanNome = sanitizeTaskName(rawNome)

                // Use EAP code if available, otherwise generate T{parent}.{child}
                const taskId = nodeToTaskId.get(leaf.id)!

                // Busca tarefa existente por UUID (WBS page salva com id=nodeId) ou por nome
                const existing = tarefas.find(t => t.id === leaf.id)
                    || tarefas.find(t => t.nome === cleanNome || t.nome === leaf.nome)

                // Converte predecessoras UUID → T-code usando o mapa pré-computado
                const resolvedDeps = existing
                    ? (existing.dependencias || []).map((d: string) => nodeToTaskId.get(d) || d)
                    : []

                return {
                    id: taskId,
                    nome: cleanNome,
                    duracao_estimada: existing ? existing.duracao_estimada : (leaf.duracao ?? 1),
                    dependencias: resolvedDeps,
                    es: existing?.es ?? 0,
                    ef: existing?.ef ?? 0,
                    ls: existing?.ls ?? 0,
                    lf: existing?.lf ?? 0,
                    folga: existing?.folga ?? 0,
                    critica: existing?.critica ?? false
                }
            })

            // Build group names map from non-leaf EAP nodes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const leafIds = new Set(leafNodes.map((n: any) => n.id))
            const groupMap = new Map<string, string>()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodes.filter((n: any) => !leafIds.has(n.id)).forEach((n: any) => {
                const code = extractEapCode(n.nome)
                if (code) {
                    const name = n.nome.slice(n.nome.indexOf(' ') + 1).trim()
                    groupMap.set(code, name)
                }
            })
            setEapGroups(groupMap)
            setCollapsedGroups(new Set()) // reset collapsed state on resync

            setTarefas(newTarefas)
            setSyncedFromWBS(true)
            setIsDirty(true)
            // eslint-disable-next-line react-hooks/rules-of-hooks
            setSaveStatus('idle')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsGenerating(false)
        }
    }
// eslint-disable-next-line react-hooks/rules-of-hooks

    // ── Resolve predecessoras digitadas (vírgula, ponto-vírgula, espaço) ──
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const resolveDepsFromInput = useCallback((raw: string): string[] => {
        const reverseMap = new Map<string, string>()
        displayMap.forEach((display, real) => reverseMap.set(display.toLowerCase(), real))
        tarefas.forEach(t => reverseMap.set(t.id.toLowerCase(), t.id))
        return raw.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0)
            .map(s => reverseMap.get(s.toLowerCase()) || s)
    }, [displayMap, tarefas])

    // ── Parser de tabela CPM (TSV | Markdown | espaço-alinhado | WBS simples) ──
    const parseCPMTable = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        if (lines.length < 1) return null
        const isPipe = lines.filter(l => l.includes('|')).length > lines.length / 2
        const isTSV = lines.filter(l => l.includes('\t')).length > lines.length / 2
        const isSpaceAligned = !isPipe && !isTSV &&
            lines.filter(l => /\S+\s{2,}\S+/.test(l)).length >= Math.max(1, lines.length * 0.4)
        let header: string[] = []
        let dataRows: string[][] = []
        if (isPipe) {
            const isSepRow = (l: string) => l.includes('|') && l.split('|').every(cell => /^[\s\-:=]*$/.test(cell))
            const valid = lines.filter(l => !isSepRow(l))
            if (valid.length < 2) return null
            const split = (l: string) => l.split('|').map(c => c.trim()).filter(Boolean)
            header = split(valid[0]); dataRows = valid.slice(1).map(split).filter(r => r.length > 0)
        } else if (isTSV) {
            const split = (l: string) => l.split('\t').map(c => c.trim())
            header = split(lines[0]); dataRows = lines.slice(1).map(split)
        } else if (isSpaceAligned) {
            const split = (l: string) => l.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
            header = split(lines[0]); dataRows = lines.slice(1).map(split).filter(r => r.length > 0)
        } else {
            // WBS simples: "T01  Nome da Tarefa  365  T02, T03"
            const wbsRe = /^(T\d+)\s{2,}(.+?)\s{2,}(\d+)\s*(?:d|dias?)?\s*(?:\s{2,}(.*))?$/i
            const parsed = lines.map(l => { const m = l.match(wbsRe); return m ? [m[1], m[2].trim(), m[3], (m[4] || '').trim()] : null }).filter(Boolean) as string[][]
            if (parsed.length === 0) return null
            header = ['Cód.', 'Nome', 'Duração', 'Predecessoras']; dataRows = parsed
        }
        const h = header.map(s => s.toLowerCase().trim())
        const codeIdx  = h.findIndex(s => /c[oó]d|^id$|^code|^t\d|^n[°º]|^num|^#/.test(s))
        const nomeIdx  = h.findIndex(s => /nome|task|tarefa|pacote|atividade|descri|work/.test(s))
        const durIdx   = h.findIndex(s => /dur|dias|days|tempo|prazo|meses/.test(s))
        const predIdx  = h.findIndex(s => /pred|depend|anterior|requisit/.test(s))
        const custoIdx = h.findIndex(s => /custo|cost|valor|budget|r\$/.test(s))
        const esIdx    = h.findIndex(s => /^es$/.test(s))
        const efIdx    = h.findIndex(s => /^ef$/.test(s))
        const lsIdx    = h.findIndex(s => /^ls$/.test(s))
        const lfIdx    = h.findIndex(s => /^lf$/.test(s))
        const folgaIdx = h.findIndex(s => /^folga$|^float$|^slack$/.test(s))
        const critIdx  = h.findIndex(s => /cr[ií]t|🔴|critica|critical/.test(s))
        const parseCusto = (v: string) => parseFloat((v ?? '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
        const parseCPMVal = (v: string | undefined) => { const n = parseInt((v ?? '').replace(/[^\d-]/g, '')); return isNaN(n) ? undefined : n }
        const parseCritica = (v: string | undefined) => v != null && /✓|true|sim|yes|1|x/i.test(v.trim())
        const rCode = codeIdx >= 0 ? codeIdx : 0
        const rNome = nomeIdx >= 0 ? nomeIdx : (rCode === 0 ? 1 : 0)
        return dataRows
            .filter(row => row[rCode]?.trim() && row[rNome]?.trim())
            .map(row => ({
                code: row[rCode].trim(),
                nome: row[rNome].trim(),
                duracao: durIdx >= 0 ? (parseInt(row[durIdx]) || 0) : 0,
                predecessoras: predIdx >= 0 && row[predIdx]?.trim() && !/^[-—]$/.test(row[predIdx].trim())
                    ? row[predIdx].split(/[,;\s]+/).map(d => d.trim()).filter(Boolean)
                    : [],
                custo:   custoIdx >= 0 ? parseCusto(row[custoIdx]) : undefined,
                es:      esIdx    >= 0 ? parseCPMVal(row[esIdx])    : undefined,
                ef:      efIdx    >= 0 ? parseCPMVal(row[efIdx])    : undefined,
                ls:      lsIdx    >= 0 ? parseCPMVal(row[lsIdx])    : undefined,
                lf:      lfIdx    >= 0 ? parseCPMVal(row[lfIdx])    : undefined,
                folga:   folgaIdx >= 0 ? parseCPMVal(row[folgaIdx]) : undefined,
                critica: critIdx  >= 0 ? parseCritica(row[critIdx]) : undefined,
            }))
    }

    const handleProcessCPMTable = () => {
        const text = importTextRef.current?.value ?? ''
        const parsed = parseCPMTable(text)
        if (!parsed || parsed.length === 0) {
            setError('Formato não reconhecido. Use TSV (tab), Markdown (|), colunas separadas por 2+ espaços, ou CSV.')
            return
        }
        setError('')
        const preview = parsed.map(row => {
            const existing = tarefas.find(t =>
                (displayMap.get(t.id) || '').toLowerCase() === row.code.toLowerCase() ||
                t.id.toLowerCase() === row.code.toLowerCase()
            )
            return { ...row, status: existing ? 'match' as const : 'new' as const, taskId: existing?.id }
        })
        setTableImportPreview(preview)
    }

    const handleConfirmCPMImport = () => {
        if (!tableImportPreview) return
        // Build reverse map for predecessor resolution
        const rev = new Map<string, string>()
        displayMap.forEach((display, real) => rev.set(display.toLowerCase(), real))
        tarefas.forEach(t => rev.set(t.id.toLowerCase(), t.id))
        // Pre-register new IDs so cross-references resolve
        tableImportPreview.filter(r => r.status === 'new').forEach(r => rev.set(r.code.toLowerCase(), r.code))
        const resolvePred = (code: string) => rev.get(code.toLowerCase()) || code

        let updated = [...tarefas]
        for (const row of tableImportPreview) {
            const preds = row.predecessoras.map(resolvePred)
            if (row.status === 'match' && row.taskId) {
                updated = updated.map(t => t.id !== row.taskId ? t : {
                    ...t,
                    duracao_estimada: row.duracao > 0 ? row.duracao : t.duracao_estimada,
                    dependencias: preds,
                    es:      row.es      ?? t.es      ?? 0,
                    ef:      row.ef      ?? t.ef      ?? 0,
                    ls:      row.ls      ?? t.ls      ?? 0,
                    lf:      row.lf      ?? t.lf      ?? 0,
                    folga:   row.folga   ?? t.folga   ?? 0,
                    critica: row.critica ?? t.critica ?? false,
                })
            } else if (row.status === 'new') {
                updated.push({
                    id: row.code, nome: row.nome,
                    duracao_estimada: row.duracao || 1,
                    dependencias: preds,
                    es:      row.es      ?? 0,
                    ef:      row.ef      ?? 0,
                    ls:      row.ls      ?? 0,
                    lf:      row.lf      ?? 0,
                    folga:   row.folga   ?? 0,
                    critica: row.critica ?? false,
                })
            }
        }
        setTarefas(updated)

        // Propaga custos importados para custosTarefas (contexto de orçamento)
        const custosComImport = tableImportPreview.reduce((acc, row) => {
            const taskId = row.taskId ?? row.code
            if (row.custo != null && row.custo > 0) acc[taskId] = row.custo
            return acc
        }, { ...custosTarefas })
        if (tableImportPreview.some(r => r.custo != null && r.custo > 0)) {
            setCustosTarefas(custosComImport)
        }

        setIsDirty(true); setSaveStatus('idle')
        setTableImportPreview(null)
        setShowTableImport(false)
        if (importTextRef.current) importTextRef.current.value = ''
        setHasImportText(false)
        const m = tableImportPreview.filter(r => r.status === 'match').length
        const n = tableImportPreview.filter(r => r.status === 'new').length
        setError('')
        // brief status
        setSaveStatus('idle')
        toast({ variant: 'success', message: `Importação concluída: ${m} tarefa(s) atualizada(s), ${n} nova(s). Clique "Gerar Diagramas" para recalcular o CPM.` })
    }

    const handleGeneratePredecessors = async () => {
        setIsInferring(true)
        setError('')
        try {
            // Fetch EAP nodes for context
            const { data: eapNodes } = await supabase
                .from('eap_nodes')
                .select('id, nome, pai_id, nivel')
                .eq('projeto_id', projetoId)

            // Use EAP code if available as the identifier sent to AI
            const dMap = buildDisplayMap(tarefas)
            // Reload costs from localStorage (may have been exported after page load)
            const storedCustos = localStorage.getItem(`aura_eap_custos_${projetoId}`)
            const custosSnapshot: Record<string, number> = storedCustos ? JSON.parse(storedCustos) : {}
            if (Object.keys(custosSnapshot).length > 0) setCustosEap(custosSnapshot)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = {
                tarefas: tarefas.map((t, i) => ({
                    id: t.id,
                    displayId: dMap.get(t.id) || `T${String(i + 1).padStart(2, '0')}`,
                    nome: t.nome,
                    duracao: t.duracao_estimada,
                    ...(custosSnapshot[t.id] ? { custo: custosSnapshot[t.id] } : {})
                }))
            }
            if (eapNodes && eapNodes.length > 0) {
                payload.eapNodes = eapNodes
            }

            // Add imported table deps as hard constraints for AI
            const storedTable = localStorage.getItem(`aura_eap_tabela_${projetoId}`)
            if (storedTable) {
                try {
                    const tableRows = JSON.parse(storedTable)
                    payload.tabelaImportada = tableRows.map((r: { code: string; nome: string; dependencias: string[] }) => ({
                        code: r.code, nome: r.nome, dependencias: r.dependencias
                    }))
                    payload.instrucaoTabela = 'Os dados em tabelaImportada são restrições RÍGIDAS do projeto. Respeite-as como constraints ao inferir predecessoras nos níveis de detalhe.'
                } catch {}
            }

            const res = await authFetch('/api/ai/predecessors', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

            const text = await res.text()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let data: any
            try {
                data = JSON.parse(text)
            } catch {
                throw new Error(`Resposta inválida da API: ${text.slice(0, 200)}`)
            }
            if (!res.ok) throw new Error(data.error || `Erro ${res.status}: ${text.slice(0, 200)}`)

            if (data.tarefasComPredecessoras) {
                const predMap = new Map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data.tarefasComPredecessoras.map((p: any) => [p.id, p.predecessoras || []])
                )
                const updated = tarefas.map(t => ({
                    ...t,
                    dependencias: (predMap.get(t.id) as string[]) || t.dependencias || [],
                    // Reset CPM values since dependencies changed
                    es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false
                }))
                setTarefas(updated)
                setIsDirty(true)
                setSaveStatus('idle')
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsInferring(false)
        }
    }

    const handleSaveCPM = async () => {
        if (!tenantId) {
            toast({ variant: 'warning', message: 'Aguardando inicialização do ambiente... Tente novamente.' })
            return
        }
        setSaving(true)
        try {
            const { error: delError } = await supabase.from('tarefas').delete().eq('projeto_id', projetoId)
            if (delError) throw delError

                // B2 Fix: EAP code IDs (short) → proper UUIDs before save.
            // Builds a consistent ID map so predecessoras references are also updated.
            // Without this, after reload: task.id = UUID but predecessoras = EAP code → PERT arrows missing.
            const isUUIDFormat = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
            const idMap = new Map<string, string>()
            tarefas.forEach(t => {
                idMap.set(t.id, isUUIDFormat(t.id) ? t.id : crypto.randomUUID())
            })

            const resolveToUUID = (d: string): string | null => {
                if (idMap.has(d)) return idMap.get(d)!
                const withT = /^[Tt]/.test(d) ? d : `T${d}`
                if (idMap.has(withT)) return idMap.get(withT)!
                const withoutT = /^[Tt]/.test(d) ? d.slice(1) : d
                if (idMap.has(withoutT)) return idMap.get(withoutT)!
                return null
            }

            const { error: tError } = await supabase.from('tarefas').insert(
                tarefas.map((t, idx) => {
                    const resolvedPreds = (t.dependencias || []).map(resolveToUUID).filter(Boolean) as string[]
                    const row: Record<string, unknown> = {
                        id: idMap.get(t.id)!,
                        projeto_id: projetoId,
                        tenant_id: tenantId,
                        nome: t.nome,
                        ordem: idx + 1,
                        duracao_estimada: t.duracao_estimada,
                        es: t.es,
                        ef: t.ef,
                        ls: t.ls,
                        lf: t.lf,
                        folga_total: t.folga,
                        no_caminho_critico: t.critica,
                        status: 'planejado'
                    }
                    if (resolvedPreds.length > 0) row.predecessoras = resolvedPreds
                    return row
                })
            )
            if (tError) throw tError

            // Sync in-memory tarefas with resolved UUIDs so PERT/Gantt stay consistent after save
            const hasIdChanges = tarefas.some(t => idMap.get(t.id) !== t.id)
            if (hasIdChanges) {
                setTarefas(tarefas.map(t => ({
                    ...t,
                    id: idMap.get(t.id) || t.id,
                    dependencias: (t.dependencias || []).map(d => idMap.get(d) || d)
                })))
            }

            // M1 — Registrar baseline de escopo no PRIMEIRO save (imutável após isso)
            // Q1: baseline = contagem de tarefas no momento inicial do CPM
            if (nTarefasBaseline === null && tarefas.length > 0) {
                const { error: bError } = await supabase
                    .from('projetos')
                    .update({
                        n_tarefas_baseline: tarefas.length,
                        data_baseline_escopo: new Date().toISOString(),
                    })
                    .eq('id', projetoId)
                if (!bError) {
                    setNTarefasBaseline(tarefas.length)
                    // Dispara a criação da versão inicial (TM = 1, 1, 1 no baseline)
                    try {
                        await criarVersaoInicial(projetoId, 1, 1, 1)
                        console.info('[M1] Versão inicial do TM (v1) registrada com sucesso.')
                    } catch (vErr) {
                        console.warn('[M1] Falha silenciosa ao registrar v1 do TM:', vErr)
                    }
                } else {
                    console.warn('[M1] Falha ao registrar baseline de escopo:', bError)
                }
            }

            setIsDirty(false)
            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 3000)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setSaveStatus('error')
            toast({ variant: 'error', message: 'Erro ao salvar: ' + err.message })
        } finally {
            setSaving(false)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getInputClass = (val: any) => {
        const base = "w-full bg-transparent border-none focus:outline-none transition-all duration-300 rounded px-2 py-1 "
        if (!val || (typeof val === 'string' && val.trim() === '')) return base + "text-slate-500 italic"
        if (isDirty) return base + "text-amber-400 bg-amber-500/5 focus:ring-1 focus:ring-amber-500/30"
        return base + "text-emerald-400 focus:ring-1 focus:ring-emerald-500/30"
    }

    const addTarefa = () => {
        // Find next available group level
        const existingLevels = tarefas.map(t => {
            const match = t.id.match(/^T(\d+)\./)
            return match ? parseInt(match[1]) : 0
        })
        const maxLevel = Math.max(...existingLevels, 0)
        const nextId = `T${maxLevel + 1}.0`
        setTarefas([...tarefas, { id: nextId, nome: 'Nova Tarefa', duracao_estimada: 1, dependencias: [], es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false }])
        setIsDirty(true)
        setSaveStatus('idle')
    }

    const applyLayer1Predecessors = () => {
        const stored = localStorage.getItem(`aura_eap_tabela_${projetoId}`)
        if (!stored) {
            setError('Nenhuma tabela importada na EAP. Acesse EAP → Tabela de Custos, importe e clique "Exportar para CPM".')
            return
        }
        let tableRows: Array<{ code: string; nome: string; duracao: number | null; custo: number | null; dependencias: string[] }>
        try { tableRows = JSON.parse(stored) } catch { setError('Erro ao ler dados da tabela.'); return }

        // Build code → sorted task IDs mapping
        const codeToTasks = new Map<string, string[]>()
        for (const row of tableRows) {
            const matching = tarefas.filter(t => {
                const dc = displayMap.get(t.id) || ''
                return dc === row.code || dc.startsWith(row.code + '.')
            })
            if (matching.length > 0) {
                const sorted = [...matching].sort((a, b) =>
                    (displayMap.get(a.id) || '').localeCompare(displayMap.get(b.id) || '', undefined, { numeric: true })
                )
                codeToTasks.set(row.code, sorted.map(t => t.id))
            }
        }

        const newDeps = new Map<string, string[]>()
        tarefas.forEach(t => newDeps.set(t.id, []))

        // Rule A: sequential within group
        codeToTasks.forEach((taskIds) => {
            for (let i = 1; i < taskIds.length; i++) {
                const deps = newDeps.get(taskIds[i]) || []
                if (!deps.includes(taskIds[i - 1])) deps.push(taskIds[i - 1])
                newDeps.set(taskIds[i], deps)
            }
        })

        // Rule B: cross-group — first(A) → last(B) for each A depends on B
        for (const row of tableRows) {
            for (const depCode of row.dependencias) {
                const sucIds = codeToTasks.get(row.code)
                const preIds = codeToTasks.get(depCode)
                if (!sucIds?.length || !preIds?.length) continue
                const deps = newDeps.get(sucIds[0]) || []
                if (!deps.includes(preIds[preIds.length - 1])) deps.push(preIds[preIds.length - 1])
                newDeps.set(sucIds[0], deps)
            }
        }

        const totalDeps = Array.from(newDeps.values()).reduce((s, d) => s + d.length, 0)
        if (totalDeps === 0) {
            setError('Não foi possível mapear códigos da tabela para as tarefas. Sincronize a EAP (Sinc. WBS) antes de aplicar.')
            return
        }

        setTarefas(tarefas.map(t => ({
            ...t,
            dependencias: newDeps.get(t.id) || [],
            es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false
        })))
        setIsDirty(true)
        setSaveStatus('idle')
        setError('')
    }

    const removeTarefa = (id: string) => {
        if (confirmDeleteId !== id) {
            // First click: enter confirm state, auto-reset after 2.5s
            setConfirmDeleteId(id)
            setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 2500)
            return
        }
        // Second click: confirmed — delete task + clean up its ID from all dependencias
        setConfirmDeleteId(null)
        const filtered = tarefas
            .filter(t => t.id !== id)
            .map(t => ({
                ...t,
                dependencias: (t.dependencias || []).filter(d => d !== id)
            }))
        // Auto-recalculate CPM if it was previously computed and deps still exist
        const wasCalculated = tarefas.some(t => t.ef > 0)
        const hasDepsLeft = filtered.some(t => (t.dependencias || []).length > 0)
        if (wasCalculated && filtered.length > 0 && hasDepsLeft) {
            setTarefas(calculateCPMLocal(filtered))
        } else {
            setTarefas(filtered)
        }
        setIsDirty(true)
        setSaveStatus('idle')
    }

    const updateTarefa = (id: string, field: string, value: string | number) => {
        setTarefas(tarefas.map(t => t.id === id ? { ...t, [field]: value } : t))
        setIsDirty(true)
        setSaveStatus('idle')
    }

    return (
        <div className="p-8 w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            <header className="mb-8 flex flex-col gap-4">
                <div>
                    <div className="flex items-center gap-3 text-blue-500 mb-2">
                        <LayoutDashboard className="h-6 w-6" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Setup</h2>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-50">Tarefas & Caminho Crítico (CPM)</h1>
                    <p className="text-slate-400 mt-2">
                        Definição do escopo, precedências automáticas e cálculo do Vértice de Prazo (PMBOK).
                    </p>
                    {/* M1 — Badge de scope creep geométrico (Lado E do triângulo CDT) */}
                    {nTarefasBaseline !== null && tarefas.length > 0 && (() => {
                        const ratio = tarefas.length / nTarefasBaseline
                        const pct = Math.round((ratio - 1) * 100)
                        const isCreep = ratio > 1.05
                        const isReduced = ratio < 0.9
                        if (!isCreep && !isReduced) return (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Escopo E = {ratio.toFixed(2)} — baseline: {nTarefasBaseline} tarefas
                            </div>
                        )
                        if (isCreep) return (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1" title="Scope creep detectado — triângulo CDT usará E > 1.0">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                ⚠ Scope Creep +{pct}% — E = {ratio.toFixed(2)} (baseline: {nTarefasBaseline} tarefas)
                            </div>
                        )
                        return (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 py-1" title="Escopo reduzido — triângulo CDT usará E < 1.0 (clampado em 0.5)">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                Escopo Reduzido {pct}% — E = {Math.max(ratio, 0.5).toFixed(2)} (baseline: {nTarefasBaseline} tarefas)
                            </div>
                        )
                    })()}
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSyncFromWBS}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-5 py-3 rounded-xl font-bold transition-all border border-slate-700 shadow-lg text-sm"
                        title="Importar pacotes de nível folha da EAP/WBS"
                    >
                        <Layers className="h-5 w-5 text-emerald-400" />
                        Sinc. WBS
                    </button>

                    <button
                        onClick={applyLayer1Predecessors}
                        disabled={isInferring || isGenerating || tarefas.length === 0}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 shadow-lg text-sm"
                        title="Aplica predecessoras determinísticas da tabela importada na EAP (Camada 1 — sem IA)"
                    >
                        <Lock className="h-5 w-5 text-amber-400" />
                        Predecessoras da Tabela
                    </button>

                    <button
                        onClick={handleGeneratePredecessors}
                        disabled={isInferring || isGenerating || tarefas.length === 0}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500 shadow-lg shadow-purple-500/20 text-sm"
                        title="IA analisa os nomes das tarefas e a EAP para inferir predecessoras automaticamente"
                    >
                        {isInferring ? (
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Sparkles className="h-5 w-5" />
                        )}
                        {isInferring ? 'Inferindo...' : 'Gerar Predecessoras'}
                    </button>

                    <button
                        onClick={() => { setShowTableImport(v => !v); setTableImportPreview(null) }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all border shadow-lg text-sm ${showTableImport ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'}`}
                        title="Colar tabela com Cód, Nome, Duração e Predecessoras para importar em massa"
                    >
                        <Upload className="h-5 w-5 text-amber-400" />
                        Importar Tabela
                    </button>

                    <button
                        onClick={handleCalculateCPM}
                        disabled={isInferring || tarefas.length === 0}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 min-h-[48px] rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500 shadow-lg text-sm cursor-pointer"
                    >
                        <BarChart3 className="h-5 w-5" />
                        Gerar Diagramas
                    </button>

                    <button
                        onClick={handleSaveCPM}
                        disabled={saving || tarefas.length === 0}
                        className={`flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-xl font-bold transition-colors border shadow-lg text-sm cursor-pointer ${
                            saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
                            saveStatus === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
                            isDirty ? 'bg-amber-600 border-amber-500 text-white' :
                            'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                        }`}
                    >
                        {saving ? (
                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : saveStatus === 'success' ? (
                            <Clock className="h-5 w-5" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {saving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : isDirty ? 'Confirmar' : 'Salvar'}
                    </button>

                    <button
                        onClick={async () => {
                            if (isDirty) await handleSaveCPM()
                            router.push(`/${projetoId}/setup/orcamento`)
                        }}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 min-h-[48px] bg-slate-200 hover:bg-white text-slate-900 rounded-xl font-bold transition-colors shadow-lg text-sm cursor-pointer"
                    >
                        Seguinte <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* EAP Export Banner */}
            {eapBannerRows && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-300">
                    {/* Header — always visible */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                            </span>
                            <span className="text-sm font-semibold text-amber-300">Exportação EAP disponível</span>
                            <span className="text-[10px] text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5">{eapBannerRows.length} tarefas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowEapBannerDetail(v => !v)}
                                className="text-xs text-amber-400 hover:text-amber-200 flex items-center gap-1 transition-colors"
                            >
                                {showEapBannerDetail ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {showEapBannerDetail ? 'Fechar' : 'Revisar'}
                            </button>
                            <button
                                onClick={() => {
                                    if (projetoId) localStorage.setItem(`aura_eap_banner_dismissed_${projetoId}`, '1')
                                    setEapBannerRows(null)
                                    setShowEapBannerDetail(false)
                                }}
                                className="text-slate-500 hover:text-white transition-colors"
                                title="Dispensar notificação"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {/* Detail panel */}
                    {showEapBannerDetail && (
                        <div className="border-t border-amber-500/20 px-4 pb-4 pt-3 space-y-3 animate-in fade-in duration-200">
                            <p className="text-[10px] text-slate-400">
                                Dados exportados da EAP. Verifique, edite ou exclua linhas antes de aceitar. Campos editáveis: nome, duração, predecessoras.
                            </p>
                            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-700 divide-y divide-slate-800">
                                {/* Header row */}
                                <div className="grid grid-cols-[60px_1fr_70px_120px_36px] gap-2 px-3 py-1.5 bg-slate-900 text-[10px] font-bold text-slate-500 uppercase">
                                    <span>Cód</span><span>Nome</span><span>Dur (d)</span><span>Predecessoras</span><span />
                                </div>
                                {eapBannerRows.map((row, i) => (
                                    <div key={i} className="grid grid-cols-[60px_1fr_70px_120px_36px] gap-2 px-3 py-1.5 items-center bg-slate-950 hover:bg-slate-900/60 transition-colors">
                                        <span className="font-mono text-[11px] text-slate-400">{row.code}</span>
                                        <input
                                            defaultValue={row.nome}
                                            onBlur={e => setEapBannerRows(rows => rows ? rows.map((r, j) => j === i ? { ...r, nome: e.target.value } : r) : rows)}
                                            className="w-full bg-transparent border-none text-xs text-slate-200 focus:outline-none focus:bg-slate-800 rounded px-1"
                                        />
                                        <input
                                            type="number"
                                            defaultValue={row.duracao ?? ''}
                                            onBlur={e => setEapBannerRows(rows => rows ? rows.map((r, j) => j === i ? { ...r, duracao: parseInt(e.target.value) || null } : r) : rows)}
                                            className="w-full bg-transparent border-none text-xs text-slate-200 font-mono focus:outline-none focus:bg-slate-800 rounded px-1"
                                        />
                                        <input
                                            defaultValue={(row.dependencias || []).join(', ')}
                                            onBlur={e => setEapBannerRows(rows => rows ? rows.map((r, j) => j === i ? { ...r, dependencias: e.target.value.split(/[,;]+/).map(s => s.trim()).filter(Boolean) } : r) : rows)}
                                            className="w-full bg-transparent border-none text-xs text-indigo-300 font-mono focus:outline-none focus:bg-slate-800 rounded px-1"
                                            placeholder="—"
                                        />
                                        <button
                                            onClick={() => setEapBannerRows(rows => rows ? rows.filter((_, j) => j !== i) : rows)}
                                            className="text-slate-600 hover:text-rose-400 transition-colors flex items-center justify-center"
                                            title="Remover linha"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleAcceptEapBanner}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Aceitar
                                </button>
                                <button
                                    onClick={handleCopyEapTsv}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-colors"
                                    title="Copia como TSV e abre o painel Importar Tabela para colar e processar"
                                >
                                    <Upload className="h-3.5 w-3.5" /> Copiar TSV → Importar Tabela
                                </button>
                                <button
                                    onClick={() => { setEapBannerRows(null); setShowEapBannerDetail(false) }}
                                    className="text-xs text-slate-500 hover:text-slate-300 px-3 py-2 transition-colors"
                                >
                                    Recusar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Caminho Crítico</div>
                    <div className="text-3xl font-bold text-blue-400 font-mono">{prazoBase || 0}<span className="text-sm text-slate-500 ml-1">dias</span></div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tarefas</div>
                    <div className="text-3xl font-bold text-indigo-400 font-mono">{tarefas.length}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Críticas</div>
                    <div className="text-3xl font-bold text-rose-400 font-mono">{tarefas.filter(t => t.ef > 0 && t.folga === 0).length}</div>
                </div>
                <div className={`bg-slate-900 border rounded-xl p-4 relative overflow-hidden ${isProjetoViavel === false ? 'border-rose-500/30' : 'border-slate-800'}`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${bufferProjeto !== null && bufferProjeto >= 0 ? 'bg-emerald-500' : bufferProjeto !== null ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Buffer (TOC)</div>
                    <div className={`text-3xl font-bold font-mono ${bufferProjeto !== null && bufferProjeto >= 0 ? 'text-emerald-400' : bufferProjeto !== null ? 'text-rose-400' : 'text-amber-400'}`}>
                        {bufferProjeto !== null ? `${bufferProjeto}d` : '—'}
                    </div>
                    {isProjetoViavel === false && <div className="text-[9px] text-rose-400 mt-1">CPM &gt; Baseline</div>}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                {([
                    { id: 'tabela' as const, label: 'Tabela', icon: Layers },
                    { id: 'gantt' as const, label: 'Gantt', icon: BarChart3 },
                    { id: 'pert' as const, label: 'Rede PERT', icon: GitMerge },
                    { id: 'custos' as const, label: 'Custos', icon: DollarSign },
                ]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); if (tab.id !== 'tabela' && !hasCPMData) handleCalculateCPM() }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            activeTab === tab.id ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">

                {/* ═══ TAB: TABELA ═══ */}
                {activeTab === 'tabela' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <span className="text-sm font-semibold text-slate-300">Malha de Tarefas ({tarefas.length})</span>
                            <div className="flex items-center gap-2">
                                {isDirty && (
                                    <button
                                        onClick={handleSaveCPM}
                                        disabled={saving}
                                        className="text-xs flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors border border-amber-500 cursor-pointer font-bold"
                                        title="Salva predecessoras e durações editadas manualmente sem precisar recalcular CPM"
                                    >
                                        <Save className="h-3 w-3" /> Salvar Predecessoras
                                    </button>
                                )}
                                <button onClick={addTarefa} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-slate-700 cursor-pointer">
                                    <Plus className="h-3 w-3" /> Adicionar
                                </button>
                            </div>
                        </div>
                        {/* ── Painel Importar Tabela ── */}
                        {showTableImport && (
                            <div className="border-b border-amber-500/20 bg-amber-950/10 p-4 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Importar Tabela de Tarefas</p>
                                    <button onClick={() => { setShowTableImport(false); setTableImportPreview(null) }} className="text-slate-500 hover:text-white transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                                </div>
                                <p className="text-[10px] text-slate-500">Cole qualquer tabela com colunas: <span className="text-slate-300 font-mono">Cód · Nome · Duração (d) · Predecessoras</span>. Aceita TSV (tab), Markdown (|) ou espaços como separador.</p>
                                <textarea
                                    ref={importTextRef}
                                    defaultValue=""
                                    onChange={() => {
                                        if (importDebounceRef.current) clearTimeout(importDebounceRef.current)
                                        importDebounceRef.current = setTimeout(() => {
                                            setHasImportText((importTextRef.current?.value.trim().length ?? 0) >= 5)
                                        }, 150)
                                    }}
                                    placeholder={"Cód.\tNome\tDuração\tPredecessoras\nT01\tLicenciamento Ambiental\t546\t-\nT02\tPermissões Municipais\t365\tT01\n..."}
                                    className="w-full h-36 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 placeholder-slate-600 outline-none focus:border-amber-500 resize-y"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={!hasImportText}
                                        onClick={handleProcessCPMTable}
                                        className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Processar
                                    </button>
                                    {tableImportPreview && (
                                        <span className="text-[10px] text-slate-400">
                                            {tableImportPreview.filter(r => r.status === 'match').length} match · {tableImportPreview.filter(r => r.status === 'new').length} novo(s)
                                        </span>
                                    )}
                                </div>
                                {/* Preview */}
                                {tableImportPreview && (
                                    <div className="space-y-2">
                                        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700 divide-y divide-slate-800">
                                            {tableImportPreview.map((row, i) => (
                                                <div key={i} className={`flex items-center gap-3 px-3 py-2 text-xs ${row.status === 'match' ? 'bg-emerald-950/20' : 'bg-blue-950/20'}`}>
                                                    {row.status === 'match'
                                                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                                        : <AlertCircle className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                                                    <span className="font-mono text-slate-400 w-10 shrink-0">{row.code}</span>
                                                    <span className="flex-1 text-slate-200 truncate">{row.nome}</span>
                                                    <span className="font-mono text-slate-500 shrink-0">{row.duracao}d</span>
                                                    <span className="font-mono text-indigo-400 shrink-0 text-[10px]">{row.predecessoras.join(', ') || '—'}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${row.status === 'match' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                        {row.status === 'match' ? 'atualizar' : 'novo'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleConfirmCPMImport}
                                            className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                                        >
                                            Confirmar Importação ({tableImportPreview.length} tarefas)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* WBS sync disclaimer */}
                        {syncedFromWBS && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/20 text-[11px] text-amber-400/80">
                                <span className="shrink-0 text-amber-400 font-bold mt-0.5">⚠</span>
                                <span>
                                    Importados apenas os <strong>nós folha</strong> da EAP (pacotes de trabalho). Se algum título de seção foi incluído indevidamente, use o botão <Trash2 className="inline h-3 w-3 mx-0.5" /> para removê-lo — confirme com dois cliques.
                                </span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="p-3 w-24">ID</th>
                                        <th className="p-3">Tarefa</th>
                                        <th className="p-3 w-20">Dur.</th>
                                        <th className="p-3 w-32 border-l border-slate-800 bg-slate-950/30">Pred.</th>
                                        <th className="p-3 w-16 text-center font-mono text-indigo-400/70">ES</th>
                                        <th className="p-3 w-16 text-center font-mono text-indigo-400/70">EF</th>
                                        <th className="p-3 w-16 text-center font-mono text-amber-400/70">LS</th>
                                        <th className="p-3 w-16 text-center font-mono text-amber-400/70 border-r border-slate-800">LF</th>
                                        <th className="p-3 w-16 text-center">Folga</th>
                                        <th className="p-3 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-800/50">
                                    {isHierarchical ? (() => {
                                        // ─── Hierarchical mode: group by EAP code levels ───
                                        const rows: React.ReactNode[] = []
                                        const l1Codes = Array.from(new Set(tarefas.map(t => t.id.split('.')[0]))).sort((a, b) => parseInt(a) - parseInt(b))

                                        for (const l1 of l1Codes) {
                                            const l1Tasks = tarefas.filter(t => t.id.startsWith(l1 + '.'))
                                            const l1Duration = l1Tasks.reduce((s, t) => s + t.duracao_estimada, 0)
                                            const l1Critical = l1Tasks.filter(t => t.ef > 0 && t.folga === 0).length
                                            const l1Collapsed = collapsedGroups.has(l1)
                                            const l1Name = eapGroups.get(l1) || `Fase ${l1}`

                                            // Level-1 group header
                                            rows.push(
                                                <tr key={`g1-${l1}`} className="bg-indigo-950/40 border-y border-indigo-800/30">
                                                    <td className="p-2 pl-3">
                                                        <button onClick={() => toggleGroup(l1)} className="flex items-center gap-1 text-indigo-300 hover:text-white transition-colors cursor-pointer">
                                                            {l1Collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                            <span className="font-mono text-xs font-bold">{l1}.</span>
                                                        </button>
                                                    </td>
                                                    <td className="p-2 font-semibold text-indigo-200 text-sm">{l1Name}</td>
                                                    <td className="p-2 font-mono text-indigo-400 text-xs">{l1Duration}d</td>
                                                    <td className="p-2 border-l border-slate-800" />
                                                    <td /><td /><td /><td className="border-r border-slate-800" />
                                                    <td className="p-2 text-center">
                                                        {l1Critical > 0 && <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono">{l1Critical}c</span>}
                                                    </td>
                                                    <td />
                                                </tr>
                                            )

                                            if (l1Collapsed) continue

                                            // Level-2 sub-groups
                                            const l2Codes = Array.from(new Set(l1Tasks.map(t => t.id.split('.').slice(0, 2).join('.')))).sort()
                                            for (const l2 of l2Codes) {
                                                const l2Tasks = l1Tasks.filter(t => t.id.startsWith(l2 + '.') || t.id === l2)
                                                const l2Duration = l2Tasks.reduce((s, t) => s + t.duracao_estimada, 0)
                                                const l2Collapsed = collapsedGroups.has(l2)
                                                const l2Name = eapGroups.get(l2) || ''

                                                // Level-2 sub-header
                                                rows.push(
                                                    <tr key={`g2-${l2}`} className="bg-slate-800/30 border-b border-slate-800/60">
                                                        <td className="p-2 pl-6">
                                                            <button onClick={() => toggleGroup(l2)} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer">
                                                                {l2Collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                                <span className="font-mono text-xs">{l2}</span>
                                                            </button>
                                                        </td>
                                                        <td className="p-2 text-slate-400 text-xs">{l2Name}</td>
                                                        <td className="p-2 font-mono text-slate-500 text-xs">{l2Duration}d</td>
                                                        <td className="p-2 border-l border-slate-800" />
                                                        <td /><td /><td /><td className="border-r border-slate-800" />
                                                        <td /><td />
                                                    </tr>
                                                )

                                                if (l2Collapsed) continue

                                                // Task rows (leaf level)
                                                for (const t of l2Tasks) {
                                                    rows.push(
                                                        <tr key={t.id} className={`hover:bg-slate-800/30 transition-colors ${(t.ef > 0 && t.folga === 0) ? 'bg-rose-950/10' : ''}`}>
                                                            <td className="p-3 pl-10 font-mono text-slate-400 text-xs">{t.id}</td>
                                                            <td className="p-3">
                                                                <input type="text" value={t.nome} onChange={(e) => updateTarefa(t.id, 'nome', e.target.value)} className={getInputClass(t.nome)} />
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-1">
                                                                    <input type="number" value={t.duracao_estimada} onChange={(e) => updateTarefa(t.id, 'duracao_estimada', parseInt(e.target.value) || 0)}
                                                                        className={`w-14 bg-slate-950 border focus:outline-none rounded px-2 py-1 font-mono text-sm ${isDirty ? 'border-amber-500/50 text-amber-400' : 'border-slate-800 text-slate-200'}`} />
                                                                    <span className="text-xs text-slate-500">d</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-3 border-l border-slate-800 bg-slate-950/30">
                                                                <input type="text"
                                                                    value={(t.dependencias || []).map(d => displayMap.get(d) || d).join(', ')}
                                                                    onChange={(e) => {
                                                                        const deps = resolveDepsFromInput(e.target.value)
                                                                        setTarefas(tarefas.map(task => task.id === t.id ? { ...task, dependencias: deps } : task))
                                                                        setIsDirty(true); setSaveStatus('idle')
                                                                    }}
                                                                    placeholder="-"
                                                                    className="w-full bg-transparent border-none focus:outline-none font-mono text-xs text-indigo-400 placeholder-slate-600 rounded px-1 py-0.5"
                                                                    title="IDs separados por vírgula (ex: T01, T03)" />
                                                            </td>
                                                            <td className="p-3 text-center font-mono text-indigo-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.es : '—'}</td>
                                                            <td className="p-3 text-center font-mono text-indigo-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.ef : '—'}</td>
                                                            <td className="p-3 text-center font-mono text-amber-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.ls : '—'}</td>
                                                            <td className="p-3 text-center font-mono text-amber-300/70 text-xs border-r border-slate-800 whitespace-nowrap">{t.ef > 0 ? t.lf : '—'}</td>
                                                            <td className="p-3 text-center">
                                                                {t.ef > 0
                                                                    ? <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${t.folga === 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : t.folga > 5 ? 'text-emerald-400' : 'text-blue-400'}`}>{t.folga}</span>
                                                                    : <span className="text-slate-600 font-mono text-xs">—</span>
                                                                }
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => removeTarefa(t.id)}
                                                                    title={confirmDeleteId === t.id ? 'Clique novamente para confirmar exclusão' : 'Remover tarefa'}
                                                                    className={`transition-all p-1 cursor-pointer rounded ${confirmDeleteId === t.id ? 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/40 animate-pulse' : 'text-slate-600 hover:text-rose-400'}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            }
                                        }
                                        return rows
                                    })() : (
                                        // ─── Flat mode (non-EAP tasks) ───
                                        tarefas.map((t) => (
                                            <tr key={t.id} className={`hover:bg-slate-800/30 transition-colors ${(t.ef > 0 && t.folga === 0) ? 'bg-rose-950/10' : ''}`}>
                                                <td className="p-3 font-mono text-slate-400 text-xs" title={t.id}>{displayMap.get(t.id) || t.id}</td>
                                                <td className="p-3">
                                                    <input type="text" value={t.nome} onChange={(e) => updateTarefa(t.id, 'nome', e.target.value)}
                                                        className={getInputClass(t.nome)} />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <input type="number" value={t.duracao_estimada} onChange={(e) => updateTarefa(t.id, 'duracao_estimada', parseInt(e.target.value) || 0)}
                                                            className={`w-14 bg-slate-950 border focus:outline-none rounded px-2 py-1 font-mono text-sm ${isDirty ? 'border-amber-500/50 text-amber-400' : 'border-slate-800 text-slate-200'}`} />
                                                        <span className="text-xs text-slate-500">d</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 border-l border-slate-800 bg-slate-950/30">
                                                    <input type="text"
                                                        value={(t.dependencias || []).map(d => displayMap.get(d) || d).join(', ')}
                                                        onChange={(e) => {
                                                            const deps = resolveDepsFromInput(e.target.value)
                                                            setTarefas(tarefas.map(task => task.id === t.id ? { ...task, dependencias: deps } : task))
                                                            setIsDirty(true); setSaveStatus('idle')
                                                        }}
                                                        placeholder="-"
                                                        className="w-full bg-transparent border-none focus:outline-none font-mono text-xs text-indigo-400 placeholder-slate-600 rounded px-1 py-0.5"
                                                        title="IDs das predecessoras separados por vírgula (ex: T01, T03)" />
                                                </td>
                                                <td className="p-3 text-center font-mono text-indigo-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.es : '—'}</td>
                                                <td className="p-3 text-center font-mono text-indigo-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.ef : '—'}</td>
                                                <td className="p-3 text-center font-mono text-amber-300/70 text-xs whitespace-nowrap">{t.ef > 0 ? t.ls : '—'}</td>
                                                <td className="p-3 text-center font-mono text-amber-300/70 text-xs border-r border-slate-800 whitespace-nowrap">{t.ef > 0 ? t.lf : '—'}</td>
                                                <td className="p-3 text-center">
                                                    {t.ef > 0
                                                        ? <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${t.folga === 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : t.folga > 5 ? 'text-emerald-400' : 'text-blue-400'}`}>{t.folga}</span>
                                                        : <span className="text-slate-600 font-mono text-xs">—</span>
                                                    }
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => removeTarefa(t.id)}
                                                        title={confirmDeleteId === t.id ? 'Clique novamente para confirmar exclusão' : 'Remover tarefa'}
                                                        className={`transition-all p-1 cursor-pointer rounded ${confirmDeleteId === t.id ? 'text-rose-400 bg-rose-500/10 ring-1 ring-rose-500/40 animate-pulse' : 'text-slate-600 hover:text-rose-400'}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {tarefas.length === 0 && (
                            <div className="p-8">
                                <EmptyState
                                    icon={<TasksEmptyIllustration className="h-8 w-8" />}
                                    title="Nenhuma tarefa ainda"
                                    description="Adicione tarefas para modelar o escopo e calcular o caminho crítico (CPM). As tarefas alimentam o Motor CDT com o Vértice de Prazo."
                                    ctaLabel="Ir para o TAP"
                                    ctaHref={`/${projetoId}/setup/tap`}
                                    zona="risco"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ TAB: GANTT (HTML, semáforo) ═══ */}
                {activeTab === 'gantt' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-blue-400" />
                                Cronograma Gantt
                                {criticalPaths.length > 1 && <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold ml-2">{criticalPaths.length} caminhos</span>}
                            </h3>
                            <button onClick={() => setFullscreenDiagram('gantt')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tela cheia">
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        </div>
                        {hasCPMData && (
                            <CriticalPathSelector
                                criticalPaths={criticalPaths}
                                selectedIndex={selectedPathIndex}
                                onSelect={setSelectedPathIndex}
                                displayMap={displayMap}
                            />
                        )}
                        <div className="p-4">
                            {hasCPMData ? (
                                <GanttHTML tarefas={tarefas} criticalPaths={orderedPaths} displayMap={displayMap} />
                            ) : (
                                <EmptyState
                                    icon={<CpmEmptyIllustration className="h-8 w-8" />}
                                    title="Cronograma não calculado"
                                    description={'Defina as predecessoras das tarefas e clique em "Gerar Diagramas" para calcular o caminho crítico.'}
                                    ctaLabel="Definir predecessoras"
                                    ctaHref={`/${projetoId}/setup/tarefas-diagramas`}
                                    zona="risco"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ TAB: PERT (semáforo) ═══ */}
                {activeTab === 'pert' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <GitMerge className="h-4 w-4 text-rose-400" />
                                Rede de Precedências (PERT)
                                {criticalPaths.length > 1 && <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold ml-2">{criticalPaths.length} caminhos</span>}
                            </h3>
                            <button onClick={() => setFullscreenDiagram('pert')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tela cheia">
                                <Maximize2 className="h-4 w-4" />
                            </button>
                        </div>
                        {hasCPMData && (
                            <CriticalPathSelector
                                criticalPaths={criticalPaths}
                                selectedIndex={selectedPathIndex}
                                onSelect={setSelectedPathIndex}
                                displayMap={displayMap}
                            />
                        )}
                        <div className="p-4 overflow-auto min-h-[500px] max-h-[70vh]">
                            {hasCPMData ? (
                                isMobile ? (
                                    <CpmMobileView tasks={tarefas} displayMap={displayMap} />
                                ) : (
                                    <PERTDiagram tarefas={tarefas} criticalPaths={orderedPaths} displayMap={displayMap} />
                                )
                            ) : (
                                <EmptyState
                                    icon={<CpmEmptyIllustration className="h-8 w-8" />}
                                    title="Cronograma não calculado"
                                    description={'Defina as predecessoras das tarefas e clique em "Gerar Diagramas" para calcular a rede PERT.'}
                                    ctaLabel="Definir predecessoras"
                                    ctaHref={`/${projetoId}/setup/tarefas-diagramas`}
                                    zona="risco"
                                />
                            )}
                        </div>
                        {hasCPMData && (
                            <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-slate-500 border-t border-slate-800 pt-3">
                                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-rose-600 rounded inline-block" /> Crítico Selecionado</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-amber-600 rounded inline-block" /> Crítico Alt.</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-600 rounded inline-block" /> Folga &gt;5d</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-600 rounded inline-block" /> Normal</span>
                                <span className="flex items-center gap-1"><span className="bg-amber-500/20 text-amber-400 text-[9px] px-1 rounded font-bold">★</span> Tarefa mais longa do caminho</span>
                            </div>
                        )}
                        {hasCPMData && (
                            <CriticalPathPanel criticalPaths={criticalPaths} displayMap={displayMap} />
                        )}
                    </div>
                )}

                {/* ═══ TAB: CUSTOS (Plano Cartesiano — Função Custo) ═══ */}
                {activeTab === 'custos' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    Função Custo por Pacote de Trabalho
                                    {Object.values(custosEap).some(v => v > 0) && (
                                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold ml-1">
                                            {formatBRL(Object.values(custosEap).reduce((s, v) => s + v, 0))} total
                                        </span>
                                    )}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Plano cartesiano: custo por tarefa (barras) e curva S acumulada (linha tracejada). Tarefas ordenadas por ES quando CPM calculado.
                                </p>
                            </div>
                        </div>
                        <div className="p-5">
                            <CostChart
                                tarefas={tarefas}
                                custos={custosEap}
                                displayMap={displayMap}
                                criticalPaths={criticalPaths}
                                onHoverDay={hasCPMData ? (day) => { if (fixedDay === null) setHoveredDay(day) } : undefined}
                                onClickDay={hasCPMData ? (day) => {
                                    setFixedDay(fd => fd !== null ? null : day)
                                    setHoveredDay(null)
                                } : undefined}
                            />
                            {hasCPMData && (
                                <GanttLupa
                                    tarefas={tarefas}
                                    criticalPaths={criticalPaths}
                                    displayMap={displayMap}
                                    activeDay={fixedDay ?? hoveredDay}
                                    maxEF={Math.max(...tarefas.map(t => t.ef), 1)}
                                    pinned={fixedDay !== null}
                                    onUnpin={() => { setFixedDay(null); setHoveredDay(null) }}
                                />
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Fullscreen Modal */}
            <DiagramModal
                title={fullscreenDiagram === 'pert' ? 'Rede de Precedências (PERT)' : 'Cronograma de Gantt'}
                open={fullscreenDiagram !== null}
                onClose={() => setFullscreenDiagram(null)}
            >
                {fullscreenDiagram === 'pert' && <PERTDiagram tarefas={tarefas} criticalPaths={orderedPaths} displayMap={displayMap} />}
                {fullscreenDiagram === 'gantt' && <GanttDiagram tarefas={tarefas} criticalPaths={orderedPaths} displayMap={displayMap} />}
            </DiagramModal>
        </div>
    )
}
