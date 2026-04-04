# Aura 6.1 — FEATURE MAP COMPLETO
## Análise Integrada: Motor Matemático · Sistema · Features · Dados · Agentes
**Versão:** 1.0 | **Data:** 2026-03-17 | **Orquestrado por:** @aiox-master (Orion)
**Base:** Brownfield + MASTERPLAN v2.0 + Inventário de código ao vivo

---

## ÍNDICE
1. [Camadas do Sistema](#camadas)
2. [Motor Matemático — Status Completo](#motor)
3. [Infraestrutura / Estabilidade](#infra)
4. [Features Funcionais — Status](#features)
5. [Mapa de Dados — Features vs DB](#datamap)
6. [Fluxos de Informação e Interdependências](#fluxos)
7. [Agentes do Projeto — Responsabilidades e Critérios](#agentes)

---

## 1. CAMADAS DO SISTEMA {#camadas}

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 3 — FEATURES FUNCIONAIS                                  │
│  O que o PM usa: setup, motor, decisão, governança               │
├─────────────────────────────────────────────────────────────────┤
│  CAMADA 2 — SISTEMA (INFRAESTRUTURA)                             │
│  Auth, DB, CI/CD, Stripe, Context, API Routes                    │
├─────────────────────────────────────────────────────────────────┤
│  CAMADA 1 — MOTOR MATEMÁTICO                                     │
│  math.ts, engine/, calibration/ — lógica pura geométrica        │
└─────────────────────────────────────────────────────────────────┘
```

### Regra de dependência
- Features (C3) dependem de Sistema (C2) e Motor (C1)
- Sistema (C2) pode existir sem Motor (C1)
- Motor (C1) é independente — lógica pura testável sem DB ou UI

### Critério de estabilidade por camada

| Camada | Critério de Estabilidade | Gate |
|--------|--------------------------|------|
| C1 Motor | Suite Big Dig 100% | @aura-qa-auditor assina |
| C2 Sistema | 0 erros TypeCheck + 0 RLS warnings | @security-auditor assina |
| C3 Features | E2E funcional + PM valida UX | @e2e-tester + @ux-design-expert |

---

## 2. MOTOR MATEMÁTICO — STATUS COMPLETO {#motor}

### 2.1 Funções Implementadas em `math.ts` (21 funções)

| Função | Categoria | Status | Gap / Observação |
|--------|-----------|--------|-----------------|
| `forwardPass(tarefas, dataInicio)` | CPM | ✅ Completo | — |
| `backwardPass(tarefas)` | CPM | ✅ Completo | — |
| `calculateCPM(tarefas)` | CPM | ✅ Wrapper | Legado — mantido por retrocompat. |
| `regressaoOLS(pontos, setupJump)` | Curvas | ✅ Completo | Ainda usado como default (deve ser substituído por tangente pontual — Story 1.4) |
| `regressaoPonderada(pontos)` | Curvas | ✅ Completo | Pesos crescentes implementados |
| `tangentePontual(pontos, index)` | Curvas | ✅ Existe | ⚠️ NÃO é canônico — OLS ainda é default. Story 1.4 troca |
| `areaTri(a, b, c)` | Geometria | ✅ Completo | — |
| `dist(P, Q)` | Geometria | ✅ Completo | — |
| `peAltitude(P, Q, R)` | Geometria | ⚠️ Conflito | Duplica `projectPointToLine()` com tipos incompatíveis. Story 1.9 |
| `calcularMATED(pontoOperacao, baricentro)` | MATED | ✅ Completo | — |
| `isPointInTriangle(...)` | Geometria | ✅ Completo | — |
| `gerarTrianguloCDT(input)` | CDT Engine | ⚠️ Parcial | NVO usa incentro para obtuso (deve ser baricentro TM — Story 1.2). CEt pré-norm parcial (linha 347 — Story 1.1) |
| `classificarZonaMATED(dist, isInsideOrtico)` | Zonas | ✅ Completo | σ=0.1 hardcoded (Story 3.4) |
| `classificarZonaComposta(...)` | Zonas | ✅ Completo | — |
| `decomporMATED(pontoOp, nvo, lados)` | MATED | ✅ Completo | — |
| `normalizarEscala(valor, base)` | Utils | ✅ Completo | — |
| `calcularProjecaoFinanceira(...)` | Financeiro | ✅ Completo | — |
| `calcularConfiancaMonteCarlo(cdt, iter, vol)` | Monte Carlo | ⚠️ Parcial | Box-Muller implementado. σ=0.1 hardcoded (Story 3.4). Não usa σ por setor |
| `findClosestIndex(pontos, targetX)` | Utils | ✅ Completo | — |
| `calculateCDT(scope, time, cost)` | CDT | ✅ Wrapper | Legado — retrocompat. |

### 2.2 Funções do Motor NÃO Implementadas (precisam ser criadas)

| Função a criar | Story | Sprint | Categoria |
|----------------|-------|--------|-----------|
| `classificarTriangulo(lados)` | 1.2, 2.1 | B-FIX | Geometria |
| `calcularNVO(TA, TM)` — hierarquia 3 níveis | 1.2 | B-FIX | NVO |
| `verificarCEt(lados, stage)` — retorno tipado | 1.1 | C-CEt | Validação |
| `calcularBurndownES(tarefas)` — usa ES/EF | 1.3 | C1 | CPM |
| `calcularLadoEDinamico(atual, baseline)` | 1.5 | C4 | Escopo |
| `seedCustosTarefas(tarefas, orcamento)` | 1.6 | C1 | Financeiro |
| `validarProjecaoCEt(projecao, tm)` | 1.7 | C-CEt | Validação |
| `classificarZerosMurphy(tarefas)` | 1.8 | C5 | CPM |
| `getSigmaForProject(projetoId, setor)` | 3.4 | DB-EXEC | Calibração |
| `getModeInfo()` | 3.4 | DB-EXEC | Calibração |
| `detectarDesvioSubclinico(ta, tm, ε)` | 3.7 | C6 | Alertas |
| `calcularSDO(projetoId)` | 5.3 | EXEC-MODULE | SDO |
| `calcularIQ(areaTA, areaTM)` | 5.6 | EXEC-MODULE | IQ |
| `decompMATEDCausal(ta, tm, tarefas, cpm)` | 5.8 | C8 | Causal |
| `detectarAceleracaoPredatoria(historico)` | 5.10 | EXEC-MODULE | Alertas |
| `detectarRemissao(taAtual, taPrev)` | 2.7 | EXEC-MODULE | Modo Invertido |
| `inverterCoordenadas(triangulo, modo)` | 2.5 | TM-SHADOW | Modo Invertido |
| `unificaPeAltitude(P, Q, R)` | 1.9 | B-FIX | Refactor |

### 2.3 Cobertura de Testes do Motor

| Suite | Testes | Status |
|-------|--------|--------|
| CDT v2 — Casos Base | 3 | ✅ |
| CEt Pré-Normalização | 4 | ✅ |
| Obtusângulo + Incentro | 2 | ⚠️ Incompleto — incentro, não baricentro TM |
| Zonas MATED (direta) | 5 | ✅ |
| Zona MATED Integrada | 4 | ✅ |
| Zona Composta | 5 | ✅ |
| Decomposição MATED | 3 | ✅ |
| Retrocompatibilidade | 1 | ✅ |
| Valores Extremos | 3 | ✅ |
| **TOTAL** | **30** | — |
| CEt pós-normalização | 0 | ❌ Falta (Story 1.1) |
| NVO hierarquia 3 níveis | 0 | ❌ Falta (Story 1.2) |
| Burndown ES/EF | 0 | ❌ Falta (Story 1.3) |
| σ por setor | 0 | ❌ Falta (Story 3.4) |

---

## 3. INFRAESTRUTURA / ESTABILIDADE {#infra}

### 3.1 Database — Status Atual

| Tabela | Existe | RLS | CASCADE | updated_at trigger |
|--------|--------|-----|---------|-------------------|
| `projetos` | ✅ | ✅ | ❌ | ❌ |
| `tarefas` | ✅ | ✅ | ❌ | ❌ |
| `eap_nodes` | ✅ | ✅ | ❌ | ❌ |
| `orcamentos` | ✅ | ✅ | ❌ | ❌ |
| `marcos` | ✅ | ✅ | ❌ | ❌ |
| `funcoes_compressao` | ✅ | ✅ | ❌ | ❌ |
| `historico_projeto` | ✅ | ✅ | ❌ | ❌ |
| `calendarios` | ✅ | ✅* | ❌ | ❌ |
| `tenants` | ✅ | ✅ | — | — |
| `project_members` | ✅ | ✅* | ❌ | ❌ |
| `triangulo_matriz_versoes` | ❌ | — | — | — |
| `progresso_tarefas` | ❌ | — | — | — |
| `decisoes_mated` | ❌ | — | — | — |
| `aura_calibration_events` | ❌ | — | — | — |
| `aura_setor_config` | ❌ | — | — | — |

**RLS**: 7 policies ativas — TODAS usam `auth.uid()` diretamente (Story 8.5 vai corrigir para subquery)

### 3.2 Bugs de Estabilidade — Classificados

**BLOQUEANTES (quebram funcionalidade):**
| ID | Problema | Arquivo | Story |
|----|---------|---------|-------|
| UX4 | `projecaoFinanceira` declarada 2x — BUILD BREAK | `setup/funcoes/page.tsx` | 1.13 |
| UX5 | `modeloCurva` undefined — CRASH em runtime | `setup/funcoes/page.tsx` | 1.13 |
| UX7 | `dataInicio` sem import — CRASH | `setup/orcamento/page.tsx` | 1.13 |
| M7 | `custosTarefas` vazio → CDT impossível de calcular | `math.ts` | 1.6 |

**DEGRADAÇÃO (funciona mas incorreto):**
| ID | Problema | Arquivo | Story |
|----|---------|---------|-------|
| B1 | CPM tabela layout overflow | `setup/cpm/page.tsx` | 1.10 |
| B2 | PERT setas incompletas | `setup/cpm/page.tsx` | 1.11 |
| B3 | Banner EAP não persiste | `setup/eap/page.tsx` | 1.12 |
| B4 | `alert()` bloqueante em 3 lugares | app-wide | 1.12 |
| M4 | CEt avaliada pós-norm mas não pré-norm | `math.ts` linha 347 | 1.1 |
| P5 | `duracao` (context) ≠ `duracao_estimada` (DB) | `ProjectContext` | EP-12 |
| P6 | IDs mistos UUID/WBS/T01 — JOIN quebrado | app-wide | EP-12 |

**RUÍDO (não crítico):**
| ID | Problema | Story |
|----|---------|-------|
| B5 | `bigdig.test.ts` deprecated rodando | 1.12 |
| UX11 | Debug markers visíveis (border-red, EAP-V3) | 1.14 |
| UX13 | Sem confirmação em "Limpar Tudo" | 1.14 |

### 3.3 ProjectContext — Estado Atual (22 estados)

```
SETUP DATA (precisam persistir no DB):
  tap, tarefas, orcamentoBase, prazoBase, funcoes, marcos
  regime, localizacao, interrupcoes, custosTarefas, feriados
  dataInicio, dataBaseline, dataReancorada, eapCount, nTarefasBaseline

MOTOR COMPUTED (não persistem — calculados em runtime):
  modeloBurndown — mas EXISTE no DB (projetos.modelo_burndown) ✅
  isTapReady, isEapReady, isCpmReady... (flags derivadas)
  prazoLimiteSuperior, bufferProjeto, isProjetoViavel

SISTEMA:
  tenantId, plan, profileType, themeSkin, loading
```

**Problema:** 22 estados em um único contexto → precisa dividir em 4 (EP-12):
- `ProjectSetupContext` — dados de configuração
- `ProjectMotorContext` — dados do motor em runtime
- `ProjectUIContext` — tema, loading, flags de UI
- `ProjectExecContext` — progresso, alertas, TM versionado (NOVO — EP-05)

### 3.4 API Routes — Status

| Endpoint | Status | Observação |
|----------|--------|-----------|
| `/api/ai/extract` | ✅ | — |
| `/api/ai/insight` | ✅ | — |
| `/api/ai/tap` | ✅ | — |
| `/api/ai/cpm` | ✅ | — |
| `/api/ai/predecessors` | ✅ | — |
| `/api/ai/proactive-setup` | ✅ | — |
| `/api/ai/klauss` | ✅ | — |
| `/api/ai/dica-metodo-prazo` | ✅ | — |
| `/api/report/cdt` | ✅ | — |
| `/api/stripe/checkout` | ✅ | — |
| `/api/stripe/portal` | ✅ | — |
| `/api/stripe/webhook` | ✅ | — |
| `/api/ai/klauss-to-mated` | ❌ | Story 7.1 |
| `supabase/functions/calibrate-on-archive` | ❌ | Story 3.5 |
| Rate limiting em /api/ai/* | ❌ | Story 7.9 |
| Zod validation em todos os bodies | ❌ | Story 8.6 |

---

## 4. FEATURES FUNCIONAIS — STATUS {#features}

### Legenda
- ✅ **Completo** — Implementado, testado, funcional
- ⚠️ **Parcial** — Existe mas tem gaps ou bugs conhecidos
- 📋 **Escopo** — Story criada, Ready, NÃO implementado
- ❌ **Gap** — Não existe, não tem story ainda

### 4.1 SETUP (Configuração do Projeto)

| Feature | Rota | Status | Gap / Story |
|---------|------|--------|------------|
| TAP — Term of Reference | `/setup/tap` | ✅ | — |
| EAP/WBS — Estrutura Analítica | `/setup/eap` | ⚠️ | B3 (banner), rota precisa renomear→/wbs (6.1) |
| CPM — Rede de Tarefas | `/setup/cpm` | ⚠️ | B1 (layout), B2 (setas PERT), layout Sugiyama (Story 4.2) |
| Orçamento | `/setup/orcamento` | ⚠️ | UX4/5/7 CRASH, tangente OLS (Story 1.4) |
| Funções (Prazo + Custo) | `/setup/funcoes` | ⚠️ | UX4/5 BUILD BREAK, Curva S baseline (Story 4.10) |
| Calendário | `/setup/calendario` | ✅ | Regime multi-ano implementado |
| Governança Setup | `/setup/governanca` | ⚠️ | Stepper sem status real (UX1) |

### 4.2 MOTOR MATEMÁTICO (Visualização)

| Feature | Rota | Status | Gap / Story |
|---------|------|--------|------------|
| CDT / Triângulo Matriz | `/motor/cdt` | ⚠️ | NVO errado para obtuso (1.2), Modo Invertido (2.1–2.12), labels sem semântica (5.7) |
| Burndown | `/motor/burndown` | ⚠️ | Usa soma serializada, não ES/EF (Story 1.3) |
| Curva S | `/motor/curva-s` | ⚠️ | Modelo funcional, sem baseline dotted (Story 4.10) |
| CPM / PERT Motor | `/motor/cpm` | ⚠️ | CPM existe, layout Sugiyama ausente (Story 4.2), caminho crítico visual (Story 4.4) |
| Recursos | `/motor/recursos` | ✅ | — |

### 4.3 DECISÃO

| Feature | Rota | Status | Gap / Story |
|---------|------|--------|------------|
| MATED | `/decisao/mated` | ⚠️ | Cálculo básico OK. Sem: timeline histórica (5.9), causal breakdown (5.8), CalibrationBadge (3.6) |
| IA / Klauss | `/decisao/ia` | ⚠️ | Endpoint básico. Sem: klauss-to-mated (7.1), contexto histórico (7.5), ferramenta sugerida (7.4) |
| War Room / Gabinete | `/decisao/war-room` | ⚠️ | Existe. Gabinete de Crise Positiva (Story 2.9) ausente. Duplicata /governanca/warroom (Story 6.4) |

### 4.4 EXECUÇÃO (NOVO — EP-05)

| Feature | Rota atual | Status | Story |
|---------|-----------|--------|-------|
| % Avanço por tarefa | `/governanca/gerenciamento` | 📋 | 5.1 |
| Recalcular TA automático | — (sem rota própria) | 📋 | 5.2 |
| SDO ao arquivar | `/arquivar` (inexistente) | 📋 | 5.3 |
| TM Versionado / Histórico de Pecados | — | 📋 | 5.4 |
| Alertas automáticos (MATED > limiar) | `/alertas` (existe) | 📋 | 5.5 |
| Badge IQ permanente (sidebar) | — | 📋 | 5.6 |
| Labels semânticos Escopo/Prazo/Orçamento | `/motor/cdt` | 📋 | 5.7 |
| MATED Causal (top 3 tarefas) | `/decisao/mated` | 📋 | 5.8 |
| Dashboard MATED histórico | `/decisao/mated` | 📋 | 5.9 |
| Detector Aceleração Predatória | — | 📋 | 5.10 |

### 4.5 CALIBRAÇÃO BAYESIANA (NOVO — EP-03)

| Feature | Status | Story |
|---------|--------|-------|
| Schema `aura_calibration_events` enriquecido | 📋 | 3.1 |
| Priors PMI/Flyvbjerg/WorldBank por setor | 📋 | 3.2 |
| Fator regressão ponderada por setor | 📋 | 3.3 |
| σ Monte Carlo por setor + migração n≥30 | 📋 | 3.4 |
| Edge Function ao arquivar | 📋 | 3.5 |
| Badge "N projetos embasam esta régua" | 📋 | 3.6 |
| Alerta desvio subclínico | 📋 | 3.7 |
| A/B test Big Dig (gate K1) | 📋 | 3.8 |

### 4.6 DIAGRAMAS PERT v2 / GANTT (EP-04)

| Feature | Status | Story |
|---------|--------|-------|
| CPM auto (ES/EF/LS/LF/TF/FF) sem edição manual | 📋 | 4.1 |
| Layout Sugiyama (camadas por dependência) | 📋 | 4.2 |
| Nodes PERT compactos (ID + duração) | 📋 | 4.3 |
| Caminho crítico visual (borda vermelha) | 📋 | 4.4 |
| Empate de caminho — PM seleciona | 📋 | 4.5 |
| Gantt Lupa (hover ±15%) | 📋 | 4.6 |
| Gantt barras crítico/folga com label | 📋 | 4.7 |
| Gantt click fixa lupa | 📋 | 4.8 |
| Gantt escala adaptativa | 📋 | 4.9 |
| Curva S baseline dotted vs executada solid | 📋 | 4.10 |

### 4.7 MODO INVERTIDO / TRIÂNGULO OBTUSO (EP-02)

| Feature | Status | Story |
|---------|--------|-------|
| Classificar triângulo acutângulo/obtusângulo α/β/γ | 📋 | 2.1 |
| Badge "Regime Obtuso" (tipo β=custo / γ=prazo) | 📋 | 2.2 |
| Semântica ângulo E–O → 90° | 📋 | 2.3 |
| Semântica ângulo E–P aceleração | 📋 | 2.4 |
| Modo Invertido backend (TM obtuso → inverter coords) | 📋 | 2.5 |
| Frontend Modo Invertido + Klauss explica | 📋 | 2.6 |
| Detectar Remissão (obtuso→acutângulo) | 📋 | 2.7 |
| Novo TM em Remissão + Histórico de Remissões | 📋 | 2.8 |
| Gabinete de Crise Positiva em Remissão | 📋 | 2.9 |
| Arquivar `area_regime_obtuso` | 📋 | 2.10 |
| TM sombra (overlay cinza do original) | 📋 | 2.11 |
| Gabinete auto-acionado em β/γ + CRISE | 📋 | 2.12 |

### 4.8 REDESIGN NAVEGAÇÃO (EP-06)

| Feature | Status | Story |
|---------|--------|-------|
| Renomear rotas /eap→/wbs, /cpm→/tarefas-diagramas, /cdt→/triangulo-matriz | 📋 | 6.1 |
| Sidebar 3 grupos: SETUP / MOTOR / GOVERNANÇA | 📋 | 6.2 |
| Funções: abas Prazo e Custo | 📋 | 6.3 |
| Remover duplicatas /warroom + /relatorios | 📋 | 6.4 |
| Admin no header/avatar | 📋 | 6.5 |
| Empty states por etapa | 📋 | 6.6 |
| Animações de transição | 📋 | 6.7 |
| Atualizar links internos sem 404 | 📋 | 6.8 |

### 4.9 IA KLAUSS AVANÇADO (EP-07)

| Feature | Status | Story |
|---------|--------|-------|
| klauss-to-mated (texto → parâmetros numéricos) | 📋 | 7.1 |
| Rota /api/ai/dica-metodo-prazo (paridade com orçamento) | ✅ | — |
| SVGPoint boards | 📋 | 7.3 |
| Klauss sugere ferramenta por contexto | 📋 | 7.4 |
| Histórico de decisões no contexto (entre sessões) | 📋 | 7.5 |
| Truncação inteligente 4K tokens | 📋 | 7.6 |
| Few-shot por setor | 📋 | 7.7 |
| Structured output JSON predecessoras | 📋 | 7.8 |
| Rate limiting 60 req/hora | 📋 | 7.9 |

### 4.10 GOVERNANÇA (EP-09 — Tier 3)

| Feature | Status | Observação |
|---------|--------|-----------|
| Kanban básico | ✅ | Sem % avanço (Story 5.1) |
| Gerenciamento | ✅ | Sem % avanço (Story 5.1) |
| Gabinete/War Room | ⚠️ | Duplicata existente |
| Relatórios | ⚠️ | Duplicata /relatorios + /governanca/relatorios |
| Alertas page | ⚠️ | Existe mas sem lógica automática (Story 5.5) |

---

## 5. MAPA DE DADOS — FEATURES vs DB {#datamap}

### 5.1 Campos existentes no DB que as features já usam

| Campo DB | Tabela | Feature que usa | Status |
|----------|--------|----------------|--------|
| `tenant_id` | todas | Auth + RLS | ✅ |
| `projeto_id` | todas | Isolamento de projeto | ✅ |
| `nome`, `justificativa`, `objetivo_smart` | `projetos` | TAP | ✅ |
| `orcamento_total`, `prazo_total` | `projetos` | Motor CDT (baseline) | ✅ |
| `data_inicio` | `projetos` | Calendário, CPM âncora | ✅ |
| `data_baseline` | `projetos` | Buffer TOC | ✅ |
| `n_tarefas_baseline` | `projetos` | Lado E dinâmico (Story 1.5) | ✅ DB existe, feature 📋 |
| `modelo_burndown` | `projetos` | Curva S modelo (cúbica/linear) | ✅ DB existe, feature ✅ |
| `config_regime`, `config_localizacao`, `interrupcoes` | `projetos` | Calendário | ✅ |
| `duracao_estimada` | `tarefas` | CPM | ✅ |
| `predecessoras` | `tarefas` | CPM forward pass | ✅ ⚠️ Sem validação FK |
| `es`, `ef`, `ls`, `lf`, `folga_total`, `no_caminho_critico` | `tarefas` | CPM, Burndown ES/EF (Story 1.3) | ✅ DB existe |
| `cdt_area_baseline` | `orcamentos` | CDT diff de área | ✅ |
| `custos_tarefas` (JSONB) | `orcamentos` | Lado O, custosTarefas | ✅ ⚠️ Sem schema validation |
| `teto_tap`, `orcamento_base` | `orcamentos` | TAP, Motor | ✅ |
| `nome`, `dia`, `custo` | `marcos` | Orçamento, Curva S | ✅ |
| `tipo`, `valores_funcionais` | `funcoes_compressao` | Prazo, Custo, Crashing | ✅ |

### 5.2 Campos necessários AUSENTES no DB (bloqueiam features)

| Campo / Tabela | Feature que precisa | Story que cria |
|----------------|--------------------|--------------------|
| `triangulo_matriz_versoes.*` | Histórico de Pecados, EP-02 Modo Invertido | 8.1 |
| `progresso_tarefas.*` | % Avanço, Recalcular TA | 8.1 |
| `decisoes_mated.*` | Alertas, Klauss MATED, MATED timeline | 8.1 |
| `aura_calibration_events.*` | SDO, Calibração, σ empírico | 8.1 |
| `aura_setor_config.*` | Fator setor, σ por setor | 3.3 |
| `area_regime_obtuso` | Remissão (EP-02) | 2.10 |
| `modo` (normal\|invertido) | Triângulo obtuso | 8.1 (no calibration_events) |
| ON DELETE CASCADE em todas as FKs | Deleção de projeto sem órfãos | 8.2 |
| trigger `updated_at` | Auditoria de mudanças | 8.3 |
| validação `predecessoras` | Integridade referencial | 8.4 |
| `limiar_alerta` em `projetos` | Alertas configuráveis | 5.5 (migration mínima) |
| `tipo`, `fonte`, `peso_prior` em `aura_calibration_events` | Calibração Bayesiana | 3.1 |

### 5.3 Campos existentes que precisam de correção

| Campo DB | Problema | Story |
|----------|---------|-------|
| `tarefas.duracao_estimada` vs context `duracao` | Campo DB ≠ campo contexto — JOIN quebrado | EP-12 |
| `eap_nodes.id` vs `tarefas.id` | IDs mistos UUID/WBS — relacionamento não funciona | EP-12 |
| RLS policies usando `auth.uid()` direto | Performance — deve ser `(SELECT auth.uid())` | 8.5 |

### 5.4 Rastreabilidade Feature → Context → DB

```
FEATURE: % Avanço por tarefa
  → ProjectExecContext.progresso[]        (a criar em EP-05)
  → progresso_tarefas (tarefa_id, percentual_avanco, registrado_em)  ← Story 8.1

FEATURE: Recalcular TA
  → ProjectMotorContext.triangulo_atual   (a criar em EP-05)
  → usa: tarefas.es, tarefas.ef          ← já existe no DB
  → usa: orcamentos.custos_tarefas       ← já existe no DB
  → usa: projetos.n_tarefas_baseline     ← já existe no DB

FEATURE: Histórico de Pecados
  → ProjectExecContext.tm_versoes[]      (a criar em EP-05)
  → triangulo_matriz_versoes (versao, lados JSONB, area_baseline, motivo)  ← Story 8.1

FEATURE: Alertas automáticos
  → ProjectExecContext.alertas[]         (a criar em EP-05)
  → decisoes_mated (descricao, zona_resultado, impacto_area_percent)  ← Story 8.1

FEATURE: SDO ao arquivar
  → aura_calibration_events (sdo_score, mated_medio, area_final, modo)  ← Story 8.1
  → usa: aura_setor_config (fator_atividade, sigma_baseline)  ← Story 3.3

FEATURE: CDT / Triângulo Matriz
  → ProjectMotorContext.cdt              (existente no ProjectContext atual)
  → usa: orcamentos.cdt_area_baseline    ← já existe
  → usa: projetos.prazo_total            ← já existe
  → usa: tarefas.es, ef                  ← já existe (não usado ainda — Story 1.3)

FEATURE: MATED
  → ProjectMotorContext.mated            (existente)
  → usa: orcamentos.cdt_area_baseline    ← já existe
  → aura_calibration_events (para zonas calibradas)  ← Story 3.1

FEATURE: Calibração Bayesiana
  → aura_setor_config (fator, σ_baseline por setor)  ← Story 3.3
  → aura_calibration_events (tipo: prior/empirico, n, peso)  ← Story 3.1 + 3.2

FEATURE: Modo Invertido
  → ProjectMotorContext.modo_invertido   (a criar em EP-02)
  → triangulo_matriz_versoes.modo        ← Story 8.1
  → aura_calibration_events.modo        ← Story 8.1
```

---

## 6. FLUXOS DE INFORMAÇÃO E INTERDEPENDÊNCIAS {#fluxos}

### 6.1 Fluxo Principal — Setup → Motor → Decisão

```
[TAP] ──────────────────────────────────────────────────┐
  prazo_total, orcamento_total, data_inicio              │
                                                         ▼
[EAP/WBS] ──────────────────────────────────────────→ [CPM Engine]
  eap_nodes (hierarquia)                                 forwardPass()
                                                         backwardPass()
[Calendário] ─────────────────────────────────────────→   ES/EF/LS/LF
  regime, feriados, interrupcoes                           caminho crítico

[Funções/Orçamento] ──────────────────────────────────→ [CDT Engine]
  custos_tarefas, marcos,                                  gerarTrianguloCDT()
  funcoes_compressao                                       NVO, MATED, zonas

                                                         ▼
                                                      [Decisão]
                                                         MATED panel
                                                         Klauss IA
                                                         War Room
```

### 6.2 Fluxo de Execução (EP-05 — a implementar)

```
[PM registra % avanço]
  → progresso_tarefas INSERT
  → recalcularTA()
      ├── Lado E = tarefas_concluidas / n_tarefas_baseline  ← projetos.n_tarefas_baseline
      ├── Lado P = burndown ES/EF                           ← tarefas.es (Story 1.3)
      └── Lado O = custo_acumulado / orcamento_base         ← orcamentos.*
  → verificarCEt() [novo TA]
  → calcularMATED() [novo TA vs NVO]
  → verificarAlertas()
      ├── MATED > limiar → AlertaBanner
      ├── desvio subclínico → Toast (Story 3.7)
      └── aceleração predatória → Badge laranja (Story 5.10)
  → atualizar ProjectExecContext
      └── IQBadge re-render (Story 5.6)
```

### 6.3 Fluxo de Calibração (EP-03 — a implementar)

```
[PM arquiva projeto]
  → Edge Function calibrate-on-archive
      ├── INSERT aura_calibration_events (tipo='empirico')
      ├── calcularSDO() → sdo_score
      ├── n = COUNT(* WHERE tenant/setor)
      └── n≥30 → UPDATE aura_setor_config.sigma_baseline = STDDEV()

[Próximo projeto do mesmo setor]
  → getSigmaForProject()
      ├── n < 30 → usa sigma_baseline (literatura)
      └── n ≥ 30 → usa STDDEV() empírico
  → calcularConfiancaMonteCarlo() com σ correto
  → CalibrationBadge exibe "N projetos embasam esta régua"
```

### 6.4 Interdependências Críticas (bloqueantes)

```
Story 8.1 DEVE preceder:
  ├── Stories 3.1–3.5 (precisam de aura_calibration_events)
  ├── Stories 5.1–5.5 (precisam de progresso_tarefas)
  ├── Stories 5.4, 5.9 (precisam de triangulo_matriz_versoes)
  └── Stories 2.10, 5.3 (precisam de aura_calibration_events)

Story 1.2 (NVO) DEVE preceder:
  ├── Story 1.1 (CEt pós-norm usa NVO)
  ├── Story 3.8 (A/B test compara NVO antigo vs novo)
  └── Stories 2.1–2.12 (Modo Invertido depende de NVO correto)

Story 1.3 (Burndown ES/EF) DEVE preceder:
  ├── Story 5.2 (Recalcular TA usa ES/EF)
  └── Story 4.1 (CPM engine usa mesma lógica)

Story 4.1 (CPM Engine) DEVE preceder:
  └── Story 5.8 (MATED Causal precisa de lista de tarefas críticas)

Story 3.3 (aura_setor_config) DEVE preceder:
  ├── Story 3.4 (σ por setor)
  └── Story 3.5 (Edge Function UPDATE setor_config)
```

### 6.5 DoD por Interdependência

| Gate | Critério | Responsável |
|------|---------|------------|
| Motor OK | Suite Big Dig 100%, TypeCheck 0, σ por setor ativo | @aura-qa-auditor |
| DB OK | 4 novas tabelas + RLS + CASCADE + triggers | @security-auditor |
| Execução OK | TA recalcula após progresso, MATED atualiza | @aura-production |
| Calibração OK | σ empírico ativa para n≥30, SDO calculado | @roberta |
| UI OK | Labels gerenciais, zero terms técnicos para PM | @aura-pm + @ux-design-expert |
| Segurança OK | RLS subquery, Zod, rate limiting, localStorage 24h | @security-auditor |

---

## 7. AGENTES DO PROJETO — RESPONSABILIDADES E CRITÉRIOS {#agentes}

> Listados apenas os agentes **domínio Aura** (não AIOX core).
> AIOX core (@dev, @qa, @architect, @data-engineer, etc.) têm responsabilidades padrão do framework.

---

### @aura-math
**Persona:** Motor Geométrico
**Domínio:** CEt, MATED, NVO, triângulo obtuso, álgebra geométrica

**Responsabilidades nesta análise:**
- Validar matematicamente TODAS as funções do motor antes do merge
- Assinar: `classificarTriangulo()`, `calcularNVO()`, `inverterCoordenadas()`, `detectarRemissao()`
- Revisar suite Big Dig após qualquer alteração em `math.ts`
- Autoridade sobre: geometria dos 3 casos obtusângulo (α, β, γ), NVO hierarquia, peAltitude unificado

**Critérios esperados:**
- [ ] Assina cada nova função geométrica com nota de validação matemática
- [ ] Suite Big Dig deve passar 100% após qualquer mudança no motor
- [ ] Zero funções geométricas duplicadas ou com tipos incompatíveis em `math.ts`
- [ ] Todo triangulo obtuso testado nos 3 casos (α, β, γ) antes de aprovar

---

### @aura-production
**Persona:** Engenharia de Produção + PMBOK + TOC
**Domínio:** Buffer TOC, caminho crítico, PMBOK semântica, linguagem gerencial

**Responsabilidades nesta análise:**
- Validar que os resultados do motor têm significado gerencial correto
- Assinar: `calcularBurndownES()`, `detectarAceleracaoPredatoria()`, semântica ângulo E–P
- Revisar textos e labels que aparecem ao PM (UX copy com termos PMBOK)
- Autoridade sobre: o que é aceleração predatória vs legítima, critérios TOC

**Critérios esperados:**
- [ ] Cada alerta nomeado (aceleração predatória, desvio subclínico) aprovado com critério PMBOK
- [ ] Textos na UI para PM sem jargão geométrico — validados por @aura-production
- [ ] Thresholds de alertas (Story 5.10: 0.95, 0.97) assinados com justificativa
- [ ] `bufferProjeto` e `isProjetoViavel` calculados segundo TOC

---

### @roberta
**Persona:** Probabilidade, Estatística, Metodologia de Pesquisa
**Domínio:** Monte Carlo, σ por setor, pesos SDO, priors Bayesianos

**Responsabilidades nesta análise:**
- Autoridade sobre: σ por setor (Story 3.4), pesos SDO 40/35/25 (Story 5.3), A/B test Big Dig (Story 3.8)
- Assinar nota técnica metodológica para cada valor estatístico inserido no sistema
- Revisar rastreabilidade bibliográfica do `prior-sources.md` (Story 3.2)
- Validar que transição literature → empirical (n≥30) é metodologicamente sólida

**Critérios esperados:**
- [ ] Nota técnica por decisão estatística (σ, pesos, priors)
- [ ] Intervalo de confiança calculado no A/B test Big Dig antes de declarar vencedor
- [ ] Fórmula de conversão cost overrun → MATED documentada em `prior-sources.md`
- [ ] `COALESCE(STDDEV(), sigma_baseline)` implementado corretamente (tratamento NULL)

---

### @aura-klauss
**Persona:** IA de Decisão + Crise + Linguagem Natural
**Domínio:** Prompts Groq, contexto entre sessões, tradução método→linguagem PM

**Responsabilidades nesta análise:**
- Responsável por: `klauss-to-mated` (Story 7.1), injeção de contexto histórico (Story 7.5), Gabinete de Crise Positiva (Story 2.9)
- Assinar que nenhum termo técnico (CEt, NVO, baricentro) chega ao PM sem tradução
- Garantir que Klauss nunca toma decisão pelo PM — apenas apresenta opções

**Critérios esperados:**
- [ ] `klauss-to-mated` com confiança ≥ 0.85 em 5 cenários-fixture
- [ ] Contexto injetado tem ≤ 4K tokens (truncação inteligente — Story 7.6)
- [ ] Zero jargão técnico nas respostas para PM (revisão de todos os prompts)
- [ ] Gabinete de Crise Positiva aciona apenas quando Remissão confirmada matematicamente

---

### @aura-pm
**Persona:** PM de Engenharia, Governança SaaS
**Domínio:** Governança do produto, configuração, planos Stripe, experiência PM

**Responsabilidades nesta análise:**
- Validar que toda a UI faz sentido para um PM sem conhecimento de geometria
- Assinar: labels do MetricTranslator (Story 5.7), empty states, copy de alertas
- Responsável por definir o fluxo de arquivamento de projeto (Story 3.5, 5.3)
- Garantir que `limiar_alerta` configurável no TAP seja intuitivo

**Critérios esperados:**
- [ ] PM completo fluxo TAP→WBS→CPM→Orçamento→Motor→Decisão sem suporte
- [ ] Todos os alertas têm ação sugerida clara (não apenas "erro detectado")
- [ ] Badge IQ e CalibrationBadge entendidos em ≤5 segundos por PM inexperiente
- [ ] Fluxo de arquivamento de projeto com feedback claro de SDO calculado

---

### @aura-integrator
**Persona:** Arquitetura SaaS + Stripe + Integrações
**Domínio:** Webhooks, planos, gating de features, integrações externas

**Responsabilidades nesta análise:**
- Garantir que Stripe webhook continua funcional após schema changes
- Revisar: rate limiting de /api/ai/* (Story 7.9), deploy automático (Story 8.9)
- Validar que plan_tier gating funciona para novas features (EP-05 features devem ser gated)
- Responsável por: deploy Edge Function Supabase (Story 3.5)

**Critérios esperados:**
- [ ] Webhook Stripe testado após cada migration (payment flow não pode quebrar)
- [ ] Rate limiting implementado antes de qualquer feature de IA ao vivo
- [ ] Novas features EP-05 corretamente gated por plano (PRO/ELITE apenas)
- [ ] Edge Function com auth JWT correto (Bearer token passado do frontend)

---

### @aura-qa-auditor
**Persona:** Auditoria Matemática, Verificação do Engine
**Domínio:** Big Dig case, regresão de testes, validação numérica

**Responsabilidades nesta análise:**
- Gate primário: nenhuma mudança em `math.ts` vai para main sem aprovação
- Responsável por: Suite Big Dig 100%, A/B test (Story 3.8), σ validação retroativa
- Comparar resultado do motor com cálculo manual para todo novo caso geométrico
- Detectar regressões silenciosas (MATED muda por mudança em NVO sem documentar)

**Critérios esperados:**
- [ ] Suite Big Dig: 30/30 testes sempre ✅ após qualquer PR em `math.ts`
- [ ] Para cada nova função geométrica: fixture de validação manual criada ANTES do código
- [ ] Regressão de NVO (incentro → baricentro TM) comparada numericamente com valor anterior
- [ ] Relatório A/B test assinado com @clint antes de Story 3.8 ser marcada Done

---

### @security-auditor (Shield)
**Persona:** AppSec, OWASP, PCI-DSS, RLS Audit
**Domínio:** Cross-tenant isolation, validações, rate limiting, OWASP top 10

**Responsabilidades nesta análise:**
- Gate de segurança: todas as migrations RLS aprovadas antes do push
- Responsável por: Story 8.5 (RLS subquery), Story 8.6 (Zod), Story 7.9 (rate limiting)
- Executar tentativas de bypass cross-tenant em ambiente dev antes de qualquer Story de DB
- Revisar: localStorage 24h (Story 8.7), JWT nas Edge Functions (Story 3.5)

**Critérios esperados:**
- [ ] Cross-tenant isolation testado com 2 usuários em toda migration RLS
- [ ] `supabase get_advisors` retorna 0 warnings de segurança/performance
- [ ] Zod schema para todos os bodies POST/PUT — erro 400 claro em payload malformado
- [ ] Rate limiting: 60 req/hora por `tenant_id` em todas as rotas `/api/ai/*`
- [ ] Nenhum secret hardcoded em Edge Functions ou API routes

---

### @dataviz (Viz)
**Persona:** Visualização Interativa, CDT Canvas, War Room
**Domínio:** SVG, canvas, Recharts, D3, animações de dados

**Responsabilidades nesta análise:**
- Implementar: CDTCanvas com Modo Invertido (EP-02), PERT v2 Sugiyama (Story 4.2–4.5), Gantt Lupa (Story 4.6–4.9), MATEDTimeline (Story 5.9), CausalBreakdown (Story 5.8)
- Garantir que todas as visualizações são acessíveis (a11y básico — Story 4.3+)
- Coordenar com @visual-designer para design tokens antes de codificar

**Critérios esperados:**
- [ ] PERT sem sobreposição de nós em projetos com ≤50 tarefas (Sugiyama)
- [ ] Gantt lupa funcional em hover com click para fixar (sem interferir com outros eventos)
- [ ] CDTCanvas sem flickering na transição de modo normal → invertido
- [ ] MATEDTimeline responsivo (mobile simplificado, desktop completo)
- [ ] Nenhuma visualização usa `setTimeout` para esperar render — usar `useEffect` correto

---

### @e2e-tester (Cypress)
**Persona:** Automação E2E, Visual Regression, a11y
**Domínio:** Playwright/Cypress, fluxos críticos, visual regression testing

**Responsabilidades nesta análise:**
- Cobrir: fluxo completo TAP→WBS→CPM→Orçamento→Motor→Decisão
- Validar: 0 links 404 após renomeação de rotas (Story 6.8)
- Executar fluxo CPM → PERT renderizado (Story 4.1–4.4)
- Garantir que Modo Invertido não quebra nenhuma página existente (EP-02)

**Critérios esperados:**
- [ ] Fluxo completo de onboarding → primeiro triângulo: 0 crashes
- [ ] Após Story 6.1 (renomear rotas): rodar full suite — 0 links 404
- [ ] Visual regression: screenshot do CDT antes/depois de Story 1.2 (NVO) não regride
- [ ] Teste E2E de cross-tenant: PM_A não acessa projeto de PM_B

---

### @visual-designer (Pixel)
**Persona:** Identidade Visual, Design Tokens, UI Polish
**Domínio:** Figma, Tailwind tokens, sistemas de cor, tipografia

**Responsabilidades nesta análise:**
- Definir tokens de cor para zonas MATED (ÓTIMO=verde, SEGURO=azul, RISCO=laranja, CRISE=vermelho)
- Assinar design do IQBadge (Story 5.6), CalibrationBadge (Story 3.6), Badge Regime Obtuso (Story 2.2)
- Garantir que Modo Invertido tem identidade visual própria (não apenas inversão de eixos)
- Coordenar com @motion-designer para transição de modos

**Critérios esperados:**
- [ ] Tokens de cor definidos antes de @dataviz implementar qualquer badge
- [ ] Guia de estilo para badges: tamanho, cor por estado, tipografia
- [ ] Design do TM sombra (Story 2.11) aprovado antes de implementação
- [ ] Cores a11y: contraste mínimo 4.5:1 para todos os badges

---

### @motion-designer (Luna)
**Persona:** UX Premium, Motion Design
**Domínio:** Animações CSS/Framer Motion, transições de estado

**Responsabilidades nesta análise:**
- Animações de transição entre seções do pipeline (Story 6.7)
- Transição visual normal → Modo Invertido (EP-02 — deve ser percebida pelo PM)
- Animação do Gabinete de Crise Positiva ao detectar Remissão (Story 2.9)
- Pulse animation no CalibrationBadge na primeira transição para empírico (Story 3.6)

**Critérios esperados:**
- [ ] Transições de sidebar ≤ 300ms (não impactar performance percebida)
- [ ] Animação de Remissão é celebratória (verde, expansão) — não de alerta
- [ ] Modo Invertido tem transição visual reconhecível sem precisar ler tooltip
- [ ] `prefers-reduced-motion` respeitado em todos os componentes animados

---

### @daniboy
**Persona:** Data Engineer — Pipelines, Schema Avançado
**Domínio:** Supabase RPC, views, pipelines de dados, schema avançado

**Responsabilidades nesta análise:**
- Co-responsável com @data-engineer em: aura_setor_config (Story 3.3), calibration_events enriquecido (Story 3.1)
- Implementar views SQL para facilitar queries de calibração (soma, média, STDDEV por tenant/setor)
- Garantir que todas as queries de calibração usam índices (não full scan)
- Revisar schema de `progresso_tarefas` para suportar histórico temporal sem explosão de linhas

**Critérios esperados:**
- [ ] View `v_calibration_stats` (setor, n, avg_mated, stddev_mated) criada e indexada
- [ ] Queries de calibração com EXPLAIN ANALYZE mostrando uso de índice
- [ ] Schema `progresso_tarefas` suporta N registros por tarefa sem duplicar por dia

---

### @daniela
**Persona:** Data Analyst — Insights, Dashboards
**Domínio:** Análise de dados, KPIs, dashboards operacionais

**Responsabilidades nesta análise:**
- Validar que MATEDTimeline (Story 5.9) representa corretamente a série temporal
- Definir KPIs do dashboard de governança (não implementados ainda — EP-09)
- Garantir que SDO (Story 5.3) é interpretável como KPI gerencial

**Critérios esperados:**
- [ ] MATEDTimeline aprovada: 1 ponto por dia com progresso, JOIN correto com aditivos
- [ ] KPIs de governança documentados antes do EP-09 começar
- [ ] SDO breakdown (3 componentes) legível como dashboard para PM

---

### @clint
**Persona:** Data Scientist — Modelagem, Monte Carlo
**Domínio:** Estatística aplicada, modelagem preditiva, validação empírica

**Responsabilidades nesta análise:**
- Co-responsável com @roberta: Story 5.3 (SDO), Story 3.4 (σ), Story 3.8 (A/B test)
- Implementar `getSigmaForProject()` em `src/lib/calibration/sigma-manager.ts`
- Validar que intervalo de confiança do A/B test é adequado (n amostral Big Dig)
- Revisar componente trajetória do SDO (regressão linear de MATED)

**Critérios esperados:**
- [ ] A/B test com seed fixo e resultado determinístico
- [ ] Intervalo de confiança calculado — se overlap, não declarar vencedor automaticamente
- [ ] Regressão linear de MATED usa ≥3 pontos antes de computar trajetória
- [ ] `sigma-manager.ts` com cobertura de teste ≥ 90%

---

### @jordy
**Persona:** Prompt Engineering, PQR (Prompt Quality Rating)
**Domínio:** System prompts, few-shot examples, structured output, Groq/LLaMA

**Responsabilidades nesta análise:**
- Responsável por: todos os prompts de IA (Klauss), few-shot por setor (Story 7.7), structured output (Story 7.8)
- Auditar prompts atuais: `/api/ai/klauss`, `/api/ai/insight`, `/api/ai/cpm`
- Garantir truncação inteligente 4K tokens (Story 7.6) sem perder contexto crítico

**Critérios esperados:**
- [ ] PQR (Prompt Quality Rating) documentado para cada endpoint IA
- [ ] `klauss-to-mated` retorna JSON schema válido em 100% dos fixtures
- [ ] Few-shot examples por setor testados com 3 cenários cada
- [ ] Rate limiting não quebra continuidade da conversa (sessão preservada)

---

### @aura-analyst
**Persona:** Análise Quantitativa do Método
**Domínio:** Validação do MetodoAura, análise de consistência matemática

**Responsabilidades nesta análise:**
- Validar consistência entre MATED, SDO e IQ como KPIs complementares (não redundantes)
- Revisar Story 5.8 (MATED Causal) — metodologia de análise de sensibilidade
- Garantir que os 3 KPIs (MATED, IQ, SDO) são orthogonais em informação

**Critérios esperados:**
- [ ] Documento de consistência: MATED × IQ × SDO sem sobreposição informacional
- [ ] MATED Causal validado: top 3 tarefas explicam ≥60% do vetor em fixture Big Dig
- [ ] Nenhum KPI pode ser derivado trivialmente de outro (seria redundante)

---

### @aura-researcher
**Persona:** Agenda de Pesquisa, Publicações, Calibração
**Domínio:** Artigos acadêmicos, registros de originalidade, publicações Operations Research

**Responsabilidades nesta análise:**
- Manter documento de contribuições originais do MetodoAura (`Aura_Coordenadas_Dual_Triangulo_Obtuso...md`)
- Garantir que Story 3.2 (priors PMI/Flyvbjerg) tem rastreabilidade bibliográfica publicável
- Revisar `prior-sources.md` quanto à qualidade de citação acadêmica

**Critérios esperados:**
- [ ] 3 contribuições originais documentadas com claims formais (EP-02 pronto para publicação)
- [ ] `prior-sources.md`: citações no formato ABNT/APA com página, tabela e ano
- [ ] Proposta de artigo rascunhada antes do EP-03 ser marcado Done

---

### @kieza-research
**Persona:** Inteligência de Mercado, Validação Setorial
**Domínio:** Análise de mercado, setores-alvo, validação de proposta de valor

**Responsabilidades nesta análise:**
- Validar que os 4 setores escolhidos (construção, TI, infraestrutura, saúde) são os de maior valor para o Aura
- Fornecer dados de mercado para Story 3.2 (benchmark de projetos por setor)
- Mapear concorrentes que poderiam ter calibração similar

**Critérios esperados:**
- [ ] Relatório de mercado com TAM por setor antes do EP-03 começar
- [ ] Validação: os priors de Flyvbjerg/PMI são reconhecidos pelo mercado-alvo
- [ ] Lista de 5 concorrentes analisados quanto a calibração estatística de benchmarks

---

### @marta-marketing
**Persona:** Marketing B2B, Growth, Posicionamento
**Domínio:** Go-to-market, messaging, proposta de valor SaaS

**Responsabilidades nesta análise:**
- Garantir que "calibração Bayesiana" e "N projetos embasam esta régua" sejam comunicados corretamente
- Revisar: `docs/como-e-porque.md` para uso comercial com parceiros (Gênesis Empreendimentos)
- Validar que o Modo Invertido tem narrativa de mercado clara ("seu projeto nasceu em crise")

**Critérios esperados:**
- [ ] Messaging para cada KPI (MATED, IQ, SDO) em linguagem comercial
- [ ] `como-e-porque.md` revisado e aprovado para apresentação a parceiros
- [ ] Proposta de valor do Modo Invertido testada com 3 PMs externos

---

## RESUMO EXECUTIVO — ESTADO DO SISTEMA

```
┌─────────────────────────────────────────────────────────────────────┐
│ CAMADA 1 — MOTOR MATEMÁTICO                                          │
│ 21 funções implementadas | 18 a criar | 30 testes (precisam ~18 mais)│
│ Status: ⚠️ PARCIAL — NVO errado, σ hardcoded, OLS ainda default       │
├─────────────────────────────────────────────────────────────────────┤
│ CAMADA 2 — INFRAESTRUTURA                                            │
│ 10 tabelas | 0 CASCADE | 0 updated_at trigger | 4 tabelas faltando   │
│ Status: ⚠️ PARCIAL — RLS funciona, mas sem as 4 novas tabelas         │
├─────────────────────────────────────────────────────────────────────┤
│ CAMADA 3 — FEATURES                                                  │
│ 14 features ✅ | 9 features ⚠️ | 47 features 📋 (scoped, não impl.)   │
│ Status: ⚠️ BASE FUNCIONAL — execução, calibração e modos ausentes     │
└─────────────────────────────────────────────────────────────────────┘

ORDEM DE IMPLEMENTAÇÃO (prioridade máxima):
  1. DB: Story 8.1 (4 tabelas) → 8.2 → 8.3 → 8.4 → 8.5 → 8.11
  2. Motor: Story 1.2 (NVO) → 1.1 (CEt) → 1.13 (crashes) → 1.10–1.14 (bugs)
  3. Execução: Stories 5.1 → 5.2 → 5.4 → 5.5 → 5.6
  4. Calibração: Stories 3.1 → 3.2 → 3.3 → 3.4
  5. Features avançadas: EP-04 (PERT), EP-02 (Modo Invertido), EP-07 (Klauss)
```
