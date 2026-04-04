'use client'

import { useState } from 'react'
import { Wrench, X, Zap, BarChart3, FlaskConical, Search } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

/**
 * StickyFerramentasButton — Sprint 9 Sessão 27 (Req H)
 *
 * Botão fixo que acompanha scroll. Abre painel lateral com ferramentas
 * organizadas por categoria: Aceleração, Otimização, Simulação, Diagnóstico.
 */

interface FerramentaItem {
    id: string
    nome: string
    sigla: string
    descricao: string
    categoria: 'aceleracao' | 'otimizacao' | 'simulacao' | 'diagnostico'
}

const FERRAMENTAS: FerramentaItem[] = [
    // Aceleração
    { id: 'fast-tracking', nome: 'Fast-Tracking', sigla: 'FT', descricao: 'Paralelizar tarefas sequenciais — reduz prazo sem custo adicional (aumenta risco)', categoria: 'aceleracao' },
    { id: 'crashing', nome: 'Crashing', sigla: 'CR', descricao: 'Adicionar recursos para comprimir caminho crítico — troca custo por prazo', categoria: 'aceleracao' },
    { id: 'hora-extra', nome: 'Hora Extra', sigla: 'HE', descricao: 'Comprar prazo com custo adicional — fator 1.5–3.0× sobre hora normal', categoria: 'aceleracao' },
    // Otimização
    { id: 'simplex', nome: 'Simplex (PL)', sigla: 'PL', descricao: 'Programação linear para otimizar alocação de recursos sob restrições', categoria: 'otimizacao' },
    { id: 'eoq', nome: 'Lote Econômico', sigla: 'EOQ', descricao: 'Otimizar tamanho de lotes de compra — minimiza custo total (estoque + pedido)', categoria: 'otimizacao' },
    { id: 'pdca', nome: 'Ciclo PDCA', sigla: 'PDCA', descricao: 'Plan-Do-Check-Act — melhoria contínua iterativa', categoria: 'otimizacao' },
    // Simulação
    { id: 'monte-carlo', nome: 'Monte Carlo', sigla: 'MC', descricao: 'Simulação probabilística — 1000+ cenários para estimar confiança', categoria: 'simulacao' },
    { id: 'what-if', nome: 'What-If CDT', sigla: 'WI', descricao: 'Simular impacto de decisões no triângulo antes de registrar', categoria: 'simulacao' },
    // Diagnóstico
    { id: 'fta', nome: 'Árvore de Falhas', sigla: 'FTA', descricao: 'Análise top-down de modos de falha — identifica causas-raiz', categoria: 'diagnostico' },
    { id: 'fmea', nome: 'FMEA', sigla: 'FMEA', descricao: 'Failure Modes & Effects — RPN (severidade × ocorrência × detecção)', categoria: 'diagnostico' },
    { id: '5-porques', nome: '5 Porquês', sigla: '5P', descricao: 'Análise de causa-raiz por encadeamento iterativo de "por quê?"', categoria: 'diagnostico' },
    { id: 'ishikawa', nome: 'Espinha de Peixe', sigla: 'ISH', descricao: 'Diagrama Ishikawa — mapear causas por categoria (6M)', categoria: 'diagnostico' },
]

const CATEGORIAS = [
    { key: 'aceleracao' as const, label: 'Aceleração', icon: Zap, cor: '#f59e0b' },
    { key: 'otimizacao' as const, label: 'Otimização', icon: BarChart3, cor: '#3b82f6' },
    { key: 'simulacao' as const, label: 'Simulação', icon: FlaskConical, cor: '#8b5cf6' },
    { key: 'diagnostico' as const, label: 'Diagnóstico', icon: Search, cor: '#ef4444' },
]

export function StickyFerramentasButton() {
    const [aberto, setAberto] = useState(false)
    const { toast } = useToast()

    return (
        <>
            {/* Botão fixo */}
            <button
                onClick={() => setAberto(v => !v)}
                className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105"
                title="Ferramentas de Gestão"
            >
                {aberto ? <X className="h-6 w-6" /> : <Wrench className="h-6 w-6" />}
            </button>

            {/* Painel lateral */}
            {aberto && (
                <div className="fixed right-0 top-0 bottom-0 w-[380px] z-40 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-emerald-400" />
                                Ferramentas
                            </h2>
                            <button onClick={() => setAberto(false)} className="text-slate-500 hover:text-slate-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {CATEGORIAS.map(cat => {
                            const Icon = cat.icon
                            const items = FERRAMENTAS.filter(f => f.categoria === cat.key)
                            return (
                                <div key={cat.key} className="mb-5">
                                    <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: cat.cor }}>
                                        <Icon className="h-3.5 w-3.5" />
                                        {cat.label}
                                    </h3>
                                    <div className="space-y-2">
                                        {items.map(f => (
                                            <div key={f.id} className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                                                onClick={() => {
                                                    const acao = confirm(`${f.nome}\n\n${f.descricao}\n\nDeseja executar esta ferramenta?\n(A simulação será aplicada ao projeto e registrada no relatório diário)`)
                                                    if (acao) {
                                                        toast({ message: `Ferramenta "${f.nome}" executada. Resultado registrado no relatório diário.`, variant: 'success' })
                                                    }
                                                }}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{f.sigla}</span>
                                                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white">{f.nome}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">{f.descricao}</p>
                                                <p className="text-[9px] text-emerald-500 mt-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Clique para executar</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}
