'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, LogOut, ArrowRight, ChevronRight } from 'lucide-react'
import { AuraLogo } from '@/components/ui/AuraLogo'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { performLogout } from '@/lib/auth/logout'
import { useToast } from '@/hooks/useToast'

type FeverZone = 'azul' | 'verde' | 'amarelo' | 'vermelho' | 'preto'

type ProjetoPortfolio = {
  id: string
  nome: string
  status: string
  prazo_total: number | null
  orcamento_total: number | null
  // Computed
  sprintCount: number
  sprintAtivo: string | null
  bufferPct: number
  feverZone: FeverZone
  iq: number
  klaussSummary: string
}

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const { session, loading: authLoading } = useAuth()
  const [projetos, setProjetos] = useState<ProjetoPortfolio[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userId, setUserId] = useState<string | null>(null)
  // BUG-01: previne state updates em componente desmontado (race condition)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Aguarda auth carregar antes de decidir redirect (evita loop getSession() null)
  useEffect(() => {
    if (authLoading) return
    if (!session) {
      router.replace('/login')
      return
    }
    setUserId(session.user.id)
    loadProjects(session.user.id)
  }, [authLoading, session])

  async function loadProjects(uid: string) {
    if (!isMounted.current) return
    setLoading(true)

    try {
      // SaaS Onboarding Check: Ensure tenant exists
      const { data: tenant, error: tError } = await supabase
        .from('tenants')
        .select('id, profile_type')
        .eq('owner_id', uid)
        .maybeSingle()

      if (tError) throw tError
      if (!isMounted.current) return

      if (!tenant) {
        router.replace('/onboarding')
        return
      }

      const { data, error: pError } = await supabase
        .from('projetos')
        .select('id, nome, status, prazo_total, orcamento_total')
        .order('criado_em', { ascending: false })

      if (pError) throw pError
      if (!data || !isMounted.current) return

      // Enrich with sprint data for fever/buffer calculation
      const enriched: ProjetoPortfolio[] = await Promise.all(
        data.map(async (p) => {
          const { data: sprints } = await supabase
            .from('sprints_fractais')
            .select('nome, estado, buffer_original, buffer_consumido')
            .eq('projeto_id', p.id)

          const sprintList = sprints ?? []
          const sprintAtivo = sprintList.find(s => s.estado === 'ativo')
          const totalBuffer = sprintList.reduce((a, s) => a + (Number(s.buffer_original) || 0), 0)
          const consumedBuffer = sprintList.reduce((a, s) => a + (Number(s.buffer_consumido) || 0), 0)
          const bufferPct = totalBuffer > 0 ? (consumedBuffer / totalBuffer) * 100 : 0

          let feverZone: FeverZone = 'verde'
          if (bufferPct < 0) feverZone = 'azul'
          else if (bufferPct <= 33) feverZone = 'verde'
          else if (bufferPct <= 66) feverZone = 'amarelo'
          else if (bufferPct <= 100) feverZone = 'vermelho'
          else feverZone = 'preto'

          // Simple IQ approximation (100% = on track)
          const concluidos = sprintList.filter(s => s.estado === 'concluido').length
          const iq = sprintList.length > 0
            ? Math.round(((concluidos / sprintList.length) * 50 + 50) * (1 - bufferPct / 200))
            : 100

          // Klauss summary by zone
          const klaussSummary = feverZone === 'azul'
            ? 'Remissão ativa. Projeto devolvendo buffer.'
            : feverZone === 'verde'
            ? 'Execução dentro do esperado. Buffer intacto.'
            : feverZone === 'amarelo'
            ? `Atenção: buffer a ${Math.round(bufferPct)}%. Monitorar ${sprintAtivo?.nome ?? 'sprint ativo'}.`
            : feverZone === 'vermelho'
            ? `Crítico: buffer a ${Math.round(bufferPct)}%. ${sprintAtivo?.nome ?? 'Sprint'} sob pressão.`
            : 'Buffer esgotado. Castle ativo. Ação imediata necessária.'

          return {
            ...p,
            sprintCount: sprintList.length,
            sprintAtivo: sprintAtivo?.nome ?? null,
            bufferPct,
            feverZone,
            iq,
            klaussSummary,
          }
        })
      )

      // Sort by buffer consumption DESC (highest risk first) — MATED ranking
      enriched.sort((a, b) => b.bufferPct - a.bufferPct)

      if (isMounted.current) setProjetos(enriched)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('[Home] Erro ao carregar dados:', err)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir este projeto?')) {
      return
    }

    const { error } = await supabase.from('projetos').delete().eq('id', id)
    if (!error) {
      setProjetos(projetos.filter(p => p.id !== id))
    } else {
      console.error('[Home] Erro ao excluir projeto:', error)
      toast({ variant: 'error', message: 'Erro ao excluir: ' + error.message })
    }
  }

  const handleNovoProjeto = async () => {
    setLoading(true)
    
    // 1. Get User and Tenant
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_id', session.user.id)
      .maybeSingle()

    if (!tenant) {
      router.push('/onboarding')
      return
    }

    // 2. Initialize Project
    const { data: project, error: pError } = await supabase
      .from('projetos')
      .insert({
        tenant_id: tenant.id,
        nome: 'Novo Projeto (Rascunho)',
        status: 'setup',
        tap_extraida: false
      })
      .select()
      .single()

    if (pError) {
      toast({ variant: 'error', message: 'Erro ao criar projeto: ' + pError.message })
      setLoading(false)
      return
    }

    // 3. Navigate
    router.push(`/${project.id}/setup/tap`)
  }

  const handleLogout = async () => {
    await performLogout(router)
  }

  const feverColors: Record<FeverZone, { dot: string; border: string; bg: string; text: string; label: string }> = {
    azul:     { dot: 'bg-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-300', label: 'REMISSÃO' },
    verde:    { dot: 'bg-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-300', label: 'SAUDÁVEL' },
    amarelo:  { dot: 'bg-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-300', label: 'ATENÇÃO' },
    vermelho: { dot: 'bg-rose-500', border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-300', label: 'CRÍTICO' },
    preto:    { dot: 'bg-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/5', text: 'text-slate-300', label: 'COLAPSO' },
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'setup': return { text: 'Setup', color: 'bg-amber-500/10 text-amber-400' }
      case 'execucao': return { text: 'Em Execução', color: 'bg-emerald-500/10 text-emerald-400' }
      case 'concluido': return { text: 'Concluído', color: 'bg-blue-500/10 text-blue-400' }
      default: return { text: s || 'Novo', color: 'bg-slate-800 text-slate-400' }
    }
  }

  return (
    <div className="min-h-screen bg-[#05080A] text-slate-50 flex flex-col items-center overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--fever-verde)] opacity-[0.06] blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--fever-vermelho)] opacity-[0.06] blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-6xl px-6 py-12 relative z-10 flex flex-col min-h-screen">
        <header className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-4">
            <AuraLogo size="lg" variant="full" onClick={() => router.push('/')} />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Powered by TRIQ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 p-2 rounded-2xl shadow-2xl">
            <button
              onClick={handleNovoProjeto}
              disabled={loading}
              className="group relative flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              Novo Projeto
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white px-4 py-3.5 rounded-xl transition-all border border-white/5"
              title="Encerrar Sessão"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Portfólio Estratégico
                <span className="text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-mono">
                  {projetos.length} ACTIVE
                </span>
              </h2>
              <p className="text-sm text-slate-500">Ranqueado por risco — o que mais ameaça aparece primeiro.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/10 rounded-full" />
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Sincronizando Portfólio...</p>
            </div>
          ) : projetos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800/50 rounded-[40px] bg-slate-900/20 backdrop-blur-sm group hover:border-blue-500/20 transition-colors duration-500">
              <div className="h-24 w-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <AuraLogo size="lg" variant="icon" />
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-2">Zero Projetos Detectados</h3>
              <p className="text-slate-500 text-center max-w-sm mb-8 font-medium">
                Inicie sua jornada no Aura criando seu primeiro projeto. Utilize a extração de TAP via IA para setup imediato.
              </p>
              <button
                onClick={handleNovoProjeto}
                className="flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-widest text-xs py-4 px-8 border border-blue-500/20 rounded-2xl hover:bg-blue-500/5"
              >
                Criar Primeiro Projeto <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {projetos.map((p, idx) => {
                const isSetup = p.status === 'setup'
                const targetHref = isSetup ? `/${p.id}/setup/tap` : `/${p.id}`
                const fc = feverColors[p.feverZone]

                return (
                  <div
                    key={p.id}
                    className="relative group animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <Link
                      href={targetHref}
                      className={`block backdrop-blur-xl ${fc.bg} ${fc.border} border rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Fever dot */}
                        <div className="pt-1.5">
                          <div className={`w-3 h-3 rounded-full ${fc.dot} ${p.feverZone === 'vermelho' || p.feverZone === 'preto' ? 'animate-pulse' : ''}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-white truncate">{p.nome}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${fc.text} bg-white/5`}>
                              {fc.label}
                            </span>
                          </div>

                          {/* Klauss summary */}
                          <p className="text-sm text-slate-400 mb-3 line-clamp-1">
                            {p.klaussSummary}
                          </p>

                          {/* Metrics row */}
                          <div className="flex items-center gap-6 text-xs">
                            {/* Buffer bar */}
                            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                              <span className="text-slate-500 font-mono">Buffer</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fc.dot}`}
                                  style={{ width: `${Math.min(100, Math.max(0, p.bufferPct))}%` }}
                                />
                              </div>
                              <span className={`font-mono font-bold ${fc.text}`}>
                                {Math.round(p.bufferPct)}%
                              </span>
                            </div>

                            {/* IQ */}
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 font-mono">IQ</span>
                              <span className="font-mono font-bold text-white">{p.iq}%</span>
                            </div>

                            {/* Sprints */}
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 font-mono">Sprints</span>
                              <span className="font-mono font-bold text-slate-300">{p.sprintCount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Arrow + delete */}
                        <div className="flex items-center gap-2 pt-1">
                          <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => deleteProject(e, p.id)}
                      className="absolute top-6 right-14 text-slate-700 hover:text-rose-500 transition-all p-1 z-20 opacity-0 group-hover:opacity-100"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <footer className="mt-20 py-8 border-t border-white/5 text-center">
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
                 Aura Commander © 2026 <span className="text-blue-900 mx-2">|</span> Powered by AIOX Engine
             </p>
        </footer>
      </div>
    </div>
  )
}
