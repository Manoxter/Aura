export type AgentProfile = {
    id: string;
    nome: string;
    specialty: 'STRATEGY' | 'TIME' | 'FINANCE' | 'RISK';
    tone: string;
    icon: string;
}

export const SPECIALIZED_AGENTS: AgentProfile[] = [
    {
        id: 'klauss-strategy',
        nome: 'Agent Klauss',
        specialty: 'STRATEGY',
        tone: 'Executive, Concise, Prescriptive',
        icon: 'ShieldCheck'
    },
    {
        id: 'crono-time',
        nome: 'Agent Crono',
        specialty: 'TIME',
        tone: 'Critical Path focused, Urgency-driven',
        icon: 'Clock'
    },
    {
        id: 'burn-finance',
        nome: 'Agent Burn',
        specialty: 'FINANCE',
        tone: 'Budget-conscious, Tradeoff-aware',
        icon: 'DollarSign'
    },
    {
        id: 'aura-risk',
        nome: 'Agent Risk',
        specialty: 'RISK',
        tone: 'Probabilistic, Neutral, Data-heavy',
        icon: 'Zap'
    }
];

export function getAgentBySpecialty(specialty: string) {
    return SPECIALIZED_AGENTS.find(a => a.specialty === specialty) || SPECIALIZED_AGENTS[0];
}
