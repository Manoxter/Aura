'use client'

/**
 * Tela de Coleta — Painel de Convites (Etapa 4)
 *
 * PM vê lista de colaboradores e status de resposta.
 * Compartilha link por email/chat. Quando 100% responderam,
 * botão "Calcular CCPM" aparece e dispara o motor automático.
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, ArrowRight, Mail, Check, Clock, Copy, Zap, ChevronRight, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Convite {
  id: string
  email: string
  nome: string
  papel: string
  token: string
  respondido: boolean
  respondido_em: string | null
}

export default function ColetaPage() {
  const params = useParams()
  const router = useRouter()
  const projetoId = params.projetoId as string

  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoPapel, setNovoPapel] = useState('dev')
  const [adding, setAdding] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [calculando, setCalculando] = useState(false)

  useEffect(() => {
    loadConvites()
  }, [projetoId])

  async function loadConvites() {
    const { data } = await supabase
      .from('convites_projeto')
      .select('id, email, nome, papel, token, respondido, respondido_em')
      .eq('projeto_id', projetoId)
      .order('created_at')
    if (data) setConvites(data)
    setLoading(false)
  }

  const addConvite = async () => {
    if (!novoEmail.trim()) return
    setAdding(true)

    const { data: proj } = await supabase.from('projetos').select('tenant_id').eq('id', projetoId).single()
    if (!proj) { setAdding(false); return }

    // Generate token
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

    await supabase.from('convites_projeto').insert({
      projeto_id: projetoId,
      tenant_id: proj.tenant_id,
      email: novoEmail.trim(),
      nome: novoNome.trim() || novoEmail.split('@')[0],
      papel: novoPapel,
      token,
      respondido: false,
    })

    setNovoEmail('')
    setNovoNome('')
    setNovoPapel('dev')
    setAdding(false)
    loadConvites()
  }

  const removeConvite = async (id: string) => {
    await supabase.from('convites_projeto').delete().eq('id', id)
    loadConvites()
  }

  const copyLink = (token: string) => {
    const url = window.location.origin + '/estimativas/' + token
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const total = convites.length
  const respondidos = convites.filter(c => c.respondido).length
  const todosResponderam = total > 0 && respondidos >= total
  const progressPct = total > 0 ? (respondidos / total) * 100 : 0

  const handleCalcularCCPM = async () => {
    setCalculando(true)

    // Buscar tenant_id
    const { data: proj } = await supabase.from('projetos').select('tenant_id').eq('id', projetoId).single()
    if (!proj) { setCalculando(false); return }

    try {
      const res = await fetch('/api/ccpm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projetoId, tenantId: proj.tenant_id }),
      })
      const data = await res.json()

      if (data.success) {
        router.push('/' + projetoId)
      } else {
        alert('Erro no cálculo CCPM: ' + (data.error || 'desconhecido'))
        setCalculando(false)
      }
    } catch {
      alert('Erro de conexão ao calcular CCPM')
      setCalculando(false)
    }
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
          <button onClick={() => router.push('/' + projetoId + '/setup/wbs')} className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> WBS
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-blue-400">Coleta</span>
        </div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          Coleta de Estimativas
        </h1>
        <p className="text-slate-400">
          Convide colaboradores para estimar as tarefas. Eles respondem por um <strong className="text-white">link sem precisar de login</strong>.
          Quando todos responderem, o motor CCPM calcula tudo automaticamente.
        </p>
      </header>

      {/* Progress */}
      <div className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">Progresso da coleta</span>
          <span className="text-sm font-mono font-bold text-white">{respondidos}/{total}</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={'h-full rounded-full transition-all duration-500 ' + (todosResponderam ? 'bg-emerald-400' : 'bg-blue-500')}
            style={{ width: progressPct + '%' }}
          />
        </div>
        {todosResponderam && (
          <p className="text-emerald-400 text-sm mt-2 font-bold">Todos responderam! Pronto para calcular.</p>
        )}
      </div>

      {/* Add collaborator form */}
      <div className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl p-5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Convidar Colaborador</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"
          />
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome (opcional)"
            className="bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"
          />
          <select
            value={novoPapel}
            onChange={(e) => setNovoPapel(e.target.value)}
            className="bg-[#05080A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"
          >
            <option value="dev">Desenvolvedor</option>
            <option value="designer">Designer</option>
            <option value="qa">QA</option>
            <option value="devops">DevOps</option>
            <option value="pm">PM</option>
            <option value="outro">Outro</option>
          </select>
          <button
            onClick={addConvite}
            disabled={adding || !novoEmail.trim()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-bold transition-all"
          >
            <Plus className="h-4 w-4" />
            Convidar
          </button>
        </div>
      </div>

      {/* Collaborator list */}
      <div className="rounded-xl border border-white/5 bg-[#0A0E12]/80 backdrop-blur-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Colaborador</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Papel</th>
              <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Link</th>
              <th className="px-3 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {convites.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.03]">
                <td className="px-5 py-3">
                  <p className="text-sm font-bold text-white">{c.nome}</p>
                  <p className="text-[11px] text-slate-500">{c.email}</p>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded">{c.papel}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {c.respondido ? (
                    <span className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Respondido
                    </span>
                  ) : (
                    <span className="text-amber-400 text-xs flex items-center justify-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Pendente
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => copyLink(c.token)}
                    className="text-slate-500 hover:text-blue-400 transition-colors text-xs flex items-center justify-center gap-1 mx-auto"
                  >
                    {copied === c.token ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copiar Link</>
                    )}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => removeConvite(c.id)} className="text-slate-700 hover:text-rose-500 transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {convites.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                  Nenhum colaborador convidado ainda. Adicione acima para começar a coleta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => router.push('/' + projetoId + '/setup/wbs')}
          className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao WBS
        </button>

        {todosResponderam ? (
          <button
            onClick={handleCalcularCCPM}
            disabled={calculando}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all animate-pulse"
          >
            <Zap className="h-5 w-5" />
            {calculando ? 'Calculando CCPM...' : 'Calcular Motor CCPM'}
          </button>
        ) : (
          <div className="text-sm text-slate-500">
            Aguardando {total - respondidos} resposta{total - respondidos !== 1 ? 's' : ''}...
          </div>
        )}
      </div>
    </div>
  )
}
