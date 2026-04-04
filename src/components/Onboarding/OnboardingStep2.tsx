'use client'

/**
 * OnboardingStep2 — SaaS-2 AC-3
 *
 * "Defina as 3 dimensões do seu triângulo CDT"
 * Fields:
 *   - Escopo: nº de tarefas estimadas (1–999)
 *   - Prazo: data fim readonly (from Step 1) — "Vértice P do Triângulo CDT"
 *   - Orçamento: valor total (number, R$ prefix)
 * Each dimension shows a one-line explanation.
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'

export interface Step2Data {
  nTarefas: number | ''
  dataFimPrazo: string   // readonly — inherited from step 1
  orcamento: number | ''
}

interface Props {
  data: Step2Data
  onChange: (data: Step2Data) => void
  errors: Partial<Record<keyof Step2Data, string>>
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

export function validateStep2(data: Step2Data): Partial<Record<keyof Step2Data, string>> {
  const errors: Partial<Record<keyof Step2Data, string>> = {}

  if (data.nTarefas === '' || (typeof data.nTarefas === 'number' && (data.nTarefas < 1 || data.nTarefas > 999))) {
    errors.nTarefas = 'Informe entre 1 e 999 tarefas'
  }

  if (data.orcamento === '' || (typeof data.orcamento === 'number' && data.orcamento <= 0)) {
    errors.orcamento = 'Informe o orçamento total do projeto'
  }

  return errors
}

const CDT_DIMENSIONS = [
  {
    key: 'escopo' as const,
    letter: 'E',
    label: 'Escopo',
    colorClass: 'text-cdt-escopo border-cdt-escopo/30 bg-cdt-escopo/5',
    letterColor: 'text-cdt-escopo',
    description: 'Quantas tarefas formam a entrega completa do projeto?',
    hint: 'Representa o Lado E do triângulo — quanto maior, mais complexo o escopo.',
  },
  {
    key: 'prazo' as const,
    letter: 'P',
    label: 'Prazo',
    colorClass: 'text-cdt-prazo border-cdt-prazo/30 bg-cdt-prazo/5',
    letterColor: 'text-cdt-prazo',
    description: 'Vértice P do Triângulo CDT — define o horizonte temporal da entrega.',
    hint: 'Data confirmada do Step 1. Pode ser ajustada no TAP após o onboarding.',
  },
  {
    key: 'orcamento' as const,
    letter: 'C',
    label: 'Custo',
    colorClass: 'text-cdt-custo border-cdt-custo/30 bg-cdt-custo/5',
    letterColor: 'text-cdt-custo',
    description: 'Qual o orçamento total disponível para este projeto?',
    hint: 'Representa o Lado C do triângulo — a restrição financeira da entrega.',
  },
]

export default function OnboardingStep2({ data, onChange, errors }: Props) {
  function setField<K extends keyof Step2Data>(key: K, value: Step2Data[K]) {
    onChange({ ...data, [key]: value })
  }

  const prazoFormatted = data.dataFimPrazo
    ? new Date(data.dataFimPrazo + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Não definido'

  return (
    <div className="space-y-5">
      {CDT_DIMENSIONS.map((dim) => (
        <div
          key={dim.key}
          className={`rounded-2xl border p-5 ${dim.colorClass}`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`text-3xl font-black w-10 shrink-0 leading-none mt-0.5 ${dim.letterColor}`}
            >
              {dim.letter}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-white uppercase tracking-wide">
                  {dim.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                {dim.description}
              </p>

              {/* Input for Escopo */}
              {dim.key === 'escopo' && (
                <>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={data.nTarefas}
                    onChange={(e) =>
                      setField(
                        'nTarefas',
                        e.target.value === '' ? '' : parseInt(e.target.value, 10),
                      )
                    }
                    placeholder="Ex: 15"
                    className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors text-sm ${
                      errors.nTarefas
                        ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
                        : 'border-border focus:border-border-focus focus:ring-border-focus'
                    }`}
                  />
                  <FieldError message={errors.nTarefas} />
                </>
              )}

              {/* Readonly for Prazo */}
              {dim.key === 'prazo' && (
                <div className="w-full bg-surface/50 border border-border/50 rounded-xl px-4 py-2.5 text-slate-300 text-sm">
                  {prazoFormatted}
                </div>
              )}

              {/* Input for Orçamento */}
              {dim.key === 'orcamento' && (
                <>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        data.orcamento === ''
                          ? ''
                          : (data.orcamento as number).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                      }
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '')
                        if (digits === '') {
                          setField('orcamento', '')
                        } else {
                          setField('orcamento', parseInt(digits, 10) / 100)
                        }
                      }}
                      placeholder="1.650.000,00"
                      className={`w-full bg-surface border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-colors text-sm ${
                        errors.orcamento
                          ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30'
                          : 'border-border focus:border-border-focus focus:ring-border-focus'
                      }`}
                    />
                  </div>
                  <FieldError message={errors.orcamento} />
                </>
              )}

              <p className="text-[11px] text-slate-500 mt-2 italic">{dim.hint}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
