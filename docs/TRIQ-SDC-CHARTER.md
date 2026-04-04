# Aura-SDC-CHARTER
## Protocolo Completo de Story Development Cycle — Aura 6.1
**Versão:** 1.0 | **Criado:** 2026-03-18 | **Aprovado por:** Squad completo (34 agentes)
**Integra com:** MASTERPLAN.md § "PIPELINE SDC COMPLETO" | `.aiox-core/development/tasks/`

> **Propósito:** Este documento define o protocolo SDC específico para o Aura 6.1 — mais detalhado que o SDC genérico do AIOX. Todo agente deve ler este documento antes de iniciar qualquer story.

---

## 1. VISÃO GERAL DO CICLO

```
FASE 1  @sm      DRAFT         → story.md criado com ACs, tasks, DoD, quality gates
FASE 2  @po      VALIDATE      → checklist 10 pontos (score ≥7 = GO)
FASE 3  @dev     IMPLEMENT     → código + testes unitários (TDD quando possível)
FASE 4  DOMÍNIO  MATH/STAT     → validação especializada (obrigatória para épicos 1/2/3/5)
FASE 5  @qa      QA-GATE       → 7 quality checks padrão
FASE 6  @devops  PUSH          → merge + deploy Vercel (APÓS CI/CD verde)
FASE 7  @nexus   MONITOR       → quality gate infra + observabilidade
```

**Regra de ouro:** Uma story nunca avança para a próxima fase sem o PASS explícito da fase anterior.
**QA está em TODAS as fases** — não apenas na Fase 5.

---

## 2. FASE 1 — DRAFT (@sm River)

### Responsabilidades
- Criar arquivo `docs/stories/{epic}.{story}.story.md`
- Seguir template canônico (seções obrigatórias abaixo)
- Popular seção de Quality Gates ANTES de entregar ao @po
- Prever agentes especializados necessários conforme tipo da story

### Seções obrigatórias em toda story
```
# Story X.Y — Título
**Épico:** EP-XX Nome do Épico          ← OBRIGATÓRIO
**Sprint:** nome-do-sprint              ← OBRIGATÓRIO
**Status:** Draft | Ready | InProgress | InReview | Done
**Agentes:** lista completa             ← OBRIGATÓRIO — todos os envolvidos
**Pré-requisito:** story anterior       ← quando houver dependência

## User Story
## Background
## Acceptance Criteria
## Tasks
## File List
## Definition of Done         ← com checkboxes explícitos
## Escopo (IN/OUT)
## Estimativa
## Riscos
## Quality Gates               ← OBRIGATÓRIO — gates específicos da story
## QA Results                  ← template yaml vazio para @qa preencher
## Change Log
```

### Checklist @sm antes de entregar ao @po
- [ ] Todos os campos de cabeçalho preenchidos
- [ ] ACs são verificáveis objetivamente (não subjetivos)
- [ ] Tasks granulares o suficiente para 1 dev executar sem ambiguidade
- [ ] File List lista todos os arquivos que serão tocados
- [ ] Escopo tem IN e OUT explícitos
- [ ] Quality Gates listam agente + critério + quando dispara
- [ ] QA Results tem o template yaml vazio

---

## 3. FASE 2 — VALIDATE (@po Pax)

### Checklist 10 pontos (score ≥7 = GO)
| # | Critério | Peso |
|---|---------|------|
| 1 | User Story segue formato "Como X, quero Y, para que Z" | 1 |
| 2 | Todos os ACs são verificáveis e não ambíguos | 2 |
| 3 | Épico e Sprint declarados | 1 |
| 4 | Agentes lead e suporte listados | 1 |
| 5 | DoD tem checkboxes com assinaturas de agentes obrigatórias | 1 |
| 6 | Escopo OUT declara explicitamente o que não entra | 1 |
| 7 | Pré-requisitos declarados (se houver) | 1 |
| 8 | Quality Gates específicos com agente responsável | 1 |
| 9 | Riscos identificados com mitigação | 1 |
| 10 | Estimativa de esforço plausível para o escopo | 1 |

**GO:** score ≥7 → Story status: Ready
**NO-GO:** score <7 → retorna ao @sm com lista de fixes obrigatórios

---

## 4. FASE 3 — IMPLEMENT (@dev Dex)

### Protocolo de execução
1. Ler story completa — **nunca começar sem ler**
2. Ler documentos obrigatórios relevantes (ver MASTERPLAN § Documentos Obrigatórios)
3. Executar tasks em ordem, marcando `[x]` conforme conclui
4. Rodar `npm run typecheck` após cada task que toca tipos
5. Rodar `npm test` após cada conjunto de funções implementadas
6. Atualizar File List se novos arquivos forem criados
7. Não avançar para @qa sem todos os testes passando

### Regras de CodeRabbit (auto-review)
- Máximo 2 iterações de auto-healing por story
- Se a 3ª iteração falhar: escalar para @qa com evidência

### Bloqueios de implementação
| Situação | Ação |
|----------|------|
| Math.ts a modificar sem validação de @aura-math | Pausar, convocar @aura-math |
| Schema a criar/alterar | Convocar @data-engineer antes de implementar |
| Endpoint /api/* a criar | Convocar @security-auditor para review de RLS/auth |
| Componente UI complexo | Convocar @ux-design-expert para spec antes |

---

## 5. FASE 4 — VALIDAÇÃO DE DOMÍNIO (obrigatória por tipo)

### Matriz de validação especializada

| Tipo de Story | Agentes obrigatórios na Fase 4 | Critério de PASS |
|--------------|-------------------------------|-----------------|
| **Motor matemático** (EP-01, 02, parte 03) | @aura-math + @aura-qa-auditor | Big Dig não regride; fórmulas validadas |
| **Estatística/calibração** (EP-03) | @roberta + @clint | Metodologia estatística aprovada; σ correto |
| **Motor geométrico SC** (Story 2.0-engine) | @aura-math + @roberta | Lei dos cossenos correta; IR/Rα/Rω em [0,1] |
| **UI/Visualização** (EP-02 ui, EP-04, DS) | @ux-design-expert + @visual-designer | Design tokens consistentes; a11y básico |
| **Animações** | @motion-designer | 60fps; ease correto; sem jank |
| **Database/migrations** (EP-08, 13) | @data-engineer + @security-auditor | RLS correto; sem orphan rows; índices |
| **IA/Klauss** (EP-07) | @aura-klauss + @jordy | Prompt aprovado; structured output funcional |
| **Execução** (EP-05) | @aura-production + @aura-qa-auditor | Tradução gerencial correta do PMBOK |
| **SaaS/Infra** (EP-SaaS, EP-08) | @security-auditor + @nexus | Sem vuln OWASP; RLS cross-tenant OK |
| **E2E/Dívida técnica** (EP-12) | @architect + @e2e-tester | 0 regressões; arquitetura aprovada |

### Regra: se a validação falhar
- Story retorna ao @dev com feedback específico
- @dev tem 1 tentativa de correção antes de escalar ao @aiox-master

---

## 6. FASE 5 — QA GATE (@qa Quinn)

### 7 checks obrigatórios
| # | Check | Critério de PASS |
|---|-------|-----------------|
| Q1 | TypeCheck | `npm run typecheck` → 0 erros novos |
| Q2 | Vitest | `npm test` → 100% dos testes existentes passando + novos para a story |
| Q3 | Lint | `npm run lint` → 0 warnings novos |
| Q4 | Big Dig | Se story toca motor: resultado não piora |
| Q5 | File List | Story file list bate com arquivos realmente modificados |
| Q6 | DoD Checkboxes | Todos os checkboxes marcados, todas as assinaturas de agentes colhidas |
| Q7 | Escopo OUT | Nada do OUT foi implementado acidentalmente |

### Verditos
| Veredicto | Condição | Ação |
|-----------|---------|------|
| **PASS** | Todos os 7 checks OK | Story → InReview → Done; @devops liberado para push |
| **CONCERNS** | 1-2 issues menores | @dev corrige; re-review em 30min |
| **FAIL** | ≥1 check crítico falhou | Story volta para @dev com feedback; re-enter Fase 3 |
| **WAIVED** | Issue documentado como aceitável | @aiox-master autoriza explicitamente |

### QA Result Format (preencher na story)
```yaml
storyId: X.Y
verdict: PASS | CONCERNS | FAIL | WAIVED
issues:
  - id: Q1
    severity: critical | high | medium | low
    description: "descrição do problema"
    resolution: "como foi resolvido"
```

---

## 7. FASE 6 — PUSH (@devops Gage) [EXCLUSIVO]

### Pré-condições obrigatórias
- [ ] QA gate: PASS ou WAIVED autorizado
- [ ] CI/CD verde no PR (lint + typecheck + vitest + build)
- [ ] Story status: InReview
- [ ] Nenhum conflito de merge não resolvido

### O que @devops faz
1. `git push origin feature/X.Y-story-name`
2. Cria PR com título convencional + referência à story
3. Aguarda CI verde
4. Merge ao branch de feature do épico (ou main se tier 1)
5. Verifica deploy Vercel (build success)
6. Atualiza Story status: Done

**Nenhum outro agente pode executar estas operações.**

---

## 8. FASE 7 — MONITORAMENTO (@nexus)

### Quality gates de infra
- Deploy Vercel: build time < 3min; bundle size não cresceu > 10%
- Supabase: nenhuma query com full table scan introduzida
- Edge Functions: latência < 500ms nas funções críticas

---

## 9. MATRIZ COMPLETA DE AGENTES POR ÉPICO

| Épico | @sm | @po | @dev | Fase 4 obrigatória | @qa | @devops |
|-------|-----|-----|------|-------------------|-----|---------|
| EP-01 Motor Core | River | Pax | Dex | @aura-math + @aura-qa-auditor | Quinn | Gage |
| EP-02 (2.0-engine) | River | Pax | Dex | @aura-math + @roberta | Quinn | Gage |
| EP-02 (2.0-ui) | River | Pax | Dex | @ux-design-expert + @motion-designer + @visual-designer | Quinn + @e2e-tester | Gage |
| EP-02 (2.1–2.12) | River | Pax | Dex | @aura-math + @roberta + @dataviz | Quinn | Gage |
| EP-03 Calibração | River | Pax | Dex | @roberta + @clint + @aura-qa-auditor | Quinn | Gage |
| EP-04 PERT/Gantt | River | Pax | Dex | @aura-math + @dataviz + @visual-designer | Quinn + @e2e-tester | Gage |
| EP-05 Execução | River | Pax | Dex | @aura-production + @aura-qa-auditor | Quinn | Gage |
| EP-06 Navegação | River | Pax | Dex | @architect + @ux-design-expert | Quinn + @e2e-tester | Gage |
| EP-07 Klauss IA | River | Pax | Dex | @aura-klauss + @jordy + @security-auditor | Quinn | Gage |
| EP-08 Infra/DB | River | Pax | Dex | @data-engineer + @security-auditor + @nexus | Quinn | Gage |
| EP-09 Ferramentas | River | Pax | Dex | @aura-production + @pm-engineer | Quinn | Gage |
| EP-10 Admin | River | Pax | Dex | @aura-integrator + @security-auditor | Quinn + @e2e-tester | Gage |
| EP-11 Pesquisa | River | Pax | — | @roberta + @kieza-research + @analyst | — | — |
| EP-12 Dívida | River | Pax | Dex | @architect + @data-engineer | Quinn + @e2e-tester | Gage |
| EP-13 Prometeu | River | Pax | Dex | @data-engineer + @roberta + @security-auditor | Quinn | Gage |
| EP-DS Design | River | Pax | Dex | @ux-design-expert + @visual-designer + @motion-designer | Quinn + @e2e-tester | Gage |
| EP-SaaS | River | Pax | Dex | @security-auditor + @data-engineer | Quinn | Gage |

---

## 10. DOD GLOBAL CROSS-ÉPICO

Todo story Done deve satisfazer TODOS os critérios abaixo:

```
CÓDIGO:
  [ ] TypeCheck: 0 erros novos
  [ ] Vitest: 100% testes existentes + novos para a story
  [ ] Lint: 0 warnings novos
  [ ] Nenhum `as any` em código novo (exceto legado documentado)

MOTOR (quando story toca engine):
  [ ] Big Dig: resultado não piora
  [ ] @aura-qa-auditor assinou matematicamente

BANCO (quando story toca DB):
  [ ] Migration reversível (rollback testado)
  [ ] RLS testado com user sem permissão
  [ ] @security-auditor assinou

UI (quando story tem componentes):
  [ ] Mobile 375px: sem scroll horizontal
  [ ] @ux-design-expert aprovou fluxo

PROCESSO:
  [ ] QA gate: PASS ou WAIVED documentado
  [ ] PR aprovado com review de ≥1 especialista do épico
  [ ] Deploy Vercel: build success
  [ ] Story atualizada: checkboxes + File List + Change Log
  [ ] Status: Done
```

---

## 11. PROTOCOLOS DE ESCALAÇÃO

| Situação | Quem aciona | Quem resolve |
|----------|------------|-------------|
| QA falha 2x na mesma story | @qa | @aiox-master media |
| Conflito matemático entre agentes | @aura-math ou @aura-production | @aiox-master + fundador |
| Story bloqueada por dependência não resolvida | @dev | @po reprioriza |
| Bug crítico descoberto durante implementação | @dev | Bug vira B-FIX sprint imediato |
| Violação constitucional detectada | Qualquer agente | HALT imediato; @aiox-master resolve |
| Story scope creep detectado | @qa | Retorna ao @sm para split |

---

## 12. REGRAS DE QA INTEGRADO EM TODAS AS FASES

QA não é apenas a Fase 5. @qa (Quinn) está presente em todo o ciclo:

| Fase | Papel do @qa |
|------|-------------|
| DRAFT (@sm) | @qa revisa Quality Gates antes de @po validar (assíncrono) |
| VALIDATE (@po) | @qa pode vetar story com ACs não verificáveis |
| IMPLEMENT (@dev) | @qa disponível para tirar dúvidas sobre critérios de aceite |
| DOMÍNIO | @qa acompanha validação especializada como observador |
| QA-GATE | @qa executa os 7 checks e emite veredicto formal |
| PUSH | @qa confirma que veredicto foi registrado na story antes do push |
| MONITOR | @qa revisa se regressões apareceram pós-deploy |

---

## 13. INTEGRAÇÃO COM AIOX SDC GENÉRICO

Este charter **complementa**, não substitui, o SDC genérico do AIOX em `.aiox-core/development/tasks/`.

| Onde usar | Documento |
|-----------|-----------|
| Aura-específico (épicos, agentes, Quality Gates por tipo) | Este arquivo: `docs/Aura-SDC-CHARTER.md` |
| SDC genérico (templates, checklists, workflow) | `.aiox-core/development/tasks/create-next-story.md` |
| Story template base | `.aiox-core/development/templates/story-tmpl.yaml` |
| DoD checklist base | `.aiox-core/development/checklists/story-dod-checklist.md` |

**Precedência:** Em caso de conflito, Aura-SDC-CHARTER tem precedência sobre SDC genérico para este projeto.

---

## 14. REFERÊNCIA RÁPIDA — FLUXO COMPLETO

```
@sm *draft
  └─ Story criada com todos os campos
        │
        ▼
@po *validate (checklist 10 pontos)
  └─ GO (≥7) → Status: Ready
  └─ NO-GO   → Retorna @sm com fixes
        │
        ▼
@dev *develop
  └─ Implementa tasks em ordem
  └─ Testes passando antes de entregar
        │
        ▼
DOMÍNIO (conforme Matriz § 9)
  └─ PASS → avança
  └─ FAIL → retorna @dev
        │
        ▼
@qa *qa-gate (7 checks)
  └─ PASS    → Status: InReview
  └─ CONCERNS → @dev corrige rápido
  └─ FAIL    → retorna @dev (Fase 3)
        │
        ▼
@devops *push
  └─ CI verde → merge → deploy
  └─ Status: Done
        │
        ▼
@nexus *monitor
  └─ Infra OK → Sprint continua
  └─ Issue    → hotfix imediato
```

---

*Aura-SDC-CHARTER v1.0 — Aprovado pelo squad completo (34 agentes) em 2026-03-18*
