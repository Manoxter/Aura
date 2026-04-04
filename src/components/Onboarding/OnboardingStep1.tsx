'use client'

/**
 * OnboardingStep1 — SaaS-2 AC-2
 *
 * "Qual é o seu projeto?"
 * Fields: nome (required, ≥3 chars), tipo (select), setor (text, optional),
 *         data_inicio (date), data_fim (date)
 * Validation: nome ≥ 3 chars, data_fim > data_inicio
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'

export type ProjectTipo = 'software'

export interface Step1Data {
  nome: string
  tipo: ProjectTipo
  setor: string
  dataInicio: string
  dataFim: string
}

interface Props {
  data: Step1Data
  onChange: (data: Step1Data) => void
  errors: Partial<Record<keyof Step1Data, string>>
}

// Aura: tipo fixo = 'software' (produto exclusivo Tech/Digital)

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  )
}

export function validateStep1(data: Step1Data): Partial<Record<keyof Step1Data, string>> {
  const errors: Partial<Record<keyof Step1Data, string>> = {}

  if (!data.nome.trim()) {
    errors.nome = 'Nome do projeto é obrigatório'
  } else if (data.nome.trim().length < 3) {
    errors.nome = 'Nome deve ter pelo menos 3 caracteres'
  }

  if (data.dataInicio && data.dataFim && data.dataFim <= data.dataInicio) {
    errors.dataFim = 'Data de fim deve ser posterior à data de início'
  }

  return errors
}

export default function OnboardingStep1({ data, onChange, errors }: Props) {
  function set<K extends keyof Step1Data>(key: K, value: Step1Data[K]) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="space-y-5">
      {/* Nome */}
      <div>
        <label
          htmlFor="ob-nome"
          className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
        >
          Nome do Projeto <span className="text-red-400">*</span>
        </label>
        <input
          id="ob-nome"
          type="text"
          value={data.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex: Expansão Planta Industrial"
          maxLength={120}
          className={`w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors text-sm ${
            errors.nome
              ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
              : 'border-border focus:border-border-focus focus:ring-border-focus'
          }`}
          autoFocus
        />
        <FieldError message={errors.nome} />
      </div>

      {/* Aura: tipo fixo software, setor fixo tecnologia */}

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="ob-data-inicio"
            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
          >
            Data de Início
          </label>
          <input
            id="ob-data-inicio"
            type="date"
            value={data.dataInicio}
            onChange={(e) => set('dataInicio', e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-colors text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="ob-data-fim"
            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block"
          >
            Data de Fim
          </label>
          <input
            id="ob-data-fim"
            type="date"
            value={data.dataFim}
            onChange={(e) => set('dataFim', e.target.value)}
            min={data.dataInicio || undefined}
            className={`w-full bg-surface border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 transition-colors text-sm ${
              errors.dataFim
                ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
                : 'border-border focus:border-border-focus focus:ring-border-focus'
            }`}
          />
          <FieldError message={errors.dataFim} />
        </div>
      </div>
    </div>
  )
}
