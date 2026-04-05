# UI-SPEC — 3 Telas Core do Aura TRIQ

**Generated:** 2026-04-04
**Source:** 38 decisoes da sessao squad (tutorial.log) + FRAMEWORK-TECH D1-D33 + MASTERPLAN-X + relatorio1.log
**Design Principle:** Reducao extrema de carga cognitiva (MASTERPLAN-X Sprint 2). O CEO bate o olho e sabe se a sprint quebra a empresa em 5 segundos.

---

## Tela 1: Portfolio (Home)

### O que e

Lista de projetos do tenant, rankeados por impacto (MATED score), nao por data de criacao. O Portfolio e a visao Executive Level (Semaforo) do MASTERPLAN-X: verde/amarelo/vermelho/preto em um relance.

### Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  AURA TRIQ                              [Avatar ▼] [+Novo]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Projetos (ordenados por MATED — maior risco primeiro)       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ● VERMELHO  Projeto Alpha        MATED 0.32 (CRISE)   │  │
│  │ Fever: ██████████░░ 78% buffer    IQ: 67%              │  │
│  │ Klauss: "Sprint 3 vai estourar sexta. Castle ativo."   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ● AMARELO   Projeto Beta          MATED 0.12 (SEGURO) │  │
│  │ Fever: ████░░░░░░░░ 38% buffer    IQ: 91%              │  │
│  │ Klauss: "Custo acima da media. Monitorar Sprint 2."    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ● VERDE     Projeto Gamma         MATED 0.03 (OTIMO)  │  │
│  │ Fever: ██░░░░░░░░░░ 15% buffer    IQ: 98%              │  │
│  │ Klauss: "Execucao dentro do esperado. Buffer intacto." │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ○ AZUL      Projeto Delta         MATED 0.01 (REMISS) │  │
│  │ Fever: ░░░░░░░░░░░░  0% buffer    IQ: 105%             │  │
│  │ Klauss: "Remissao ativa. Devolveu 3 dias de buffer."   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Dados por Card

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Nome do projeto | `projetos.nome` (Supabase) | -- |
| MATED score | Distancia euclidiana ao NVO | `math.ts → calcularMATED()` |
| Zona MATED (OTIMO/SEGURO/RISCO/CRISE) | Classificacao por faixas 0.05/0.15/0.30 | `alertas.ts → classificarZonaDesvio()` |
| Cor do indicador | Fever zone do projeto global | `fever-chart.ts → determinarFeverZone()` |
| Buffer consumido % | Atraso acumulado / buffer total | `buffer.ts → determinarFeverZone()` |
| IQ (Indice de Qualidade) | area_TA / area_TM x 100% | `math.ts → areaTri()` |
| Klauss 1-phrase | Resumo narrativo por zona | `api/ai/klauss/route.ts` |

### Comportamento

- **Ordenacao:** Projetos rankeados por MATED score DESCENDENTE (maior risco no topo). Nao por data.
- **Cores das Fever zones:**
  - Azul (#3b82f6) — buffer < 0% (remissao)
  - Verde (#22c55e) — 0-33% buffer consumido
  - Amarelo (#eab308) — 33-66% buffer consumido
  - Vermelho (#ef4444) — 66-100% buffer consumido
  - Preto (#171717) — buffer > 100% (esgotado)
- **Click no card:** Navega para Tela 2 (Board de Controle Sierpinski) do projeto.
- **Klauss summary:** Gerado via `POST /api/ai/klauss` com context do ultimo estado. Cache de 5min.
- **Badge IQ:** Mostra area_TA/area_TM como percentual. Se > 100% = projeto expandiu. Se < 95% = comprimido.

### Componentes Necessarios

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `ProjectCard` | Client Component | Renderiza card com cor, MATED, IQ, Klauss phrase |
| `PortfolioList` | Server Component | Fetch projetos + sort por MATED desc |
| `FeverBadge` | Presentational | Barra de progresso colorida do buffer |
| `MATEDIndicator` | Presentational | Circulo colorido + texto da zona |
| `KlaussSummary` | Client Component | Fetch resumo Klauss com cache SWR |

---

## Tela 2: Board de Controle (Sierpinski)

### O que e

Malha Sierpinski com os Sprint Triangles do projeto. E o Managerial Level do MASTERPLAN-X. O PM ve o projeto inteiro como uma estrutura fractal onde cada triangulo e um sprint, colorido pela fever zone, com TBZ (buffers de transicao) em cinza tracejado.

### Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  ← Portfolio    Projeto Alpha    [Fever: ██████78%] [IQ:67%] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MALHA SIERPINSKI (nivel 2 = 4 sprints)                      │
│                                                              │
│                        /\                                    │
│                       /  \       ← TM (sombra ghost cinza)   │
│                      / TM \                                  │
│                     /______\                                 │
│                    /\  TBZ /\                                │
│                   /  \----/  \   ← TBZ cinza tracejado       │
│                  / S3 \  / S4 \                              │
│                 / VRM  \/ AMR  \                              │
│                /________________\                            │
│               /\  TBZ /\  TBZ /\                            │
│              /  \----/  \----/  \                            │
│             / S1  \  /S2  \  / -- \  ← reserva tracejada     │
│            / VERDE \/ AMAR \/      \                         │
│           /________________________\                         │
│                                                              │
│  Legenda:                                                    │
│  ■ Azul (remissao)  ■ Verde  ■ Amarelo  ■ Vermelho  ■ Preto │
│  --- TBZ (buffer transicao)  ... Reserva (nao alocado)       │
│                                                              │
│  Click em sprint → abre Sanfona (Tela 3) ↓                  │
│                                                              │
│  ┌─ SANFONA SPRINT 3 (expandida) ──────────────────────────┐ │
│  │  Fever Chart   │  MATED Decomp  │  Klauss Narrativa     │ │
│  │  [grafico]     │  [tabela]      │  "Sprint 3 consome..." │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Dados da Malha

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Layout Sierpinski (posicoes) | N sprints → nivel = ceil(log2(N)) | `sierpinski.ts → sierpinskiLayout()` |
| Sprint Triangle (lados E', P', C') | Normalizacao proporcional | `fractals.ts → buildSprintTriangle()` |
| Cor do sprint | Fever zone individual | `fever-chart.ts → determinarFeverZone()` |
| TBZ (triangulos invertidos) | Slots ↓ na malha | `sierpinski.ts` |
| Ghost TM (sombra) | TM baseline imutavel | `pipeline-dual.ts → executarPipelineDual()` |
| CEt por sprint | Validacao existencia | `crisis.ts → checkCDTExistence()` |
| Colinearidade | Alinhamento fractal ao TM | `fractals.ts → verificarColinearidade()` |

### Comportamento da Malha

1. **Cor = Fever Zone por sprint:**
   - Azul (#3b82f6) — sprint com sobra de buffer (remissao, D28)
   - Verde (#22c55e) — buffer 0-33%
   - Amarelo (#eab308) — buffer 33-66%
   - Vermelho (#ef4444) — buffer 66-100%
   - Preto (#171717) — buffer esgotado

2. **TBZ Visual:** Triangulos invertidos (↓) em cinza (#9ca3af) com borda tracejada (`stroke-dasharray: 5,5`). Representam buffers de transicao entre sprints (handoff). Nao possuem classificacao Clairaut.

3. **Acordeao (Compressao):** Sprints que consomem mais buffer ENCOLHEM horizontalmente:
   ```
   largura_sprint = E'_si × (1 - buffer_sprint_pct / 100)
   ```
   Implementado em `sanfona.ts`. O efeito visual e de um acordeao se fechando.

4. **Ghost TM:** O TM baseline e exibido como sombra semitransparente (opacity: 0.15) por tras da malha ativa (TA). Permite comparacao visual instantanea TM vs TA (D30).

5. **Click em sprint:** Abre a Sanfona (Tela 3) abaixo da malha como accordion expandivel. Apenas 1 sprint aberto por vez.

6. **CEt Falha:** Se a CEt de um sprint violar:
   - Sprint na Cadeia Critica → BORDA PRETA GROSSA + alerta global "TM INVALIDO" (D15)
   - Sprint fora da CC → BORDA LARANJA + alerta local (apenas fractal invalido)

7. **Reserva:** Slots ↑ nao preenchidos aparecem com borda tracejada e fundo transparente.

### Componentes Necessarios

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `SierpinskiMesh` | Client Component (SVG) | Renderiza malha completa: sprints + TBZ + ghost |
| `SprintTriangle` | Presentational (SVG) | Triangulo individual com cor, borda, label |
| `TBZTriangle` | Presentational (SVG) | Triangulo invertido tracejado cinza |
| `GhostTM` | Presentational (SVG) | Sombra do TM baseline (opacity 0.15) |
| `AccordionEffect` | Client Component | Calcula compressao horizontal por buffer% |
| `FeverHeader` | Presentational | Barra de fever global + IQ no header |
| `SprintAccordion` | Client Component | Container expandivel que hospeda Tela 3 |

---

## Tela 3: Drill-Down Fractal (Sanfona)

### O que e

O Technical Level do MASTERPLAN-X. Abre como accordion abaixo do sprint clicado na malha Sierpinski. Mostra o Fever Chart detalhado, a decomposicao MATED, a narrativa Klauss, e as curvas de prazo/custo em modo read-only. E CONSULTA, nao manipulacao (nao e "manche de aviao" — D3 do tutorial.log).

### Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  SANFONA — Sprint 3 (Vermelho, 78% buffer)                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ ABA 1: FEVER CHART DETALHADO ────────────────────────┐  │
│  │                                                        │  │
│  │  Buffer %                                              │  │
│  │  100 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ PRETO ─ ─ ─ ─ ─ ─ ─   │  │
│  │   66 ────────────────────── VERMELHO ──────────        │  │
│  │        ·····*                                          │  │
│  │   33 ────── · ── AMARELO ──────────────────────        │  │
│  │      ····   ·                                          │  │
│  │    0 ─ VERDE── ──────────────────────────────          │  │
│  │      Conclusao %  ─────────→  100%                     │  │
│  │                                                        │  │
│  │  * = posicao atual    ··· = trajetoria real             │  │
│  │  ~~~ = Monte Carlo P50 (cinza)   --- P80 (cinza claro) │  │
│  │                                                        │  │
│  │  Monte Carlo:                                          │  │
│  │   P50: 82% buffer ao fim   P80: 94%   IC90: [71-98%]  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ ABA 2: MATED DECOMPOSICAO ───────────────────────────┐  │
│  │                                                        │  │
│  │  MATED Sprint 3: 0.18 (RISCO)                         │  │
│  │                                                        │  │
│  │  Tarefa           │ Contrib. │ % do MATED │ Status     │  │
│  │  ──────────────────┼──────────┼────────────┼────────── │  │
│  │  T12 - Backend API │   0.09  │   50%      │ Atrasada   │  │
│  │  T14 - Testes E2E  │   0.05  │   28%      │ Em risco   │  │
│  │  T15 - Deploy      │   0.04  │   22%      │ Pendente   │  │
│  │                                                        │  │
│  │  Castle: impacto propaga 74% para Sprint 4 (k=1)      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ ABA 3: KLAUSS NARRATIVA ─────────────────────────────┐  │
│  │                                                        │  │
│  │  "Sprint 3 vai estourar sexta-feira. A tarefa T12      │  │
│  │   (Backend API) e o gargalo — 50% do MATED vem dela.   │  │
│  │   Se nao agir, o Castle propaga R$ 8.200 de impacto    │  │
│  │   para Sprint 4. Sugestao: realocar Dev Y de T15       │  │
│  │   para T12 (Formula N recomenda +1 recurso)."          │  │
│  │                                                        │  │
│  │  Protocolo: Alpha (agudo)   IR: 0.42   α: 52°         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ ABA 4: CURVAS PRAZO/CUSTO (read-only) ───────────────┐  │
│  │                                                        │  │
│  │  Custo C(t)              Prazo P(t)                    │  │
│  │  ┌────────────┐          ┌────────────┐                │  │
│  │  │  --- Setup  │          │  --- Setup  │               │  │
│  │  │  ─── Real   │          │  ─── Real   │               │  │
│  │  │  Curva S    │          │  Burndown   │               │  │
│  │  │  acumulada  │          │  bifurcado  │               │  │
│  │  └────────────┘          └────────────┘                │  │
│  │                                                        │  │
│  │  Setup = tracejado imutavel (baseline dia 0)           │  │
│  │  Real  = solido continuo (execucao viva)               │  │
│  │  ★ Somente consulta — nao manipula valores             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ ABA 5: PONTO NO TRIANGULO (consulta) ────────────────┐  │
│  │                                                        │  │
│  │     /\                                                 │  │
│  │    / ·\ ← ponto de operacao atual                      │  │
│  │   / ZRE\                                               │  │
│  │  /______\                                              │  │
│  │                                                        │  │
│  │  Hover no ponto:                                       │  │
│  │  "Este ponto = 1.4h/h de atraso + R$ 400 de gasto     │  │
│  │   extra. Se mantiver ritmo, sprint fecha 3 dias depois."│  │
│  │                                                        │  │
│  │  ★ Nao e manipulacao. E informacao pura.               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Dados por Aba

#### Aba 1: Fever Chart Detalhado

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Trajetoria real (pontos historicos) | Historico de buffer consumption | `fever-chart.ts → buildFeverPoint()` |
| Zonas (azul/verde/amarelo/vermelho/preto) | Faixas fixas 0/33/66/100% | `fever-chart.ts → determinarFeverZone()` |
| Monte Carlo P50/P80/IC90 | Projecao estocastica Box-Muller | `fever-chart.ts → simularMonteCarlo()` |
| % conclusao do sprint | Tarefas concluidas / total | `progresso_tarefas` (DB) |
| Pins historicos | Decisoes que alteraram cronograma | `decisoes_mated` (DB) |

#### Aba 2: MATED Decomposicao

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| MATED do sprint | Distancia baricentro sprint ao NVO | `math.ts → calcularMATED()` |
| Decomposicao causal por tarefa | Peso = duracao_tarefa / duracao_CC | `causal-analysis.ts → decompMATEDCausal()` |
| Zona do sprint | Classificacao por faixas | `alertas.ts → classificarZonaDesvio()` |
| Impacto Castle | Propagacao e^(-0.3k) aos vizinhos | `castle.ts → propagarImpacto()` |
| Skew visual (inclinacao carta) | arctan(buffer_consumido/original) | `castle.ts → calcularSkewVisual()` |

#### Aba 3: Klauss Narrativa

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Narrativa contextual | LLM (Groq LLaMA 3.3-70b) + context do sprint | `api/ai/klauss/route.ts` |
| Template por zona | Verde/Amarelo/Vermelho/Preto/Azul | Prompt v4.0 com few-shot |
| Sugestao de acao | Formula N + Castle + Fever | `contributor.ts → calcularFormulaN()` |
| Protocolo Clairaut | Classificacao agudo/beta/gamma | `clairaut-fractals.ts → aplicarClairautFractais()` |
| IR (Risco Intrinseco) | 1 - (epsilon/90) | `clairaut.ts → sintetizarClairaut()` |

#### Aba 4: Curvas Prazo/Custo (read-only, D32 Sanfona)

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Curva Custo setup (tracejada) | Baseline imutavel dia 0 | `math.ts` (curva S baseline) |
| Curva Custo real (solida) | Custo acumulado EVM (D11) | `execution.ts` |
| Curva Prazo setup (tracejada) | Burndown baseline | `math.ts` (reta burndown baseline) |
| Curva Prazo real (solida) | Burndown bifurcado CCPM (D5) | `math.ts` + `ccpm.ts` |
| Reta tendencia | Regressao ponderada (pico) | `math.ts` (regressao) |

**Visual:** Setup = `stroke-dasharray: 8,4` (tracejado) em cor suave. Real = linha solida em cor forte. Sobreposicao mostra desvio instantaneo. Accordion e read-only: o usuario nao arrasta pontos.

#### Aba 5: Consulta de Ponto no Triangulo (D3 tutorial.log)

| Elemento | Fonte de Dados | Engine Function |
|---|---|---|
| Triangulo do sprint (SVG) | Lados E', P', C' normalizados | `fractals.ts → buildSprintTriangle()` |
| ZRE (triangulo ortico) | Pes das alturas | `triangle-logic.ts → calculateOrthicTriangle()` |
| NVO do sprint | Baricentro ortico / incentro | `triangle-logic.ts, nvo-ponderado.ts` |
| Ponto de operacao | Baricentro TA do sprint | `triangle-logic.ts → calculateBarycenter()` |
| Traducao hover → dias/R$ | Coordenada SVG → valores projeto | `mapper.ts → toProjectValues()` |
| Traducao CDT → narrativa | Diagnostico geometrico → texto | `traducao.ts → traduzirCDT()` |

**Comportamento:** Hover sobre qualquer ponto dentro do triangulo mostra tooltip com traducao em linguagem humana: dias de atraso/antecipacao, custo adicional/economia, projecao de fechamento. NAO e manipulacao — e consulta pura (o usuario nao move vertices).

### Componentes Necessarios

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `SanfonaContainer` | Client Component | Accordion wrapper, 1 sprint aberto por vez |
| `FeverChartDetail` | Client Component (SVG/Canvas) | Grafico fever com trajetoria + Monte Carlo |
| `MATEDDecomp` | Client Component | Tabela de decomposicao causal |
| `CastleImpact` | Presentational | Badge mostrando propagacao e^(-λk) |
| `KlaussNarrative` | Client Component | Fetch + render da narrativa Klauss |
| `CurveOverlay` | Client Component (SVG) | Curvas setup (tracejado) vs real (solido) |
| `PointConsultation` | Client Component (SVG) | Triangulo interativo com hover → tooltip |
| `ClairautBadge` | Presentational | Mostra protocolo (α/β/γ) + IR + angulos |
| `MonteCarloStats` | Presentational | P50, P80, IC90 formatados |

---

## Fluxo entre Telas

```
TELA 1 (Portfolio)
  │
  │  Click no project card
  ▼
TELA 2 (Board Sierpinski)
  │
  │  Click no sprint triangle
  ▼
TELA 3 (Sanfona — abre como accordion na Tela 2)
  │
  │  Click em outro sprint → fecha atual, abre novo
  │  Click fora → fecha sanfona
  │  ← Back → volta para Portfolio
```

### Rotas Next.js

| Rota | Tela | Tipo |
|---|---|---|
| `/` ou `/portfolio` | Tela 1: Portfolio | Server Component (lista) + Client (cards) |
| `/projeto/[id]` | Tela 2: Board Sierpinski | Client Component (SVG interativo) |
| `/projeto/[id]#sprint-[n]` | Tela 3: Sanfona | Client Component (accordion dentro da Tela 2) |

---

## Data Flow Summary

```
Supabase (projetos, tarefas, progresso_tarefas, decisoes_mated)
  │
  ├─► cpm.ts (Forward/Backward Pass)
  ├─► ccpm.ts (Corte Goldratt, Nivelamento)
  ├─► buffer.ts (PB, CB, FB via RSS)
  ├─► math.ts (CDT, Heron, Cossenos, MATED)
  ├─► fractals.ts + sierpinski.ts (Malha + Sprints)
  ├─► clairaut.ts + clairaut-fractals.ts (Protocolos)
  ├─► crisis.ts (CEt Dupla + Hierarquica)
  ├─► fever-chart.ts (Zones + Monte Carlo)
  ├─► castle.ts (Propagacao e^(-λk))
  ├─► causal-analysis.ts (MATED decomp)
  ├─► zones.ts (5 zonas operacionais)
  ├─► sdo.ts (Score Desfecho Objetivo)
  ├─► bayesian.ts (Priors + Update)
  ├─► mapper.ts (SVG ↔ dias/R$)
  └─► api/ai/klauss (Narrativa LLM)
        │
        ▼
  TELA 1: Portfolio (MATED ranking + fever badge + Klauss 1-line)
  TELA 2: Sierpinski (malha colorida + ghost TM + acordeao)
  TELA 3: Sanfona (fever detail + MATED decomp + Klauss + curvas + ponto)
```

---

*Specification derived from 38 squad session decisions (tutorial.log), FRAMEWORK-TECH D1-D33, MASTERPLAN-X hierarchical dashboard, relatorio1.log gap analysis, and GEOMETRIA-SIERPINSKI fractal rules.*
