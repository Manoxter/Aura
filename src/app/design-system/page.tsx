'use client'

import { useState } from 'react'
import { ZONA_LABELS, CDT_LABELS } from '@/lib/constants/cdt-labels'
import { MATEDBadge } from '@/components/ui/MATEDBadge'
import { EmptyState } from '@/components/ui/EmptyState'

// Section wrapper
function DSSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-bold text-slate-100 mb-6 pb-2 border-b border-border">{title}</h2>
      {children}
    </section>
  )
}

// Color swatch
function Swatch({ name, className, value }: { name: string; className: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`h-12 w-12 rounded-xl ${className} border border-border`} />
      <span className="text-xs text-slate-300 font-medium">{name}</span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
  )
}

export default function DesignSystemPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [toastDemo, setToastDemo] = useState<string | null>(null)
  const [animDemo, setAnimDemo] = useState<string | null>(null)

  // Suppress unused variable warning — toastDemo reserved for future Toast section
  void toastDemo

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-klauss-bg border border-klauss-border text-klauss text-xs font-medium mb-4">
          🛠️ Development Only
        </div>
        <h1 className="text-4xl font-bold text-slate-100">Aura Design System</h1>
        <p className="text-slate-400 mt-2">Referência visual de tokens, componentes e utilitários.</p>
      </div>

      {/* ══════════ TOKENS — CORES ══════════ */}
      <DSSection title="Tokens — Cores">
        <div className="space-y-6">
          {/* MATED Zones */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Zonas MATED</h3>
            <div className="flex gap-8 flex-wrap">
              <Swatch name="zona-otimo" className="bg-zona-otimo" value="#10b981" />
              <Swatch name="zona-seguro" className="bg-zona-seguro" value="#3b82f6" />
              <Swatch name="zona-risco" className="bg-zona-risco" value="#f59e0b" />
              <Swatch name="zona-crise" className="bg-zona-crise" value="#f43f5e" />
            </div>
          </div>

          {/* CDT */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">CDT Dimensões</h3>
            <div className="flex gap-8 flex-wrap">
              <Swatch name="cdt-escopo" className="bg-cdt-escopo" value="#3b82f6" />
              <Swatch name="cdt-custo" className="bg-cdt-custo" value="#10b981" />
              <Swatch name="cdt-prazo" className="bg-cdt-prazo" value="#f59e0b" />
            </div>
          </div>

          {/* Klauss */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Klauss IA</h3>
            <div className="flex gap-8 flex-wrap">
              <Swatch name="klauss" className="bg-klauss" value="#6366f1" />
              <Swatch name="klauss-bg" className="bg-klauss-bg border border-klauss-border" value="#6366f108" />
            </div>
          </div>

          {/* Surface */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Surface</h3>
            <div className="flex gap-8 flex-wrap">
              <Swatch name="background" className="bg-background" value="var(--background)" />
              <Swatch name="surface" className="bg-surface" value="var(--surface)" />
              <Swatch name="surface-raised" className="bg-surface-raised" value="var(--surface-raised)" />
              <Swatch name="surface-overlay" className="bg-surface-overlay" value="var(--surface-overlay)" />
            </div>
          </div>
        </div>
      </DSSection>

      {/* ══════════ TIPOGRAFIA ══════════ */}
      <DSSection title="Tipografia">
        <div className="space-y-3 font-mono">
          {[
            { size: 'text-2xs', label: 'text-2xs', example: '10px — Micro labels' },
            { size: 'text-xs', label: 'text-xs', example: '12px — Captions, badges' },
            { size: 'text-sm', label: 'text-sm', example: '14px — Body secondary' },
            { size: 'text-base', label: 'text-base', example: '16px — Body primary' },
            { size: 'text-lg', label: 'text-lg', example: '18px — Subheadings' },
            { size: 'text-xl', label: 'text-xl', example: '20px — Headings' },
            { size: 'text-2xl', label: 'text-2xl', example: '24px — Page titles' },
            { size: 'text-3xl', label: 'text-3xl', example: '30px — Hero text' },
            { size: 'text-metric', label: 'text-metric', example: '40px — KPI metrics' },
          ].map(({ size, label, example }) => (
            <div key={size} className="flex items-baseline gap-4">
              <span className="w-24 text-xs text-slate-500 font-mono shrink-0">{label}</span>
              <span className={`${size} text-slate-100`}>{example}</span>
            </div>
          ))}
        </div>
      </DSSection>

      {/* ══════════ SOMBRAS ══════════ */}
      <DSSection title="Sombras">
        <div className="flex gap-8 flex-wrap">
          {[
            { name: 'shadow-card', cls: 'shadow-card' },
            { name: 'shadow-card-hover', cls: 'shadow-card-hover' },
            { name: 'shadow-modal', cls: 'shadow-modal' },
            { name: 'glow-emerald', cls: 'shadow-glow-emerald' },
            { name: 'glow-blue', cls: 'shadow-glow-blue' },
            { name: 'glow-amber', cls: 'shadow-glow-amber' },
            { name: 'glow-rose', cls: 'shadow-glow-rose' },
            { name: 'glow-indigo', cls: 'shadow-glow-indigo' },
          ].map(({ name, cls }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className={`h-16 w-28 rounded-xl bg-surface-raised ${cls}`} />
              <span className="text-xs text-slate-400">{name}</span>
            </div>
          ))}
        </div>
      </DSSection>

      {/* ══════════ ANIMAÇÕES ══════════ */}
      <DSSection title="Animações">
        <div className="flex gap-6 flex-wrap">
          {[
            { name: 'fade-in', cls: 'animate-fade-in' },
            { name: 'slide-up', cls: 'animate-slide-up' },
            { name: 'pulse-slow', cls: 'animate-pulse-slow' },
            { name: 'glow', cls: 'animate-glow' },
            { name: 'slide-in-right', cls: 'animate-slide-in-right' },
            { name: 'slide-in-left', cls: 'animate-slide-in-left' },
            { name: 'scale-in', cls: 'animate-scale-in' },
          ].map(({ name, cls }) => (
            <button
              key={name}
              onClick={() => setAnimDemo(animDemo === name ? null : name)}
              className="flex flex-col items-center gap-2 group"
              aria-label={`Preview animação ${name}`}
            >
              <div className={`h-14 w-24 rounded-xl bg-klauss-bg border border-klauss-border flex items-center justify-center ${animDemo === name ? cls : ''}`}>
                <span className="text-klauss text-xs font-medium">▶</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Clique para ver a animação.</p>
      </DSSection>

      {/* ══════════ COMPONENTES ══════════ */}
      <DSSection title="Componentes">
        {/* MATED Badges */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">MATED Badge</h3>
          <div className="flex gap-4 flex-wrap items-center">
            <MATEDBadge zona="OTIMO" size="xs" />
            <MATEDBadge zona="OTIMO" size="sm" />
            <MATEDBadge zona="OTIMO" size="md" />
            <MATEDBadge zona="SEGURO" size="md" />
            <MATEDBadge zona="RISCO" size="md" />
            <MATEDBadge zona="CRISE" size="md" />
          </div>
        </div>

        {/* EmptyState */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Empty States</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmptyState
              title="Nenhuma tarefa"
              description="Adicione tarefas ao projeto para começar."
              ctaLabel="Adicionar tarefa"
              zona="otimo"
            />
            <EmptyState
              title="Projeto em risco"
              description="Configure o motor matemático para continuar."
              zona="risco"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Botões</h3>
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 bg-klauss text-white rounded-xl font-medium hover:bg-klauss/80 transition-colors text-sm">
              Primary
            </button>
            <button className="px-4 py-2 bg-zona-otimo text-white rounded-xl font-medium hover:bg-zona-otimo/80 transition-colors text-sm">
              Success
            </button>
            <button className="px-4 py-2 bg-zona-crise text-white rounded-xl font-medium hover:bg-zona-crise/80 transition-colors text-sm">
              Danger
            </button>
            <button className="px-4 py-2 bg-surface-raised border border-border text-slate-300 rounded-xl font-medium hover:bg-surface-overlay transition-colors text-sm">
              Secondary
            </button>
            <button disabled className="px-4 py-2 bg-klauss text-white rounded-xl font-medium opacity-50 cursor-not-allowed text-sm">
              Disabled
            </button>
          </div>
        </div>
      </DSSection>

      {/* ══════════ UTILITÁRIOS CSS ══════════ */}
      <DSSection title="Utilitários CSS">
        <div className="space-y-6">
          {/* Zona utilities */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Zona Utilities</h3>
            <div className="flex gap-4 flex-wrap">
              <div className="zona-otimo border rounded-xl px-4 py-2 text-sm font-medium">.zona-otimo</div>
              <div className="zona-seguro border rounded-xl px-4 py-2 text-sm font-medium">.zona-seguro</div>
              <div className="zona-risco border rounded-xl px-4 py-2 text-sm font-medium">.zona-risco</div>
              <div className="zona-crise border rounded-xl px-4 py-2 text-sm font-medium">.zona-crise</div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Classes compostas: bg + border + text do token da zona.</p>
          </div>

          {/* Glass */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Glass Effect</h3>
            <div className="glass rounded-xl px-6 py-4 inline-block">
              <span className="text-slate-300 text-sm">.glass — backdrop-blur + bg-slate-900/80</span>
            </div>
          </div>

          {/* aura-card */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Card</h3>
            <div className="aura-card rounded-xl px-6 py-4 inline-block">
              <span className="text-slate-300 text-sm">.aura-card — bg-slate-900 + border + shadow</span>
            </div>
          </div>

          {/* aura-badge */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Badge</h3>
            <div className="flex gap-3 flex-wrap items-center">
              <span className="aura-badge bg-emerald-500/10 border-emerald-500/40 text-emerald-400">.aura-badge Ótimo</span>
              <span className="aura-badge bg-blue-500/10 border-blue-500/40 text-blue-400">.aura-badge Seguro</span>
              <span className="aura-badge bg-amber-500/10 border-amber-500/40 text-amber-400">.aura-badge Risco</span>
              <span className="aura-badge bg-rose-500/10 border-rose-500/40 text-rose-400">.aura-badge Crise</span>
            </div>
          </div>
        </div>
      </DSSection>

      {/* ══════════ LABELS SEMÂNTICOS ══════════ */}
      <DSSection title="Labels Semânticos (CDT / ZONA)">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">CDT_LABELS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(CDT_LABELS) as [string, typeof CDT_LABELS[keyof typeof CDT_LABELS]][]).map(([key, entry]) => (
                <div key={key} className="aura-card rounded-xl p-3 space-y-1">
                  <span className="text-xs text-slate-500 font-mono">CDT_LABELS.{key}</span>
                  <p className="text-sm font-semibold text-slate-100">{entry.longo}</p>
                  <p className="text-xs text-slate-400">{entry.tooltip}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">ZONA_LABELS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(ZONA_LABELS) as [string, typeof ZONA_LABELS[keyof typeof ZONA_LABELS]][]).map(([key, entry]) => (
                <div key={key} className="aura-card rounded-xl p-3 space-y-1">
                  <span className="text-xs text-slate-500 font-mono">ZONA_LABELS.{key}</span>
                  <p className="text-sm font-semibold text-slate-100">{entry.icone} {entry.nome}</p>
                  <p className="text-xs text-slate-400">{entry.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DSSection>
    </div>
  )
}
