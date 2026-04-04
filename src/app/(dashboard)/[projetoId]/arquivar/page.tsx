'use client'

// Story 3.5: Tela de Arquivamento — chama calibrate-on-archive Edge Function
// Story 5.3: calcularSDO() chamado antes do arquivamento

import { useState } from 'react'
import { Archive, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calcularSDO } from '@/lib/engine/sdo'

interface CalibrateResult {
  n: number
  mode: 'literature' | 'empirical'
  sigma_updated: boolean
}

export default function ArquivarPage() {
  const { projetoId } = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tap, tenantId, orcamentoBase: _orcamentoBase, prazoBase: _prazoBase } = useProject()

  const [step, setStep] = useState<'confirm' | 'archiving' | 'done' | 'error'>('confirm')
  const [calibResult, setCalibResult] = useState<CalibrateResult | null>(null)
  const [sdoScore, setSdoScore] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [confirmInput, setConfirmInput] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectName = (tap as any)?.nome_projeto ?? 'este projeto'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setor: string = (tap as any)?.setor ?? 'geral'
  const CONFIRM_TEXT = 'ARQUIVAR'

  async function handleArquivar() {
    if (confirmInput !== CONFIRM_TEXT) return
    setStep('archiving')

    try {
      // ── 1. Calcular SDO (Story 5.3) ────────────────────────────────────────
      let sdo = 0.5
      try {
        const sdoResult = await calcularSDO(String(projetoId), supabase)
        sdo = sdoResult.score
        setSdoScore(sdo)
      } catch {
        // SDO não bloqueante — continua arquivamento
      }

      // ── 2. Buscar métricas do CDT atual ────────────────────────────────────
      const { data: projetoData } = await supabase
        .from('projetos')
        .select('cdt_area_atual, cdt_area_baseline, mated_atual')
        .eq('id', projetoId)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const areaFinal = (projetoData as any)?.cdt_area_atual ?? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matedMedio = (projetoData as any)?.mated_atual ?? 0.1

      // ── 3. Marcar projeto como arquivado no DB (AC-4: antes da Edge Function) ─
      // O arquivamento acontece primeiro para garantir que falha na calibração
      // não bloqueie o encerramento do projeto.
      await supabase
        .from('projetos')
        .update({ status: 'arquivado', arquivado_em: new Date().toISOString() })
        .eq('id', projetoId)

      // ── 4. Chamar Edge Function calibrate-on-archive (best-effort) ───────────
      // AC-4: falha silenciosa — não bloqueia o arquivamento já efetivado acima
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token ?? ''

        const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s/g, '')
        const resp = await fetch(
          `${supabaseUrl}/functions/v1/calibrate-on-archive`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              projeto_id: projetoId,
              tenant_id: tenantId,
              setor,
              area_final: areaFinal,
              mated_medio: matedMedio,
              sdo_score: sdo,
              modo: 'normal',
            }),
          }
        )

        if (resp.ok) {
          const calibData: CalibrateResult = await resp.json()
          setCalibResult(calibData)
        } else {
          console.warn('[arquivar] calibrate-on-archive falhou silenciosamente:', resp.status)
        }
      } catch (calibErr) {
        // Falha silenciosa: projeto já arquivado, calibração tenta de forma best-effort
        console.warn('[arquivar] calibrate-on-archive erro (não bloqueante):', calibErr)
      }

      setStep('done')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro desconhecido')
      setStep('error')
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-6 animate-in fade-in duration-500">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Projeto Arquivado</h1>
        <p className="text-slate-400">
          Os dados de <strong className="text-white">{projectName}</strong> foram registrados
          na calibração bayesiana do setor <strong className="text-white">{setor}</strong>.
        </p>

        {sdoScore !== null && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">SDO — Score de Desfecho</p>
            <p className="text-3xl font-mono font-bold text-emerald-400">
              {(sdoScore * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {calibResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left text-sm space-y-1">
            <p className="text-slate-400">
              <span className="text-white font-medium">{calibResult.n}</span> projetos calibrando o setor{' '}
              <span className="text-white font-medium">{setor}</span>
            </p>
            <p className="text-slate-400">
              Modo:{' '}
              <span className={calibResult.mode === 'empirical' ? 'text-sky-400 font-medium' : 'text-slate-300'}>
                {calibResult.mode === 'empirical' ? 'Empírico (≥30 projetos)' : 'Literatura (N < 30)'}
              </span>
            </p>
            {calibResult.sigma_updated && (
              <p className="text-emerald-400 text-xs">✓ σ atualizado com dados empíricos</p>
            )}
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
        >
          Voltar ao início
        </button>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-white">Erro ao arquivar</h1>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
        <button
          onClick={() => setStep('confirm')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (step === 'archiving') {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
        <p className="text-white font-medium">Calculando SDO e atualizando calibração...</p>
        <p className="text-slate-500 text-sm">Isso pode levar alguns segundos</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-12 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 text-rose-400">
        <Archive className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-white">Arquivar Projeto</h1>
      </div>

      <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 text-sm text-rose-300 space-y-1">
        <p className="font-semibold text-rose-200">⚠ Esta ação é irreversível</p>
        <p>O projeto será marcado como arquivado e seus dados contribuirão para a calibração bayesiana do setor.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <p className="text-sm text-slate-400">
          Ao arquivar <strong className="text-white">{projectName}</strong>, o sistema irá:
        </p>
        <ul className="text-sm text-slate-400 space-y-1 list-none">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            Calcular o SDO (Score de Desfecho Objetivo)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            Registrar os dados de calibração do setor <strong className="text-white">{setor}</strong>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            Atualizar σ do setor se 30+ projetos arquivados
          </li>
        </ul>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">
          Digite <strong className="text-white font-mono">{CONFIRM_TEXT}</strong> para confirmar:
        </label>
        <input
          type="text"
          value={confirmInput}
          onChange={e => setConfirmInput(e.target.value)}
          placeholder={CONFIRM_TEXT}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-rose-500 transition-colors"
        />
      </div>

      <button
        onClick={handleArquivar}
        disabled={confirmInput !== CONFIRM_TEXT}
        className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Archive className="h-4 w-4" />
        Arquivar Projeto
      </button>
    </div>
  )
}
