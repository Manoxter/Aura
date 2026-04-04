# Aura 6.1 — MASTERPLAN COMPLETO
## Plano Unificado: Brownfield + Decisões P5 + Dívida Técnica + SDC Pipeline
**Versão:** 5.4 | **Criado:** 2026-03-17 | **Atualizado:** 2026-03-21 (Sessão 12) | **Orquestrado por:** @aiox-master (Orion)
**Squad:** 34 agentes | **Épicos:** 15 | **Stories mapeadas:** 158 | **Decisões integradas:** 145

---

## DOCUMENTOS OBRIGATÓRIOS — Leitura antes de qualquer implementação

> **Todo agente que iniciar trabalho neste projeto DEVE ler estes documentos em ordem.**
> Eles representam o estado real do produto, as decisões tomadas e as regras do método.

| # | Documento | Caminho | O que contém |
|---|-----------|---------|-------------|
| 1 | **MASTERPLAN** | `docs/MASTERPLAN.md` | Épicos, stories, sprint order, DoD global, matrix de responsabilidade |
| 2 | **SPRINT-MEMORY** | `docs/SPRINT-MEMORY.md` | Decisões matemáticas, implementação, regras canônicas do motor |
| 3 | **WORK-LOG** | `docs/WORK-LOG.md` | Histórico sessão a sessão — o que foi feito, testado, commitado |
| 4 | **MetodoAura** | `MetodoAura.md` | Autoridade do método — regras gerenciais e matemáticas inegociáveis |
| 5 | **Math Audit v2** | `docs/reviews/math-deep-audit-v2.md` | Auditoria matemática — decisões sobre CEt, NVO, MATED, obtusângulos |
| 6 | **Síntese de Clairaut** | `memory/project_sintese_clairaut.md` | SC completa: protocolos Agudo/β/γ, Estado Singular, manômetros α/ω/ε |
| 7 | **Painel Clairaut** | `memory/project_painel_clairaut.md` | 3 modos de visualização, live preview, fase angular (artigo) |
| 8 | **Artigo Científico** | `memory/project_artigo_cientifico.md` | 8 conceitos originais Aura para publicação futura |
| 9 | **Pipeline v2.0** | Seção "PIPELINE DE PROCESSAMENTO" neste documento | Sequência canônica de 7 passos de processamento |
| 10 | **Story ativa** | `docs/stories/{epic}.{story}.story.md` | ACs, tasks, DoD e quality gates da story em execução |
| 11 | **Aura-SDC-CHARTER** | `docs/Aura-SDC-CHARTER.md` | Protocolo SDC Aura-específico: 7 fases, 34 agentes, quality gates por épico, DoD global — **PRECEDÊNCIA** sobre SDC genérico |

> **Regra:** Se houver conflito entre documentos, a ordem de precedência é: MetodoAura > Math Audit v2 > SPRINT-MEMORY > MASTERPLAN.

---

## PIPELINE DE PROCESSAMENTO Aura — v2.0 (canônico)

> Sequência obrigatória após cada recalibração do projeto. Aprovada pelo squad completo em 2026-03-18.

```
PASSO 1  │ REGRESSÃO + DERIVADA
         │ • Regressão OLS global → reta tangente Prazo
         │ • Derivada da curva acumulada → reta tangente Custo
         │
PASSO 2  │ CEt DUPLA + NVO
         │ • CEt pré-normalização (valores brutos R$, dias)
         │ • CEt pós-normalização (adimensional [0.05, 2.0])
         │ • Calcula [lado_min, lado_max] para E, P, O
         │ • Calcula NVO por hierarquia de 3 níveis (Story 1.2)
         │
PASSO 3  │ EIXO DE DIMENSÃO — Zonamento CEt (semáforo de decisão)
         │
         │  Orçamento:  [0 → O_líq]       FAIXA AUTORIZADA
         │              [O_líq → O_cet]   FAIXA DE CONTINGÊNCIA → unlock: entrada de capital
         │              [> O_cet]         FORA DO CONE (bloqueado)
         │
         │  Prazo:      [0 → P_líq]       FAIXA AUTORIZADA
         │              [P_líq → P_cet]   FAIXA DE CONTINGÊNCIA → unlock: alteração calendário
         │              [> P_cet]         FORA DO CONE (bloqueado)
         │
         │  (independente e paralelo ao MATED — Eixo de Forma)
         │
PASSO 4  │ SC — SÍNTESE DE CLAIRAUT  [Story 2.0]
         │ • Pré-gate: verificar Estado Singular (ângulo = 90° ±0.01°)
         │ • Classificar: Agudo / Protocolo β (E-O obtuso) / Protocolo γ (E-P obtuso)
         │ • Ativar protocolo + calcular α, ω, ε + Prometeu Intrínseco (IR, Rα, Rω)
         │
PASSO 5  │ EIXO DE FORMA — MATED + ALERTAS
         │ • Distância euclidiana ao NVO → Zona: ÓTIMO/SEGURO/RISCO/CRISE
         │ • Alertas com throttle por zona → registro em decisoes_mated
         │ • Nomenclatura da decisão reflete protocolo SC ativo
         │
PASSO 6  │ CÁLCULO DE ÁREA (dinâmico — recalcula a cada progresso)
         │ • TA/TM = Índice de Qualidade (IQ)
         │ • Painel Clairaut atualiza α, ω, ε em tempo real
         │
PASSO 7  │ DASHBOARDS
         │ • Triângulo TM + TA (sombra TM-SHADOW)
         │ • Painel Clairaut (modo escolhido: triangle-live / gauge-panel / radar)
         │ • Módulo Prometeu Intrínseco (IR, Rα, Rω)
         │ • MATED Timeline, IQ badge, alertas
```

---
**Ref. detalhada:** `docs/FEATURE-MAP.md` — Motor × Sistema × Features × Dados × Agentes

---

## V1.0 RELEASE GATE — O QUE É E O QUE NÃO É v1.0

> **Propósito:** Definir a linha de chegada de v1.0 comercialmente viável. Tudo fora deste gate é v1.1 ou v2.0.
> **Regra:** Se uma feature não está nesta lista, NÃO é TIER 1 mesmo que pareça importante.

### ✅ IN — v1.0 (produto funciona e gera valor comercialmente)

| Camada | Critério | Story |
|--------|----------|-------|
| **C1 Motor** | NVO correto (acutângulo + obtuso) | 1.2 |
| **C1 Motor** | CEt verificada (pré e pós-normalização) | 1.1 |
| **C1 Motor** | 0 crashes em setup (UX4, UX5, UX7, M7) | 1.10–1.14 |
| **C2 Infra DB** | 5 tabelas novas + RLS + CASCADE + triggers | 8.1–8.5, 8.11 |
| **C2 SaaS** | Login/Register com UX funcional | SaaS-1 |
| **C2 SaaS** | Onboarding guiado (1ª sessão → projeto criado) | SaaS-2 |
| **C2 SaaS** | Convites de membros (colaboração mínima) | SaaS-3 |
| **C2 SaaS** | Rate limiting /api/ai/* + Zod validation | SaaS-6 |
| **C2 SaaS** | CI/CD com quality gates bloqueantes | SaaS-8 |
| **C3 Execução** | % Avanço por tarefa + TA recalcula | 5.1, 5.2 |
| **C3 Execução** | MATED atualiza + alerta automático | 5.5 |
| **C3 Execução** | Badge IQ na sidebar | 5.6 |
| **C3 UX** | Mobile 375px funcional (0 scroll horizontal) | DS-3 |
| **C3 UX** | 0 usos de `alert()` nativo | DS-2 |
| **C3 UX** | Empty states com CTA | DS-4 |
| **C3 UX** | Sidebar com grupos semânticos | DS-5 |
| **C3 Klauss** | klauss-to-mated funcional | 7.1 |

### ❌ OUT — v1.1 (melhorias pós-lançamento)

- Modo Invertido / Triângulo Obtuso (EP-02) completo
- PERT Sugiyama / Gantt Lupa (EP-04)
- Calibração Bayesiana completa (EP-03 stories 3.5–3.8)
- SDO completo (Story 5.3)
- Histórico de Pecados TM versionado completo (Story 5.4)
- Design System página /design-system (DS-10)
- Auditoria a11y completa (DS-8)
- Email de alerta MATED (SaaS-5)
- Configurações de perfil avançadas (SaaS-4)

### ❌ OUT — v2.0 (features premium)

- Pesquisa acadêmica / paper (EP-11)
- A/B test Big Dig (Story 3.8)
- Aceleração Predatória (Story 5.10)
- MATED Causal completo (Story 5.8)
- Monitoring/Observability externo (Sentry/Datadog)
- Billing/Stripe completo
- 2FA

---

## ESTADO ATUAL DO PRODUTO

```
┌─────────────────────────────────────────────────────────────────┐
│ Aura 6.1 — Sessão 12 (2026-03-21) — MASTERPLAN v5.4  🏁 V1.0   │
├──────────────────────┬──────────────────────────────────────────┤
│ Código               │ 150+ arquivos TS/TSX, 5.000+ LOC motor   │
│ Banco de Dados       │ 16 migrations, 17 tabelas (todas RLS ✅) │
│ APIs                 │ 13 endpoints (9 IA, 3 Stripe, 1 Report)  │
│ Pages                │ 33 rotas                                  │
│ Motor matemático     │ 35+ funções impl. (NVO, CEt, MATED, IQ…) │
│ Testes unitários     │ 568 testes passando ✅                    │
│ Build                │ ✅ npm run build — 0 errors               │
│ Deploy               │ ✅ Vercel (aura-6-1.vercel.app)          │
│ Edge Function        │ ✅ calibrate-on-archive ACTIVE (AC-4 fix)│
│ EP-01 Motor Core     │ ✅ 14/14 Done (NVO, CEt, tangente, E din)│
│ EP-02 Modo Invertido │ ✅ 14/14 Done (SC, obtuso β/γ, remissão) │
│ EP-03 Calibração     │ ✅ 14/14 Done (3.0-A→F + 3.1–3.8)       │
│ EP-05 Execução       │ ✅ 10/10 Done (% avanço, TA, MATED, IQ)  │
│ EP-06 Navegação      │ ✅ Done (6.1–6.8)                        │
│ EP-07 Klauss IA      │ ✅ Done (7.1–7.9)                        │
│ EP-08 Infra/DB       │ ✅ Done (8.1–8.13 rastreados)            │
│ EP-DS Design System  │ ✅ 10/10 Done                            │
│ EP-SaaS              │ ✅ Done (exceto SaaS-4/5 — v1.1)         │
│ V1.0 Release Gate    │ 🏁 TODOS 16 CRITÉRIOS ATENDIDOS          │
└──────────────────────┴──────────────────────────────────────────┘
```

### Story 3.0 — CDT: Calibração de Parâmetros e Sistema de Zonas (Sessão 11)

**Aprovada em debate conceitual** — 25 decisões canônicas (D1–D25).

| Grupo | Decisões | Resumo |
|-------|---------|--------|
| A — Denominadores | D1–D7 | `lado_P` usa caminho crítico; `lado_O` usa orçamento operacional; TAP recebe `percentual_contingencia` |
| B — Zonas | D8–D12 | Verde/Amarela/Vermelha/Cinza/Nula com regras assimétricas prazo × custo |
| C — Visualização | D13–D17 | Sombreamento aditivo no triângulo + gráficos; pulso em Zona Vermelha |
| D — 3 Modos de Leitura | D18–D20 | Semáforo (rápido) → Triângulo (painel) → Tabela CEt (decisão) |
| E — Governança | D21–D25 | Zona Nula bloqueada + declaração PM/PO; derivada NVO; timeline de zonas |

**Decomposição em sub-stories:** 3.0-A → 3.0-F (6 sub-stories, ~4 sessões)
**Documento completo:** `docs/stories/3.0.story.md`
**Decisões canônicas:** `docs/SPRINT-MEMORY.md §11`

### Sprints Redesign P5 — Status Final (Sessões 9–10)

| # | Sprint | Conteúdo | Sessão | Status |
|---|--------|---------|--------|--------|
| 1 | B-FIX | Bugs B1–B5: CPM layout, PERT setas, banner, alert(), bigdig | 9 | ✅ Done |
| 2 | PERT-V2 | PERT Sugiyama + nodes compactos + empate caminho crítico | 9 | ✅ Done |
| 3 | GANTT-LUPA | Gantt efeito lupa temporal sob Função Custo | 9 | ✅ Done |
| 4 | C-CEt | CetDuplaBadge + AreaBadge no header do Motor CDT | 9 | ✅ Done |
| 5 | F-CICD | GitHub Actions CI/CD (lint→typecheck→test→build) | 9 | ✅ Done |
| 6 | RENAME-ROUTES | EAP→WBS, CPM→tarefas-diagramas, CDT→triangulo-matriz | 9 | ✅ Done |
| 7 | TM-SHADOW | TM baseline como sombra cinza atrás do TA no TrianglePlotter | 10 | ✅ Done |
| 8 | DB-EXEC | 3 tabelas execução: triangulo_matriz_versoes, progresso_tarefas, decisoes_mated | 10 | ✅ Done |
| 9 | EXEC-MODULE | recalcularTA conectado ao Hub — lados reais após save de progresso | 10 | ✅ Done |
| 10 | KLAUSS-MATED | UI → /api/ai/klauss-to-mated real; fix tenant_id; zona+justificativa exibidos | 10 | ✅ Done |
| 11 | FERRAMENTAS | CaixaFerramentas: 10 ferramentas (5 diagnóstico + 5 crise) + recomendação Klauss | 10 | ✅ Done |
| 12 | ADMIN-SIDEBAR | Avatar dropdown no rodapé: Conta & plano, Perfis, Sair — fora do GOVERNANÇA | 10 | ✅ Done |

### Camadas do Sistema — Visão Rápida

| Camada | Status | Critério de Estabilidade |
|--------|--------|--------------------------|
| **C1 Motor Matemático** | ✅ V1.0 — NVO 3 níveis, CEt dupla, tangente pontual, E dinâmico, zonas CDT | Suite 568 testes ✅ — build clean |
| **C2 Sistema/Infra** | ✅ V1.0 — 16 migrations, RLS todas tabelas, Edge Function AC-4 fix | TypeCheck 0 erros (src/) — RLS verificado |
| **C3 Features** | ✅ V1.0 — execução/calibração/MATED/IQ/Klauss funcionais | Build 0 erros — 568 testes ✅ |

---

## SQUAD COMPLETO — 33 AGENTES

### Core AIOX (13)
| Agente | Persona | Papel |
|--------|---------|-------|
| `@aiox-master` | Orion | Orquestrador master, governança |
| `@dev` | Dex | Implementação full-stack Next.js/TS |
| `@qa` | Quinn | Testes, quality gates, cobertura |
| `@architect` | Aria | Arquitetura técnica, decisões de design |
| `@data-engineer` | Dara | Schema Supabase, RLS, migrations |
| `@pm` | Morgan | PRDs, epics, requisitos |
| `@po` | Pax | Backlog, validação stories, priorização |
| `@sm` | River | User stories, sprint planning |
| `@devops` | Gage | Git push, CI/CD — EXCLUSIVO |
| `@nexus` | Nexus | DevOps Vercel, quality gates infra |
| `@analyst` | Atlas | Pesquisa, análise de mercado |
| `@ux-design-expert` | Uma | UX/UI, design system |
| `@squad-creator` | Craft | Criação e gestão de squads |

### Aura Domínio (6)
| Agente | Papel |
|--------|-------|
| `@aura-math` | Motor geométrico — CEt, MATED, NVO, obtusângulos |
| `@aura-production` | Engenharia de produção, PMBOK, TOC prescritivo |
| `@aura-klauss` | IA Klauss — decisão, crise, linguagem natural |
| `@aura-pm` | PM de engenharia, governança SaaS |
| `@aura-integrator` | Arquitetura SaaS, Stripe, integrações |
| `@aura-qa-auditor` | Auditoria matemática, verificação do engine |

### Suporte & Crescimento (7)
| Agente | Papel |
|--------|-------|
| `@kieza-research` | Inteligência de mercado, validação setorial |
| `@marta-marketing` | Marketing B2B, growth, posicionamento |
| `@motion-designer` | UX premium, motion design (Luna) |
| `@daniboy` | Data engineer — pipelines, schema avançado |
| `@daniela` | Data analyst — insights, dashboards |
| `@clint` | Data scientist — modelagem, Monte Carlo |
| `@jordy` | Prompt engineering, PQR, refactor de prompts IA |

### Especialistas Visuais (3)
| Agente | Persona | Papel |
|--------|---------|-------|
| `@dataviz` | Viz | Visualização interativa, CDT Canvas, War Room |
| `@e2e-tester` | Cypress | Automação E2E, visual regression, a11y |
| `@visual-designer` | Pixel | Identidade visual, design tokens, UI polish |

### Especialistas Novos (4)
| Agente | Papel |
|--------|-------|
| `@roberta` | Probabilidade, estatística, metodologia pesquisa, Monte Carlo |
| `@security-auditor` | Shield — AppSec, OWASP, PCI-DSS, RLS audit |
| `@aura-analyst` | Análise quantitativa do método |
| `@aura-researcher` | Agenda pesquisa, publicações, calibração |

---

## DÍVIDA TÉCNICA — STATUS COMPLETO (39 DÉBITOS)

### Motor Matemático (M1–M8)
| ID | Débito | Sev | Status | Épico |
|----|--------|-----|--------|-------|
| M1 | Normalização CDT sem adimensionalização verdadeira | CRÍTICO | ✅ Resolvido (E=nTarefas/baseline linha 565, C/P=tang/baseTang linha 581-584) | EP-01 |
| M2 | Mapeamento lado-vértice sem documentação semântica | ALTO | ✅ Resolvido (comentário semântico A/B/C_vert em math.ts linha 671) | EP-01 |
| M3 | `peAltitude()` vs `projectPointToLine()` — tipos incompatíveis | ALTO | ✅ Resolvido (Story 1.9 — peAltitude delega para projectPointToLine com conversão number[]→Point) | EP-01 |
| M4 | CEt avaliada pós-normalização | CRÍTICO | ✅ Resolvido (Story 1.1 Done) | EP-01 |
| M5 | Triângulo órtico inválido para obtusângulos | CRÍTICO | ✅ Resolvido (linha 382-396) | — |
| M6 | OLS global em vez de tangente pontual | ALTO | ✅ Resolvido (Story 1.4 — tangentePontual canônico) | EP-01 |
| M7 | `custosTarefas` vazio → CDT impossível | CRÍTICO | ✅ Resolvido (Story 1.6 — seedCustosTarefas) | EP-01 |
| M8 | Box-Muller implementado mas não usado no MC | MÉDIO | ✅ Resolvido | — |

### Pipeline de Dados (P1–P6)
| ID | Débito | Sev | Status | Épico |
|----|--------|-----|--------|-------|
| P1 | WBS extractor parseia linhas não-WBS | ALTO | ✅ Resolvido (isNonWBSLine() em extractors.ts + 31 testes) | EP-12 |
| P2 | `setTarefas(... as any)` — shape incorreto | CRÍTICO | ✅ Resolvido (TarefaRow type + cast tipado em ProjectContext.tsx) | EP-12 |
| P3 | EAP loop re-parse quando context carrega antes do DB | MÉDIO | ✅ Resolvido (cascadeAttemptedRef — cascata roda 1x por projeto) | EP-12 |
| P4 | EAP save sobrescreve duração com hardcoded `5` | ALTO | ✅ Resolvido (fallback 5 → 1 em eap/page, tap/page, ProjectContext) | EP-12 |
| P5 | `duracao` (context) vs `duracao_estimada` (DB) inconsistente | CRÍTICO | ✅ Resolvido (TarefaCpmSchema aceita duracao OU duracao_estimada) | EP-12 |
| P6 | IDs mistos: UUID vs WBS-xxx vs T01 — JOIN quebrado | ALTO | ⏳ Pendente (EP-12 v1.1) | EP-12 |

### Database (DB1–DB13)
| ID | Débito | Sev | Status | Épico |
|----|--------|-----|--------|-------|
| DB1 | RLS sem policies | CRÍTICO | ✅ Resolvido (migration 20260314) | — |
| DB2 | ID misto eap_nodes ↔ tarefas | ALTO | ⏳ Pendente (EP-12 v1.1) | EP-12 |
| DB5 | Índices faltantes em projeto_id | ALTO | ✅ Resolvido | — |
| DB9 | `predecessoras` JSONB sem validação de referência | ALTO | ✅ Resolvido (trigger trg_validate_predecessoras + Zod z.array(z.string())) | EP-12 |
| DB11 | Sem ON DELETE CASCADE (eap_nodes → projetos) | MÉDIO | ✅ Resolvido (migration 20260321900000) | EP-08 |
| DB12 | `custos_tarefas` JSONB sem schema validation | MÉDIO | ✅ Resolvido (CustosTarefasSchema + parseCustosTarefas em schemas/index.ts) | EP-08 |
| DB13 | Sem trigger `updated_at` automático | BAIXO | ✅ Resolvido (migration 20260321900000) | EP-08 |

### Frontend/UX (UX1–UX14)
| ID | Débito | Sev | Status | Épico |
|----|--------|-----|--------|-------|
| UX1 | Sem stepper setup com status real | ALTO | ✅ Resolvido (useSetupCompletion — 5 passos com status real via ProjectContext) | EP-12 |
| UX3 | Labels CDT sem semântica (E/O/P não identificados) | ALTO | ✅ Resolvido (CDTCanvas renderiza E/O/P com translateLabel em svgA/B/C) | EP-05 |
| UX4 | `projecaoFinanceira` declarada 2x — BUILD BREAK | CRÍTICO | ✅ Resolvido (Story 1.13) | EP-01 |
| UX5 | `modeloCurva` undefined — CRASH | CRÍTICO | ✅ Resolvido (Story 1.13) | EP-01 |
| UX6 | Reta tangente hardcoded no SVG orçamento | ALTO | ✅ Resolvido (Story 1.4 — tangentePontual) | EP-01 |
| UX7 | `dataInicio` sem import em orcamento/page.tsx | ALTO | ✅ Resolvido (Story 1.13) | EP-01 |
| UX9 | Sem tradução métricas adimensionais → linguagem PM | CRÍTICO | ✅ Resolvido (Sprint 10) | EP-05 |
| UX11 | Debug markers visíveis (border-red, EAP-V3) | BAIXO | ✅ Resolvido (Story 1.14 — debug cleanup) | EP-01 |
| UX12 | Empty states genéricos em todas as páginas | MÉDIO | ✅ Resolvido (Story DS-4 — empty states com CTA) | EP-06 |
| UX13 | Sem confirmação em "Limpar Tudo" na EAP | MÉDIO | ✅ Resolvido (Story 1.14) | EP-01 |
| UX14 | Mobile completamente quebrado (tabelas overflow) | ALTO | ✅ Resolvido (grid-cols responsivos sm:breakpoint em dashboard, gerenciamento, loading, calendário, report) | EP-12 |

### Gaps de Método (G1–G7)
| Gap | Descrição | Status | Épico |
|-----|-----------|--------|-------|
| G1 | KPI primário (Desvio Qualidade) sem badge/visualização | ✅ Resolvido (card Desvio Qualidade no dashboard — CONTROLADO/ATENÇÃO/CRÍTICO) | EP-05 |
| G2 | Lados usam OLS global em vez de tangente instantânea | ✅ Resolvido (Story 1.4 — tangentePontual canônico) | EP-01 |
| G3 | Sem Zona de Sensibilidade Mínima MATED | ✅ Resolvido (CDTCanvas — círculo tracejado ε=0.05 ao redor NVO) | EP-05 |
| G4 | Projeção tendência não validada contra CEt | ✅ Resolvido (Story 1.7 — projeção valida CEt antes de exibir) | EP-01 |
| G5 | Escopo E hardcoded 1.0 (scope creep invisível) | ✅ Resolvido (Story 1.5 — E = tarefas_atual/tarefas_baseline) | EP-01 |
| G6 | Sem rota IA para dica-método-prazo | ⏳ Pendente | EP-07 |
| G7 | Zeros Murphy vs zeros planejados não diferenciados | ✅ Resolvido (Story 1.8 — classificarZerosMurphy) | EP-01 |

**Resumo:** 36/39 resolvidos (92.3%) | 3 pendentes (7.7%) — P6, DB2, G6 → EP-12 v1.1 | 0 críticos pendentes

---

## BUGS CONFIRMADOS (B1–B5) — ✅ TODOS RESOLVIDOS (Sprint B-FIX, Sessão 9)

| ID | Bug | Arquivo | Status |
|----|-----|---------|--------|
| B1 | CPM tabela layout quebrado (colunas overflow) | `setup/tarefas-diagramas/page.tsx` | ✅ Resolvido |
| B2 | PERT setas incompletas (nem todas as arestas SVG) | `setup/tarefas-diagramas/page.tsx` | ✅ Resolvido |
| B3 | Banner WBS não persiste "dispensado" | `setup/wbs/page.tsx` | ✅ Resolvido |
| B4 | `alert()` bloqueante em 3 lugares críticos | app-wide | ✅ Substituído por toast |
| B5 | `bigdig.test.ts` deprecated ainda rodando | `engine/bigdig.test.ts` | ✅ Removido |

---

## ESTRUTURA DE ROTAS ATUAL (26 PÁGINAS)

```
/ (landing) | /login | /register | /forgot-password | /onboarding

SETUP:
  /[projetoId]/setup/tap/
  /[projetoId]/setup/wbs/              ✅ renomeado (era /eap/)
  /[projetoId]/setup/calendario/
  /[projetoId]/setup/tarefas-diagramas/ ✅ renomeado (era /cpm/)
  /[projetoId]/setup/funcoes/
  /[projetoId]/setup/orcamento/

MOTOR:
  /[projetoId]/motor/burndown/
  /[projetoId]/motor/curva-s/
  /[projetoId]/motor/triangulo-matriz/  ✅ renomeado (era /cdt/)
  /[projetoId]/motor/recursos/
  /[projetoId]/motor/cpm/

DECISÃO:
  /[projetoId]/decisao/mated/
  /[projetoId]/decisao/ia/
  /[projetoId]/decisao/war-room/  (renomear → /gabinete/)

GOVERNANÇA:
  /[projetoId]/governanca/gerenciamento/
  /[projetoId]/governanca/kanban/
  /[projetoId]/governanca/gabinete/
  /[projetoId]/governanca/warroom/  ⚠️ DUPLICADO — remover
  /[projetoId]/governanca/relatorios/

ADMIN:
  /[projetoId]/admin/perfis/
  /[projetoId]/admin/planos/
  /[projetoId]/admin/alertas/

REPORT:
  /[projetoId]/report/
  /[projetoId]/relatorios/          ⚠️ DUPLICADO — consolidar
```

---

## SCHEMA SUPABASE ATUAL (9 MIGRATIONS)

| Migration | O que cria | Status |
|-----------|-----------|--------|
| add_tap_summary_fields | Campos TAP | ✅ |
| audit_harmony_fix | Auditoria integridade | ✅ |
| fix_tap_metadata | Metadata JSON | ✅ |
| rls_policies_and_indices | RLS 7 tabelas + 5 índices + cdt_area_baseline | ✅ CRÍTICA |
| enforce_plan_tier_server_side | Gating por plano | ✅ |
| fix_regime_turnos_indexes_security | Regime trabalho + RLS final | ✅ |
| m1_escopo_baseline | n_tarefas_baseline, data_baseline | ✅ Motor |
| c2_modelo_burndown | Curva S persistida por projeto | ✅ Motor |
| 20260318200000_exec_tables | triangulo_matriz_versoes, progresso_tarefas, decisoes_mated + RLS + 6 índices | ✅ Sprint DB-EXEC |

**Tabelas ativas (10) — status detalhado:**

| Tabela | RLS | CASCADE | updated_at trigger | Observação |
|--------|-----|---------|-------------------|------------|
| `projetos` | ✅ | ❌ | ❌ | 8.2, 8.3 |
| `tarefas` | ✅ | ❌ | ❌ | 8.2, 8.3 |
| `eap_nodes` | ✅ | ❌ | ❌ | 8.2, 8.3 |
| `orcamentos` | ✅ | ❌ | ❌ | 8.2, 8.3 |
| `marcos` | ✅ | ❌ | ❌ | 8.2 |
| `funcoes_compressao` | ✅ | ❌ | ❌ | 8.2 |
| `historico_projeto` | ✅ | ❌ | ❌ | 8.2 |
| `calendarios` | ✅* | ❌ | ❌ | — |
| `tenants` | ✅ | — | — | — |
| `project_members` | ✅* | ❌ | ❌ | — |
| `triangulo_matriz_versoes` | ✅ RLS | ❌ | ❌ | Criada — 0 rows |
| `progresso_tarefas` | ✅ RLS | ❌ | ❌ | Criada — 0 rows |
| `decisoes_mated` | ✅ RLS | ❌ | ❌ | Criada — 0 rows |
| `aura_calibration_events` | ✅ RLS | ❌ | ❌ | Criada — 12 rows |
| `aura_setor_config` | ✅ RLS | ❌ | ❌ | Criada — 5 rows |
| `ratelimit_log` | ✅ RLS | — | — | Nova — não mapeada |
| `tenant_users` | ✅ RLS | — | — | Nova — não mapeada |

> ✅ **Atualizado 2026-03-18:** Todas as tabelas existem com RLS. Verificado via MCP Supabase.
> RLS usa `auth.uid()` diretamente (Story 8.5 vai corrigir para `(SELECT auth.uid())` — performance)

**Pendentes (EP-08):** Zod validation JSONB, mapear ratelimit_log e tenant_users
**Resolvidos (Sprint 8):** ON DELETE CASCADE (9 tabelas) + trigger updated_at automático (migration 20260321900000)

---

## MOTOR MATEMÁTICO — INVENTÁRIO DE FUNÇÕES (math.ts)

### Funções Implementadas (21)

| Função | Categoria | Status | Observação |
|--------|-----------|--------|------------|
| `forwardPass()` | CPM | ✅ | — |
| `backwardPass()` | CPM | ✅ | — |
| `calculateCPM()` | CPM | ✅ wrapper | Legado — retrocompat. |
| `regressaoOLS()` | Curvas | ✅ | ⚠️ Ainda default — deve ser substituído por tangente (Story 1.4) |
| `regressaoPonderada()` | Curvas | ✅ | Pesos crescentes ok |
| `tangentePontual()` | Curvas | ✅ existe | ⚠️ Não é canônico — Story 1.4 troca |
| `areaTri()` | Geometria | ✅ | — |
| `dist()` | Geometria | ✅ | — |
| `peAltitude()` | Geometria | ⚠️ | Conflita com `projectPointToLine()` — Story 1.9 |
| `calcularMATED()` | MATED | ✅ | — |
| `isPointInTriangle()` | Geometria | ✅ | — |
| `gerarTrianguloCDT()` | CDT Engine | ⚠️ | NVO usa incentro para obtuso (deve ser baricentro TM — Story 1.2). CEt pré-norm parcial (linha 347) |
| `classificarZonaMATED()` | Zonas | ✅ | σ=0.1 hardcoded (Story 3.4) |
| `classificarZonaComposta()` | Zonas | ✅ | — |
| `decomporMATED()` | MATED | ✅ | — |
| `normalizarEscala()` | Utils | ✅ | — |
| `calcularProjecaoFinanceira()` | Financeiro | ✅ | — |
| `calcularConfiancaMonteCarlo()` | Monte Carlo | ⚠️ | Box-Muller impl. σ=0.1 hardcoded (Story 3.4) |
| `findClosestIndex()` | Utils | ✅ | — |
| `calculateCDT()` | CDT | ✅ wrapper | Legado |
| `isPointInTriangle()` | Geometria | ✅ | — |

### Funções a Criar (18) — com Story de referência

| Função | Story | Sprint | Categoria |
|--------|-------|--------|-----------|
| `classificarTriangulo(lados)` | 1.2, 2.1 | B-FIX | Geometria |
| `calcularNVO(TA, TM)` — 3 níveis | 1.2 | B-FIX | NVO |
| `verificarCEt(lados, stage)` | 1.1 | C-CEt | Validação |
| `calcularBurndownES(tarefas)` | 1.3 | C1 | CPM |
| `calcularLadoEDinamico()` | 1.5 | C4 | Escopo |
| `seedCustosTarefas()` | 1.6 | C1 | Financeiro |
| `validarProjecaoCEt()` | 1.7 | C-CEt | Validação |
| `classificarZerosMurphy()` | 1.8 | C5 | CPM |
| `getSigmaForProject()` | 3.4 | DB-EXEC | Calibração |
| `getModeInfo()` | 3.4 | DB-EXEC | Calibração |
| `detectarDesvioSubclinico()` | 3.7 | C6 | Alertas |
| `calcularSDO()` | 5.3 | EXEC-MODULE | SDO |
| `calcularIQ(areaTA, areaTM)` | 5.6 | EXEC-MODULE | IQ |
| `decompMATEDCausal()` | 5.8 | C8 | Causal |
| `detectarAceleracaoPredatoria()` | 5.10 | EXEC-MODULE | Alertas |
| `detectarRemissao()` | 2.7 | EXEC-MODULE | Modo Invertido |
| `inverterCoordenadas()` | 2.5 | TM-SHADOW | Modo Invertido |
| `unificaPeAltitude()` | 1.9 | B-FIX | Refactor |

---

## MAPA DE DADOS — FEATURES vs DB

### Campos DB existentes que features precisam (OK)

| Campo DB | Tabela | Feature |
|----------|--------|---------|
| `n_tarefas_baseline` | `projetos` | Lado E dinâmico (Story 1.5) — DB ✅ feature 📋 |
| `modelo_burndown` | `projetos` | Curva S modelo — DB ✅ feature ✅ |
| `es`, `ef`, `ls`, `lf` | `tarefas` | CPM + Burndown ES/EF — DB ✅ feature 📋 (Story 1.3) |
| `custos_tarefas` JSONB | `orcamentos` | Lado O — DB ✅ ⚠️ sem schema validation |
| `cdt_area_baseline` | `orcamentos` | CDT diff área — DB ✅ |
| `config_regime`, `interrupcoes` | `projetos` | Calendário — DB ✅ |

### Tabelas AUSENTES que bloqueiam features (CRÍTICO)

| Tabela | Features bloqueadas | Story |
|--------|--------------------|----|
| `progresso_tarefas` | % Avanço (5.1), Recalcular TA (5.2), Alertas (5.5) | **8.1** |
| `triangulo_matriz_versoes` | Histórico de Pecados (5.4), Modo Invertido (2.8) | **8.1** |
| `decisoes_mated` | Alertas (5.5), Klauss MATED (7.1), Timeline (5.9) | **8.1** |
| `aura_calibration_events` | SDO (5.3), Calibração (3.1–3.5) | **8.1** |
| `aura_setor_config` | Fator setor (3.3), σ por setor (3.4) | **3.3** |

> **⚠️ Story 8.1 é gate crítico — 15+ stories dependem dela**

### Campos DB com problemas de consistência

| Campo | Problema | Story |
|-------|---------|-------|
| `tarefas.duracao_estimada` vs context `duracao` | Nomes diferentes — JOIN inconsistente | EP-12 (12.3) |
| `eap_nodes.id` vs `tarefas.id` | IDs mistos UUID/WBS — relacionamento quebrado | EP-12 (12.2) |
| RLS com `auth.uid()` direto | Performance: avaliado por linha | 8.5 |
| `predecessoras` JSONB sem validação FK | Referências inválidas aceitas silenciosamente | 8.4 |

---

## INTERDEPENDÊNCIAS CRÍTICAS — BLOQUEANTES

```
✅ Gate Story 8.1 CUMPRIDO — todas as 4 tabelas existem no banco (verificado 2026-03-18):
  aura_calibration_events ✅ | progresso_tarefas ✅ | triangulo_matriz_versoes ✅ | decisoes_mated ✅

Stories 2.0-engine + 2.0-ui (SC-FOUNDATION) DEVEM preceder:
  └── Stories 2.1–2.12  (EP-02 inteiro depende da SC implementada + Painel Clairaut ativo)

Story 1.2 (NVO correto) DEVE preceder:
  ├── Story 1.1  (CEt pós-norm usa NVO)
  ├── Story 3.8  (A/B test compara NVO antigo vs novo)
  └── Stories 2.1–2.12 (Modo Invertido depende de NVO)

Story 1.3 (Burndown ES/EF) DEVE preceder:
  ├── Story 5.2  (recalcular TA usa Lado P baseado em ES/EF)
  └── Story 4.1  (CPM engine usa mesma lógica)

Story 4.1 (CPM Engine) DEVE preceder:
  └── Story 5.8  (MATED Causal precisa de caminho crítico calculado)

Story 3.3 (aura_setor_config) DEVE preceder:
  ├── Story 3.4  (σ por setor)
  └── Story 3.5  (Edge Function UPDATE setor_config)

Story 3.4 (σ por setor) DEVE preceder:
  └── Story 3.8  (A/B test usa σ do modelo B)
```

---

## COBERTURA DE STORIES — ÉPICOS vs ARQUIVOS CRIADOS

> **Transparência:** diferença entre o que está no papel (MASTERPLAN) e o que existe como arquivo .story.md em `/docs/stories/`.

| Épico | Stories Planejadas | Arquivos Criados | Status |
|-------|--------------------|-----------------|--------|
| **EP-01** Motor Core | 14 | 9 (1.1, 1.2, 1.3, 1.7, 1.10, 1.11, 1.12, 1.13, 1.14) | ⚠️ 5 faltando (1.4–1.6, 1.8–1.9) |
| **EP-02** Modo Invertido | 14 | 2 (2.0-engine, 2.0-ui) | ⚠️ Stories 2.0-engine + 2.0-ui criadas — pré-req obrigatório |
| **EP-03** Calibração | 8 | 8 (3.1–3.8) | ✅ Completo |
| **EP-04** PERT/Gantt | 10 | 0 | ⛔ Nenhuma criada |
| **EP-05** Execução | 10 | 10 (5.1–5.10) | ✅ Completo |
| **EP-06** Navegação | 8 | 8 (6.1–6.8) | ✅ Completo — Done: 6.1, 6.2, 6.4, 6.5, 6.8 / Draft: 6.3, 6.6, 6.7 |
| **EP-07** Klauss IA | 9 | 8 (7.1–7.9, exceto 7.1 já existia) | ✅ Completo — Done: 7.1, 7.2, 7.5, 7.6, 7.9 / Draft: 7.3, 7.4, 7.7, 7.8 |
| **EP-08** Infra/DB | 13 | 6 (8.1–8.5, 8.11) | ⚠️ 7 faltando (8.6–8.10, 8.12, 8.13) |
| **EP-09** Ferramentas | 8 | 0 | ⛔ Nenhuma criada |
| **EP-10** Admin | 6 | 0 | ⛔ Nenhuma criada |
| **EP-11** Pesquisa | 8 | 0 | ⛔ Nenhuma criada |
| **EP-12** Dívida Técnica | 18 | 0 | ⛔ Nenhuma criada |
| **EP-DS** Design System | 10 | 10 (DS-1–DS-10) | ✅ Completo |
| **EP-SaaS** Infra SaaS | 8 | 8 (SaaS-1–SaaS-8) | ✅ Completo |
| **EP-13** Prometeu Extrínseco | 6 | 0 | ⛔ Novo épico — Sessão 9 |
| **TOTAL** | **151** | **~68** | **⚠️ ~83 stories sem arquivo** |

> Stories "faltando" = planejadas no MASTERPLAN mas sem arquivo .story.md. São a próxima prioridade de @sm.

---

## 14 ÉPICOS — ESTRUTURA COMPLETA

---

## ÉPICO 1 — Fundamentos Geométricos (Motor Core)

**Objetivo:** Garantir que o motor matemático é correto, consistente e fiel ao MetodoAura antes de qualquer feature nova.
**Prioridade:** 🔴 CRÍTICO — TIER 1
**Agentes lead:** @aura-math, @dev | **Suporte:** @aura-qa-auditor, @qa, @roberta, @architect
**Débitos cobertos:** M1, M2, M4, M6, M7, G2, G4, G5, UX4, UX5, UX6, UX7, UX11, UX13, B1, B2, B3, B4, B5

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 1.1 | CEt dupla: pré e pós-normalização, bloquear cálculo se falhar | @dev + @aura-math | C-CEt | 3h |
| 1.2 | NVO hierarquia 3 níveis: baricentro órtico → baricentro TM → incentro TM | @dev + @aura-math | B-FIX | 5h |
| 1.3 | Burndown baseado em ES/EF do CPM real (não soma serializada) | @dev + @aura-production | C1 | 6h |
| 1.4 | Tangente pontual como canônico (substituir OLS global no Lado P) | @dev + @aura-math | C-TAN | 6h |
| 1.5 | Lado E dinâmico: E = tarefas_atuais / tarefas_baseline (scope creep) | @dev + @aura-math | C4 | 8h |
| 1.6 | Seed custosTarefas: gerar distribuição proporcional quando vazio | @dev + @aura-production | C1 | 4h |
| 1.7 | Projeção CDT (+5 dias) validada contra CEt antes de exibir | @dev + @aura-math | C-CEt | 3h |
| 1.8 | Zeros Murphy vs zeros planejados: classificar e ponderar diferente | @dev + @aura-production | C5 | 4h |
| 1.9 | Unificar `peAltitude()` e `projectPointToLine()` em `triangle-logic.ts` | @dev + @architect | B-FIX | 3h |
| 1.10 | Fix B1: CPM tabela layout (CSS grid min-width) | @dev | B-FIX | 2h |
| 1.11 | Fix B2: PERT setas (arrowhead SVG, coord pré-render) | @dev + @dataviz | B-FIX | 3h |
| 1.12 | Fix B3/B4/B5: banner persist + substituir alert() por toast + remover bigdig deprecated | @dev | B-FIX | 4.5h |
| 1.13 | Fix UX4/UX5/UX7: projecaoFinanceira duplicada + modeloCurva undefined + dataInicio import | @dev | B-FIX | 3h |
| 1.14 | Fix UX11/UX13: remover debug markers + confirmação "Limpar Tudo" | @dev | B-FIX | 1.5h |

### Quality Gates
- @aura-qa-auditor valida matematicamente stories 1.1–1.8 antes do merge
- Suite Big Dig passa 100% após cada story crítica
- TypeCheck 0 erros novos
- Vitest: cobertura ≥90% nas funções alteradas do engine

### Definition of Done (EP-01)
- [ ] CEt verificada em dois momentos, com erro tipado retornado
- [ ] NVO calculado pelos 3 níveis, testado com fixtures acutângulo/obtusângulo/patológico
- [ ] Burndown usa ES de cada tarefa; projeto paralelo gera Lado P ≠ versão serializada
- [ ] Tangente pontual ativa para Lado P (não OLS)
- [ ] Lado E = razão tarefas, não hardcoded 1.0
- [ ] Todos os bugs B1–B5 e UX4/5/7/11/13 resolvidos
- [ ] Suite Big Dig: 157/157 tests ✅

---

## ÉPICO 2 — Triângulo Obtuso / Mundo Invertido

**Objetivo:** Implementar sistema de coordenadas dual — instrumento opera em dois modos semânticos conforme geometria.
**Prioridade:** 🔴 CRÍTICO — TIER 2
**Agentes lead:** @aura-math, @roberta | **Suporte:** @dev, @dataviz, @aura-production, @aura-klauss
**Decisões cobertas:** E18–E26
**⚠️ PRÉ-REQUISITO OBRIGATÓRIO:** Stories 2.0-engine E 2.0-ui (SC-FOUNDATION) DEVEM estar Done antes de qualquer story 2.x

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| **2.0-engine** | **SC-FOUNDATION: Motor de Classificação Morfológica e Protocolos** | @dev + @aura-math + @roberta + @architect | **SC-FOUNDATION** | **5h** |
| **2.0-ui** | **Painel Integridade do Triângulo: Visualização Angular Configurável** | @dev + @ux-design-expert + @dataviz + @motion-designer + @visual-designer | **SC-FOUNDATION** | **6h** |
| 2.1 | Badge "Regime Obtuso" + tipo (β/γ) usando resultado da SC (2.0) | @dev + @dataviz | TM-SHADOW | 2h |
| 2.2 | Badge "Regime Obtuso" na UI com tipo (β=custo / γ=prazo) | @dev + @dataviz | TM-SHADOW | 2h |
| 2.3 | Semântica ângulo E–O → 90°: badge "consumo de reserva" | @dev + @aura-math | TM-SHADOW | 3h |
| 2.4 | Semântica ângulo E–P: aceleração legítima vs predatória via IQ | @dev + @aura-production | EXEC-MODULE | 4h |
| 2.5 | Modo Invertido backend: TM obtusângulo → inverter coordenadas | @dev + @aura-math + @roberta | TM-SHADOW | 8h |
| 2.6 | Frontend Modo Invertido: disclaimer + Klauss explica mudança | @dev + @aura-klauss + @ux-design-expert | TM-SHADOW | 4h |
| 2.7 | Detectar Remissão: transição obtusângulo→acutângulo durante execução | @dev + @aura-math | EXEC-MODULE | 4h |
| 2.8 | Novo TM em Remissão + Histórico de Remissões (paralelo ao de Pecados) | @dev + @data-engineer | EXEC-MODULE | 5h |
| 2.9 | Gabinete de Crise Positiva: Klauss analisa + PM alerta de oportunidade | @aura-klauss + @dev | KLAUSS-MATED | 4h |
| 2.10 | Arquivar `area_regime_obtuso` na Remissão (dado longitudinal) | @data-engineer | DB-EXEC | 2h |
| 2.11 | TM sombra: triângulo original sempre visível como overlay cinza | @dataviz + @dev | TM-SHADOW | 4h |
| 2.12 | Gabinete de Crise auto-acionado em β/γ + zona CRISE | @dev + @aura-klauss | TM-SHADOW | 3h |

### Quality Gates
- @aura-qa-auditor verifica invariância matemática (área, MATED, ângulos) pré e pós-inversão
- @roberta valida que variância σ² é preservada na transformação
- @qa testa os dois modos com projetos-fixture distintos

### Definition of Done (EP-02)
- [ ] Stories 2.0-engine + 2.0-ui Done: SC classifica corretamente Agudo/β/γ/Singular + Painel Integridade do Triângulo funcional nos 3 modos
- [ ] Classificação correta para os 3 tipos de obtusângulo (α, β, γ) via SC
- [ ] Modo Invertido ativo para TM obtusângulo desde criação do projeto
- [ ] Remissão detectada e registrada com novo TM no modo acutângulo
- [ ] Área, MATED e ângulos matematicamente invariantes sob transformação
- [ ] PM nunca vê coordenadas inversas — Klauss explica tudo
- [ ] Gabinete de Crise Positiva acionado em Remissão

---

## ÉPICO 3 — Calibração Bayesiana e Dados Históricos

**Objetivo:** Substituir parâmetros arbitrários por valores com base estatística publicada + atualização progressiva.
**Prioridade:** 🔴 CRÍTICO — TIER 1
**Agentes lead:** @roberta | **Suporte:** @data-engineer, @daniboy, @clint, @aura-math, @analyst
**Decisões cobertas:** E1, E4–E9, E11, E17, M4 (INSIGHTS), G3

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 3.1 | Tabela `aura_calibration_events` no Supabase com RLS | @data-engineer + @daniboy | DB-EXEC | 3h |
| 3.2 | Importar priors PMI/Flyvbjerg/World Bank por setor | @roberta + @analyst + @daniboy | DB-EXEC | 6h |
| 3.3 | Fator regressão ponderada por setor (1.2/1.4/1.6/1.0) | @roberta + @data-engineer | DB-EXEC | 4h |
| 3.4 | σ Monte Carlo por setor com migração automática após n≥30 | @roberta + @clint + @dev | DB-EXEC | 5h |
| 3.5 | Edge Function: recalcular zonas MATED ao arquivar projeto | @data-engineer + @devops | F-CICD | 4h |
| 3.6 | Interface transparente: "régua baseada em N projetos do setor X" | @dev + @ux-design-expert | EXEC-MODULE | 3h |
| 3.7 | Alerta desvio subclínico MATED (dist < ε mas dimensão variou > 5%) | @dev + @aura-math | C6 | 4h |
| 3.8 | A/B test Big Dig: modelo com menor erro vira padrão (gate K1) | @aura-qa-auditor + @clint | C2 | 4h |

### Quality Gates
- @roberta assina metodologia estatística antes do merge
- @aura-qa-auditor roda Big Dig com novos parâmetros — resultado não pode piorar
- @qa testa com projetos de setores diferentes

### Definition of Done (EP-03)
- [ ] Zonas MATED embasadas em ≥1000 projetos históricos (priors)
- [ ] Fator por setor com rastreabilidade bibliográfica
- [ ] σ Monte Carlo por setor implementado com fallback global
- [ ] Edge Function funcional ao arquivar projeto
- [ ] Interface mostra "N projetos embasam esta régua" ao PM

---

## ÉPICO 4 — Diagramas PERT e Gantt

**Objetivo:** PERT com auto-cálculo CPM e layout Sugiyama. Gantt com efeito lupa.
**Prioridade:** 🟠 ALTA — TIER 2
**Agentes lead:** @dev, @dataviz | **Suporte:** @ux-design-expert, @aura-math, @visual-designer
**Decisões cobertas:** S1–S4, P3 (SPRINT-MEMORY)

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 4.1 | useCPMEngine: forward/backward pass automático (ES/EF/LS/LF/TF/FF) | @dev + @aura-math | PERT-V2 | 8h |
| 4.2 | Layout Sugiyama: camadas por nível de dependência | @dev + @dataviz | PERT-V2 | 8h |
| 4.3 | Nodes PERT compactos: retângulo arredondado, ID + duração | @dataviz + @visual-designer | PERT-V2 | 4h |
| 4.4 | Caminho crítico: borda vermelha + arrowhead espesso | @dataviz | PERT-V2 | 3h |
| 4.5 | Empate de caminho: listar todos no painel + PM seleciona | @dev + @aura-math | PERT-V2 | 4h |
| 4.6 | GanttLupa: overlay hover ±15% do período sobre Função Custo | @dev + @dataviz | GANTT-LUPA | 6h |
| 4.7 | GanttLupa: barras crítico (red) vs folga (cinza-azul), label truncado | @dataviz + @visual-designer | GANTT-LUPA | 4h |
| 4.8 | GanttLupa: click fixa lupa até novo click fora | @dev | GANTT-LUPA | 2h |
| 4.9 | Gantt escala adaptativa: dias/semanas/meses/anos + label inline | @dataviz | GANTT-LUPA | 4h |
| 4.10 | Curva S: linha baseline planejada (dotted) vs executada (solid) | @dev + @dataviz | EXEC-MODULE | 3h |

### Quality Gates
- @e2e-tester valida fluxo CPM → PERT renderizado
- @qa testa empate de caminhos com fixture 3+ caminhos iguais
- @aura-math valida ES/EF/LS/LF calculados contra valores manuais do Big Dig

### Definition of Done (EP-04)
- [ ] ES/EF/LS/LF/TF/FF calculados automaticamente sem edição manual
- [ ] Layout Sugiyama sem cruzamentos em projetos com até 50 tarefas
- [ ] Nodes compactos: apenas ID e duração visíveis
- [ ] Gantt lupa funcional no hover; click fixa
- [ ] Curva S mostra baseline vs realizado

---

## ÉPICO 5 — Módulo de Execução

**Objetivo:** Registrar progresso real, recalcular TA, implementar SDO, alertas e Histórico de Pecados.
**Prioridade:** 🔴 CRÍTICO — TIER 1 (retenção de usuário)
**Agentes lead:** @dev, @aura-pm | **Suporte:** @aura-production, @data-engineer, @roberta, @clint
**Decisões cobertas:** E2, E3, E6, E22, E24, S5–S7, G1, UX3, UX9, P1–P2 (SPRINT-MEMORY)

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 5.1 | % avanço por tarefa: input em Gerenciamento e Kanban | @dev + @ux-design-expert | EXEC-MODULE | 5h |
| 5.2 | Recalcular TA ao registrar progresso | @dev + @aura-math | EXEC-MODULE | 4h |
| 5.3 | SDO: calcular desfecho objetivo ao arquivar (40%/35%/25%) | @dev + @roberta + @clint | EXEC-MODULE | 6h |
| 5.4 | TM versionado (Histórico de Pecados): nova versão ao aprovar aditivo | @dev + @data-engineer | EXEC-MODULE | 5h |
| 5.5 | Alerta automático: TA/TM desvia > 5% (limiar configurável) | @dev + @aura-klauss | EXEC-MODULE | 4h |
| 5.6 | Badge Índice de Qualidade (TA/TM %) permanente na UI | @dev + @dataviz | EXEC-MODULE | 3h |
| 5.7 | Labels semânticos CDT (Escopo/Prazo/Custo) no MetricTranslator | @dev + @ux-design-expert | EXEC-MODULE | 3h |
| 5.8 | MATED causal: decompor vetor por tarefa CPM (causa raiz) | @dev + @aura-math + @aura-production | C8 | 6h |
| 5.9 | Dashboard histórico MATED em série temporal | @dev + @dataviz + @daniela | EXEC-MODULE | 5h |
| 5.10 | Aceleração predatória: IQ caindo + ângulo E–P fechando → alerta nomeado | @dev + @aura-production | EXEC-MODULE | 4h |

### Quality Gates
- @aura-qa-auditor audita SDO com projetos históricos reais
- @roberta valida pesos SDO (40/35/25) e cálculo estatístico
- @qa testa fluxo completo: arquivamento → SDO calculado → registro em events

### Definition of Done (EP-05)
- [ ] PM registra % avanço por tarefa sem sair da página de gerenciamento
- [ ] TA recalculado a cada atualização de progresso
- [ ] SDO calculado automaticamente ao arquivar, sem declaração humana
- [ ] Histórico de Pecados com versões TM e motivos obrigatórios
- [ ] Badge IQ sempre visível na sidebar ou header
- [ ] Aceleração predatória detectada e nomeada automaticamente

---

## ÉPICO 6 — Redesign de Navegação e Rotas

**Objetivo:** Aplicar estrutura aprovada no P5, renomear rotas, consolidar duplicatas, mover Admin.
**Prioridade:** 🟡 MÉDIA — TIER 3
**Agentes lead:** @dev, @architect | **Suporte:** @ux-design-expert, @motion-designer
**Decisões cobertas:** D1–D7, UX12

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 6.1 | Renomear rotas: /eap→/wbs, /cpm→/tarefas-diagramas, /cdt→/triangulo-matriz | @dev + @architect | RENAME-ROUTES | 4h |
| 6.2 | Sidebar: nova estrutura SETUP / MOTOR MATEMÁTICO / GOVERNANÇA | @dev + @ux-design-expert | RENAME-ROUTES | 5h |
| 6.3 | Funções: criar abas Prazo e Custo na mesma page | @dev + @dataviz | RENAME-ROUTES | 4h |
| 6.4 | Remover rotas duplicadas: /warroom e /relatorios | @dev | RENAME-ROUTES | 2h |
| 6.5 | Admin: mover para header/avatar menu (fora da sidebar) | @dev + @ux-design-expert | ADMIN-SIDEBAR | 5h |
| 6.6 | Empty states diferenciados por etapa do pipeline | @dev + @ux-design-expert | RENAME-ROUTES | 4h |
| 6.7 | Animações de transição entre seções do pipeline | @motion-designer + @dev | ADMIN-SIDEBAR | 4h |
| 6.8 | Atualizar todos os links internos e redirects (sem 404) | @dev | RENAME-ROUTES | 3h |

### Quality Gates
- @e2e-tester: 0 links 404 após renomeação
- @qa: fluxo completo TAP → WBS → Calendário → Tarefas → Motor → Governança

### Definition of Done (EP-06)
- [ ] Todas as rotas com nomes canônicos (wbs, tarefas-diagramas, triangulo-matriz)
- [ ] Sidebar com 3 grupos: SETUP / MOTOR / GOVERNANÇA
- [ ] Admin no header, fora da sidebar
- [ ] Zero rotas duplicadas
- [ ] Zero links 404 verificados por E2E

---

## ÉPICO 7 — IA Klauss e Rotas de Decisão

**Objetivo:** Expandir Klauss com endpoints de decisão, sugestão de ferramentas e gestão de contexto histórico.
**Prioridade:** 🟡 MÉDIA — TIER 3
**Agentes lead:** @aura-klauss, @jordy | **Suporte:** @dev, @aura-production, @pm-engineer
**Decisões cobertas:** E25, K3, K4, D10, G6, K1

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 7.1 | Endpoint klauss-to-mated: texto → parâmetros numéricos MATED | @dev + @aura-klauss + @jordy | KLAUSS-MATED | 6h |
| 7.2 | Rota /api/ai/dica-metodo-prazo (paridade com orçamento) | @dev + @aura-klauss | C7 | 3h |
| 7.3 | SVGPoint: onCanvasClick nos boards Orçamento e Prazo | @dev + @dataviz | C10 | 4h |
| 7.4 | Klauss sugere ferramenta mais adequada ao contexto de crise | @aura-klauss + @jordy | KLAUSS-MATED | 4h |
| 7.5 | Klauss injeta histórico de decisões no contexto (entre sessões) | @aura-klauss + @jordy | KLAUSS-MATED | 4h |
| 7.6 | Truncação inteligente: 4K tokens máx (críticas + últimas 5 decisões) | @aura-klauss + @jordy | KLAUSS-MATED | 3h |
| 7.7 | Few-shot examples por setor (Big Dig + 2 outros) | @jordy + @analyst | KLAUSS-MATED | 3h |
| 7.8 | Structured output JSON schema para predecessoras | @jordy + @dev | KLAUSS-MATED | 2h |
| 7.9 | Rate limiting /api/ai/*: 60 req/hora por tenant_id | @security-auditor + @devops | F-CICD | 3h |

### Quality Gates
- @qa testa integração Klauss com Groq end-to-end
- @security-auditor valida rate limiting antes do deploy
- @aura-klauss valida precisão das sugestões em 5 cenários

### Definition of Done (EP-07)
- [ ] klauss-to-mated converte texto em parâmetros numéricos com confiança ≥0.85
- [ ] Histórico de sessões injetado no contexto da IA
- [ ] Rate limiting ativo em todas as rotas /api/ai/*
- [ ] Structured output sem falhas em 100% dos projetos-fixture

---

## ÉPICO 8 — Infraestrutura, CI/CD e Banco de Dados

**Objetivo:** Novas migrations, GitHub Actions, serviço de calibração, segurança de dados.
**Prioridade:** 🔴 CRÍTICO — TIER 1
**Agentes lead:** @devops, @data-engineer | **Suporte:** @nexus, @aura-integrator, @security-auditor, @daniboy
**Decisões cobertas:** E8, E9, DB11, DB12, DB13, SPRINT-MEMORY §5, F-CICD, F-RATE, F-VALID

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 8.1 | Migration: 4 novas tabelas (TM versoes, progresso, decisoes_mated, calibration_events) | @data-engineer + @devops | DB-EXEC | 5h |
| 8.2 | Migration: ON DELETE CASCADE em todas as tabelas filhas | @data-engineer | DB-EXEC | 1h |
| 8.3 | Migration: trigger updated_at automático | @data-engineer | DB-EXEC | 1h |
| 8.4 | Migration: predecessoras com validação de referência | @data-engineer | DB-EXEC | 2h |
| 8.5 | Fix RLS: substituir `auth.uid()` por `(SELECT auth.uid())` em 9 tabelas | @data-engineer + @security-auditor | DB-EXEC | 2h |
| 8.6 | Validação Zod em todos os bodies POST/PUT das API routes | @security-auditor + @dev | F-CICD | 4h |
| 8.7 | localStorage: expiração 24h + limpeza ao logout | @security-auditor + @dev | F-CICD | 2h |
| 8.8 | GitHub Actions: lint + typecheck + vitest bloqueantes no PR | @devops + @nexus | F-CICD | 4h |
| 8.9 | GitHub Actions: deploy automático Vercel ao merge em main | @devops + @nexus | F-CICD | 2h |
| 8.10 | Edge Function: calibração Bayesiana ao arquivar projeto | @data-engineer + @devops | F-CICD | 4h |
| 8.11 | RLS policies para as 4 novas tabelas | @data-engineer | DB-EXEC | 2h |
| 8.12 | Mapear `ratelimit_log`: schema formal, purpose, índices e documentação | @data-engineer + @security-auditor | DB-EXEC | 2h |
| 8.13 | Mapear `tenant_users`: alinhamento com `project_members`, uso esperado, RLS policy | @data-engineer + @aura-integrator | DB-EXEC | 2h |

### Quality Gates
- @security-auditor valida cross-tenant isolation em 100%
- @qa valida rollback de todas as migrations
- @nexus valida pipeline CI/CD com PR de teste real

### Definition of Done (EP-08)
- [ ] 4 novas tabelas com RLS e índices funcionando
- [ ] ON DELETE CASCADE sem orphan rows
- [ ] Zod valida todos os bodies — erro 400 claro em payload inválido
- [ ] `ratelimit_log` e `tenant_users` documentadas e com RLS + schema formal (8.12, 8.13)
- [ ] localStorage expira em 24h
- [ ] PR falha se lint/typecheck/vitest falhar
- [ ] Deploy automático Vercel funcional

---

## ÉPICO 9 — Caixa de Ferramentas

**Objetivo:** Ferramentas de diagnóstico em Gerenciamento e de resposta rápida no Gabinete de Crise.
**Prioridade:** 🟢 BAIXA — TIER 4
**Agentes lead:** @aura-production, @pm-engineer | **Suporte:** @dev, @ux-design-expert
**Decisões cobertas:** D8, D9, D10

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 9.1 | UI Caixa de Ferramentas em Gerenciamento: grid + modal | @dev + @ux-design-expert | FERRAMENTAS | 5h |
| 9.2 | Ferramentas Gerenciamento: 5W2H, Ishikawa, PDCA interativos | @dev + @aura-production | FERRAMENTAS | 8h |
| 9.3 | Ferramentas Gerenciamento: EOQ e Simplex | @dev + @pm-engineer | FERRAMENTAS | 6h |
| 9.4 | UI Caixa de Ferramentas no Gabinete de Crise | @dev + @ux-design-expert | FERRAMENTAS | 4h |
| 9.5 | Ferramentas Crise: Árvore de Decisão, 5 Porquês, FMEA simplificado | @dev + @aura-production | FERRAMENTAS | 8h |
| 9.6 | Klauss aciona ferramenta mais relevante automaticamente | @aura-klauss + @jordy | FERRAMENTAS | 4h |

### Quality Gates
- @aura-production valida output correto de cada ferramenta para o contexto
- @qa: crise detectada → Klauss sugere → PM abre ferramenta (fluxo completo)

### Definition of Done (EP-09)
- [ ] 5 ferramentas de diagnóstico funcionais em Gerenciamento
- [ ] 3 ferramentas de crise funcionais no Gabinete
- [ ] Klauss sugere ferramenta com ≥80% de precisão contextual

---

## ÉPICO 10 — Administração e Billing

**Objetivo:** Admin fora da sidebar, Stripe completo, configurações de projeto.
**Prioridade:** 🟢 BAIXA — TIER 4
**Agentes lead:** @dev, @aura-integrator | **Suporte:** @ux-design-expert, @motion-designer
**Decisões cobertas:** D7

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 10.1 | Menu avatar/header: Conta, Faturamento, Configurações | @dev + @ux-design-expert | ADMIN-SIDEBAR | 5h |
| 10.2 | Remover Admin da sidebar completamente | @dev | ADMIN-SIDEBAR | 1h |
| 10.3 | Stripe: planos, billing portal, webhook | @dev + @aura-integrator | ADMIN-SIDEBAR | 8h |
| 10.4 | Configurações: limiar alerta configurável (padrão 5%) | @dev | ADMIN-SIDEBAR | 2h |
| 10.5 | PlanGate contextual: upgrade sugerido no momento certo | @dev + @aura-integrator | ADMIN-SIDEBAR | 4h |

### Quality Gates
- @e2e-tester: fluxo billing end-to-end em Stripe test mode
- @security-auditor: webhook Stripe com assinatura validada

### Definition of Done (EP-10)
- [ ] Admin 100% no header, sem rastro na sidebar
- [ ] Stripe billing portal funcional em test mode
- [ ] Webhook recebe e processa eventos de pagamento

---

## ÉPICO 11 — Pesquisa, Piloto e Publicação

**Objetivo:** Estudo piloto com Gênesis Empreendimentos, calibrar parâmetros, publicar paper.
**Prioridade:** 🔵 ESTRATÉGICO
**Agentes lead:** @roberta, @analyst | **Suporte:** @kieza-research, @marta-marketing, @clint, @daniela, @aura-researcher, @aura-math
**Decisões cobertas:** E7, E10–E16, P4 (INSIGHTS) | **Debate Sessão 9 (D8):** 8 conceitos originais incorporados

### Conceitos Originais Aura para o Artigo Científico

> **Referência completa:** `memory/project_artigo_cientifico.md`
> Aprovado pelo squad completo (34 agentes) em 2026-03-18. Reestruturação formal em momento oportuno.

| # | Conceito | Descrição Resumida |
|---|----------|-------------------|
| C1 | **Triângulo de Monitoramento (TM)** | Instrumento geométrico triangular como objeto matemático de gestão |
| C2 | **Síntese de Clairaut (SC)** | Classificação morfológica e sistema de protocolos via lei dos cossenos |
| C3 | **Ângulo de Equilíbrio ε (Epsilon)** | Vértice Prazo-Orçamento como indicador direto de saúde do projeto |
| C4 | **Singularidade Gerencial** | Ângulo reto no TM como estado ingerenciável — HALT obrigatório |
| C5 | **Sombra Dimensional** | Projeção das funções tangentes dentro dos limites do triângulo (invariante visual) |
| C6 | **Protocolo de Translação Condicional (γ)** | Translação paralela da função prazo ao atingir regime obtuso E-P |
| C7 | **Phase-Space Angular** | Gráfico 2D (eixo α × eixo ω) — trajetória do projeto no espaço de fases |
| C8 | **Sistema de Configuração Live Preview** | Preview em tempo real com dados reais — paradigma UX para ferramentas científicas |

### Stories (não-técnicas)

| ID | Título | Agentes | Fase | Esforço |
|----|--------|---------|------|---------|
| 11.1 | Protocolo formal de pesquisa: calibração MATED por setor | @roberta + @analyst | Pré-lançamento | — |
| 11.2 | Coleta dados PMI/Flyvbjerg/World Bank/TCU por setor | @analyst + @kieza-research | Pré-lançamento | — |
| 11.3 | Proposta formal para Gênesis Empreendimentos (piloto) | @aura-pm + @marta-marketing | Pré-lançamento | — |
| 11.4 | Retroalimentar projetos concluídos da Gênesis no Aura | @roberta + @daniela | Piloto | — |
| 11.5 | Análise estatística dos resultados do piloto | @roberta + @clint | Piloto | — |
| 11.6 | Rascunho artigo: 8 conceitos originais Aura (C1–C8) — SC, ε, Singularidade, Sombra Dimensional, Phase-Space, Live Preview | @roberta + @analyst + @aura-math + @aura-researcher | Piloto | — |
| 11.7 | Revisão e submissão paper PMI/IEEE | @roberta + @aura-researcher | Pós-piloto | — |
| 11.8 | Posicionamento de mercado com dados do piloto | @marta-marketing + @kieza-research | Pós-piloto | — |

### Definition of Done (EP-11)
- [ ] Protocolo de pesquisa formalizado e aprovado por @roberta
- [ ] Priors importados com rastreabilidade bibliográfica
- [ ] Piloto com Gênesis executado com ≥5 projetos retroalimentados
- [ ] Rascunho do artigo gerado antes de lançamento público
- [ ] Todos os 8 conceitos originais (C1–C8) documentados com rigor formal em `memory/project_artigo_cientifico.md`
- [ ] @aura-researcher confirma claims de originalidade para todos os 8 conceitos

---

## ÉPICO 12 — Dívida Técnica do Brownfield

**Objetivo:** Resolver débitos arquiteturais, de pipeline, UX e testes que comprometem sustentabilidade.
**Prioridade:** 🟠 ALTA — TIER 2
**Agentes lead:** @architect, @dev | **Suporte:** @data-engineer, @qa, @e2e-tester, @ux-design-expert
**Débitos cobertos:** M3, P1–P6, DB2, DB9, UX1, UX12, UX14 + todos os gaps de arquitetura

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 12.1 | Split ProjectContext → 4 contextos (TAP/CPM/Motor/UI) + memoização | @dev + @architect | A-CTX | 8h |
| 12.2 | Mapper canônico de IDs: UUID DB ↔ WBS display ↔ T01 legacy | @dev + @data-engineer + @architect | A-IDS | 6h |
| 12.3 | Unificar `duracao` vs `duracao_estimada` globalmente | @dev + @architect | A-IDS | 6h |
| 12.4 | Resolver `as any` em tipos CPM (`setTarefas`) | @dev + @architect | A-IDS | 3h |
| 12.5 | Web Worker: useMathWorker para CPM com 100+ tarefas | @dev + @architect | A-WORK | 6h |
| 12.6 | Refatorar EAP page.tsx (1800 LOC) em hooks customizados | @dev | A-EAP | 6h |
| 12.7 | Shared parser: unificar parseCPMTable + parseTableText | @dev | A-PARSER | 4h |
| 12.8 | Fix WBS extractor: filtrar linhas não-WBS | @dev + @aura-production | C1 | 3h |
| 12.9 | Fix EAP re-parse loop (context carrega antes do DB) | @dev + @architect | A-CTX | 3h |
| 12.10 | Fix EAP save sobrescreve duração com 5 | @dev | C1 | 2h |
| 12.11 | Sistema toast React (substituir alert() nativo) | @dev + @ux-design-expert | A-TOAST | 3h |
| 12.12 | SetupStepper com status real dos dados (não só bolinhas) | @dev + @ux-design-expert | A-TOAST | 6h |
| 12.13 | Mobile responsividade: tabelas scrolláveis, CPM min-375px | @dev + @ux-design-expert | U-MOBILE | 8h |
| 12.14 | Testes: parseCPMTable 4 formatos (T1) | @qa + @e2e-tester | B-TEST | 3h |
| 12.15 | Testes: EAP Smart Merge edge cases (T2) | @qa | B-TEST | 4h |
| 12.16 | E2E happy path completo: TAP → Motor → Decisão (T3) | @e2e-tester + @qa | B-TEST | 8h |
| 12.17 | E2E mobile 375px: sem overflow em nenhuma página (T4) | @e2e-tester | B-TEST | 4h |
| 12.18 | Demo mode: Big Dig pré-carregado sem login (/demo) | @dev + @ux-design-expert | P-DEMO | 4h |

### Quality Gates
- @architect revisa e aprova PR de A-CTX e A-IDS (impacto alto)
- @qa: 0 regressões no Big Dig após refatoração
- @e2e-tester: E2E happy path pass em Chromium + mobile viewport

### Definition of Done (EP-12)
- [ ] 0 `as any` em tipos críticos (CPM/CDT/EAP)
- [ ] ProjectContext refatorado em 4 contextos sem re-renders desnecessários
- [ ] ID único canônico: UUID no DB, WBS no display, T01 como alias legacy
- [ ] `duracao` vs `duracao_estimada` unificado globalmente
- [ ] EAP page.tsx < 400 LOC (hooks extraídos)
- [ ] E2E happy path passa em Chromium e mobile 375px
- [ ] Demo mode funcional com Big Dig pré-carregado

---

## ÉPICO DS — Design System Aura

**Objetivo:** Documentar tokens existentes, criar componentes de UI reutilizáveis, resolver dívida de UX (mobile, acessibilidade, empty states) e estabelecer guia visual formal.
**Prioridade:** 🟡 MÉDIO — TIER 2 (paralelo ao motor, não bloqueia C1/C2)
**Agentes lead:** @ux-design-expert (Uma), @visual-designer (Pixel) | **Suporte:** @dev (Dex), @e2e-tester (Cypress), @motion-designer (Luna)
**Sprint:** DS-FOUNDATION

### Stories

| ID | Título | Agentes | Esforço |
|----|--------|---------|---------|
| DS-1 | Documentar tokens e fundação (TOKENS.md) | @visual-designer + @ux-design-expert | 3h |
| DS-2 | Componentizar Toast/Alert React (substituir alert() — B4) | @dev + @ux-design-expert | 2h |
| DS-3 | Mobile responsividade: sidebar hamburguer, tabelas, CPM 375px | @dev + @ux-design-expert + @e2e-tester | 5h |
| DS-4 | Empty states contextuais por etapa do pipeline | @ux-design-expert + @visual-designer + @dev | 4h |
| DS-5 | Sidebar com grupos semânticos SETUP/MOTOR/GOVERNANÇA | @ux-design-expert + @dev | 4h |
| DS-6 | Labels semânticos CDT: E/P/O com nomes completos e tooltips | @ux-design-expert + @dev + @aura-pm | 3h |
| DS-7 | Reconciliar CSS variables vs Tailwind tokens (fonte canônica) | @visual-designer + @dev | 2h |
| DS-8 | Auditoria a11y: axe-core, focus rings, aria-labels, contraste | @e2e-tester + @visual-designer + @dev | 5h |
| DS-9 | SetupStepper com status real dos dados (5 passos, 4 estados) | @ux-design-expert + @dev | 4h |
| DS-10 | Documentação visual dos componentes (/design-system em dev) | @visual-designer + @ux-design-expert + @dev | 4h |

### Nota sobre sobreposição com EP-12
DS-2 e DS-9 substituem funcionalmente as Stories 12.11 e 12.12 (A-TOAST sprint). DS-3 substitui 12.13. O EP-DS é a versão Design System–first dessas histórias, com foco em tokens, usabilidade e acessibilidade além da correção técnica.

---

## ÉPICO SaaS — Infraestrutura SaaS Core

**Objetivo:** Garantir que o Aura funciona como SaaS comercialmente viável — autenticação robusta, onboarding guiado, colaboração multi-tenant e segurança de produção.
**Prioridade:** 🔴 CRÍTICO — TIER 1 (sem isso, não existe v1.0)
**DRI:** @dev (Dex) para implementação | @security-auditor (Shield) para segurança
**Agentes lead:** @dev, @security-auditor | **Suporte:** @ux-design-expert, @data-engineer, @devops
**Sprint:** SAAS-CORE

> ⚠️ **BILLING EXCLUÍDO INTENCIONALMENTE:** Integração de pagamento (Stripe) será implementada em sprint dedicado quando a decisão de provedor for tomada. `plan_tier` já existe no DB como campo preparatório.

### Stories

| ID | Título | DRI | Esforço | v1.0? |
|----|--------|-----|---------|-------|
| SaaS-1 | Auth UX: login/register/password reset + middleware de rota | @dev | 4h | ✅ v1.0 |
| SaaS-2 | Onboarding: primeiro projeto guiado (3 steps) | @ux-design-expert | 6h | ✅ v1.0 |
| SaaS-3 | Multi-tenant: convites por email + roles Admin/Editor/Viewer | @dev | 8h | ✅ v1.0 |
| SaaS-4 | Configurações de conta/perfil + alterar senha | @dev | 5h | ❌ v1.1 |
| SaaS-5 | Email transacional: convites + alertas MATED crise/risco | @dev | 5h | ❌ v1.1 |
| SaaS-6 | Segurança: rate limiting 60 req/h + Zod validation | @security-auditor | 5h | ✅ v1.0 |
| SaaS-7 | Error Boundaries React + logging estruturado + correlationId | @dev | 4h | ✅ v1.0 |
| SaaS-8 | CI/CD: GitHub Actions com 4 quality gates bloqueantes | @devops | 3h | ✅ v1.0 |

### Quality Gates
- @security-auditor: valida SaaS-6 (rate limiting + Zod) e SaaS-3 (RLS por role)
- @devops: valida SaaS-8 (CI/CD) — exclusivo para push e pipeline
- SaaS-1 DEVE estar Done antes de SaaS-2, SaaS-3
- SaaS-8 (CI/CD) pode rodar em paralelo com SaaS-1 (independente)

### Definition of Done (EP-SaaS)
- [ ] Middleware de rota: 0 páginas autenticadas acessíveis sem sessão
- [ ] Onboarding: novo usuário cria projeto em < 5 minutos
- [ ] Convites: membro aceita convite e acessa projeto com role correto
- [ ] Rate limiting: 429 retornado após 60 req/h por tenant
- [ ] CI/CD: nenhum PR mergeado sem TypeCheck + Tests + Build verdes
- [ ] ErrorBoundary: 0 telas brancas nas 5 rotas críticas

### Quality Gates
- @visual-designer: tokens documentados (DS-1) antes de qualquer componente DS-2+
- @ux-design-expert: aprova fluxo de empty states e sidebar antes do merge
- @e2e-tester: Playwright mobile 375px (DS-3) e axe-core (DS-8) PASS
- DS-7 (reconciliação tokens) deve estar Done antes de DS-10 (documentação visual)

### Definition of Done (EP-DS)
- [ ] TOKENS.md criado com todos os tokens por categoria
- [ ] 0 usos de `alert()` no codebase
- [ ] Mobile 375px: 0 scroll horizontal em 5 rotas críticas
- [ ] 5 empty states contextuais com CTA implementados
- [ ] Sidebar com 3 grupos semânticos e indicadores de completude
- [ ] CSS variables são fonte canônica (Tailwind usa var())
- [ ] axe-core: 0 violations critical/serious nas 5 rotas principais
- [ ] Página `/design-system` acessível em development

---

## PIPELINE SDC COMPLETO

> **Protocolo detalhado:** `docs/Aura-SDC-CHARTER.md` — 7 fases, matriz de agentes por épico, DoD global.
> O Aura-SDC-CHARTER tem PRECEDÊNCIA sobre o SDC genérico AIOX para este projeto.

```
Para cada Story:
  1. @sm *draft         → story em docs/stories/{epic}.{story}.story.md
  2. @po *validate      → checklist 10 pontos (score ≥7 = GO)
  3. @dev *develop      → implementação + testes unitários (TDD quando possível)
  4. @aura-qa-auditor   → validação matemática (Épicos 1/2/3/5 obrigatório)
  5. @qa *qa-gate       → 7 quality checks
  6. @devops *push      → merge + deploy Vercel (APÓS CI/CD verde)
  7. @nexus             → quality gate infra + monitoramento
```

### Definição Global de "Done" (DoD Cross-Épico)
- [ ] TypeCheck: 0 erros novos
- [ ] Vitest: todos os testes existentes passando + novos testes para a story
- [ ] Lint: 0 warnings novos
- [ ] Big Dig fixture: resultado não piora em stories do motor
- [ ] @qa executou QA gate e aprovou
- [ ] PR aprovado com review de ≥1 agente especialista do épico
- [ ] Deploy Vercel: build sucesso
- [ ] Story atualizada: todos os checkboxes marcados + File List completo

---

## ORDEM OTIMIZADA DE IMPLEMENTAÇÃO

### TIER 1 — Bloqueadores críticos (primeiras 2 semanas)

> ✅ **GATE CUMPRIDO:** Story 8.1 (4 tabelas) — todas as tabelas existem (verificado 2026-03-18).
> ✅ **GATE CUMPRIDO:** EP-03 (8/8 Done), EP-05 (10/10 Done), EP-DS (10/10 Done), EP-SaaS (Done).
> ⚠️ **GATE OBRIGATÓRIO:** Story 1.2 (NVO) deve estar Done antes de 1.1, 3.8, e EP-02.
> ⚠️ **GATE OBRIGATÓRIO:** Story 2.0 (SC-FOUNDATION) deve estar Done antes de qualquer Story 2.x.
> ⚠️ **GATE OBRIGATÓRIO:** SaaS-6 (rate limiting + Zod) deve estar Done antes de qualquer deploy em produção.

```
Sprint B-FIX          → 1.2 (NVO ← PRIMEIRO), 1.10, 1.11, 1.12, 1.13, 1.14
Sprint SC-FOUNDATION  → 2.0-engine (SC + Protocolos + Prometeu Intrínseco) + 2.0-ui (Painel Integridade do Triângulo)  ← NOVO
Sprint DB-EXEC        → 8.2 → 8.3 → 8.4 → 8.5 → 8.11 → 3.1  (8.1 já concluído)
Sprint C-CEt          → 1.1, 1.7 (após 1.2)
Sprint SAAS-CORE      → ✅ Done (SaaS-1 a SaaS-8 concluídos)
Sprint EXEC-MODULE    → ✅ Done (5.1 a 5.10 concluídos)
```

### TIER 2 — Motor e arquitetura (semanas 3–5)

```
Sprint C1             → 1.3, 1.6, 12.8, 12.10 (burndown real + EAP fix)
Sprint C-TAN + C4     → 1.4, 1.5 (tangente pontual + E dinâmico)
Sprint A-IDS          → 12.2–12.4 (IDs canônicos — desbloqueia pipeline)
Sprint A-CTX          → 12.1, 12.9 (context split + re-parse fix)
Sprint A-TOAST        → 12.11, 12.12 (toast + stepper real)
Sprint DS-FOUNDATION  → DS-1 → DS-7 → DS-2 → DS-3 → DS-4 → DS-5 → DS-6 → DS-8 → DS-9 → DS-10
Sprint SAAS-CORE 2ª  → SaaS-4 (perfil) + SaaS-5 (email) + SaaS-7 (error boundary)
Sprint DB-EXEC 2ª     → 3.1–3.4 (calibração Bayesiana)
```

### TIER 3 — Visualização e navegação (semanas 5–7)

```
Sprint PERT-V2        → 4.1–4.5 (auto-cálculo + Sugiyama)
Sprint GANTT-LUPA     → 4.6–4.10 (lupa + escala + curva S)
Sprint TM-SHADOW      → 2.1–2.12 (Mundo Invertido + sombra — requer 2.0-engine + 2.0-ui Done)
Sprint PROMETEU       → 13.1–13.6 (Prometeu Extrínseco — requer 2.0-engine Done)  ← após TM-SHADOW
Sprint RENAME-ROUTES  → 6.1–6.8 (nova navegação)
Sprint C5–C10         → 1.8, 3.7, 1.9, 7.2, 5.8, 7.3 (refinamentos motor)
```

### TIER 4 — IA, governança e produto (semanas 7–10)

```
Sprint KLAUSS-MATED   → 2.7–2.9, 7.1, 7.4–7.8 (Klauss expandido + Remissão)
Sprint EXEC-MODULE 2ª → 2.10, 5.9, 5.10, 4.10 (SDO, obtuso, histórico)
Sprint F-CICD 2ª      → 3.5 (Edge Function calibração)
Sprint A-EAP          → 12.6, 12.7 (refatoração EAP)
Sprint A-WORK         → 12.5 (Web Worker)
Sprint B-TEST         → 12.14–12.17 (E2E completo)
```

### TIER 5 — Ferramentas e admin (semanas 10–12)

```
Sprint FERRAMENTAS    → 9.1–9.6
Sprint ADMIN-SIDEBAR  → 10.1–10.5
Sprint P-DEMO         → 12.18 (modo demo)
Sprint PESQUISA       → 11.1–11.8 (piloto + paper — paralelo ao TIER 4+)
```

---

---

## ÉPICO 13 — Prometeu Extrínseco (Módulo de Risco Manual)

**Objetivo:** Registro manual de riscos contextuais pelo PM, cruzado com IR geométrico. Gestão de risco PMBOK integrada ao triângulo.
**Prioridade:** 🟠 ALTA — TIER 3 (após EP-02)
**Agentes lead:** @dev, @aura-pm | **Suporte:** @data-engineer, @roberta, @aura-klauss, @ux-design-expert, @security-auditor
**Decisões cobertas:** Debate Sessão 9 (2026-03-18) — squad completo aprovado
**Pré-requisito:** Story 2.0 (SC-FOUNDATION) — Prometeu Intrínseco deve estar ativo

### Contexto
O Prometeu Intrínseco (IR, Rα, Rω) é derivado automaticamente da SC (Story 2.0).
O Prometeu Extrínseco adiciona a camada de risco manual e contextual sobre o risco geométrico.

### Stories

| ID | Título | Agentes | Sprint | Esforço |
|----|--------|---------|--------|---------|
| 13.1 | Migration: tabela `riscos_projeto` (categoria, prob, impacto, score_rc, zona_cet, unlock_event_id) | @data-engineer + @security-auditor | PROMETEU | 3h |
| 13.2 | UI: tela "Riscos" — tab no projeto com lista, filtros e CRUD | @dev + @ux-design-expert | PROMETEU | 6h |
| 13.3 | Modal bloqueante: decisão em Faixa de Contingência exige registro de unlock_event antes de liberar | @dev + @security-auditor | PROMETEU | 4h |
| 13.4 | Klauss sugere categoria + probabilidade + impacto automaticamente por descrição textual | @aura-klauss + @jordy | PROMETEU | 4h |
| 13.5 | Score RC composto: RC = w₁·IR + w₂·Rα + w₃·Rω (pesos calibrados por setor via EP-03) | @dev + @roberta | PROMETEU | 5h |
| 13.6 | Dashboard Prometeu: mapa de calor de riscos + RC por projeto | @dataviz + @dev | PROMETEU | 5h |

### Quality Gates
- @security-auditor: trilha de auditoria completa (unlock_event_id referencia evento real, não string)
- @roberta: pesos RC calibrados — não devem ser fixos, devem usar dados de EP-03
- @aura-qa-auditor: IR calculado na Story 2.0 alimenta corretamente o RC desta story

### Definition of Done (EP-13)
- [ ] Tabela `riscos_projeto` com RLS e trilha de auditoria rastreável
- [ ] PM não consegue usar Faixa de Contingência sem registrar evento justificador
- [ ] Klauss sugere categoria/prob/impacto com ≥80% precisão contextual
- [ ] RC computado com pesos por setor (fallback global enquanto calibração < N projetos)
- [ ] Dashboard Prometeu mostra mapa de calor + RC do portfólio

---

## MATRIZ DE RESPONSABILIDADE POR ÉPICO

| Épico | Lead | Especialista Domínio | Qualidade | Design |
|-------|------|---------------------|-----------|--------|
| 1 — Motor Core | @aura-math + @dev | @aura-production | @aura-qa-auditor + @qa | — |
| 2 — Obtuso | @aura-math + @roberta | @aura-production | @aura-qa-auditor | @dataviz |
| 3 — Calibração | @roberta | @clint + @analyst | @qa | — |
| 4 — PERT/Gantt | @dev + @dataviz | @aura-math | @e2e-tester + @qa | @visual-designer |
| 5 — Execução | @dev + @aura-pm | @aura-production | @aura-qa-auditor | @ux-design-expert |
| 6 — Navegação | @dev + @architect | — | @e2e-tester | @ux-design-expert + @motion-designer |
| 7 — Klauss | @aura-klauss + @jordy | @aura-production | @security-auditor + @qa | — |
| 8 — Infra/DB | @devops + @data-engineer | @aura-integrator | @nexus + @security-auditor | — |
| 9 — Ferramentas | @aura-production + @pm-engineer | — | @qa | @ux-design-expert |
| 10 — Admin | @dev + @aura-integrator | — | @e2e-tester + @security-auditor | @ux-design-expert |
| 11 — Pesquisa | @roberta + @analyst | @kieza-research | — | @marta-marketing |
| 12 — Dívida Técnica | @architect + @dev | @data-engineer | @e2e-tester + @qa | @ux-design-expert |
| DS — Design System | @ux-design-expert + @visual-designer | @dev | @e2e-tester | @visual-designer + @motion-designer |
| SaaS — Infra SaaS | @dev + @security-auditor | @data-engineer | @security-auditor | @ux-design-expert |
| 13 — Prometeu Extrínseco | @dev + @aura-pm | @roberta + @aura-klauss | @security-auditor + @qa | @ux-design-expert + @dataviz |

---

## GATES DE QUALIDADE POR CAMADA

| Gate | Critério objetivo | Responsável | Bloqueia |
|------|------------------|------------|---------|
| **Motor OK** | Suite Big Dig 100%, TypeCheck 0, σ por setor ativo | @aura-qa-auditor | Merge em `math.ts` |
| **DB OK** | 5 novas tabelas + RLS + CASCADE + triggers + 0 advisors warnings | @security-auditor | Início EP-03, EP-05 |
| **Execução OK** | TA recalcula após progresso, MATED atualiza, alertas disparam | @aura-production | EP-05 Done |
| **Calibração OK** | σ empírico ativa n≥30, SDO calculado sem input subjetivo | @roberta | EP-03 Done |
| **UI OK** | Zero jargão técnico para PM, IQ + MATED legíveis | @aura-pm + @ux-design-expert | EP-05 + EP-06 Done |
| **Segurança OK** | RLS subquery, Zod, rate limiting, localStorage 24h, JWT Edge Fn | @security-auditor | Deploy produção |
| **E2E OK** | Happy path TAP→Motor→Decisão, zero 404 pós-renomear rotas | @e2e-tester | v1.0 release |

## AGENTES DE DOMÍNIO — AUTORIDADE E CRITÉRIOS

> Agentes específicos do projeto Aura (não AIOX core). Referência completa: `docs/FEATURE-MAP.md §7`.

| Agente | Autoridade (o que assina) | Critério mínimo de entrega |
|--------|--------------------------|---------------------------|
| **@aura-math** | Todas as funções geométricas em `math.ts` | Fixture manual antes do código; Big Dig 100% após mudança |
| **@aura-production** | Semântica gerencial, thresholds de alertas, linguagem PMBOK | Alertas nomeados com critério PMBOK; zero jargão técnico para PM |
| **@roberta** | σ por setor, pesos SDO, priors Bayesianos, A/B test | Nota técnica metodológica por decisão estatística |
| **@aura-klauss** | Todos os prompts IA, resposta sem jargão, Gabinete de Crise | klauss-to-mated ≥0.85 confiança; contexto ≤4K tokens |
| **@aura-pm** | UX para PM, fluxos de configuração, copy de alertas | PM completa setup sem suporte; alertas com ação sugerida |
| **@aura-integrator** | Stripe, Rate limiting, JWT Edge Functions, deploy | Webhook Stripe testado após cada migration |
| **@aura-qa-auditor** | Gate motor: nenhum PR em `math.ts` sem aprovação | Suite Big Dig obrigatória; regressão numérica documentada |
| **@security-auditor** | RLS, Zod, OWASP, cross-tenant isolation | Cross-tenant testado com 2 usuários; 0 advisors warnings |
| **@dataviz** | CDTCanvas, PERT Sugiyama, Gantt, MATEDTimeline | PERT sem sobreposição ≤50 tarefas; sem flickering de modo |
| **@e2e-tester** | Fluxo completo E2E, visual regression, mobile | Happy path pass Chromium + 375px; 0 links 404 pós-rotas |
| **@visual-designer** | Tokens de cor MATED, design de badges, guia de estilo | Tokens definidos antes de @dataviz codificar; a11y 4.5:1 |
| **@motion-designer** | Transições de modo, animação de Remissão | `prefers-reduced-motion` respeitado; ≤300ms por transição |
| **@daniboy** | Views SQL calibração, índices, queries otimizadas | EXPLAIN ANALYZE sem full scan nas queries de calibração |
| **@daniela** | MATEDTimeline historicamente correta, KPIs de governança | JOIN correto events + versões; KPIs documentados antes EP-09 |
| **@clint** | SDO componente trajetória, A/B test, IC estatístico | A/B com seed fixo + IC calculado antes de declarar vencedor |
| **@jordy** | System prompts, few-shot, structured output, PQR | JSON schema válido 100% fixtures; PQR documentado por endpoint |
| **@aura-analyst** | Consistência MATED × IQ × SDO | Os 3 KPIs ortogonais (sem sobreposição informacional) |
| **@aura-researcher** | Contribuições originais, rastreabilidade bibliográfica | `prior-sources.md` com citações ABNT; 3 claims formais EP-02 |
| **@kieza-research** | Validação dos 4 setores, mercado, benchmark concorrentes | Relatório TAM por setor antes de EP-03 começar |
| **@marta-marketing** | Messaging KPIs, revisão `como-e-porque.md`, Go-to-market | `como-e-porque.md` aprovado para parceiros antes de EP-11 |

---

## TIMELINE ESTIMADA

| Tier | Sprints | Esforço | Semanas | v1.0? |
|------|---------|---------|---------|-------|
| Tier 1 — Bloqueadores Motor | B-FIX, DB-EXEC, C-CEt, EXEC-MODULE | ~65h | 1–2 | ✅ |
| Tier 1+ — SaaS Core | SAAS-CORE (SaaS-1 a SaaS-8) ← paralelo ao Tier 1 | ~40h | 1–2 | ✅ |
| Tier 2 — Motor + Arq + DS | C1, C-TAN, C4, A-IDS, A-CTX, DB-EXEC2, DS-FOUNDATION | ~106h | 3–5 | Parcial |
| Tier 3 — Visualização | PERT-V2, GANTT-LUPA, TM-SHADOW, **PROMETEU**, RENAME-ROUTES, C5–C10 | ~107h | 5–7 | ❌ v1.1 |
| Tier 4 — IA + Produto | KLAUSS-MATED, EXEC-MOD2, A-EAP, A-WORK, B-TEST | ~70h | 7–10 | ❌ v1.1 |
| Tier 5 — Final | FERRAMENTAS, ADMIN-SIDEBAR, P-DEMO, PESQUISA | ~60h | 10–12 | ❌ v2.0 |
| **TOTAL** | **20 sprints** | **~421h** | **10–12 semanas** | — |

Com squad de 5–7 devs parallelizados: **8–10 semanas para v1.0**
**V1.0 mínimo (Tier 1 + Tier 1+ + partes do Tier 2):** ~140h de esforço focado

---

## DOCUMENTOS DE REFERÊNCIA

| Documento | Localização | Conteúdo |
|-----------|-------------|---------|
| **FEATURE-MAP.md** | `docs/FEATURE-MAP.md` | **Motor × Sistema × Features × Dados × Agentes — análise viva** |
| **Aura-SDC-CHARTER.md** | `docs/Aura-SDC-CHARTER.md` | **Protocolo SDC Aura: 7 fases, 34 agentes, quality gates por épico** |
| SPRINT-MEMORY.md | `docs/SPRINT-MEMORY.md` | Decisões técnicas canônicas |
| WORK-LOG.md | `docs/WORK-LOG.md` | Histórico completo de sessões |
| INSIGHTS-LOG.md | `docs/INSIGHTS-LOG.md` | Análises squad — M/P/K proposals |
| PRD v6.1 | `docs/prd/Aura-6.1-PRD.md` | PRD formal aprovado |
| como-e-porque.md | `docs/como-e-porque.md` | Documento institucional para parceiros |
| Coordenadas Dual | `prints para teste/.../Aura_Coordenadas_Dual_*.md` | Paper: contribuição original |
| MetodoAura.md | `MetodoAura.md` | Autoridade matemática do método |
| technical-debt-assessment.md | `docs/prd/technical-debt-assessment.md` | 39 débitos mapeados |

---

---

## MAPA DE INTERDEPENDÊNCIAS CRUZADAS — PRÉ-REQUISITOS NÃO ÓBVIOS

> Estas dependências NÃO estão escritas nas stories individuais mas são críticas. Consultar antes de priorizar.

| Story | Depende de | Motivo |
|-------|-----------|--------|
| EP-06.2 (Sidebar) | EP-05 completo | Novas rotas de EP-05 devem existir antes de renomear |
| EP-07.1 (klauss-to-mated) | Story 5.2 (TA recalculado) | Klauss recebe TA como contexto |
| EP-07.5 (histórico decisões) | Story 5.4 (TM versionado) | Precisa de versões para exibir histórico |
| EP-09 (Ferramentas) | Stories 5.1–5.8 completas | Gabinete usa dados de execução em tempo real |
| EP-04.2 (Sugiyama layout) | Story 2.5 (Modo Invertido backend) | Obtuso inverte eixos — impacta layout PERT |
| DS-5 (Sidebar grupos) | EP-06.1 (rotas renomeadas) | Sidebar aponta para rotas corretas |
| DS-6 (Labels CDT) | Story 5.7 (MetricTranslator) | Reutiliza tradutor de métricas |
| DS-9 (Stepper) | Stories 5.1–5.7 | Stepper lê status de execução real |
| SaaS-3 (convites) | Story 8.1 (project_members confirmada) | Tabela deve existir antes do UI |
| SaaS-5 (email alertas) | Story 5.5 (alertas automáticos) | Email disparado pelo trigger de alerta |
| EP-10 (Admin gating) | Story 5.3 (SDO arquivado) | plan_tier gating usa SDO do projeto |

---

## SEGURANÇA E COMPLIANCE — CHECKLIST PRÉ-DEPLOY PRODUÇÃO

| Item | Story | Status | Bloqueante? |
|------|-------|--------|------------|
| Rate limiting /api/ai/* (60 req/h) | SaaS-6 | 📋 Ready | ✅ SIM |
| Zod validation em endpoints críticos | SaaS-6 | 📋 Ready | ✅ SIM |
| RLS policies com `(SELECT auth.uid())` | 8.5 | 📋 Ready | ✅ SIM |
| RLS habilitado nas 4 novas tabelas | 8.11 | 📋 Ready | ✅ SIM |
| Cross-tenant isolation testado | 8.11, SaaS-3 | 📋 Ready | ✅ SIM |
| Middleware de rota (sem páginas expostas) | SaaS-1 | 📋 Ready | ✅ SIM |
| Stack trace oculto em production | SaaS-7 | 📋 Ready | ✅ SIM |
| CI/CD com quality gates bloqueantes | SaaS-8 | 📋 Ready | ✅ SIM |
| Roles por membro de projeto (RLS) | SaaS-3 | 📋 Ready | ✅ SIM |
| Supabase backup automático verificado | — | ✅ Padrão | Não |
| LGPD: soft delete de conta | SaaS-4 | 📋 Ready | Não (v1.1) |
| 2FA | — | ❌ Fora do escopo v1.0 | Não |

---

*MASTERPLAN v4.0 — Atualizado por Orion (@aiox-master) | 2026-03-17*
*Adições v4.0: V1.0 Release Gate, EP-SaaS (8 stories), Cobertura de Stories, Mapa de Interdependências, Segurança & Compliance checklist*
*Baseado em: Brownfield completo §7.2–7.6 + Decisões E1–E26 + D1–D10 + S1–S7 + M/P/K + Dívida Técnica*
*Squad: 33 agentes | Épicos: 12 | Stories: 89 | Decisões integradas: 98 | Timeline: 10–12 semanas*
