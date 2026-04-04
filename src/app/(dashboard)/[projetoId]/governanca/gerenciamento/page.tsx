'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
    Columns3,
    CheckCircle2,
    Clock,
    AlertTriangle,
    PlayCircle,
    MessageSquare,
    Sparkles,
    Activity,
    
    
    Send,
    Loader2,
    PlusCircle,
    GitFork
} from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { CDTCanvas } from '@/components/aura/CDTCanvas'
import { gerarTrianguloCDT, calcularProjecaoFinanceira, type CDTResult } from '@/lib/engine/math'
import { PlanGate } from '@/components/saas/PlanGate'
import { ProgressInput, ProgressToastContainer } from '@/components/tasks/ProgressInput'
import { getUltimoProgresso } from '@/lib/api/progresso'
import { recalcularTA } from '@/lib/engine/execution'
import type { TrianguloAtual } from '@/lib/engine/execution'
import { TMAditivo } from '@/components/aura/TMAditivo'
import { TMHistorico } from '@/components/aura/TMHistorico'
import { CaixaFerramentas } from '@/components/aura/CaixaFerramentas'
import type { Ferramenta } from '@/components/aura/CaixaFerramentas'

type Tarefa = {
    id: string
    nome: string
    status: string
    duracao_estimada: number
    no_caminho_critico: boolean
    percentual_avanco: number
}

const FERRAMENTAS_DIAGNOSTICO: Ferramenta[] = [
    {
        id: '5w2h',
        nome: '5W2H',
        sigla: '5W2H',
        descricao: 'Plano de ação estruturado com 7 perguntas-chave',
        quando: 'Use quando precisar definir ações claras para resolver um desvio identificado.',
        zonas: ['SEGURO', 'RISCO'],
        guia: [
            'What (O quê): defina a ação a ser tomada',
            'Why (Por quê): justifique a necessidade da ação',
            'Who (Quem): atribua o responsável pela execução',
            'Where (Onde): localize onde a ação ocorre no projeto',
            'When (Quando): estabeleça prazo de início e fim',
            'How (Como): detalhe o método de execução',
            'How Much (Quanto custa): estime o custo adicional',
        ],
    },
    {
        id: 'ishikawa',
        nome: 'Espinha de Peixe',
        sigla: 'Ishikawa',
        descricao: 'Diagrama de causa-e-efeito para investigar problemas',
        quando: 'Use quando precisar identificar a causa raiz de um desvio de prazo ou custo.',
        zonas: ['RISCO', 'CRISE'],
        guia: [
            'Escreva o problema (efeito) na cabeça da espinha',
            'Trace 6 espinhas: Mão de obra, Máquina, Material, Método, Meio Ambiente, Medição',
            'Para cada espinha, liste as causas potenciais relacionadas ao projeto',
            'Use o método dos 5 Porquês para aprofundar cada causa',
            'Priorize as causas com maior impacto no CDT',
            'Defina ações corretivas para as causas priorizadas',
        ],
    },
    {
        id: 'pdca',
        nome: 'PDCA',
        sigla: 'PDCA',
        descricao: 'Ciclo de melhoria contínua: Plan, Do, Check, Act',
        quando: 'Use para implementar melhorias graduais e controladas no processo de execução.',
        zonas: ['OTIMO', 'SEGURO', 'TODOS'],
        guia: [
            'Plan: identifique o problema e planeje a melhoria com metas claras',
            'Do: execute o plano em escala piloto ou controlada',
            'Check: mensure os resultados e compare com as metas planejadas',
            'Act: padronize a melhoria se eficaz, ou reinicie o ciclo se necessário',
        ],
    },
    {
        id: 'eoq',
        nome: 'Lote Econômico',
        sigla: 'EOQ',
        descricao: 'Otimização de compras e estoques para reduzir custo total',
        quando: 'Use quando houver desvios de orçamento relacionados a aquisições e suprimentos.',
        zonas: ['SEGURO', 'RISCO'],
        guia: [
            'Levante a demanda anual (D) do material ou serviço',
            'Identifique o custo de pedido (S) por ordem de compra',
            'Identifique o custo de manutenção de estoque (H) por unidade/ano',
            'Calcule EOQ = √(2DS/H)',
            'Ajuste o cronograma de compras para usar o lote econômico',
            'Negocie contratos de fornecimento com base no EOQ calculado',
        ],
    },
    {
        id: 'simplex',
        nome: 'Simplex',
        sigla: 'Simplex',
        descricao: 'Método criativo de resolução de problemas em 8 fases',
        quando: 'Use quando o problema não tem solução óbvia e requer criatividade da equipe.',
        zonas: ['RISCO', 'CRISE'],
        guia: [
            'Encontrar o Problema: identifique a situação problemática real',
            'Formular o Problema: reescreva de forma mais clara e específica',
            'Coletar Dados: reúna informações e perspectivas sobre o problema',
            'Gerar Ideias: brainstorm livre sem julgamentos (mín. 20 ideias)',
            'Selecionar e Avaliar: filtre as ideias por viabilidade e impacto',
            'Planejar: desenvolva plano de ação para a ideia selecionada',
            'Ganhar Aceitação: comunique e engaje stakeholders',
            'Implementar e Verificar: execute e monitore os resultados no CDT',
        ],
    },
]

const KANBAN_COLUMNS = [
    { key: 'planejado', label: 'A Fazer', color: 'border-slate-700', bg: 'bg-slate-900/40', icon: Clock },
    { key: 'em_andamento', label: 'Execução', color: 'border-blue-500', bg: 'bg-blue-500/10', icon: PlayCircle },
    { key: 'concluido', label: 'Concluído', color: 'border-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
]

// UX9: Tradução de métricas adimensionais para linguagem PM
function formatDesvioLadoGest(valor: number, tipo: 'orcamento' | 'prazo' | 'escopo'): string {
    if (Math.abs(valor - 1.0) < 0.005) return 'no plano'
    const pct = ((valor - 1.0) * 100).toFixed(1)
    const sinal = valor > 1.0 ? '+' : ''
    const labels: Record<typeof tipo, [string, string]> = {
        orcamento: ['acima do operacional', 'abaixo do operacional'],
        prazo: ['além do crítico', 'adiantado'],
        escopo: ['expansão de escopo', 'contração'],
    }
    const [acima, abaixo] = labels[tipo]
    return `${sinal}${pct}% ${valor > 1.0 ? acima : abaixo}`
}

function GerenciamentoPageContent() {
    const { projetoId } = useParams()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenantId, tarefas: contextTarefas, orcamentoBase, prazoBase, custosTarefas, marcos } = useProject()
    const [tarefas, setTarefas] = useState<Tarefa[]>([])
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [showTable, setShowTable] = useState(false)
    const [klaussInsight, setKlaussInsight] = useState<null | { impact: string; suggestion: string }>(null)
    const [showAditivo, setShowAditivo] = useState(false)
    const [historicoRefreshKey, setHistoricoRefreshKey] = useState(0)
    const [taAtual, setTaAtual] = useState<TrianguloAtual | null>(null)

    const refreshTA = useCallback(async (current?: TrianguloAtual) => {
        if (!projetoId) return
        const novo = await recalcularTA(projetoId as string, supabase, current)
        setTaAtual(novo)
    }, [projetoId])

    // Kanban Logic
    useEffect(() => {
        if (projetoId) loadTarefas()
    }, [projetoId])

    async function loadTarefas() {
        const { data } = await supabase
            .from('tarefas')
            .select('id, nome, status, duracao_estimada, no_caminho_critico')
            .eq('projeto_id', projetoId)
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
        refreshTA()
    }

    const handleProgressSaved = useCallback((tarefaId: string, novoValor: number) => {
        setTarefas(prev => prev.map(t =>
            t.id === tarefaId ? { ...t, percentual_avanco: novoValor } : t
        ))
        refreshTA(taAtual ?? undefined)
    }, [refreshTA, taAtual])

    async function moveTask(taskId: string, newStatus: string) {
        setTarefas(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        await supabase.from('tarefas').update({ status: newStatus }).eq('id', taskId)
    }

    // Klauss Logic — chama endpoint real klauss-to-mated
    const handleKlaussAnalysis = async () => {
        if (!note.trim()) return
        setIsAnalyzing(true)
        try {
            const res = await fetch('/api/ai/klauss-to-mated', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descricao: note,
                    projetoId,
                    taAtual: taAtual ?? undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data.resultado) {
                setKlaussInsight({
                    impact: data.error ?? 'Não foi possível analisar o impacto.',
                    suggestion: 'Verifique a descrição e tente novamente.',
                })
            } else {
                const r = data.resultado
                setKlaussInsight({
                    impact: `[${r.zona_estimada}] ${r.justificativa}`,
                    suggestion: `Impacto estimado — E: ${r.impacto.E > 0 ? '+' : ''}${(r.impacto.E * 100).toFixed(1)}% | P: ${r.impacto.P > 0 ? '+' : ''}${(r.impacto.P * 100).toFixed(1)}% | O: ${r.impacto.O > 0 ? '+' : ''}${(r.impacto.O * 100).toFixed(1)}% (confiança: ${(r.confianca * 100).toFixed(0)}%)`,
                })
            }
        } catch {
            setKlaussInsight({
                impact: 'Erro de conexão com o Klauss.',
                suggestion: 'Verifique sua conexão e tente novamente.',
            })
        }
        setIsAnalyzing(false)
    }

    // CDT Hub: curvas reais via gerarTrianguloCDT (contextTarefas tem ef/ls do CPM)
    const curvaCustoCDT = useMemo(() => {
        if (!prazoBase || contextTarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(contextTarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map((p: { dia: number; acumulado: number }) => ({ x: p.dia, y: p.acumulado }))
    }, [contextTarefas, custosTarefas, marcos, prazoBase])

    const curvaPrazoCDT = useMemo(() => {
        if (!prazoBase || contextTarefas.length === 0) return []
        const step = Math.max(1, Math.floor(prazoBase / 50))
        const pontos: { x: number; y: number }[] = []
        for (let dia = 0; dia <= prazoBase; dia += step) {
            const prog = (contextTarefas.filter(t => (t.ef || 0) <= dia).length / contextTarefas.length) * 100
            pontos.push({ x: dia, y: prog })
        }
        if (pontos.length > 0 && pontos[pontos.length - 1].x < prazoBase) pontos.push({ x: prazoBase, y: 100 })
        return pontos
    }, [contextTarefas, prazoBase])

    const cdtData: CDTResult | null = useMemo(() => {
        if (curvaCustoCDT.length < 2 || curvaPrazoCDT.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto: curvaCustoCDT, curvaPrazo: curvaPrazoCDT, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [curvaCustoCDT, curvaPrazoCDT, orcamentoBase, prazoBase])

    if (loading) return <div className="p-8 text-slate-500 animate-pulse">Sincronizando Hub de Comando...</div>

    return (
        <PlanGate minPlan="PRO" featureName="Hub de Gerenciamento">
            <ProgressToastContainer />
            <div className="p-8 space-y-8 animate-in fade-in duration-700">
                <header className="flex justify-between items-end border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3 text-blue-500 mb-2">
                            <Activity className="h-6 w-6" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">Governança Viva</h2>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-100">Hub de Gerenciamento</h1>
                        <p className="text-slate-400 mt-2">Visão tripartite: Execução, Análise de Impacto e Geometria CDT.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Saúde do Projeto</p>
                            <p className="text-lg font-bold text-emerald-500">RESILIENTE</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    
                    {/* LEFT: Mini Kanban (Execução) */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                                    <Columns3 className="h-5 w-5 text-blue-400" />
                                    Fluxo de Execução
                                </h3>
                                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                    <button 
                                        onClick={() => setShowTable(false)}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${!showTable ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                                    >
                                        Kanban
                                    </button>
                                    <button 
                                        onClick={() => setShowTable(true)}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${showTable ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                                    >
                                        Tabela
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                                {showTable ? (
                                    <div className="col-span-3 overflow-x-auto">
                                        <table className="w-full text-left text-xs text-slate-400">
                                            <thead className="text-[10px] font-bold uppercase text-slate-600 bg-slate-950/50">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-slate-800">Tarefa</th>
                                                    <th className="px-4 py-3 border-b border-slate-800 text-center">Status</th>
                                                    <th className="px-4 py-3 border-b border-slate-800 text-center">Duração</th>
                                                    <th className="px-4 py-3 border-b border-slate-800 text-center">%</th>
                                                    <th className="px-4 py-3 border-b border-slate-800 text-center">Crítico</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {tarefas.map(task => (
                                                    <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-4 py-4 font-medium text-slate-200">{task.nome}</td>
                                                        <td className="px-4 py-4 text-center">
                                                            <select
                                                                value={task.status || 'planejado'}
                                                                onChange={(e) => moveTask(task.id, e.target.value)}
                                                                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-500"
                                                            >
                                                                {KANBAN_COLUMNS.map(c => (
                                                                    <option key={c.key} value={c.key}>{c.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-mono">{task.duracao_estimada}d</td>
                                                        <td className="px-4 py-4 text-center">
                                                            <ProgressInput
                                                                tarefaId={task.id}
                                                                tarefaNome={task.nome}
                                                                valorAtual={task.percentual_avanco}
                                                                onSave={(v) => handleProgressSaved(task.id, v)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {task.no_caminho_critico ? <span className="text-rose-500 font-bold">SIM</span> : <span className="text-slate-600">NÃO</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    KANBAN_COLUMNS.map(col => {
                                        const colTasks = tarefas.filter(t => (t.status || 'planejado') === col.key)
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        const _Icon = col.icon
                                        return (
                                            <div 
                                                key={col.key} 
                                                className={`rounded-2xl border ${col.color} ${col.bg} p-3 flex flex-col space-y-3 min-h-[500px]`}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => {
                                                    const taskId = e.dataTransfer.getData('taskId')
                                                    if (taskId) moveTask(taskId, col.key)
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{col.label}</span>
                                                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">{colTasks.length}</span>
                                                </div>
                                                <div className="space-y-2 overflow-y-auto max-h-[450px] scrollbar-hide">
                                                    {colTasks.map(task => (
                                                        <div
                                                            key={task.id}
                                                            draggable
                                                            onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                                                            className="bg-slate-900 border border-slate-800 p-3 rounded-xl cursor-grab active:scale-95 transition-all text-xs group"
                                                        >
                                                            <p className="text-slate-200 font-medium group-hover:text-blue-400 leading-snug">{task.nome}</p>
                                                            {task.no_caminho_critico && (
                                                                <div className="mt-2 text-[8px] text-rose-500 font-bold uppercase">Caminho Crítico</div>
                                                            )}
                                                            <ProgressInput
                                                                tarefaId={task.id}
                                                                tarefaNome={task.nome}
                                                                valorAtual={task.percentual_avanco}
                                                                onSave={(v) => handleProgressSaved(task.id, v)}
                                                                compact
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Notes & Triangle */}
                    <div className="xl:col-span-2 space-y-8 flex flex-col">
                        
                        {/* TOP RIGHT: Klauss Notes */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-1/2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[80px] rounded-full" />
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="bg-purple-500/10 p-2 rounded-xl text-purple-400">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                                        Diário PM / PO
                                        <Sparkles className="h-3 w-3 text-purple-400" />
                                    </h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Klauss AI Proativo</p>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col space-y-4 relative z-10">
                                <textarea 
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Descreva intercorrências ou observações do dia... Ex: 'Atraso na entrega do cimento por greve de transporte.'"
                                    className="w-full flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:border-purple-500/50 outline-none resize-none placeholder:text-slate-600"
                                />
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-600 italic">O Klauss traduzirá este texto em impactos no motor CDT.</p>
                                    <button 
                                        onClick={handleKlaussAnalysis}
                                        disabled={isAnalyzing || !note.trim()}
                                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                    >
                                        {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                        Analisar Impacto
                                    </button>
                                </div>

                                {klaussInsight && (
                                    <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-4 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="h-4 w-4 text-purple-400 mt-1" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-purple-300">Insight Gerado:</p>
                                                <p className="text-[11px] text-slate-300 leading-relaxed">{klaussInsight.impact}</p>
                                                <p className="text-[11px] text-emerald-400 font-medium">✨ {klaussInsight.suggestion}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOTTOM RIGHT: Mini CDT View */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1 flex flex-col items-center justify-center relative shadow-inner">
                            <div className="absolute top-4 left-6">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="h-3 w-3 text-blue-500" />
                                    Pulso CDT Online
                                </h3>
                            </div>
                            
                            <div className="scale-75 origin-center min-h-[200px] flex items-center justify-center">
                                {cdtData ? (
                                    <CDTCanvas cdt={cdtData} />
                                ) : (
                                    <p className="text-xs text-slate-600">Setup incompleto</p>
                                )}
                            </div>

                            <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-sm">
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-600 uppercase font-bold">Escopo</p>
                                    <p className="text-xs font-bold text-slate-300">1.000</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-600 uppercase font-bold">Orçamento</p>
                                    <p className="text-xs font-bold text-amber-500">{cdtData?.lados.orcamento.toFixed(3) ?? '—'}</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">{cdtData ? formatDesvioLadoGest(cdtData.lados.orcamento, 'orcamento') : '—'}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-600 uppercase font-bold">Prazo</p>
                                    <p className="text-xs font-bold text-rose-500">{cdtData?.lados.prazo.toFixed(3) ?? '—'}</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">{cdtData ? formatDesvioLadoGest(cdtData.lados.prazo, 'prazo') : '—'}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Caixa de Ferramentas de Diagnóstico */}
                <CaixaFerramentas
                    ferramentas={FERRAMENTAS_DIAGNOSTICO}
                    klaussRecomenda={
                        cdtData?.zona_mated === 'OTIMO' ? 'pdca'
                        : cdtData?.zona_mated === 'SEGURO' ? '5w2h'
                        : cdtData?.zona_mated === 'RISCO' ? 'ishikawa'
                        : 'simplex'
                    }
                    titulo="Caixa de Ferramentas"
                    subtitulo="Diagnóstico e planejamento de ação — Klauss sugere a ferramenta ideal"
                />

                {/* Histórico de Aditivos (TM Versionado) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500/10 p-2 rounded-xl">
                                <GitFork className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Histórico de Aditivos</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                    TM Versionado — Histórico de Pecados
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAditivo(true)}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                        >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Registrar Aditivo
                        </button>
                    </div>
                    <TMHistorico
                        projetoId={projetoId as string}
                        refreshKey={historicoRefreshKey}
                    />
                </div>
            </div>

            {/* Modal de Aditivo */}
            {showAditivo && (
                <TMAditivo
                    projetoId={projetoId as string}
                    ladosAtuais={{ E: taAtual?.E ?? 1, P: taAtual?.P ?? (cdtData?.lados.prazo ?? 1), O: taAtual?.O ?? (cdtData?.lados.orcamento ?? 1) }}
                    zonaMatedAtual={cdtData?.zona_mated ?? 'SEGURO'}
                    onClose={() => setShowAditivo(false)}
                    onSuccess={() => {
                        setShowAditivo(false)
                        setHistoricoRefreshKey(k => k + 1)
                    }}
                />
            )}
        </PlanGate>
    )
}

export default function GerenciamentoPage() {
    return (
        <ErrorBoundary>
            <GerenciamentoPageContent />
        </ErrorBoundary>
    )
}
