'use client'

/**
 * Página Pública de Estimativas — Colaborador responde SEM login
 *
 * Acessada via link com token (compartilhado por email/chat).
 * Colaborador vê lista de tarefas e informa:
 *   - Tempo otimista (horas)
 *   - Tempo pessimista (horas)
 *   - Custo otimista (R$)
 *   - Custo pessimista (R$)
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, Clock, AlertCircle, Send } from 'lucide-react'
import Image from 'next/image'

interface TarefaEstimativa {
  id: string
  nome: string
  id_string: string | null
  ordem: number
  duracao_otimista: string
  duracao_pessimista: string
  custo_otimista: string
  custo_pessimista: string
}

interface ConviteInfo {
  id: string
  nome: string
  papel: string
  email: string
}

interface ProjetoInfo {
  id: string
  nome: string
}

export default function EstimativasPublicPage() {
  const params = useParams()
  const token = params.token as string

  const [convite, setConvite] = useState<ConviteInfo | null>(null)
  const [projeto, setProjeto] = useState<ProjetoInfo | null>(null)
  const [tarefas, setTarefas] = useState<TarefaEstimativa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [jaRespondido, setJaRespondido] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/estimativas?token=' + token)
        const data = await res.json()

        if (!res.ok) {
          if (res.status === 409) {
            setJaRespondido(true)
          } else {
            setError(data.error || 'Link inválido ou expirado.')
          }
          setLoading(false)
          return
        }

        setConvite(data.convite)
        setProjeto(data.projeto)
        setTarefas(data.tarefas.map((t: { id: string; nome: string; id_string: string | null; ordem: number }) => ({
          ...t,
          duracao_otimista: '',
          duracao_pessimista: '',
          custo_otimista: '',
          custo_pessimista: '',
        })))
      } catch {
        setError('Erro ao carregar dados.')
      }
      setLoading(false)
    }
    load()
  }, [token])

  const updateTarefa = (idx: number, field: string, value: string) => {
    setTarefas(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const isValid = () => {
    return tarefas.every(t =>
      Number(t.duracao_otimista) > 0 &&
      Number(t.duracao_pessimista) > 0 &&
      Number(t.duracao_otimista) <= Number(t.duracao_pessimista)
    )
  }

  const handleSubmit = async () => {
    if (!isValid()) return
    setEnviando(true)

    try {
      const res = await fetch('/api/estimativas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          estimativas: tarefas.map(t => ({
            tarefa_id: t.id,
            duracao_otimista: Number(t.duracao_otimista),
            duracao_pessimista: Number(t.duracao_pessimista),
            custo_otimista: Number(t.custo_otimista) || 0,
            custo_pessimista: Number(t.custo_pessimista) || 0,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao enviar.')
        setEnviando(false)
        return
      }

      setSucesso(true)
    } catch {
      setError('Erro de conexão.')
    }
    setEnviando(false)
  }

  // ── States ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05080A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (jaRespondido) {
    return (
      <div className="min-h-screen bg-[#05080A] flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <Image src="/icon-aura.png" alt="Aura" width={48} height={48} className="mx-auto" />
          <h1 className="text-2xl font-bold text-white">Estimativas já enviadas</h1>
          <p className="text-slate-400">Suas estimativas foram registradas com sucesso. Obrigado pela contribuição!</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#05080A] flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Link inválido</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#05080A] flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Estimativas enviadas!</h1>
          <p className="text-slate-400">
            Obrigado, {convite?.nome}! Suas estimativas foram registradas para o projeto <strong className="text-white">{projeto?.nome}</strong>.
          </p>
          <p className="text-xs text-slate-600">Você pode fechar esta página.</p>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#05080A] text-white">
      <div className="aura-bg-logo" />

      <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-8 space-y-3">
          <Image src="/logo-aura.png" alt="Aura" width={120} height={60} className="mx-auto" />
          <h1 className="text-2xl font-bold">Estimativa de Tarefas</h1>
          <p className="text-slate-400">
            Olá <strong className="text-white">{convite?.nome}</strong>! Você foi convidado para estimar tarefas do projeto <strong className="text-blue-400">{projeto?.nome}</strong>.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Papel: <span className="text-white">{convite?.papel}</span>
          </div>
        </header>

        {/* Instructions */}
        <div className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-4 mb-6">
          <p className="text-sm text-slate-400">
            Para cada tarefa, informe sua estimativa de <strong className="text-white">tempo</strong> e <strong className="text-white">custo</strong>:
          </p>
          <ul className="mt-2 text-xs text-slate-500 space-y-1">
            <li>• <strong>Otimista:</strong> se tudo correr perfeitamente, sem imprevistos</li>
            <li>• <strong>Pessimista:</strong> se tudo complicar (mas ainda realizável)</li>
          </ul>
        </div>

        {/* Task list */}
        <div className="space-y-4">
          {tarefas.map((t, idx) => (
            <div key={t.id} className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  {t.id_string || '#' + (idx + 1)}
                </span>
                <h3 className="text-sm font-bold text-white">{t.nome}</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Tempo Otimista (h)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={t.duracao_otimista}
                    onChange={(e) => updateTarefa(idx, 'duracao_otimista', e.target.value)}
                    placeholder="Ex: 4"
                    className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Tempo Pessimista (h)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={t.duracao_pessimista}
                    onChange={(e) => updateTarefa(idx, 'duracao_pessimista', e.target.value)}
                    placeholder="Ex: 12"
                    className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Custo Otimista (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={t.custo_otimista}
                    onChange={(e) => updateTarefa(idx, 'custo_otimista', e.target.value)}
                    placeholder="Ex: 500"
                    className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Custo Pessimista (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={t.custo_pessimista}
                    onChange={(e) => updateTarefa(idx, 'custo_pessimista', e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Validation hint */}
              {Number(t.duracao_otimista) > Number(t.duracao_pessimista) && Number(t.duracao_pessimista) > 0 && (
                <p className="text-xs text-rose-400 mt-2">Tempo otimista não pode ser maior que pessimista.</p>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={enviando || !isValid()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
          >
            {enviando ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
            ) : (
              <><Send className="h-5 w-5" /> Enviar Estimativas</>
            )}
          </button>
          <p className="text-xs text-slate-600 mt-3">
            Suas estimativas são confidenciais e serão usadas apenas para cálculo de buffer do projeto.
          </p>
        </div>
      </div>
    </div>
  )
}
