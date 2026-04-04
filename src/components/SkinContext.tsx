"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useProject } from '@/context/ProjectContext'
import type { ProfileType } from '@/lib/types'

// ══════════════════════════════════════════════════════════════
// @ux-design-expert — SaaS Camaleão: Sistema de Skins
// Adapta o vocabulário do Aura ao setor do gestor.
// Referência PRD v6.1: "profile_type: TECH | CONSTRUCAO | DEFAULT"
// ══════════════════════════════════════════════════════════════

// Dicionário de termos por setor
const SKIN_DICTIONARY: Record<ProfileType, Record<string, string>> = {
    TECH: {
        'Escopo': 'Backlog',
        'Escopo de Obra': 'Backlog',
        'Orçamento': 'Budget Técnico',
        'Prazo': 'Sprint / Timeline',
        'Projeto': 'Release',
        'Gestor': 'Tech Lead',
        'Tarefa': 'Story / Task',
        'Reunião de Crise': 'War Room (P0 Incident)',
        'Gabarito de Qualidade': 'Definition of Done',
        'Ata Digital': 'Incident Report',
        'Re-ancorar Baseline': 'Reset Sprint Baseline',
        'Gabinete de Crise': 'Incident War Room',
        'Sponsors': 'Stakeholders',
    },
    CONSTRUCAO: {
        'Escopo': 'Escopo de Obra',
        'Backlog': 'Caderno de Encargos',
        'Orçamento': 'Planilha de Custos',
        'Prazo': 'Cronograma Físico',
        'Projeto': 'Empreendimento',
        'Gestor': 'Engenheiro Responsável',
        'Tarefa': 'Serviço / Etapa',
        'Reunião de Crise': 'Reunião de Obra de Emergência',
        'Gabarito de Qualidade': 'ART / Laudo de Conformidade',
        'Ata Digital': 'Livro de Ocorrências Digital',
        'Re-ancorar Baseline': 'Revisar Linha de Base do Cronograma',
        'Gabinete de Crise': 'Comitê de Crise de Obra',
        'Sponsors': 'Incorporadores / Proprietários',
    },
    DEFAULT: {}, // Sem tradução — usa os termos originais
}

export interface SkinConfig {
    profile: ProfileType
    t: (text: string) => string // Translator function
}

const SkinContext = createContext<SkinConfig>({
    profile: 'DEFAULT',
    t: (text: string) => text,
})

export function SkinProvider({ children }: { children: ReactNode }) {
    const { profileType } = useProject()
    const [profile, setProfile] = useState<ProfileType>(profileType || 'DEFAULT')

    useEffect(() => {
        if (profileType) setProfile(profileType)
    }, [profileType])

    // Função de tradução: busca no dicionário do perfil, fallback ao original
    function t(text: string): string {
        const dict = SKIN_DICTIONARY[profile] || {}
        return dict[text] ?? text
    }

    return (
        <SkinContext.Provider value={{ profile, t }}>
            {children}
        </SkinContext.Provider>
    )
}

export function useSkin() {
    return useContext(SkinContext)
}

// Exporta o dicionário para uso em outros componentes (ex: assinatura page)
export { SKIN_DICTIONARY }
