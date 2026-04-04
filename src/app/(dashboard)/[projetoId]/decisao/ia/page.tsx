'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { LineChart, Sparkles, Send, Loader2, User } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { useParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { KlaussEmptyIllustration } from '@/components/ui/EmptyState'
import { gerarTrianguloCDT, calcularProjecaoFinanceira } from '@/lib/engine/math'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

function getSuggestedPrompts(hasTarefas: boolean, isEapReady: boolean, isMotorReady: boolean): string[] {
    if (!hasTarefas) {
        return [
            'Como devo estruturar o escopo de um projeto de construção industrial?',
            'Quais são os principais riscos de projetos sem TAP formal?',
            'Explique o Método Aura e o triângulo CDT.',
        ]
    }
    if (!isEapReady) {
        return [
            'Como organizar uma EAP (WBS) para o meu projeto?',
            'Quais pacotes de trabalho são essenciais em projetos de infraestrutura?',
            'Qual é a diferença entre EAP por entregáveis e por fases?',
        ]
    }
    if (!isMotorReady) {
        return [
            'Como definir as predecessoras das tarefas no CPM?',
            'O que é o Caminho Crítico e como ele afeta o prazo?',
            'Como calibrar o orçamento base com os dados de CPM?',
        ]
    }
    return [
        'Se atrasar 10% do prazo, como o triângulo CDT se deforma?',
        'Quais tarefas críticas têm maior risco de scope creep?',
        'Como usar a Zona de Resiliência Executiva (ZRE) para decisões?',
        'Analise o estado atual do projeto e sugira ações corretivas.',
    ]
}

function MarkdownText({ text }: { text: string }) {
    const lines = text.split('\n')
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                if (line.startsWith('## ')) return <p key={i} className="font-bold text-white mt-3 mb-1">{line.slice(3)}</p>
                if (line.startsWith('### ')) return <p key={i} className="font-semibold text-slate-200 mt-2">{line.slice(4)}</p>
                if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="text-slate-300 pl-3">• {line.slice(2)}</p>
                if (line.trim() === '') return <div key={i} className="h-1" />
                const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
                return (
                    <p key={i} className="text-slate-300 leading-relaxed">
                        {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
                            if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="bg-slate-700 text-blue-300 px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>
                            return part
                        })}
                    </p>
                )
            })}
        </div>
    )
}

export default function IAPage() {
    const { projetoId } = useParams()
    const { tarefas, isEapReady, isMotorReady, tap, orcamentoBase, prazoBase, custosTarefas, marcos } = useProject()
    const hasTarefas = tarefas.length > 0
    const nomeProjeto = tap?.nome_projeto || 'seu projeto'

    const suggestedPrompts = getSuggestedPrompts(hasTarefas, isEapReady, isMotorReady)
    const [inputValue, setInputValue] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const cdtAtual = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return null
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
            const curvaCusto = projecao.map(p => ({ x: p.dia, y: p.acumulado }))
            const step = Math.max(1, Math.floor(prazoBase / 50))
            const curvaPrazo: { x: number; y: number }[] = []
            for (let dia = 0; dia <= prazoBase; dia += step) {
                const prog = (tarefas.filter(t => (t.ef || 0) <= dia).length / tarefas.length) * 100
                curvaPrazo.push({ x: dia, y: prog })
            }
            if (curvaPrazo.length > 0 && curvaPrazo[curvaPrazo.length - 1].x < prazoBase) curvaPrazo.push({ x: prazoBase, y: 100 })
            if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
            return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
        } catch { return null }
    }, [tarefas, prazoBase, custosTarefas, marcos, orcamentoBase])

    async function sendMessage(text: string) {
        if (!text.trim() || loading) return
        const userMsg: Message = { role: 'user', content: text.trim() }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInputValue('')
        setLoading(true)

        try {
            const projectContext = {
                totalCost: orcamentoBase,
                totalDuration: prazoBase,
                cdtStatus: cdtAtual
                    ? `Zona ${cdtAtual.zona_mated} — MATED ${cdtAtual.mated_distancia.toFixed(3)}`
                    : 'Motor não ativado',
                globalIQo: null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tarefas: tarefas.slice(0, 20).map((t: any) => ({
                    displayId: t.wbs_code || t.id,
                    nome: t.nome,
                    duracao_estimada: t.duracao_estimada,
                    folga_total: t.folga_total ?? null,
                })),
            }

            const res = await authFetch('/api/ai/klauss', {
                method: 'POST',
                body: JSON.stringify({
                    message: text.trim(),
                    projectContext,
                    history: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                    projetoId: projetoId as string,
                }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                throw new Error((err as any).error || `Erro ${res.status}`)
            }

            const data = await res.json()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMessages(prev => [...prev, { role: 'assistant', content: (data as any).response }])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Erro ao contatar Klauss: ${e.message ?? 'Tente novamente.'}`,
            }])
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputValue) }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 h-[calc(100vh-8rem)] flex flex-col">
            <header className="border-b border-slate-800 pb-6 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <LineChart className="h-8 w-8 text-blue-500" />
                    Klauss — IA Assistant
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Análise preditiva omni-data e chat estratégico</p>
            </header>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col overflow-hidden relative min-h-0">
                <div className="absolute inset-x-0 -top-40 h-80 bg-blue-500/10 blur-[100px] pointer-events-none" />

                <div className="flex-1 p-6 overflow-y-auto space-y-6 min-h-0">
                    {/* Welcome */}
                    <div className="flex gap-4">
                        <div className="bg-blue-600 rounded-full h-10 w-10 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl rounded-tl-none text-slate-200 max-w-2xl">
                            <p className="mb-3 font-medium">
                                Olá! Sou o <span className="text-blue-400 font-semibold">Klauss</span>, assistente IA do Aura para{' '}
                                <span className="text-blue-400 font-semibold">{nomeProjeto}</span>.
                            </p>
                            <p className="text-slate-400 text-sm mb-4">
                                {isMotorReady
                                    ? `Motor ativo — Zona ${cdtAtual?.zona_mated ?? '...'} | MATED ${cdtAtual?.mated_distancia.toFixed(3) ?? '...'}. Faça sua pergunta estratégica.`
                                    : 'O Motor CDT ainda não foi ativado. Posso ajudar com perguntas sobre metodologia e estruturação.'}
                            </p>
                            {messages.length === 0 && (
                                <div data-testid="klauss-empty-prompts" className="flex flex-col gap-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Prompts sugeridos</p>
                                    {suggestedPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(prompt)}
                                            className="text-left text-sm text-blue-300 hover:text-white bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 hover:border-blue-500/40 px-3 py-2 rounded-xl transition-all"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                            <div className="text-blue-400 mb-3"><KlaussEmptyIllustration className="h-10 w-10 mx-auto" /></div>
                            <p className="text-slate-500 text-xs">As respostas aparecerão aqui</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`rounded-full h-10 w-10 flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700 border border-slate-600' : 'bg-blue-600 shadow-lg shadow-blue-500/20'}`}>
                                {msg.role === 'user' ? <User className="h-5 w-5 text-slate-300" /> : <Sparkles className="h-5 w-5 text-white" />}
                            </div>
                            <div className={`p-4 rounded-2xl max-w-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30 rounded-tr-none text-slate-200' : 'bg-slate-800/80 border border-slate-700/50 rounded-tl-none'}`}>
                                {msg.role === 'assistant' ? <MarkdownText text={msg.content} /> : <p className="text-slate-200">{msg.content}</p>}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-4">
                            <div className="bg-blue-600 rounded-full h-10 w-10 flex items-center justify-center shrink-0">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                                <span className="text-slate-400 text-sm">Klauss está analisando...</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
                    <div className="relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={loading}
                            placeholder="Ex: Se atrasar 10% do prazo, como o triângulo CDT se deforma?"
                            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500 disabled:opacity-50"
                        />
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={!inputValue.trim() || loading}
                            className="absolute right-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 pl-1">Enter para enviar · Rate limit: 60 req/hora</p>
                </div>
            </div>
        </div>
    )
}
