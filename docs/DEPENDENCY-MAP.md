# DEPENDENCY MAP — Aura TRIQ

**Generated:** 2026-04-04
**Purpose:** Trace which document feeds which decision/module and which engine file implements it.

**Legend:**
```
DOCUMENT --> feeds --> DECISION/MODULE --> implements --> ENGINE FILE
```

---

## 1. MATH (Motor Geometrico, CDT, CEt, Heron, Clairaut)

### FRAMEWORK-UNIVERSAL.md (D34-D43) — Nucleo Universal

```
FRAMEWORK-UNIVERSAL.md
  ├─ D34 (Fim do traslado visual)          ─── implements ──► math.ts (gerarTrianguloCDT)
  ├─ D35 (Convenção cartesiana L→R, B→T)   ─── implements ──► math.ts, triangle-logic.ts
  ├─ D36 (Triggers angulares por zona)      ─── implements ──► alertas.ts (verificarAlertas)
  ├─ D37 (Modal singularidade 85°)          ─── implements ──► guards.ts (G4 viabilidade)
  ├─ D39 (Supressão de eixos visuais)       ─── implements ──► (UI SVG — sem eixos grid)
  ├─ D40 (Swaps adaptativos α/β/γ)         ─── implements ──► ancoragem-guia.ts (calcularAncoragem)
  ├─ D41 (Ângulo reto posição natural)      ─── implements ──► clairaut.ts (sintetizarClairaut)
  ├─ D42 (Zona plástica [85°-105°])        ─── implements ──► guards.ts, crisis.ts
  └─ D43 (Pecado Origem / Baseline block)   ─── implements ──► crisis.ts, zones.ts
```

### SPRINT-MEMORY.md §11-14 — Calibração CDT Canonica

```
SPRINT-MEMORY.md §11
  ├─ Denominador Prazo (CC baseline)        ─── implements ──► math.ts (normalizeAnchor), execution.ts
  ├─ Denominador Custo (BAC operacional)    ─── implements ──► math.ts (normalizeAnchor)
  ├─ Sistema 5 zonas (Verde/Amarela/Vermelha/Cinza/Nula) ─► zones.ts (classificarCandidatoCEt)
  ├─ Hierarquia 3 modos (Rápido/Painel/Decisão)          ─► (UI Dashboard layers)
  ├─ Velocidade de degradação d(NVO)/dt     ─── implements ──► execution.ts (calcularVelocidadeDegradacao)
  └─ Assimetria Prazo x Custo               ─── implements ──► zones.ts

SPRINT-MEMORY.md §12
  ├─ D-ARCH-1 (duracao_acumulada real)      ─── implements ──► execution.ts
  ├─ D-ARCH-2 (Separação TA vs TM)         ─── implements ──► pipeline-dual.ts (executarPipelineDual)
  ├─ Defaults contingência por setor        ─── implements ──► bayesian.ts, zones.ts
  └─ Fluxo PERT/CPM 3 caminhos             ─── implements ──► cpm.ts (calculateCPMLocal)

SPRINT-MEMORY.md §2
  ├─ Curva S cúbica y=C(3t²-2t³)           ─── implements ──► math.ts
  ├─ Reta Tendência Pico (Regressão Ponderada) ── implements ► math.ts
  ├─ Vetores de intensidade (E=1.0 âncora)  ─── implements ──► math.ts (normalizeAnchor)
  ├─ Limites de descarte CEt                ─── implements ──► crisis.ts (checkCETDupla)
  ├─ Zonas MATED (ÓTIMO/SEGURO/RISCO/CRISE)─── implements ──► alertas.ts, zones.ts
  └─ NVO = baricentro órtico / incentro     ─── implements ──► triangle-logic.ts, nvo-ponderado.ts
```

### MASTERPLAN-X.md — CDT v3/v4

```
MASTERPLAN-X.md
  ├─ Sprint 1: Reta-Mestra Regressão Múltipla ── implements ► math.ts (coeficientes regressão)
  ├─ Sprint 1: Área real sob curva (Integral)   ── implements ► math.ts (ZII)
  ├─ Sprint 1: Adaptação CEt obtusângulos       ── implements ► crisis.ts, clairaut.ts
  ├─ Sprint 2: Hierarquia 3 níveis dashboard    ── implements ► (UI: Executive/Managerial/Technical)
  ├─ Sprint 2: Tradução Tooltips MATED          ── implements ► traducao.ts (traduzirCDT), mapper.ts
  ├─ Sprint 3: Triggers Supabase (Área Baseline)── implements ► (Supabase migrations)
  └─ Sprint 4: TDD Big Dig + Horizonte          ── implements ► big-dig-simulation.test.ts, math.test.ts
```

### TRIQ-JORNADA.md — Evolucao CDT v1→v4

```
TRIQ-JORNADA.md
  ├─ Fase 2: CEt Dupla (pré + pós)             ─── implements ──► crisis.ts (checkCETDupla)
  ├─ Fase 2: Tangente pontual (não OLS global)  ─── implements ──► math.ts
  ├─ Fase 2: Área como KPI primário             ─── implements ──► math.ts (areaTri)
  ├─ Fase 3: Protocolos α/β/γ (Clairaut)       ─── implements ──► clairaut.ts (sintetizarClairaut)
  ├─ Fase 3: Manômetros angulares SVG           ─── implements ──► (UI gauge components)
  ├─ Fase 4: CDT v3 C=sqrt(1+mc²)              ─── implements ──► math.ts
  ├─ Fase 5: CDT v4 espaço geométrico comum    ─── implements ──► math.ts, pipeline-dual.ts
  ├─ Fase 5: Controle bidirecional (cinem. inversa) ── implements ► compensacao-bidirecional.ts
  ├─ Fase 6: Âncora Semântica (Opção 4)        ─── implements ──► ancora-semantica.ts
  └─ Fase 6: Pipeline Dual TM/TA               ─── implements ──► pipeline-dual.ts
```

### GEOMETRIA-SIERPINSKI.md — Malha Fractal

```
GEOMETRIA-SIERPINSKI.md
  ├─ Regra de crescimento (N=2^nível)       ─── implements ──► sierpinski.ts (sierpinskiLayout)
  ├─ Triângulos invertidos = TBZ             ─── implements ──► fractals.ts, sierpinski.ts
  ├─ Restrição Acordeão (compressão)         ─── implements ──► fractals.ts, sanfona.ts
  └─ Backward Pass fractal → CEt cascata     ─── implements ──► crisis.ts, fractals.ts
```

### ACADEMIC-THESIS-TRIQ.md — Formalização Acadêmica

```
ACADEMIC-THESIS-TRIQ.md
  ├─ §3: Escopo como constante (E=1.0 âncora) ── implements ► math.ts (normalizeAnchor)
  ├─ §4.1: Integrais A_C, A_P                  ── implements ► math.ts (área sob curva)
  ├─ §4.2: Suavização por múltiplas derivadas   ── implements ► math.ts (regressão piecewise)
  ├─ §4.3: ZII (Zona Intersecção Integral)      ── implements ► math.ts, zones.ts
  ├─ §5: Topologia MATED + Clairaut             ── implements ► clairaut.ts, euclidian.ts
  └─ §6: Big Dig + Horizonte como fixtures       ── implements ► big-dig-simulation.test.ts
```

---

## 2. CCPM (Critical Chain, Buffers, Fractais)

### FRAMEWORK-TECH.md (D1-D33) — Extensão CCPM

```
FRAMEWORK-TECH.md
  ├─ D1 (Corte estimativa O+S)              ─── implements ──► ccpm.ts (cortarEstimativa)
  ├─ D2 (Buffer RSS √Σsi²)                  ─── implements ──► buffer.ts (calcularProjectBuffer)
  ├─ D3/D4 (Magic Link + Klauss Push 48h)   ─── implements ──► api/estimativas/, contributor.ts
  ├─ D5 (Burndown P(t) bifurcado)           ─── implements ──► math.ts (reta burndown bifurcada)
  ├─ D6 (Cost Buffer RSS)                    ─── implements ──► buffer.ts (calcularCostBuffer)
  ├─ D7 (Sprint Triangles + TBZ)            ─── implements ──► fractals.ts, sierpinski.ts
  ├─ D8 (Crashing como aporte multiplicador) ── implements ──► decision.ts
  ├─ D9 (Contributors sequenciais na CC)     ── implements ──► ccpm.ts (nivelarRecursos)
  ├─ D10 (Fever Chart geométrico 2D)         ── implements ──► fever-chart.ts (buildFeverPoint)
  ├─ D12 (Heron sem média — global = CDT)    ── implements ──► math.ts (areaTri), fractals.ts
  ├─ D13 (CEt hierárquica 3 etapas)          ── implements ──► crisis.ts (checkCETDupla)
  ├─ D14 (CEt como limitador de buffer) ★    ── implements ──► buffer.ts, crisis.ts
  ├─ D15 (Propagação falha: CC=global, feeding=local) ── implements ► castle.ts, fractals.ts
  ├─ D19 (Fórmula N + Brooks 1.2×)          ─── implements ──► contributor.ts (calcularFormulaN)
  ├─ D21 (3 camadas backend)                 ── implements ──► decision.ts (3-tier)
  ├─ D25 (TBZ algorítmico)                   ── implements ──► sierpinski.ts, fractals.ts
  ├─ D29 (Fever Chart 4 zonas)               ── implements ──► fever-chart.ts
  ├─ D30 (Ghost TM fractal)                  ── implements ──► fractals.ts (buildSprintTriangle)
  ├─ D31 (Castelo de Cartas e^(-λk))        ── implements ──► castle.ts (propagarImpacto)
  ├─ D32 (Sanfona setup vs dashboard)        ── implements ──► sanfona.ts
  └─ D33 (Klauss Causal narrativas)          ── implements ──► api/ai/klauss/route.ts
```

### tutorial.log — 38 Decisões da Sessão Squad

```
tutorial.log
  ├─ Decisão 1 (Corte Goldratt 50%)         ─── implements ──► ccpm.ts (cortarEstimativa)
  ├─ Decisão 2 (Buffer RSS projeto)          ─── implements ──► buffer.ts (calcularProjectBuffer)
  ├─ Decisão 3 (Tradução ponto no diagrama)  ─── implements ──► mapper.ts (toProjectValues)
  ├─ Decisão 5 (Sobras e redistribuição)     ─── implements ──► fractals.ts, decision.ts
  ├─ Decisão 7/25 (SDO ponderado por sprint) ─── implements ──► sdo.ts (calcularSDO)
  ├─ Decisão 11 (CEt dinâmica escopo mutável)─── implements ──► crisis.ts
  ├─ Decisão 13 (NVO baricentro ponderado)   ─── implements ──► nvo-ponderado.ts
  ├─ Decisão 14 (MATED composto)             ─── implements ──► math.ts (calcularMATED)
  ├─ Decisão 16 (Amortecimento baricentros)  ─── implements ──► fractals.ts
  ├─ Decisão 17/18 (Calendário horas/dias)   ─── implements ──► (configuração projeto)
  ├─ Decisão 19 (Klauss narração contínua)   ─── implements ──► api/ai/klauss/route.ts
  ├─ Decisão 21 (Normalização fractal regra 3)── implements ──► fractals.ts (buildSprintTriangle)
  ├─ Decisão 23 (Clairaut completo/simplificado) ── implements ► clairaut-fractals.ts
  ├─ Decisão 24 (5 zonas Fever + Azul)       ─── implements ──► fever-chart.ts
  ├─ Decisão 28/29 (Atenuação exponencial)   ─── implements ──► castle.ts (e^(-0.3k))
  ├─ Decisão 29 ext. (Prevenção protocolo não-α) ── implements ► clairaut-fractals.ts
  ├─ Decisão 30/31 (Compressão visual acordeão) ── implements ► sanfona.ts, fractals.ts
  └─ Pipeline 36 passos (fluxo completo)     ─── implements ──► (orquestração: pipeline-dual.ts)
```

---

## 3. UI (Dashboard, Navegação, Componentes Visuais)

### SPRINT-MEMORY.md §1 — Navegação

```
SPRINT-MEMORY.md §1
  ├─ Sidebar SETUP/MOTOR/GOVERNANÇA          ─── implements ──► src/app/ (rotas Next.js)
  ├─ Renomeação CDT→TM, EAP→WBS, CPM→Tarefas ── implements ► (rotas /wbs, /tarefas-diagramas, /triangulo-matriz)
  └─ Administração fora da sidebar (header)   ── implements ──► (layout component)
```

### SPRINT-MEMORY.md §3-4 — Diagramas

```
SPRINT-MEMORY.md §3
  ├─ PERT auto-cálculo + Sugiyama layout     ─── implements ──► sugiyama.ts, cpm.ts
  ├─ Nodes PERT (ID + duração, 8px radius)   ─── implements ──► (PERT UI component)
  ├─ Caminho crítico vermelho #ef4444         ── implements ──► (PERT UI)
  └─ Gantt Lupa (hover ±15%)                 ─── implements ──► (GanttLupa UI component)

SPRINT-MEMORY.md §4
  ├─ Caixa de Ferramentas (Gerenciamento)    ─── implements ──► math-tools.ts
  └─ Ferramentas Gabinete de Crise           ─── implements ──► math-tools.ts, alertas.ts
```

### MASTERPLAN-X.md Sprint 2 — Carga Cognitiva

```
MASTERPLAN-X.md Sprint 2
  ├─ Executive Level (Semáforo)              ─── implements ──► regime-badge.ts, (UI header badge)
  ├─ Managerial Level (CDT Dashboard)        ── implements ──► (Triangle component)
  └─ Technical Level (Drill-Down Clairaut)   ── implements ──► (Fractal drill-down component)
```

### FRAMEWORK-TECH.md (D32) — Sanfona

```
FRAMEWORK-TECH.md D32
  └─ Sanfona UI (tracejado base vs sólido execução) ── implements ► sanfona.ts, (SanfonaUI component)
```

### relatorio1.log — Gaps de UI

```
relatorio1.log
  ├─ Gap #1: Sierpinski Visual Component     ─── implements ──► sierpinski.ts (engine), (UI a criar)
  ├─ Dashboard 6→3 camadas                   ─── implements ──► (refactor UI)
  └─ Webhook Slack Outbound                  ─── implements ──► (api/webhooks/ a criar)
```

---

## 4. GOVERNANCE (SDO, Zonas, Processo SDC)

### TRIQ-SDC-CHARTER.md — Processo de Desenvolvimento

```
TRIQ-SDC-CHARTER.md
  ├─ Pipeline SDC 7 fases                    ─── implements ──► (processo, não código)
  ├─ Matriz agentes × épicos                 ─── implements ──► (processo)
  ├─ QA Gate 7 checks (typecheck/vitest/lint/BigDig) ── implements ► (CI/CD GitHub Actions)
  └─ DoD global cross-épico                  ─── implements ──► (processo)
```

### TRIQ-6.1-PRD.md — 59 Decisões do Produto

```
TRIQ-6.1-PRD.md
  ├─ RF-01 Motor Geométrico
  │   ├─ E19 (CEt dupla)                    ─── implements ──► crisis.ts (checkCETDupla)
  │   ├─ E18 (NVO hierárquico)              ─── implements ──► triangle-logic.ts, nvo-ponderado.ts
  │   ├─ M1 (Lado E dinâmico)               ─── implements ──► math.ts
  │   └─ P1-INSIGHTS (Burndown CPM)         ─── implements ──► cpm.ts, math.ts
  ├─ RF-02 Coordenadas Dual
  │   ├─ E20 (Badge Regime Obtuso)           ─── implements ──► regime-badge.ts
  │   ├─ E23 (Modo Invertido ativo)          ─── implements ──► modo-invertido.ts
  │   ├─ E24 (Evento Remissão)              ─── implements ──► transicao-evento.ts
  │   └─ E25 (Gabinete Crise Positiva)      ─── implements ──► alertas.ts
  ├─ RF-03 Calibração Bayesiana
  │   ├─ E1/E4 (Priors importados setor)    ─── implements ──► bayesian.ts (priors Standish)
  │   ├─ E11 (Fator regressão por setor)    ─── implements ──► math.ts (fator_atividade)
  │   ├─ E17 (σ Monte Carlo por setor)      ─── implements ──► fever-chart.ts (simularMonteCarlo)
  │   └─ E8 (Tabela calibration_events)     ─── implements ──► (Supabase migration)
  ├─ RF-04 Diagramas
  │   ├─ S1/S2 (PERT Sugiyama + CPM auto)   ─── implements ──► sugiyama.ts, cpm.ts
  │   ├─ S3 (Empate caminho crítico)         ── implements ──► cpm.ts (findAllCriticalPaths)
  │   └─ S4 (Gantt Lupa ±15%)               ── implements ──► (GanttLupa UI)
  ├─ RF-05 Execução e SDO
  │   ├─ E2/E3 (SDO 40%+35%+25%)            ── implements ──► sdo.ts (calcularSDO)
  │   ├─ S6 (TM versionado)                  ── implements ──► (DB: triangulo_matriz_versoes)
  │   └─ S7 (Alerta desvio >5%)              ── implements ──► alertas.ts
  ├─ RF-06 Navegação
  │   ├─ D1-D7 PRD (Sidebar 3 seções)        ── implements ──► (Next.js routes)
  │   └─ D2-D4 PRD (Rotas /wbs, /tarefas-diagramas, /triangulo-matriz) ── (routes)
  ├─ RF-07 IA Klauss
  │   ├─ K3 (Rota dica-metodo-prazo)         ── implements ──► api/ai/
  │   └─ D10 PRD (Klauss sugere ferramenta)  ── implements ──► api/ai/klauss/route.ts
  └─ RF-08 Infraestrutura
      └─ CI/CD lint+typecheck+vitest          ── implements ──► .github/workflows/
```

### como-e-porque.md (P01-P09) — Fundamentações

```
como-e-porque.md
  ├─ P01 (Triângulo como objeto geométrico)  ─── implements ──► math.ts (Heron, Lei Cossenos)
  ├─ P02 (TM = Baseline + Hist. Pecados)     ── implements ──► pipeline-dual.ts
  ├─ P03 (MATED = distância ao NVO)           ── implements ──► math.ts (calcularMATED), euclidian.ts
  ├─ P04 (Zonas MATED Bayesianas)             ── implements ──► bayesian.ts, zones.ts
  ├─ P05 (Fator regressão por setor)          ── implements ──► math.ts (fator_atividade)
  ├─ P06 (SDO algorítmico)                    ── implements ──► sdo.ts (calcularSDO)
  ├─ P07 (σ Monte Carlo por setor)            ── implements ──► fever-chart.ts
  ├─ P08 (Estratégia Bayesiana 3 fases)       ── implements ──► bayesian.ts (predictNext)
  └─ P09 (Parceiro Gênesis para piloto)       ── implements ──► (processo, não código)
```

---

## 5. AI (Klauss, Monte Carlo, Bayesian)

### FRAMEWORK-TECH.md (D33) — Klauss Causal

```
FRAMEWORK-TECH.md D33
  └─ Klauss Causal (narrativas por zona)     ─── implements ──► api/ai/klauss/route.ts
```

### SPRINT-MEMORY.md §6 — Endpoint Klauss

```
SPRINT-MEMORY.md §6
  └─ POST /api/ai/klauss-to-mated            ─── implements ──► api/ai/klauss-to-mated/ (a criar)
```

### tutorial.log — Pipeline Bayesiano/Monte Carlo

```
tutorial.log (Decisões AI)
  ├─ Priors Standish CHAOS por setor         ─── implements ──► bayesian.ts (SECTOR_PRIORS)
  ├─ Bayesian conjugado normal               ─── implements ──► bayesian.ts (bayesianUpdate)
  ├─ Hierarquia predição 3 tiers             ─── implements ──► bayesian.ts (predictNext)
  ├─ Monte Carlo Box-Muller assimétrico 1.5× ── implements ──► fever-chart.ts (simularMonteCarlo)
  └─ Capital Intelectual (memória Klauss)    ── implements ──► sdo.ts + bayesian.ts
```

### relatorio1.log — Klauss Status

```
relatorio1.log (Klauss)
  ├─ System Prompt v4.0 (CCPM, Fever, Castle, EVM)  ── api/ai/klauss/route.ts
  ├─ RAG: últimas 5 decisões MATED injetadas         ── api/ai/klauss/route.ts
  ├─ Few-shot: Healthcare.gov, Banking, Fintech      ── api/ai/klauss/route.ts
  └─ Gaps: Slack outbound, proatividade, tom          ── (a implementar)
```

---

## CROSS-REFERENCE: Engine Files ← Feeding Documents

| Engine File | Primary Documents |
|---|---|
| `math.ts` | SPRINT-MEMORY §2/§11, MASTERPLAN-X, TRIQ-JORNADA, ACADEMIC-THESIS, como-e-porque P01 |
| `clairaut.ts` | FRAMEWORK-UNIVERSAL D40-D41, TRIQ-JORNADA Fase 3, tutorial.log |
| `crisis.ts` | FRAMEWORK-UNIVERSAL D42-D43, SPRINT-MEMORY §11, TRIQ-6.1-PRD E19, FRAMEWORK-TECH D13-D14 |
| `buffer.ts` | FRAMEWORK-TECH D2/D6/D14, tutorial.log Dec.2, GEOMETRIA-SIERPINSKI |
| `ccpm.ts` | FRAMEWORK-TECH D1/D9, tutorial.log Dec.1 |
| `fractals.ts` | GEOMETRIA-SIERPINSKI, FRAMEWORK-TECH D7/D12/D30, tutorial.log Dec.21 |
| `sierpinski.ts` | GEOMETRIA-SIERPINSKI, FRAMEWORK-TECH D25, relatorio1.log |
| `castle.ts` | FRAMEWORK-TECH D31, tutorial.log Dec.28/29 |
| `fever-chart.ts` | FRAMEWORK-TECH D10/D29, tutorial.log Dec.24, TRIQ-6.1-PRD E17 |
| `sdo.ts` | como-e-porque P06, TRIQ-6.1-PRD E2/E3, tutorial.log Dec.7/25 |
| `bayesian.ts` | como-e-porque P04/P08, TRIQ-6.1-PRD E1/E4/E5, relatorio1.log Roberta |
| `zones.ts` | SPRINT-MEMORY §11, FRAMEWORK-UNIVERSAL D43, tutorial.log |
| `pipeline-dual.ts` | TRIQ-JORNADA Fase 6, SPRINT-MEMORY §12 D-ARCH-2 |
| `contributor.ts` | FRAMEWORK-TECH D19, tutorial.log |
| `sanfona.ts` | FRAMEWORK-TECH D32, tutorial.log Dec.30/31 |
| `nvo-ponderado.ts` | SPRINT-MEMORY §2, tutorial.log Dec.13 |
| `mapper.ts` | tutorial.log Dec.3 |
| `sugiyama.ts` | SPRINT-MEMORY §3, TRIQ-6.1-PRD S1/S2 |
| `ancoragem-guia.ts` | FRAMEWORK-UNIVERSAL D40, TRIQ-JORNADA Fase 3 |
| `ancora-semantica.ts` | TRIQ-JORNADA Fase 6 |
| `modo-invertido.ts` | TRIQ-6.1-PRD E23, TRIQ-JORNADA |
| `transicao-evento.ts` | TRIQ-6.1-PRD E24/E25 |
| `regime-badge.ts` | TRIQ-6.1-PRD E20 |
| `causal-analysis.ts` | tutorial.log, FRAMEWORK-TECH D33 |
| `cpm.ts` | SPRINT-MEMORY §3, TRIQ-6.1-PRD S1, tutorial.log Fase 2 |
| `decision.ts` | FRAMEWORK-TECH D8/D21 |
| `alertas.ts` | SPRINT-MEMORY §11, TRIQ-6.1-PRD S7 |
| `math-tools.ts` | SPRINT-MEMORY §4 (Caixa de Ferramentas) |
| `guards.ts` | FRAMEWORK-UNIVERSAL D37/D42, tutorial.log (5 guards) |
| `traducao.ts` | MASTERPLAN-X Sprint 2, tutorial.log |
| `execution.ts` | SPRINT-MEMORY §11/§12, TRIQ-6.1-PRD RF-05 |
| `compensacao-bidirecional.ts` | TRIQ-JORNADA Fase 5 (cinematica inversa) |
| `api/ai/klauss/route.ts` | FRAMEWORK-TECH D33, SPRINT-MEMORY §6, relatorio1.log, tutorial.log Dec.19 |

---

*Generated from 12 source documents. All paths relative to `src/lib/engine/` unless noted.*
