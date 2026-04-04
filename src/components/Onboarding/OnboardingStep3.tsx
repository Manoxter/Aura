'use client'

/**
 * OnboardingStep3 — SaaS-2 AC-4
 *
 * "Adicione sua primeira tarefa"
 * Fields:
 *   - nome (required)
 *   - duracao in days (number, 1–999)
 *   - responsavel (text, optional)
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'

export interface Step3Data {
  nomeTarefa: string
  duracao: number | ''
  responsavel: string
}

interface Props {
  data: Step3Data
  onChange: (data: Step3Data) => void
  errors: Partial<Record<keyof Step3Data, string>>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

export function validateStep3(data: Step3Data): Partial<Record<keyof Step3Data, string>> {
  const errors: Partial<Record<keyof Step3Data, string>> = {}

  if (!data.nomeTarefa.trim()) {
    errors.nomeTarefa = 'Nome da tarefa é obrigatório'
  }

  if (
    data.duracao === '' ||
    (typeof data.duracao === 'number' && (data.duracao < 1 || data.duracao > 999))
  ) {
    errors.duracao = 'Duração deve ser entre 1 e 999 dias'
  }

  return errors
}

export default function OnboardingStep3({ data, onChange, errors }: Props) {
  function set<K extends keyof Step3Data>(key: K, value: Step3Data[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Context card */}
      <div className="bg-surface-raised/50 border border-border rounded-2xl p-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          No MetodoAura, cada tarefa é um segmento do caminho critico do projeto.
          Esta será a primeira entrada da sua Estrutura Analítica de Projeto (EAP).
        </p>
      </div>

      {/* Nome da tarefa */}
      <div>
        <label
          htmlFor="ob-tarefa-nome"
          className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
        >
          Nome da Tarefa <span className="text-red-400">*</span>
        </label>
        <input
          id="ob-tarefa-nome"
          type="text"
          value={data.nomeTarefa}
          onChange={(e) => set('nomeTarefa', e.target.value)}
          placeholder="Ex: Levantamento de requisitos"
          maxLength={120}
          className={`w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors text-sm ${
            errors.nomeTarefa
              ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
              : 'border-border focus:border-border-focus focus:ring-border-focus'
          }`}
          autoFocus
        />
        <FieldError message={errors.nomeTarefa} />
      </div>

      {/* Duração */}
      <div>
        <label
          htmlFor="ob-tarefa-duracao"
          className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
        >
          Duração <span className="text-slate-500 font-normal normal-case">(em dias)</span>
        </label>
        <div className="relative">
          <input
            id="ob-tarefa-duracao"
            type="number"
            min={1}
            max={999}
            value={data.duracao}
            onChange={(e) =>
              set('duracao', e.target.value === '' ? '' : parseInt(e.target.value, 10))
            }
            placeholder="Ex: 5"
            className={`w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors text-sm ${
              errors.duracao
                ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
                : 'border-border focus:border-border-focus focus:ring-border-focus'
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
            dias
          </span>
        </div>
        <FieldError message={errors.duracao} />
      </div>

      {/* Responsável */}
      <div>
        <label
          htmlFor="ob-tarefa-responsavel"
          className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
        >
          Responsável{' '}
          <span className="text-slate-600 normal-case font-normal">(opcional)</span>
        </label>
        <input
          id="ob-tarefa-responsavel"
          type="text"
          value={data.responsavel}
          onChange={(e) => set('responsavel', e.target.value)}
          placeholder="Ex: Ana Lima"
          maxLength={80}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-colors text-sm"
        />
      </div>
    </div>
  )
}
