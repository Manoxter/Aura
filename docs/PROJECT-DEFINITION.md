# Aura — PROJECT DEFINITION v6.1
## Sistema de Decision Intelligence para Engenharia de Projetos

**Autoridade Máxima:** PRD v6.1 (Março 2026)
**Norte Estratégico:** Governança Ativa | IA Ubíqua | Geometria Prescritiva | SaaS Camaleão
**Estratégia de Mercado:** [STRATEGY-ADHERENCE.md](file:///c:/Users/engpr/OneDrive/Área de Trabalho/Aura-6.1/docs/STRATEGY-ADHERENCE.md)

---

## 1. Resumo Executivo

O **Aura** é uma plataforma SaaS de **Decision Intelligence** voltada para engenharia e gestão de projetos complexos. O sistema substitui o rastreio passivo por uma **governança ativa** baseada em modelagem geométrica (CDT) e distância euclidiana (MATED), apoiada por Inteligência Artificial contextual em cada etapa do projeto.

### Proposta de Valor Central
> O Aura transforma dados brutos de custo, prazo e escopo em decisões fundamentadas, rastreáveis e auditáveis — com justificativa matemática automática para aditivos e mudanças de rumo.

---

## 2. Motor Matemático — CDT e MATED

### 2.1 O CDT — Triângulo de Estado do Projeto
O CDT converte os três eixos do projeto em **intensidades adimensionais** (0 a 1000 na escala operacional):
- **E (Escopo)**: `1.0` (Referência fixa).
- **O (Orçamento)**: `coefOrc / (BAC / totalDias)`.
- **P (Prazo)**: `|coefPrazo|` (Dias realizados por dia planejado).

### 2.2 O MATED — Distância Euclidiana de Decisão
`d = sqrt((x_P - x_B)² + (y_P - y_B)²)`
- **B**: Baricentro Órtico (ponto de equilíbrio ideal).
- **P**: Ponto de Operação atual.
- **Threshold**: 0.15 (dispara alerta no War Room).

---

## 3. Arquitetura Hub & Spoke
O Dashboard (CDT Canvas) é o centro (Hub). Todos os módulos são Spoke (acessíveis via Sidebar):
- **SETUP**: TAP & Escopo, Governança.
- **MOTOR**: CPM (Gantt), Curva S (Orçamento), Burndown (Prazo).
- **DECISÃO**: CDT, MATED (Simulador), War Room, IA Assistant.

---

## 4. IA Ubíqua (Componente AIInsightCard)
Renderizado em **TODAS** as telas de entrada de dados.
- Feedback contextual em tempo real.
- Sugestões de ação concretas com confirmação em 1 clique.
- Registro auditável em `historico_projeto`.

---

## 5. Roadmap de Fases (Consolidado)

### FASE 3 — Agente IA Flutuante + AIInsightCard Ubíquo
- [ ] Componente `AIInsightCard` em todas as telas.
- [ ] Rota `/api/ai/insight` (IA contextual).
- [ ] Painel flutuante global de chat IA.
- [ ] Rota `/api/ai/war-room` (Análise de crise MATED).

### FASE 4 — MATED Euclidiano + Stripe
- [ ] Componente `MatedSimulator.tsx` completo.
- [ ] Lógica de threshold e alerta automático.
- [ ] Integração Stripe (START, PRO, ELITE).
- [ ] Controle de limite de projetos por plano (Tabela `tenants`).

### FASE 5 — Memória Organizacional (ELITE)
- [ ] Arquivamento de projetos (Snapshot congelado).
- [ ] Aprendizado da IA com histórico arquivado.

---

## 6. Governança e Segurança
- **Isolamento**: RLS obrigatório em todas as queries (`auth.uid()` + `tenant_id`).
- **Auditabilidade**: Justificativa técnica automática para aditivos salva em `historico_projeto`.
- **Snapshot Sagrado**: Nenhum `UPDATE` em registros de triângulo de execução.

## 7. Protocolos de Gestão Prescritiva (MATED + CET)

### 7.1 Re-ancoragem de Escopo (Scope Creep)
- **Rastro Permanente**: Toda deformação original em relação à TAP é preservada para auditoria de "Desvio Total de Qualidade".
- **Nova Baseline**: Mudanças bruscas de escopo permitem a re-ancoragem do triângulo. Isso gera um "Novo Projeto/Versão" onde variáveis são recalculadas, mas recursos e histórico são herdados.
- **Justificativa via IA**: O agente Klauss deve interpretar a mudança de escopo e justificar a nova geometria antes da re-ancoragem.

### 7.2 Protocolo de Inconsistência (CET Violada)
- **Comportamento**: Quando a condição $|P - C| < E < P + C$ é violada, o sistema **NÃO bloqueia** a edição.
- **Trigger de Crise**: O sistema emite um alerta crítico e gera um **Relatório Detalhado de Inconsistência Geométrica**.
- **War Room Workflow**: O PM/PO aciona o Gabinete de Crise, onde o relatório é a base para a tomada de decisão conjunta utilizando as ferramentas Klauss e MATED.

## 8. Organização do Squad (Equipe de Elite)

A construção do Aura é orquestrada por um squad de agentes especializados e o Usuário (PM/PO):

- **@[.antigravity/rules/agents/aiox-master.md]**: Líder de Orquestração.
- **@[.antigravity/rules/agents/aura-math.md]**: Auditor de Motores Geométricos.
- **@[.antigravity/rules/agents/aura-production.md]**: Analista de Gestão Prescritiva.
- **@[.antigravity/rules/agents/aura-klauss.md]**: Assistente de IA e Memória do Projeto.
- **@[.antigravity/rules/agents/kieza-research.md]**: Especialista em Mercado e Aderência.
- **@[.antigravity/rules/agents/marta-marketing.md]**: Estrategista de Marketing e Growth B2B.
- **Equipe Dev**: Liderada por `@architect` e `@dev` (Antigravity).

### 8.1 Squad: Aurateam
Este squad é o conselho deliberativo para o futuro do Aura, focado em estratégia, marketing, design e integridade técnica.
- **Membros**: Usuário (PM/PO), @aiox-master, @kieza-research, @marta-marketing, @ux-design-expert, @aura-integrator (Max), @aura-qa-auditor (Atlas) e @motion-designer (Luna).
- **Objetivo**: Debater o projeto, sugerir melhorias estruturais, auditar a matemática e documentar a "Verdade Absoluta".

### 8.1 Habilidades Identificadas como Faltantes
Para garantir o sucesso do Aura, recrutamos os seguintes reforços:
1. **Design System Architect (@ux-design-expert)**: Foco total na estética "WOW", micro-animações e tradução visual de dados.
2. **Security & Cloud DevOps (@devops)**: Garantia de isolamento via RLS e performance no Supabase.
3. **SaaS Strategist**: Para a lógica complexa de planos Stripe e Multi-tenancy (pendente de recrutamento formal).

---
_Validated by @aiox-master, @aura-math & @aura-production | Wave 18 | 2026-03-11_
