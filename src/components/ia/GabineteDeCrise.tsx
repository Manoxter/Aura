'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MessageSquareText, X, Send, Cpu, Bot, ShieldAlert, TrendingDown, CheckCircle2 } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { useSinteseClairaut } from '@/lib/engine/hooks/useSinteseClairaut'
import { detectarRemissao, MSG_REMISSAO_POSITIVA, MSG_RISCO_CRITICO } from '@/lib/engine/modo-invertido'
import { useRiscosCriticos } from '@/hooks/useRiscosCriticos'
import type { ResultadoSC } from '@/lib/engine/clairaut'

// Story 2.12 — auto-trigger mensagens por regime
const MSG_AUTO: Record<string, string> = {
    obtuso_beta: '⚠️ Regime β detectado — orçamento em colapso geométrico. Análise do Klauss acionada automaticamente.',
    obtuso_gamma: '⚠️ Regime γ detectado — cronograma em colapso geométrico. Análise do Klauss acionada automaticamente.',
    crise: '🚨 Zona CRISE detectada (desvio ≥ 30%). Gabinete de Crise acionado automaticamente.',
}

type Mensagem = {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
}

export function GabineteDeCrise() {
    const { tap, tarefas, orcamentoBase, isMotorReady, taAtual, matedAtual } = useProject()
    const { projetoId } = useParams<{ projetoId: string }>()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Mensagem[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    // AC-3: one-shot por sessão (crise)
    const autoTriggered = useRef(false)
    // Story 2.9: one-shot por sessão (remissão positiva)
    const remissaoTriggered = useRef(false)
    // Story 13.4: one-shot por sessão (risco crítico)
    const riscoCriticoTriggered = useRef(false)
    const prevResultado = useRef<ResultadoSC | null>(null)

    // Story 13.4 — detectar riscos com score_rc > 0.6
    const { temRiscoCritico } = useRiscosCriticos(projetoId ?? null)

    // Story 2.12 — Síntese de Clairaut para detectar regime β/γ
    const { resultado } = useSinteseClairaut(
        taAtual?.E ?? null,
        taAtual?.P ?? null,
        taAtual?.O ?? null
    )

    // Story 2.12 — Auto-trigger ao entrar em regime obtuso ou zona CRISE
    useEffect(() => {
        if (autoTriggered.current || isOpen) return
        if (!isMotorReady) return

        const isObtuso = resultado?.tipo === 'obtuso_beta' || resultado?.tipo === 'obtuso_gamma'
        const isCrise = (matedAtual ?? 0) >= 0.30

        if (!isObtuso && !isCrise) return

        autoTriggered.current = true
        setIsOpen(true)

        const chave = resultado?.tipo === 'obtuso_beta' ? 'obtuso_beta'
            : resultado?.tipo === 'obtuso_gamma' ? 'obtuso_gamma'
            : 'crise'

        setMessages([{
            id: crypto.randomUUID(),
            role: 'system',
            content: MSG_AUTO[chave],
        }])
    }, [resultado, matedAtual, isMotorReady, isOpen])

    // Story 2.9 — Auto-trigger de Crise Positiva quando Remissão detectada
    useEffect(() => {
        if (!resultado) {
            prevResultado.current = resultado
            return
        }
        const remissao = detectarRemissao(prevResultado.current, resultado)
        prevResultado.current = resultado

        if (!remissao.remitiu || remissaoTriggered.current) return
        remissaoTriggered.current = true

        const msg = MSG_REMISSAO_POSITIVA[remissao.tipoAnterior!]
        setIsOpen(true)
        setMessages([{ id: crypto.randomUUID(), role: 'system', content: msg }])
    }, [resultado])

    // Story 13.4 — Auto-trigger quando risco crítico detectado (one-shot por sessão)
    // AC-2/AC-3: dispara alerta ao identificar score_rc > 0.6 no projeto
    useEffect(() => {
        if (!temRiscoCritico || riscoCriticoTriggered.current || isOpen) return
        riscoCriticoTriggered.current = true
        setIsOpen(true)
        setMessages([{ id: crypto.randomUUID(), role: 'system', content: MSG_RISCO_CRITICO }])
    }, [temRiscoCritico, isOpen])

    // Initial Greeting when opened for the first time (manual open)
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'oi, sou o Klauss, o assintente que ajuda a evitar o caos.'
            }])
        }
    }, [isOpen, messages.length])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return
        const userMsg: Mensagem = { id: crypto.randomUUID(), role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const projectContext = {
                nome: tap?.nome_projeto || 'Não Definido',
                totalCost: orcamentoBase || 0,
                totalDuration: tarefas.length > 0 ? Math.max(...tarefas.map(t => t.ef)) : 0,
                isSetupComplete: isMotorReady,
                cdtStatus: isMotorReady
                    ? 'Motor Ligado. ZRE calculada. Triângulo CDT estabilizado.'
                    : 'Aguardando conclusão do setup para cálculos de resiliência.',
                tarefas: tarefas.length > 0
                    ? tarefas.map((t, i) => ({
                        displayId: `T${String(i + 1).padStart(2, '0')}`,
                        nome: t.nome,
                        duracao_estimada: t.duracao_estimada,
                        folga_total: t.folga ?? 0
                    }))
                    : undefined
            }
            const history = messages.map(m => ({ role: m.role, content: m.content }))
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token || ''
            const response = await fetch('/api/ai/klauss', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ message: text, projectContext, history })
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Falha na comunicação com o Klauss')
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.response }])
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'system', content: 'Erro de conexão com o Gabinete de Crise. Servidores inoperantes.' }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        await sendMessage(input)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Panel — só renderiza no DOM quando aberto (evita scroll listeners bloqueando UI) */}
            {isOpen && (
                <div className="pointer-events-auto bg-slate-900 border border-slate-700 w-[400px] h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-in zoom-in-95 duration-200 origin-bottom-right">
                    {/* Header */}
                    <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                <Bot className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1">
                                    Gabinete de Crise <ShieldAlert className="h-3 w-3 text-amber-500" />
                                </h3>
                                <p className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    KLAUSS ONLINE
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col w-full">
                                <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20 ml-auto'
                                        : msg.role === 'system'
                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 w-full text-center text-xs mx-auto'
                                            : 'bg-slate-800 text-slate-200 border border-slate-700 mr-auto'
                                }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mb-1">Klauss_</div>
                                    )}
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                                {msg.role === 'assistant' && msg.content.length > 60 && (
                                    <div className="mt-2 mr-auto ml-2 flex gap-2">
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() => sendMessage('Com base nesta análise, simule o impacto desta decisão na Zona de Resiliência Executiva (ZRE) do projeto. Calcule a variação estimada na distância MATED ao NVO.')}
                                            className="text-[10px] font-semibold tracking-wide bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 flex items-center gap-1 py-1 rounded hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                                        >
                                            <TrendingDown className="h-3 w-3" /> Simular Impacto (ZRE)
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() => sendMessage('Decisão aprovada. Registre esta decisão no histórico de gestão e indique os próximos passos recomendados para manter o projeto dentro da ZRE.')}
                                            className="text-[10px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 flex items-center gap-1 py-1 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                                        >
                                            <CheckCircle2 className="h-3 w-3" /> Aprovar Decisão
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="bg-slate-800 text-slate-400 border border-slate-700 mr-auto max-w-[85%] rounded-xl p-3 text-sm flex gap-1 items-center">
                                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
                        <form onSubmit={handleSend} className="flex gap-2 relative">
                            <input
                                type="text"
                                disabled={isLoading}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Descreva a situação ou decisão..."
                                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white w-8 flex items-center justify-center rounded-md transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                        <div className="text-[10px] text-slate-500 mt-2 text-center uppercase tracking-widest font-mono flex items-center justify-center gap-1">
                            <Cpu className="h-3 w-3" /> Intel. Generativa Aura
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto h-14 w-14 rounded-full shadow-lg border flex items-center justify-center transition-colors hover:scale-105 active:scale-95 cursor-pointer ${
                    isOpen
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 animate-[bounce_3s_infinite]'
                }`}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquareText className="h-6 w-6" />}
            </button>
        </div>
    )
}
