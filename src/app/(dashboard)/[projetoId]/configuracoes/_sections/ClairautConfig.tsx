'use client'

/**
 * ClairautConfig — Seção "Integridade do Triângulo" em /configuracoes
 *
 * Permite o usuário selecionar o modo de visualização do Painel Clairaut
 * com live preview usando dados reais do projeto atual.
 *
 * Story 2.0-ui — Sprint SC-FOUNDATION
 */

import { useState, useTransition } from 'react'
import { CheckCircle2, Triangle, Gauge, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  PainelIntegridadeTriangulo,
  type ClairautDisplayMode,
} from '@/components/aura/PainelIntegridadeTriangulo'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ModeOption {
  value: ClairautDisplayMode
  label: string
  descricao: string
  Icon: typeof Triangle
}

const MODOS: ModeOption[] = [
  {
    value: 'triangle-live',
    label: 'Triângulo Vivo',
    descricao: 'Arcos coloridos sobrepostos nos vértices do triângulo de monitoramento.',
    Icon: Triangle,
  },
  {
    value: 'gauge-panel',
    label: 'Painel de Instrumentos',
    descricao: 'Três velocímetros semicirculares exibindo α, ω, ε separadamente.',
    Icon: Gauge,
  },
  {
    value: 'radar',
    label: 'Radar Angular',
    descricao: 'Spider chart triangular com saúde angular do projeto em formato radar.',
    Icon: Radar,
  },
]

interface ClairautConfigProps {
  /** Lados normalizados do CDT atual — usados no live preview */
  E?: number | null
  P?: number | null
  O?: number | null
  /** tenantId para persistir no Supabase */
  tenantId: string | null
  /** Modo atual salvo no banco */
  modoAtual?: ClairautDisplayMode
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function ClairautConfig({
  E,
  P,
  O,
  tenantId,
  modoAtual = 'triangle-live',
}: ClairautConfigProps) {
  const [modoPendente, setModoPendente] = useState<ClairautDisplayMode>(modoAtual)
  const [modoSalvo, setModoSalvo] = useState<ClairautDisplayMode>(modoAtual)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function salvarModo(novoModo: ClairautDisplayMode) {
    setModoPendente(novoModo)
    if (!tenantId) return

    setSalvando(true)
    setErro(null)

    startTransition(() => {
      supabase
        .from('tenants')
        .update({ clairaut_display_mode: novoModo })
        .eq('id', tenantId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ error }: { error: any }) => {
          setSalvando(false)
          if (error) {
            setErro('Falha ao salvar preferência. Tente novamente.')
            setModoPendente(modoSalvo)
          } else {
            setModoSalvo(novoModo)
          }
        })
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Integridade do Triângulo</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Escolha como o Painel Clairaut exibe os ângulos α, ω, ε do triângulo de monitoramento.
        </p>
      </div>

      {/* Seletor de modo com live preview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODOS.map(({ value, label, descricao, Icon }) => {
          const ativo = modoPendente === value
          const salvo = modoSalvo === value

          return (
            <button
              key={value}
              onClick={() => salvarModo(value)}
              className={cn(
                'relative flex flex-col rounded-xl border p-3 text-left transition-all duration-200',
                'hover:border-indigo-500/60 hover:bg-slate-800/60',
                ativo
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.5)]'
                  : 'border-slate-700 bg-slate-800/30'
              )}
              disabled={salvando}
            >
              {/* Ícone "salvo" */}
              {salvo && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-indigo-400" />
              )}

              {/* Live Preview */}
              <div className="mb-3 rounded-lg bg-slate-900/60 p-2">
                <PainelIntegridadeTriangulo
                  E={E}
                  P={P}
                  O={O}
                  mode={value}
                  showSaudeEstrutural={false}
                />
              </div>

              {/* Título e descrição */}
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-200">{label}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{descricao}</p>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {salvando && (
        <p className="text-xs text-slate-500">Salvando preferência…</p>
      )}
      {erro && (
        <p className="text-xs text-rose-400">{erro}</p>
      )}
    </div>
  )
}
