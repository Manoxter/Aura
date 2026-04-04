'use client'

import { useState, useRef } from 'react'
import { User, Camera, Lock, Shield, Trash2, Globe, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function PerfilPage() {
  const { session } = useAuth()
  const user = session?.user ?? null
  const router = useRouter()

  // Profile form state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [cargo, setCargo] = useState(user?.user_metadata?.cargo || '')
  const [empresa, setEmpresa] = useState(user?.user_metadata?.empresa || '')
  const [timezone, setTimezone] = useState(user?.user_metadata?.timezone || 'America/Sao_Paulo')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Password form state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const TIMEZONES = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
    { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
    { value: 'America/Recife', label: 'Recife (GMT-3)' },
    { value: 'America/Belem', label: 'Belém (GMT-3)' },
    { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
    { value: 'America/Boa_Vista', label: 'Boa Vista (GMT-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  ]

  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          cargo: cargo.trim(),
          empresa: empresa.trim(),
          timezone,
        }
      })
      if (error) throw error

      // Replicate display_name to tenants table
      if (fullName.trim()) {
        await supabase
          .from('tenants')
          .update({ display_name: fullName.trim() })
          .eq('owner_id', user.id)
      }

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err: unknown) {
      console.error('Erro ao salvar perfil:', err)
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter ao menos 8 caracteres.')
      return
    }
    if (!/\d/.test(newPassword)) {
      setPasswordError('A nova senha deve conter ao menos 1 número.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar senha.'
      setPasswordError(message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      // Resize to 200x200 using canvas
      const img = new Image()
      const url = URL.createObjectURL(file)
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')!
      const size = Math.min(img.width, img.height)
      const offsetX = (img.width - size) / 2
      const offsetY = (img.height - size) / 2
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 200, 200)
      URL.revokeObjectURL(url)

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9)
      })
      const filePath = `${user.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      setAvatarUrl(publicUrl)
    } catch (err: unknown) {
      console.error('Erro ao fazer upload:', err)
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'CONFIRMAR') {
      setDeleteError('Digite "CONFIRMAR" para prosseguir.')
      return
    }
    if (!user) return
    try {
      // Soft delete — mark deleted_at on tenant
      await supabase
        .from('tenants')
        .update({ deleted_at: new Date().toISOString() })
        .eq('owner_id', user.id)
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: unknown) {
      console.error('Erro ao excluir conta:', err)
      setDeleteError('Erro ao excluir conta. Contate o suporte.')
    }
  }

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Indisponível'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configurações de Conta</h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie seu perfil e preferências</p>
      </div>

      {/* Avatar + Profile */}
      <section className="bg-surface-raised rounded-2xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-klauss" /> Perfil
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative h-20 w-20">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-klauss-bg border border-klauss-border flex items-center justify-center">
                <User className="h-8 w-8 text-klauss" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Alterar foto de perfil"
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-klauss flex items-center justify-center hover:bg-klauss/80 transition-colors"
            >
              <Camera className="h-3.5 w-3.5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              aria-hidden="true"
            />
          </div>
          <div className="text-sm text-slate-400">
            {avatarUploading ? 'Enviando...' : 'JPG, PNG. Será redimensionada para 200×200px.'}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1">Nome completo</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="João Silva"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-klauss"
            />
          </div>
          <div>
            <label htmlFor="cargo" className="block text-sm font-medium text-slate-300 mb-1">Cargo / Função</label>
            <input
              id="cargo"
              type="text"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Gerente de Projetos"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-klauss"
            />
          </div>
          <div>
            <label htmlFor="empresa" className="block text-sm font-medium text-slate-300 mb-1">Empresa</label>
            <input
              id="empresa"
              type="text"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Construtora XYZ"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-klauss"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> Fuso horário
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-klauss"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={profileSaving}
          className="mt-5 px-6 py-2.5 bg-klauss text-white rounded-xl font-medium hover:bg-klauss/80 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {profileSaved ? <><Check className="h-4 w-4" /> Salvo!</> : profileSaving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </section>

      {/* Password */}
      <section className="bg-surface-raised rounded-2xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-zona-seguro" /> Alterar Senha
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1">Nova senha</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres e 1 número"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-klauss"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">Confirmar nova senha</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-klauss"
            />
          </div>
          {passwordError && (
            <p className="text-zona-crise text-sm">{passwordError}</p>
          )}
          {passwordSaved && (
            <p className="text-zona-otimo text-sm flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Senha alterada com sucesso.</p>
          )}
        </div>
        <button
          onClick={handleChangePassword}
          disabled={passwordSaving || !newPassword}
          className="mt-5 px-6 py-2.5 bg-zona-seguro text-white rounded-xl font-medium hover:bg-zona-seguro/80 disabled:opacity-50 transition-colors"
        >
          {passwordSaving ? 'Salvando...' : 'Alterar senha'}
        </button>
      </section>

      {/* Security */}
      <section className="bg-surface-raised rounded-2xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-zona-otimo" /> Segurança
        </h2>
        <div className="text-sm text-slate-400 mb-4">
          Último login: <span className="text-slate-300">{lastSignIn}</span>
        </div>
        <button
          onClick={handleSignOutAll}
          className="px-5 py-2.5 bg-surface border border-border text-slate-300 rounded-xl font-medium hover:bg-surface-raised transition-colors text-sm"
        >
          Encerrar todas as sessões
        </button>
      </section>

      {/* Delete account */}
      <section className="bg-surface-raised rounded-2xl p-6 border border-zona-crise-border">
        <h2 className="text-lg font-semibold text-zona-crise mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5" /> Excluir Conta
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Esta ação é irreversível. Seus dados ficam em retenção por 30 dias antes de serem removidos permanentemente.
        </p>
        {!showDeleteModal ? (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 border border-zona-crise-border text-zona-crise rounded-xl font-medium hover:bg-zona-crise-bg transition-colors text-sm"
          >
            Excluir minha conta
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Digite <strong className="text-white">CONFIRMAR</strong> para continuar:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => { setDeleteConfirm(e.target.value); setDeleteError('') }}
              placeholder="CONFIRMAR"
              className="w-full bg-surface border border-zona-crise-border rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-zona-crise"
            />
            {deleteError && (
              <p className="text-zona-crise text-sm flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />{deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'CONFIRMAR'}
                className="px-5 py-2.5 bg-zona-crise text-white rounded-xl font-medium hover:bg-zona-crise/80 disabled:opacity-50 transition-colors text-sm"
              >
                Excluir conta
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError('') }}
                className="px-5 py-2.5 bg-surface border border-border text-slate-300 rounded-xl font-medium hover:bg-surface-raised transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
