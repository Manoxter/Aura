'use client'

import { useState } from 'react'
import { Users, Shield, UserPlus, Mail, MoreHorizontal, Settings, Activity } from 'lucide-react'

// PRD v6.1 Profiling Architecture 
type NivelAcesso = 'Nível 1' | 'Nível 2' | 'Nível 3'
type Perfil = 'PM/PO' | 'Analista Técnico' | 'Visualizador'

interface Colaborador {
    id: string
    nome: string
    email: string
    perfil: Perfil
    nivel: NivelAcesso
    status: 'Ativo' | 'Pendente'
    avatar?: string
}

const getBadgeColor = (perfil: Perfil) => {
    switch (perfil) {
        case 'PM/PO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        case 'Analista Técnico': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        case 'Visualizador': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    }
}

// Seed Data from PRD
const initialTeam: Colaborador[] = [
    { id: '1', nome: 'Julio', email: 'julio@engalpha.com.br', perfil: 'PM/PO', nivel: 'Nível 1', status: 'Ativo', avatar: 'J' },
    { id: '2', nome: 'Marcos', email: 'marcos@engalpha.com.br', perfil: 'Analista Técnico', nivel: 'Nível 2', status: 'Ativo', avatar: 'M' },
    { id: '3', nome: 'Ana', email: 'ana@engalpha.com.br', perfil: 'Visualizador', nivel: 'Nível 3', status: 'Ativo', avatar: 'A' },
]

export default function PerfisPage() {
    const [equipe, setEquipe] = useState<Colaborador[]>(initialTeam)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [newEmail, setNewEmail] = useState('')
    const [newNome, setNewNome] = useState('')
    const [newPerfil, setNewPerfil] = useState<Perfil>('Visualizador')

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Mocking API / Resend Email delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        const novoColaborador: Colaborador = {
            id: crypto.randomUUID(),
            nome: newNome,
            email: newEmail,
            perfil: newPerfil,
            nivel: newPerfil === 'PM/PO' ? 'Nível 1' : newPerfil === 'Analista Técnico' ? 'Nível 2' : 'Nível 3',
            status: 'Pendente',
            avatar: newNome.charAt(0).toUpperCase()
        }

        setEquipe([...equipe, novoColaborador])
        setNewEmail('')
        setNewNome('')
        setNewPerfil('Visualizador')
        setIsSubmitting(false)
        setIsInviteModalOpen(false)
    }

    return (
        <div className="p-8 w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <Settings className="h-6 w-6" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Administração</h2>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-50">Perfis & Acesso</h1>
                    <p className="text-slate-400 mt-2">
                        Gerencie a governança do projeto controlando permissões da equipe (Engenharia Alpha S.A.).
                    </p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <UserPlus className="h-4 w-4" />
                    Convidar Colaborador
                </button>
            </header>

            {/* Matrix Definitions Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <h3 className="font-semibold text-slate-200 text-sm">Nível 1 (PM / PO)</h3>
                    </div>
                    <p className="text-xs text-slate-500">Controle Total: Criar, Editar, Apagar e Arquivar Projetos. Gestão de Equipe completa.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        <h3 className="font-semibold text-slate-200 text-sm">Nível 2 (Analista)</h3>
                    </div>
                    <p className="text-xs text-slate-500">Edição de tarefas (Motor CPM) e intercorrências. Pode gerar Notas de Gestão e Alertas.</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <h3 className="font-semibold text-slate-200 text-sm">Nível 3 (Visualizador)</h3>
                    </div>
                    <p className="text-xs text-slate-500">Apenas leitura de painéis e Motor CDT. Sem permissão de edição ou de imputar ações.</p>
                </div>
            </div>

            {/* Team Data Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">Equipe</th>
                            <th className="px-6 py-4 font-medium">Perfil de Acesso</th>
                            <th className="px-6 py-4 font-medium">Nível</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 text-right font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {equipe.map((membro) => (
                            <tr key={membro.id} className="hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-medium">
                                            {membro.avatar}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-200">{membro.nome}</div>
                                            <div className="text-xs text-slate-500">{membro.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getBadgeColor(membro.perfil)}`}>
                                        {membro.perfil}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                    {membro.nivel}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-1.5 text-xs font-medium ${membro.status === 'Ativo' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${membro.status === 'Ativo' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                                        {membro.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-500 hover:text-slate-300 p-1 transition-colors">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal Overlay */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl scale-in-95">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <Mail className="h-5 w-5 text-blue-500" />
                                Convidar Colaborador
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                Um convite com credenciais temporárias será enviado via Resend para o email informado.
                            </p>
                        </div>

                        <form onSubmit={handleInvite} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                                <input
                                    required autoFocus type="text"
                                    value={newNome} onChange={e => setNewNome(e.target.value)}
                                    placeholder="Ex: Carlos Silva"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">E-mail Profissional</label>
                                <input
                                    required type="email"
                                    value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                    placeholder="carlos@empresa.com.br"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Perfil de Acesso</label>
                                <select
                                    value={newPerfil} onChange={e => setNewPerfil(e.target.value as Perfil)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                >
                                    <option value="Visualizador">Visualizador (Nível 3)</option>
                                    <option value="Analista Técnico">Analista Técnico (Nível 2)</option>
                                    <option value="PM/PO">PM / PO (Nível 1)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="flex-1 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Convite'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
