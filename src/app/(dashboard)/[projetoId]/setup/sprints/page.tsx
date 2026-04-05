'use client'

/**
 * Tela de Sprints — Milestones Backward (Etapa 2)
 *
 * PM define N sprints como entregas (milestones).
 * Construção BACKWARD: primeiro define o Ômega (entrega final),
 * depois define sprints de trás para frente.
 *
 * Inspiração visual: backward_pass_concept image
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, ArrowRight, Calendar, Target, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuraLogo } from '@/components/ui/AuraLogo'

interface Sprint {
  id?: string
  nome: string
  data_inicio: string
  data_fim: string
  ordem: number
}

export default function SprintsSetupPage() {
  const params = useParams()
  const router = useRouter()
  const projetoId = params.projetoId as string

  const [projeto, setProjeto] = useState<{ nome: string; data_inicio: string; data_fim: string } | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load project + existing sprints
  useEffect(() => {
    async function load() {
      const [projRes, sprintRes] = await Promise.all([
        supabase.from('projetos').select('nome, data_inicio, data_fim').eq('id', projetoId).single(),
        supabase.from('sprints_fractais').select('id, nome, ordem, data_inicio, data_fim').eq('projeto_id', projetoId).order('ordem'),
      ])
      if (projRes.data) setProjeto(projRes.data)
      if (sprintRes.data && sprintRes.data.length > 0) {
        setSprints(sprintRes.data.map(s => ({
          id: s.id,
          nome: s.nome,
          data_inicio: s.data_inicio || '',
          data_fim: s.data_fim || '',
          ordem: s.ordem,
        })))
      }
      setLoading(false)
    }
    load()
  }, [projetoId])

  // Add sprint (backward: new sprint goes BEFORE existing ones)
  const addSprint = () => {
    const newOrdem = sprints.length + 1
    const dataFim = sprints.length === 0
      ? (projeto?.data_fim || '')
      : sprints[sprints.length - 1].data_inicio // new sprint ends where previous starts

    setSprints([...sprints, {
      nome: 'Sprint ' + newOrdem,
      data_inicio: '',
      data_fim: dataFim,
      ordem: newOrdem,
    }])
  }

  const removeSprint = (idx: number) => {
    setSprints(sprints.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordem: i + 1 })))
  }

  const updateSprint = (idx: number, field: keyof Sprint, value: string) => {
    setSprints(sprints.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  // Save to Supabase
  const handleSave = async () => {
    setSaving(true)

    // Get tenant
    const { data: proj } = await supabase.from('projetos').select('tenant_id').eq('id', projetoId).single()
    if (!proj) { setSaving(false); return }

    // Delete existing sprints
    await supabase.from('sprints_fractais').delete().eq('projeto_id', projetoId)

    // Insert new (backward order: last sprint has highest ordem)
    const reversed = [...sprints].reverse()
    const rows = reversed.map((s, i) => ({
      projeto_id: projetoId,
      tenant_id: proj.tenant_id,
      nome: s.nome,
      ordem: reversed.length - i, // backward: last defined = ordem 1 (closest to start)
      data_inicio: s.data_inicio || null,
      data_fim: s.data_fim || null,
      buffer_original: 0,
      buffer_consumido: 0,
      estado: 'futuro' as const,
      impacto_propagado: 0,
    }))

    // Also create marcos for each sprint
    await supabase.from('marcos').delete().eq('projeto_id', projetoId)
    const marcos = reversed.map((s, i) => ({
      projeto_id: projetoId,
      tenant_id: proj.tenant_id,
      nome: s.nome,
      data: s.data_fim || null,
      tipo: 'milestone',
    }))

    await supabase.from('sprints_fractais').insert(rows)
    await supabase.from('marcos').insert(marcos)

    setSaving(false)
    router.push('/' + projetoId + '/setup/wbs')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-500">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
        Carregando...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => router.push('/' + projetoId + '/setup/tap')} className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> TAP
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-blue-400">Sprints</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">WBS</span>
        </div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Target className="h-8 w-8 text-blue-500" />
          Definir Sprints (Milestones)
        </h1>
        <p className="text-slate-400">
          Defina as entregas do projeto de <strong className="text-white">trás para frente</strong>.
          Comece pelo último milestone (entrega final) e vá adicionando sprints anteriores.
        </p>
      </header>

      {/* Project dates reference */}
      {projeto && (
        <div className="flex items-center gap-6 p-4 rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-slate-500">Início:</span>
            <span className="text-white font-mono">{projeto.data_inicio || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" />
            <span className="text-slate-500">Ômega (entrega final):</span>
            <span className="text-amber-400 font-mono font-bold">{projeto.data_fim || '—'}</span>
          </div>
        </div>
      )}

      {/* Backward timeline visualization */}
      <div className="relative">
        {/* Timeline line */}
        {sprints.length > 0 && (
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-amber-500/20 to-transparent" />
        )}

        {/* Sprint items */}
        <div className="space-y-4">
          {sprints.map((sprint, idx) => (
            <div key={idx} className="relative pl-14">
              {/* Timeline dot */}
              <div className={'absolute left-4 top-6 w-4 h-4 rounded-full border-2 ' + (idx === 0 ? 'border-amber-500 bg-amber-500/20' : 'border-blue-500/40 bg-blue-500/10')} />

              {/* Sprint card */}
              <div className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-1 rounded">
                      {idx === 0 ? 'ÔMEGA' : 'S' + (sprints.length - idx)}
                    </span>
                    <input
                      type="text"
                      value={sprint.nome}
                      onChange={(e) => updateSprint(idx, 'nome', e.target.value)}
                      className="bg-transparent border-none text-white font-bold text-lg outline-none placeholder-slate-600 flex-1"
                      placeholder="Nome do Sprint / Milestone"
                    />
                  </div>
                  <button
                    onClick={() => removeSprint(idx)}
                    className="text-slate-700 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Data Início</label>
                    <input
                      type="date"
                      value={sprint.data_inicio}
                      onChange={(e) => updateSprint(idx, 'data_inicio', e.target.value)}
                      className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Data Entrega (Milestone)</label>
                    <input
                      type="date"
                      value={sprint.data_fim}
                      onChange={(e) => updateSprint(idx, 'data_fim', e.target.value)}
                      className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add sprint button */}
        <div className="pl-14 mt-4">
          <button
            onClick={addSprint}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-800/50 text-slate-500 hover:text-blue-400 hover:border-blue-500/30 transition-all"
          >
            <Plus className="h-5 w-5" />
            {sprints.length === 0 ? 'Definir primeiro sprint (entrega final → Ômega)' : 'Adicionar sprint anterior'}
          </button>
        </div>
      </div>

      {/* Backward arrow hint */}
      {sprints.length > 1 && (
        <div className="flex items-center justify-center gap-3 text-slate-600 text-sm">
          <ArrowLeft className="h-4 w-4" />
          <span>Construção backward: da entrega final para o início</span>
          <ArrowLeft className="h-4 w-4" />
        </div>
      )}

      {/* Save + Next */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => router.push('/' + projetoId + '/setup/tap')}
          className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao TAP
        </button>

        <button
          onClick={handleSave}
          disabled={saving || sprints.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          {saving ? 'Salvando...' : 'Salvar e definir tarefas'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
