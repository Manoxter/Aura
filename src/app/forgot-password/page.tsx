'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <Activity className="h-10 w-10 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Email enviado!</h2>
          <p className="text-slate-400 mb-6">
            Se existe uma conta com <strong className="text-white">{email}</strong>,
            você receberá um link para redefinir sua senha.
          </p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition font-medium">
            ← Voltar ao Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-10 w-10 text-blue-500" />
            <h1 className="text-4xl font-bold text-white tracking-tight">AURA</h1>
          </div>
          <p className="text-slate-400">Recupere o acesso à sua conta</p>
        </div>

        <form onSubmit={handleReset} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email cadastrado</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? 'Enviando...' : (
              <>Enviar Link de Recuperação <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          <div className="text-center text-sm">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">
              ← Voltar ao Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
