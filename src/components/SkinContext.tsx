"use client"

import React, { createContext, useContext, ReactNode } from 'react'

// ══════════════════════════════════════════════════════════════
// SaaS Skin — Vocabulário único: Software Ágil (TECH)
// Simplificado: perfil único, sem switching de profile_type.
// ══════════════════════════════════════════════════════════════

const SKIN_DICTIONARY: Record<string, string> = {
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
}

export interface SkinConfig {
    profile: 'TECH'
    t: (text: string) => string // Translator function
}

const SkinContext = createContext<SkinConfig>({
    profile: 'TECH',
    t: (text: string) => text,
})

export function SkinProvider({ children }: { children: ReactNode }) {
    // Função de tradução: busca no dicionário TECH, fallback ao original
    function t(text: string): string {
        return SKIN_DICTIONARY[text] ?? text
    }

    return (
        <SkinContext.Provider value={{ profile: 'TECH', t }}>
            {children}
        </SkinContext.Provider>
    )
}

export function useSkin() {
    return useContext(SkinContext)
}

// Exporta o dicionário para uso em outros componentes (ex: assinatura page)
export { SKIN_DICTIONARY }
