'use client'

/**
 * OnboardingPage — SaaS-2
 *
 * 3-step guided onboarding wizard:
 *   Step 1 — "Qual é o seu projeto?" (basic project info)
 *   Step 2 — "Defina as 3 dimensões do seu triângulo CDT"
 *   Step 3 — "Adicione sua primeira tarefa"
 *
 * AC-1:  Redirects new users here before dashboard
 * AC-5:  Completing step 3 creates project + task in Supabase → redirect /dashboard
 * AC-7:  Skip available on each step
 * AC-8:  onboarding_completed flag saved on profile completion or skip
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Triangle, ArrowRight, ArrowLeft, Check, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PlanTier } from '@/lib/types'
import OnboardingStep1, {
  Step1Data,
  validateStep1,
} from '@/components/Onboarding/OnboardingStep1'
import OnboardingStep2, {
  Step2Data,
  validateStep2,
} from '@/components/Onboarding/OnboardingStep2'
import OnboardingStep3, {
  Step3Data,
  validateStep3,
} from '@/components/Onboarding/OnboardingStep3'

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEP_LABELS = [
  { num: 1, title: 'Seu Projeto' },
  { num: 2, title: 'Triângulo CDT' },
  { num: 3, title: 'Primeira Tarefa' },
] as const

// ─── Empty initial states ──────────────────────────────────────────────────────

function emptyStep1(): Step1Data {
  return { nome: '', tipo: 'software', setor: 'tecnologia', dataInicio: '', dataFim: '' }
}

function emptyStep2(dataFim: string): Step2Data {
  return { nTarefas: '', dataFimPrazo: dataFim, orcamento: '' }
}

function emptyStep3(): Step3Data {
  return { nomeTarefa: '', duracao: '', responsavel: '' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureTenant(userId: string, userName: string): Promise<string> {
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: newTenant, error } = await supabase
    .from('tenants')
    .insert({
      owner_id: userId,
      profile_type: 'TECH',
      plan: 'START' as PlanTier,
      plan_tier: 'START' as PlanTier,
      nome: `Org de ${userName}`,
    })
    .select('id')
    .single()

  if (error) throw error
  return newTenant.id
}

async function markOnboardingCompleted(userId: string): Promise<void> {
  // Stored in tenants table as onboarding_completed boolean
  await supabase
    .from('tenants')
    .update({ onboarding_completed: true })
    .eq('owner_id', userId)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()

  // Auth
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Engenheiro')

  // Step (0-indexed)
  const [step, setStep] = useState(0)

  // Form data
  const [step1, setStep1] = useState<Step1Data>(emptyStep1)
  const [step2, setStep2] = useState<Step2Data>(() => emptyStep2(''))
  const [step3, setStep3] = useState<Step3Data>(emptyStep3)

  // Validation errors per step
  type Step1Errors = Partial<Record<keyof Step1Data, string>>
  type Step2Errors = Partial<Record<keyof Step2Data, string>>
  type Step3Errors = Partial<Record<keyof Step3Data, string>>
  const [errors1, setErrors1] = useState<Step1Errors>({})
  const [errors2, setErrors2] = useState<Step2Errors>({})
  const [errors3, setErrors3] = useState<Step3Errors>({})

  // UI
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUserId(session.user.id)
      const meta = session.user.user_metadata
      const name =
        meta?.full_name ||
        meta?.name ||
        session.user.email?.split('@')[0] ||
        'Engenheiro'
      setUserName(name)
    })
  }, [router])

  // ── Keep step2 prazo in sync with step1 dataFim ───────────────────────────
  useEffect(() => {
    setStep2((prev) => ({ ...prev, dataFimPrazo: step1.dataFim }))
  }, [step1.dataFim])

  // ── Navigation ────────────────────────────────────────────────────────────

  const validateCurrentStep = useCallback((): boolean => {
    if (step === 0) {
      const errs = validateStep1(step1)
      setErrors1(errs)
      return Object.keys(errs).length === 0
    }
    if (step === 1) {
      const errs = validateStep2(step2)
      setErrors2(errs)
      return Object.keys(errs).length === 0
    }
    if (step === 2) {
      const errs = validateStep3(step3)
      setErrors3(errs)
      return Object.keys(errs).length === 0
    }
    return true
  }, [step, step1, step2, step3])

  function goNext() {
    if (!validateCurrentStep()) return
    if (step < 2) setStep((s) => s + 1)
  }

  function goPrev() {
    if (step > 0) setStep((s) => s - 1)
  }

  // ── Skip ──────────────────────────────────────────────────────────────────

  async function handleSkip() {
    if (userId) {
      try {
        await markOnboardingCompleted(userId)
      } catch {
        // Non-blocking — skip anyway
      }
    }
    router.replace('/dashboard')
  }

  // ── Complete onboarding (step 3 submit) ───────────────────────────────────

  async function handleComplete() {
    if (!validateCurrentStep()) return
    if (!userId) return

    setSaving(true)
    setSaveError(null)

    try {
      const tenantId = await ensureTenant(userId, userName)

      // Build project payload from step1 + step2
      const projectPayload: Record<string, unknown> = {
        tenant_id: tenantId,
        nome: step1.nome.trim() || 'Meu Projeto',
        status: 'setup',
        tap_extraida: false,
        setor: 'tecnologia',
        ...(step1.setor ? { descricao: step1.setor } : {}),
        ...(step1.dataInicio ? { data_inicio: step1.dataInicio } : {}),
        ...(step1.dataFim ? { data_fim: step1.dataFim } : {}),
        ...(typeof step2.orcamento === 'number' && step2.orcamento > 0
          ? { orcamento_total: step2.orcamento }
          : {}),
      }

      const { data: project, error: pError } = await supabase
        .from('projetos')
        .insert(projectPayload)
        .select('id')
        .single()

      if (pError) throw pError

      // Create first task
      const tarefaPayload: Record<string, unknown> = {
        projeto_id: project.id,
        nome: step3.nomeTarefa.trim(),
        duracao_estimada: typeof step3.duracao === 'number' ? step3.duracao : 1,
        ...(step3.responsavel.trim() ? { responsavel: step3.responsavel.trim() } : {}),
        predecessoras: [],
        es: 0,
        ef: typeof step3.duracao === 'number' ? step3.duracao : 1,
        ls: 0,
        lf: typeof step3.duracao === 'number' ? step3.duracao : 1,
        folga_total: 0,
        no_caminho_critico: true,
      }

      const { error: tError } = await supabase.from('tarefas').insert(tarefaPayload)
      if (tError) {
        // Task creation is best-effort — don't block the user
        console.warn('[Onboarding] Falha ao criar tarefa inicial:', tError)
      }

      // Mark onboarding complete
      await markOnboardingCompleted(userId)

      router.replace(`/${project.id}/setup/tap`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setSaveError(`Erro ao salvar: ${msg}. Tente novamente.`)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface text-white flex flex-col items-center justify-center p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,rgba(30,41,59,0.6)_0%,rgba(15,23,42,1)_100%)] overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zona-seguro/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-klauss/5 blur-[160px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-zona-seguro to-klauss shadow-lg shadow-zona-seguro/20 ring-1 ring-white/10 mb-3">
            <Triangle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AURA
            </span>
          </h1>
        </header>

        {/* ── Stepper ── */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {STEP_LABELS.map((s, i) => {
            const isActive = i === step
            const isDone = i < step
            return (
              <React.Fragment key={s.num}>
                {i > 0 && (
                  <div
                    className={`h-0.5 w-8 sm:w-14 rounded-full transition-all duration-500 ${
                      isDone ? 'bg-zona-seguro' : 'bg-surface-raised'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex items-center justify-center h-9 w-9 rounded-xl border-2 transition-all duration-500 font-bold text-sm ${
                      isActive
                        ? 'border-zona-seguro bg-zona-seguro/10 text-zona-seguro-text scale-110'
                        : isDone
                        ? 'border-zona-otimo bg-zona-otimo/10 text-zona-otimo-text'
                        : 'border-surface-raised bg-surface-raised text-slate-500'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                      isActive ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* ── Card ── */}
        <div className="bg-surface-raised/50 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8">
          {/* Step heading */}
          <div className="mb-6">
            {step === 0 && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  Qual é o seu projeto?
                </h2>
                <p className="text-slate-400 text-sm">
                  Comece pelo básico — você preencherá os detalhes no TAP depois.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  Defina as 3 dimensões do seu triângulo
                </h2>
                <p className="text-slate-400 text-sm">
                  Escopo, Prazo e Custo formam o Triângulo CDT — a base do MetodoAura.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  Adicione sua primeira tarefa
                </h2>
                <p className="text-slate-400 text-sm">
                  A primeira entrada da sua EAP — estrutura analítica de projeto.
                </p>
              </>
            )}
          </div>

          {/* Step content */}
          {step === 0 && (
            <OnboardingStep1
              data={step1}
              onChange={setStep1}
              errors={errors1}
            />
          )}
          {step === 1 && (
            <OnboardingStep2
              data={step2}
              onChange={setStep2}
              errors={errors2}
            />
          )}
          {step === 2 && (
            <OnboardingStep3
              data={step3}
              onChange={setStep3}
              errors={errors3}
            />
          )}

          {/* Save error */}
          {saveError && (
            <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {saveError}
            </p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            {/* Back / Skip left side */}
            <div className="flex items-center gap-4">
              {step > 0 && (
                <button
                  onClick={goPrev}
                  disabled={saving}
                  className="flex items-center gap-2 text-slate-500 hover:text-white font-medium transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}
              <button
                onClick={handleSkip}
                disabled={saving}
                className="text-sm text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
              >
                Pular — configuro depois
              </button>
            </div>

            {/* Next / Complete */}
            {step < 2 ? (
              <button
                onClick={goNext}
                disabled={saving}
                className="group flex items-center gap-2 bg-zona-seguro hover:brightness-110 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-bold transition-all shadow-lg shadow-zona-seguro/20 active:scale-95"
              >
                Próximo
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="group flex items-center gap-2 bg-zona-otimo hover:brightness-110 disabled:opacity-60 text-white px-7 py-3 rounded-xl font-bold transition-all shadow-lg shadow-zona-otimo/20 active:scale-95"
              >
                {saving ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Concluir
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-mono">
            Powered by Aura Geometric Intelligence
          </p>
        </footer>
      </div>
    </div>
  )
}
