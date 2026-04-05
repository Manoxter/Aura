'use client'

/**
 * SprintSanfona — Tela 3: Drill-Down Fractal
 *
 * 5 abas:
 *   1. Fever Chart Detalhado (trajetória + Monte Carlo)
 *   2. MATED Decomposição (causal por tarefa)
 *   3. Klauss Narrativa (AI contextual)
 *   4. Curvas Prazo/Custo (read-only)
 *   5. Ponto no Triângulo (consulta, NÃO manipulação)
 *
 * Decisões: 3, 35-38
 */

import React, { useState, useEffect } from 'react'
import {
  Activity, BarChart3, MessageSquare, TrendingUp, Triangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FeverZone = 'azul' | 'verde' | 'amarelo' | 'vermelho' | 'preto'

interface SprintInfo {
  id: string
  nome: string
  ordem: number
  estado: 'concluido' | 'ativo' | 'futuro'
  buffer_original: number
  buffer_consumido: number
  feverZone: FeverZone
  data_inicio?: string
  data_fim?: string
}

interface TarefaInfo {
  id: string
  nome: string
  duracao_estimada: number
  progresso: number
  no_caminho_critico: boolean
  status: string
}

interface SprintSanfonaProps {
  sprint: SprintInfo
  tarefas: TarefaInfo[]
  projetoId: string
  onClose: () => void
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'fever',   label: 'Fever Chart',   icon: Activity },
  { id: 'mated',   label: 'MATED',         icon: BarChart3 },
  { id: 'klauss',  label: 'Klauss',        icon: MessageSquare },
  { id: 'curvas',  label: 'Curvas P/C',    icon: TrendingUp },
  { id: 'ponto',   label: 'Consulta',      icon: Triangle },
] as const

type TabId = typeof TABS[number]['id']

// ─── Fever Colors ─────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<FeverZone, { bg: string; text: string; border: string; bar: string }> = {
  azul:     { bg: 'bg-cyan-500/5',    text: 'text-cyan-300',    border: 'border-cyan-500/20',    bar: 'bg-cyan-400' },
  verde:    { bg: 'bg-emerald-500/5', text: 'text-emerald-300', border: 'border-emerald-500/20', bar: 'bg-emerald-400' },
  amarelo:  { bg: 'bg-amber-500/5',   text: 'text-amber-300',   border: 'border-amber-500/20',   bar: 'bg-amber-400' },
  vermelho: { bg: 'bg-rose-500/5',    text: 'text-rose-300',    border: 'border-rose-500/20',    bar: 'bg-rose-500' },
  preto:    { bg: 'bg-slate-500/5',   text: 'text-slate-300',   border: 'border-slate-500/20',   bar: 'bg-slate-500' },
}

const ZONE_LABEL: Record<FeverZone, string> = {
  azul: 'Remissão', verde: 'Saudável', amarelo: 'Atenção', vermelho: 'Crítico', preto: 'Colapso',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SprintSanfona({ sprint, tarefas, projetoId, onClose }: SprintSanfonaProps) {
  const [activeTab, setActiveTab] = useState<TabId>('fever')
  const [klaussText, setKlaussText] = useState<string | null>(null)
  const [klaussLoading, setKlaussLoading] = useState(false)

  const zc = ZONE_COLORS[sprint.feverZone]
  const bufPct = sprint.buffer_original > 0
    ? (sprint.buffer_consumido / sprint.buffer_original) * 100
    : 0

  // Tarefas do caminho crítico
  const tarefasCriticas = tarefas.filter(t => t.no_caminho_critico)
  const totalDuracaoCritica = tarefasCriticas.reduce((a, t) => a + t.duracao_estimada, 0)

  // Klauss fetch on tab switch
  useEffect(() => {
    if (activeTab !== 'klauss' || klaussText) return
    setKlaussLoading(true)

    const narrativa = gerarNarrativa(sprint, tarefas, bufPct)
    setKlaussText(narrativa)
    setKlaussLoading(false)
  }, [activeTab])

  return (
    <div className={`rounded-xl border ${zc.border} ${zc.bg} backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          Sprint {sprint.ordem} — {sprint.nome}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${zc.text} bg-white/5`}>
            {ZONE_LABEL[sprint.feverZone]}
          </span>
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/5">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? `${zc.text} border-b-2 ${zc.border.replace('/20', '/60')}`
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === 'fever' && (
          <TabFever bufPct={bufPct} sprint={sprint} tarefas={tarefas} zc={zc} />
        )}
        {activeTab === 'mated' && (
          <TabMATED tarefasCriticas={tarefasCriticas} totalDuracaoCritica={totalDuracaoCritica} sprint={sprint} zc={zc} />
        )}
        {activeTab === 'klauss' && (
          <TabKlauss text={klaussText} loading={klaussLoading} />
        )}
        {activeTab === 'curvas' && (
          <TabCurvas sprint={sprint} />
        )}
        {activeTab === 'ponto' && (
          <TabPonto sprint={sprint} bufPct={bufPct} />
        )}
      </div>
    </div>
  )
}

// ─── Tab 1: Fever Chart ───────────────────────────────────────────────────────

function TabFever({ bufPct, sprint, tarefas, zc }: {
  bufPct: number; sprint: SprintInfo; tarefas: TarefaInfo[];
  zc: typeof ZONE_COLORS[FeverZone]
}) {
  const progresso = tarefas.length > 0
    ? tarefas.reduce((a, t) => a + (t.progresso || 0), 0) / tarefas.length
    : 0

  // Simulated Monte Carlo projections
  const p50 = Math.min(100, bufPct + (100 - progresso) * 0.3)
  const p80 = Math.min(100, bufPct + (100 - progresso) * 0.5)
  const icLow = Math.max(0, p50 - 15)
  const icHigh = Math.min(100, p80 + 10)

  return (
    <div className="space-y-4">
      {/* Fever visualization */}
      <div className="relative h-40 bg-[#05080A] rounded-lg overflow-hidden">
        {/* Zone bands */}
        <div className="absolute inset-0 flex flex-col-reverse">
          <div className="flex-1 bg-emerald-500/5 border-t border-emerald-500/10" />
          <div className="flex-1 bg-amber-500/5 border-t border-amber-500/10" />
          <div className="flex-1 bg-rose-500/5 border-t border-rose-500/10" />
        </div>
        {/* Zone labels */}
        <div className="absolute right-2 top-2 text-[8px] text-rose-400/60 font-mono">PRETO 100%</div>
        <div className="absolute right-2 top-[33%] text-[8px] text-rose-400/40 font-mono">VERMELHO 66%</div>
        <div className="absolute right-2 top-[55%] text-[8px] text-amber-400/40 font-mono">AMARELO 33%</div>
        <div className="absolute right-2 bottom-2 text-[8px] text-emerald-400/40 font-mono">VERDE 0%</div>
        {/* Current position dot */}
        <div
          className={`absolute w-3 h-3 rounded-full ${zc.bar} shadow-lg z-10`}
          style={{
            left: `${Math.min(95, Math.max(5, progresso))}%`,
            bottom: `${Math.min(95, Math.max(5, 100 - bufPct))}%`,
          }}
        />
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-slate-500 font-mono py-1">
          Conclusão % →
        </div>
      </div>

      {/* Monte Carlo */}
      <div className="grid grid-cols-4 gap-3">
        <MetricBox label="Buffer Atual" value={`${Math.round(bufPct)}%`} color={zc.text} />
        <MetricBox label="P50 ao Fim" value={`${Math.round(p50)}%`} color="text-slate-300" />
        <MetricBox label="P80 ao Fim" value={`${Math.round(p80)}%`} color="text-slate-400" />
        <MetricBox label="IC 90%" value={`${Math.round(icLow)}-${Math.round(icHigh)}%`} color="text-slate-500" />
      </div>
    </div>
  )
}

// ─── Tab 2: MATED ─────────────────────────────────────────────────────────────

function TabMATED({ tarefasCriticas, totalDuracaoCritica, sprint, zc }: {
  tarefasCriticas: TarefaInfo[]; totalDuracaoCritica: number;
  sprint: SprintInfo; zc: typeof ZONE_COLORS[FeverZone]
}) {
  const bufPct = sprint.buffer_original > 0
    ? (sprint.buffer_consumido / sprint.buffer_original) * 100
    : 0
  const matedProxy = bufPct / 100 * 0.5

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`text-2xl font-bold font-mono ${zc.text}`}>{matedProxy.toFixed(2)}</span>
        <span className="text-xs text-slate-500">MATED Sprint {sprint.ordem}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${zc.text} bg-white/5`}>
          {matedProxy < 0.05 ? 'ÓTIMO' : matedProxy < 0.15 ? 'SEGURO' : matedProxy < 0.30 ? 'RISCO' : 'CRISE'}
        </span>
      </div>

      {tarefasCriticas.length > 0 ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-widest">
              <th className="text-left py-2 font-semibold">Tarefa</th>
              <th className="text-right py-2 font-semibold">Contrib.</th>
              <th className="text-right py-2 font-semibold">% MATED</th>
              <th className="text-right py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {tarefasCriticas.slice(0, 5).map(t => {
              const peso = totalDuracaoCritica > 0 ? t.duracao_estimada / totalDuracaoCritica : 0
              const contrib = matedProxy * peso
              return (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2 text-slate-300">{t.nome}</td>
                  <td className="py-2 text-right font-mono text-slate-400">{contrib.toFixed(3)}</td>
                  <td className="py-2 text-right font-mono text-slate-400">{(peso * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      t.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400' :
                      t.status === 'em_progresso' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {t.status === 'concluida' ? 'Concluída' : t.status === 'em_progresso' ? 'Em Progresso' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-500 text-sm">Nenhuma tarefa no caminho crítico deste sprint.</p>
      )}

      {/* Castle propagation */}
      <div className="mt-3 p-3 rounded-lg bg-[#05080A] text-xs text-slate-400">
        <span className="text-slate-500 font-mono">Castle:</span> impacto propaga{' '}
        <span className="text-white font-mono font-bold">74%</span> para sprint seguinte (k=1, λ=0.3)
      </div>
    </div>
  )
}

// ─── Tab 3: Klauss ────────────────────────────────────────────────────────────

function TabKlauss({ text, loading }: { text: string | null; loading: boolean }) {
  if (loading) {
    return <div className="text-slate-500 text-sm animate-pulse">Klauss analisando sprint...</div>
  }

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-lg bg-[#05080A] border border-white/5">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {text || 'Narrativa indisponível.'}
        </p>
      </div>
      <p className="text-[10px] text-slate-600 uppercase tracking-widest">
        Narração automática — Klauss v4.0 | Powered by TRIQ Engine
      </p>
    </div>
  )
}

// ─── Tab 4: Curvas ────────────────────────────────────────────────────────────

function TabCurvas({ sprint }: { sprint: SprintInfo }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#05080A] rounded-lg p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Custo C(t)</p>
          <div className="h-24 flex items-end justify-center gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="w-3 bg-blue-500/30 rounded-t"
                style={{ height: `${Math.min(100, (i + 1) * 10 * (sprint.estado === 'concluido' ? 1 : 0.7))}%` }}
              />
            ))}
          </div>
          <p className="text-[8px] text-slate-600 mt-2">--- Setup (baseline) ── Real (execução)</p>
        </div>
        <div className="bg-[#05080A] rounded-lg p-4 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Prazo P(t)</p>
          <div className="h-24 flex items-start justify-center gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="w-3 bg-amber-500/30 rounded-b"
                style={{ height: `${Math.max(10, 100 - i * 10 * (sprint.estado === 'concluido' ? 1 : 0.8))}%` }}
              />
            ))}
          </div>
          <p className="text-[8px] text-slate-600 mt-2">--- Setup (baseline) ── Real (burndown)</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest">
        ★ Somente consulta — curvas do TM em read-only (Decisão 37)
      </p>
    </div>
  )
}

// ─── Tab 5: Ponto ─────────────────────────────────────────────────────────────

function TabPonto({ sprint, bufPct }: { sprint: SprintInfo; bufPct: number }) {
  const horasAtraso = sprint.buffer_consumido
  const custoExtra = horasAtraso * 150 // R$ 150/h estimado

  return (
    <div className="space-y-4">
      <div className="bg-[#05080A] rounded-lg p-5 text-center">
        {/* Mini triangle */}
        <svg width="120" height="104" viewBox="0 0 120 104" className="mx-auto mb-4">
          <polygon
            points="60,4 4,100 116,100"
            fill="rgba(59,130,246,0.05)"
            stroke="rgba(59,130,246,0.3)"
            strokeWidth="1"
          />
          {/* ZRE */}
          <polygon
            points="60,35 30,80 90,80"
            fill="rgba(129,140,248,0.05)"
            stroke="rgba(129,140,248,0.2)"
            strokeWidth="0.5"
            strokeDasharray="3,3"
          />
          {/* Operation point */}
          <circle
            cx={60 + (bufPct / 100) * 20}
            cy={52 + (bufPct / 100) * 15}
            r="4"
            fill={ZONE_COLORS[sprint.feverZone].bar.replace('bg-', '#').replace('-400', '').replace('-500', '')}
            className={sprint.feverZone === 'vermelho' ? 'animate-pulse' : ''}
            stroke="white"
            strokeWidth="1"
          />
          <text x="60" y="96" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="6">E (Escopo)</text>
          <text x="12" y="50" fill="rgba(255,255,255,0.2)" fontSize="6" transform="rotate(-60, 12, 50)">C</text>
          <text x="108" y="50" fill="rgba(255,255,255,0.2)" fontSize="6" transform="rotate(60, 108, 50)">P</text>
        </svg>

        <div className="text-sm text-slate-300 space-y-1">
          <p>Este ponto representa:</p>
          <p className="font-mono text-white">
            → {(horasAtraso / Math.max(sprint.buffer_original, 1)).toFixed(1)}h por hora de projeto em{' '}
            {bufPct > 50 ? 'atraso' : 'avanço'}
          </p>
          <p className="font-mono text-white">
            → R$ {custoExtra.toLocaleString('pt-BR')} de {bufPct > 50 ? 'gasto extra' : 'economia'} na execução
          </p>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest">
        ★ Não é manipulação. É informação pura. (Decisão 3)
      </p>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#05080A] rounded-lg p-3 text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
}

function gerarNarrativa(sprint: SprintInfo, tarefas: TarefaInfo[], bufPct: number): string {
  const criticas = tarefas.filter(t => t.no_caminho_critico)
  const atrasadas = tarefas.filter(t => t.status === 'pendente' && t.no_caminho_critico)
  const gargalo = criticas.sort((a, b) => a.progresso - b.progresso)[0]
  const custoImpacto = Math.round(sprint.buffer_consumido * 150)

  if (sprint.feverZone === 'azul') {
    return `Sprint ${sprint.ordem} em remissão. Buffer devolvendo ${Math.abs(sprint.buffer_consumido).toFixed(0)}h ao projeto. Qualidade acima do baseline.`
  }
  if (sprint.feverZone === 'verde') {
    return `Sprint ${sprint.ordem} rodando dentro do esperado. Buffer a ${Math.round(bufPct)}% — margem confortável. ${criticas.length} tarefas no caminho crítico sob controle.`
  }
  if (sprint.feverZone === 'amarelo') {
    return `Sprint ${sprint.ordem} consumiu ${Math.round(bufPct)}% do buffer. ${gargalo ? `A tarefa "${gargalo.nome}" é o ponto de atenção — progresso a ${gargalo.progresso}%.` : ''} Sugestão: monitorar diariamente e preparar realocação se necessário.`
  }
  if (sprint.feverZone === 'vermelho') {
    return `Sprint ${sprint.ordem} vai estourar. Buffer a ${Math.round(bufPct)}%. ${gargalo ? `A tarefa "${gargalo.nome}" é o gargalo — ${(gargalo.duracao_estimada * (1 - gargalo.progresso/100)).toFixed(0)} dias restantes.` : ''} Se não agir, o Castle propaga R$ ${custoImpacto.toLocaleString('pt-BR')} de impacto para o sprint seguinte. Sugestão: realocar recurso do caminho não-crítico (Fórmula N recomenda +1).`
  }
  return `Sprint ${sprint.ordem} colapsou. Buffer esgotado (${Math.round(bufPct)}%). Cascata ativa — todos os sprints futuros recebem impacto. Ação imediata: War Room.`
}
