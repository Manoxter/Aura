'use client'

/**
 * Página Dedicada do Sprint — Drill-Down Fractal
 *
 * Mostra o triângulo fractal isolado do sprint + Fever Chart + MATED + curvas.
 * Acessada via click no sprint dentro do TM no dashboard.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Activity, BarChart3, MessageSquare, TrendingUp, Triangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SprintSanfona } from '@/components/aura/SprintSanfona'
import type { FeverZone } from '@/components/aura/SierpinskiMesh'

interface SprintDB {
  id: string
  nome: string
  ordem: number
  estado: string
  buffer_original: number
  buffer_consumido: number
  data_inicio: string | null
  data_fim: string | null
}

interface TarefaDB {
  id: string
  nome: string
  duracao_estimada: number
  progresso: number
  no_caminho_critico: boolean
  status: string
}

export default function SprintPage() {
  const params = useParams()
  const router = useRouter()
  const projetoId = params.projetoId as string
  const sprintId = params.sprintId as string

  const [sprint, setSprint] = useState<SprintDB | null>(null)
  const [tarefas, setTarefas] = useState<TarefaDB[]>([])
  const [projetoNome, setProjetoNome] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [sprintRes, tarefasRes, projetoRes] = await Promise.all([
        supabase
          .from('sprints_fractais')
          .select('id, nome, ordem, estado, buffer_original, buffer_consumido, data_inicio, data_fim')
          .eq('id', sprintId)
          .single(),
        supabase
          .from('tarefas')
          .select('id, nome, duracao_estimada, progresso, no_caminho_critico, status')
          .eq('projeto_id', projetoId),
        supabase
          .from('projetos')
          .select('nome')
          .eq('id', projetoId)
          .single(),
      ])

      if (sprintRes.data) setSprint(sprintRes.data)
      if (tarefasRes.data) {
        setTarefas(tarefasRes.data.map(t => ({
          ...t,
          duracao_estimada: Number(t.duracao_estimada) || 0,
          progresso: Number(t.progresso) || 0,
          no_caminho_critico: t.no_caminho_critico ?? false,
        })))
      }
      if (projetoRes.data) setProjetoNome(projetoRes.data.nome)
      setLoading(false)
    }
    load()
  }, [sprintId, projetoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500">
        <Activity className="h-8 w-8 animate-spin mr-3" />
        Carregando sprint...
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="text-center p-20 text-slate-500">
        Sprint não encontrado.
      </div>
    )
  }

  const bufPct = Number(sprint.buffer_original) > 0
    ? (Number(sprint.buffer_consumido) / Number(sprint.buffer_original)) * 100
    : 0

  let feverZone: FeverZone = 'verde'
  if (bufPct < 0) feverZone = 'azul'
  else if (bufPct <= 33) feverZone = 'verde'
  else if (bufPct <= 66) feverZone = 'amarelo'
  else if (bufPct <= 100) feverZone = 'vermelho'
  else feverZone = 'preto'

  const sprintInfo = {
    id: sprint.id,
    nome: sprint.nome,
    ordem: sprint.ordem,
    estado: sprint.estado as 'concluido' | 'ativo' | 'futuro',
    buffer_original: Number(sprint.buffer_original),
    buffer_consumido: Number(sprint.buffer_consumido),
    feverZone,
  }

  const ZONE_LABEL: Record<FeverZone, string> = {
    azul: 'Remissão', verde: 'Saudável', amarelo: 'Atenção', vermelho: 'Crítico', preto: 'Colapso',
  }

  const ZONE_COLOR: Record<FeverZone, string> = {
    azul: 'text-cyan-300', verde: 'text-emerald-300', amarelo: 'text-amber-300',
    vermelho: 'text-rose-300', preto: 'text-slate-300',
  }

  const ZONE_STROKE: Record<FeverZone, string> = {
    azul: '#22d3ee', verde: '#00E676', amarelo: '#FFAB00', vermelho: '#E53935', preto: '#52525b',
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-white/5 pb-5">
        <button
          onClick={() => router.push(`/${projetoId}`)}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{projetoNome}</p>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Sprint {sprint.ordem} — {sprint.nome}
            <span className={`text-sm px-3 py-1 rounded-full bg-white/5 ${ZONE_COLOR[feverZone]}`}>
              {ZONE_LABEL[feverZone]}
            </span>
          </h1>
        </div>
      </header>

      {/* Fractal Triangle Isolado */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="rounded-2xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            Triângulo Fractal — Sprint {sprint.ordem}
          </h2>
          <div className="flex justify-center">
            <svg width="400" height="350" viewBox="0 0 400 350">
              {/* Ghost shadow (original shape before decisions) */}
              <polygon
                points="40,310 360,310 180,30"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              {/* Active fractal triangle (escaleno) */}
              <polygon
                points={`40,310 ${360 - bufPct * 0.8},310 ${180 + bufPct * 0.3},${30 + bufPct * 0.5}`}
                fill={`${ZONE_STROKE[feverZone]}15`}
                stroke={ZONE_STROKE[feverZone]}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Labels */}
              <text x="200" y="330" textAnchor="middle" fill="rgba(0,230,118,0.4)" fontSize="10"
                fontFamily="var(--font-jetbrains), monospace">E (Escopo)</text>
              <text x="20" y="170" fill="rgba(59,130,246,0.4)" fontSize="10"
                fontFamily="var(--font-jetbrains), monospace"
                transform="rotate(-65, 20, 170)">C (Custo)</text>
              <text x="380" y="170" fill="rgba(255,171,0,0.4)" fontSize="10"
                fontFamily="var(--font-jetbrains), monospace"
                transform="rotate(65, 380, 170)">P (Prazo)</text>
              {/* Center info */}
              <text x="200" y="180" textAnchor="middle" fill={ZONE_STROKE[feverZone]}
                fontSize="24" fontWeight="700" fontFamily="var(--font-jetbrains), monospace">
                S{sprint.ordem}
              </text>
              <text x="200" y="205" textAnchor="middle" fill="rgba(255,255,255,0.4)"
                fontSize="11" fontFamily="var(--font-outfit), sans-serif">
                Buffer: {Math.round(bufPct)}%
              </text>
              {/* Estado */}
              {sprint.estado === 'ativo' && (
                <circle cx="200" cy="55" r="5" fill={ZONE_STROKE[feverZone]} className="animate-pulse" />
              )}
              {sprint.estado === 'concluido' && (
                <text x="200" y="60" textAnchor="middle" fill="#4ade80" fontSize="16">✓</text>
              )}
            </svg>
          </div>
        </div>

        {/* Sprint Metrics Lateral */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sprint Metrics</h3>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Buffer Original</span>
              <span className="text-sm font-mono text-white">{sprint.buffer_original}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Buffer Consumido</span>
              <span className={`text-sm font-mono font-bold ${ZONE_COLOR[feverZone]}`}>{sprint.buffer_consumido}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Buffer Disponível</span>
              <span className="text-sm font-mono text-white">
                {Math.max(0, Number(sprint.buffer_original) - Number(sprint.buffer_consumido))}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Estado</span>
              <span className={`text-sm font-bold ${
                sprint.estado === 'concluido' ? 'text-emerald-400' :
                sprint.estado === 'ativo' ? 'text-blue-400' : 'text-slate-500'
              }`}>
                {sprint.estado === 'concluido' ? 'Concluído' : sprint.estado === 'ativo' ? 'Ativo' : 'Futuro'}
              </span>
            </div>
            {sprint.data_inicio && (
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Período</span>
                <span className="text-xs font-mono text-slate-400">
                  {sprint.data_inicio?.slice(5)} → {sprint.data_fim?.slice(5)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Tarefas CC</span>
              <span className="text-sm font-mono text-white">
                {tarefas.filter(t => t.no_caminho_critico).length}/{tarefas.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sanfona Completa (5 abas) */}
      <SprintSanfona
        sprint={sprintInfo}
        tarefas={tarefas}
        projetoId={projetoId}
        onClose={() => router.push(`/${projetoId}`)}
      />
    </div>
  )
}
