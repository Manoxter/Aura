# System Architecture — Aura 6.1
## Brownfield Discovery Phase 1 — @architect (Aria)
**Data:** 2026-03-14 | **Wave:** 09

---

## 1. Stack Tecnologico

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Framework | Next.js 14 (App Router) | 14.2.35 |
| Runtime | React 18 | 18.x |
| Linguagem | TypeScript | 5.x |
| Estilizacao | Tailwind CSS + clsx + tailwind-merge | 3.x |
| Icones | Lucide React | latest |
| Graficos | Recharts | latest |
| Backend | Next.js API Routes (serverless) | — |
| Banco de Dados | Supabase (PostgreSQL + RLS) | — |
| Auth | Supabase Auth | — |
| IA/LLM | Groq SDK (LLaMA 3.3-70b) | — |
| IA Fallback | OpenAI SDK | — |
| Validacao | Zod | — |
| Pagamento | Stripe | — |
| Testes | Vitest | — |
| Hooks | Husky (pre-push) | — |
| Review | CodeRabbit | — |

---

## 2. Estrutura de Pastas

```
src/
├── app/
│   ├── (dashboard)/[projetoId]/
│   │   ├── setup/        # TAP, EAP, CPM, Calendario, Orcamento, Funcoes
│   │   ├── motor/        # CPM Gantt, Curva S, Burndown
│   │   ├── decisao/      # CDT Canvas, MATED, War Room, IA
│   │   ├── governanca/   # Gabinete, Kanban, Relatorios
│   │   └── relatorios/   # Custom reports
│   ├── api/ai/           # TAP, CPM, Insight, Klauss
│   ├── login/            # Auth
│   └── onboarding/       # SaaS onboarding
├── lib/
│   ├── engine/           # Motor Matematico (IP Core)
│   │   ├── math.ts       # CPM, CDT, OLS, Monte Carlo, Projecao
│   │   ├── triangle-logic.ts  # Geometria Euclidiana
│   │   ├── euclidian.ts  # MATED Decision Evaluation
│   │   ├── crisis.ts     # CEt Validation + Crisis Report
│   │   ├── mapper.ts     # SVG <-> Project Metrics
│   │   ├── extractors.ts # TAP/WBS Deterministic Extraction
│   │   └── math-tools.ts # OR Tools (EOQ, Filas, Monte Carlo, EMV)
│   ├── validations/      # Zod Schemas
│   ├── types.ts          # Core Types
│   └── supabase.ts       # Client
├── components/
│   ├── aura/             # CDTCanvas, MatedSimulator, AIInsightCard
│   ├── motor/            # TrianglePlotter
│   └── ia/               # GabineteDeCrise
└── context/
    └── ProjectContext.tsx # Global State
```

---

## 3. Pipeline de Dados (Cascata)

```
TAP (texto) ──→ deterministicExtractor() ──→ API /ai/tap (Groq)
     │                                            │
     ▼                                            ▼
  MERGE (Script wins numeros, AI wins semantico)
     │
     ▼
  Supabase: projetos (update) + eap_nodes (insert) + tarefas (insert)
     │                                                    + orcamentos (upsert)
     │                                                    + marcos (insert)
     ▼
  EAP Page ──→ loadEAP() ──→ Edit/Save ──→ Leaf nodes → tarefas
     │
     ▼
  CPM Page ──→ Sync WBS ou Manual ──→ /api/ai/cpm ──→ forwardPass + backwardPass
     │
     ▼
  Orcamento Page ──→ calcularProjecaoFinanceira() ──→ Curva S ──→ regressaoOLS()
     │
     ▼
  Funcoes Page ──→ custosTarefas (manual) ──→ regressaoOLS() ──→ tangentePontual()
     │
     ▼
  Motor CDT ──→ gerarTrianguloCDT(retaOrc, retaPrazo, bac, dias, conting)
     │              ├── checkCDTExistence(E, O, P) ──→ CEt validation
     │              ├── calculateOrthicTriangle() ──→ ZRE
     │              └── calculateBarycenter(orthic) ──→ NVO
     ▼
  MATED ──→ evaluateDecision(triangle, decision) ──→ distance to NVO
     │
     ▼
  War Room ──→ GabineteDeCrise ──→ Klauss IA ──→ Crisis Report
```

---

## 4. AUDITORIA DO MOTOR MATEMATICO

### 4.1 Validacao da Geometria CDT

#### 4.1.1 Normalização Adimensional

**Implementacao atual** (`math.ts:176-229`):
```
E = 1.0 (fixo)
O = coefOrc / taxaMedia = |dy_custo/dx| / (BAC/totalDias)
P = |coefPrazo.a|
```

**PROBLEMA CRITICO #M1 — Normalização Incoerente:**
- `E` e sempre `1.0` (fixo). Correto como referencia.
- `O` e um ratio: inclinação real da reta de custo / inclinação media. **Porem**: se `custosTarefas` esta vazio (BUG #6 identificado), `coefOrc = 0` e `O = 0.05` (clamp minimo). O triangulo se degenera em um segmento de reta.
- `P` e `|retaPrazo.a|` direto — mas `retaPrazo.a` e a inclinação de uma tangente pontual ao burndown, que varia entre `0` e `~-10` dependendo da escala. **Nao ha normalizacao relativa ao prazo base**, fazendo com que `P` seja dependente da escala do projeto.

**IMPACTO:** Dois projetos com mesma proporcionalidade (ex: 50% do prazo, 50% do custo) podem gerar triangulos CDT completamente diferentes dependendo da escala absoluta. **Isso invalida o CDT como KPI comparativo entre projetos.**

**CORRECAO SUGERIDA:**
```
O = (custo_acumulado_real / BAC) — ratio 0-1 normalizado
P = (prazo_consumido_real / prazo_total) — ratio 0-1 normalizado
E = 1.0 (referencia)
```
Ou usar o modelo proposto no PRD: intensidades na escala 0-1000 com auto-scaling.

---

#### 4.1.2 Construcao dos Vertices (Lei dos Cossenos)

**Implementacao** (`math.ts:198-208`):
```typescript
cosA = (En² + Pn² - On²) / (2·En·Pn)
angA = acos(cosA)
A = [0, 0]
B = [En, 0]
C = [Pn·cos(angA), Pn·sin(angA)]
```

**AVALIACAO:** Matematicamente **correto**. A lei dos cossenos esta bem aplicada para construir um triangulo com lados `En`, `On`, `Pn` a partir da origem. O clamp `cosA ∈ [-0.9999, 0.9999]` protege contra `NaN` no `acos`.

**PROBLEMA #M2 — Mapeamento Lado-Vertice Ambiguo:**
- `A` = origem, `B` = ponto no eixo X (escopo), `C` = ponto calculado (prazo/custo).
- Mas na semantica do projeto: Escopo e o **lado AB**, Orcamento e o **lado BC**, Prazo e o **lado AC**.
- O `DimensionMapper` mapeia X=Dias, Y=Custo. Mas os vertices CDT nao correspondem a esses eixos — sao coordenadas adimensionais.
- **Nao ha tradução documentada** entre "vertice geometrico" e "metrica de projeto".

**IMPACTO:** O PM/PO ve um triangulo no canvas sem saber qual lado representa qual dimensão. A falta de labels semanticos compromete a usabilidade como KPI.

---

#### 4.1.3 Triangulo Ortico (ZRE)

**Implementacao** (`triangle-logic.ts:52-67` e `math.ts:210-217`):

Existem **duas implementacoes diferentes** do triangulo ortico:

1. **`triangle-logic.ts`**: Usa `projectPointToLine()` com tipos `Point {x, y}` — **correto geometricamente**.
2. **`math.ts`**: Usa `peAltitude()` com arrays `number[]` — **tambem correto**, mas tipo diferente.

**PROBLEMA #M3 — Implementação Duplicada com Tipos Incompativeis:**
- `math.ts` gera o baricentro como `number[]` (array)
- `triangle-logic.ts` gera como `Point {x, y}` (objeto)
- `euclidian.ts` importa de `triangle-logic.ts` (usa `Point`)
- `math.ts` `calcularMATED` usa `number[]` para baricentro

Resultado: Ha **dois caminhos** para calcular o NVO (Nucleo Otimo de Viabilidade), e eles **nao sao intercambiaveis**. Dependendo de qual caminho os dados percorrem, o MATED pode dar resultados diferentes por incompatibilidade de tipo.

---

#### 4.1.4 CEt — Condicao de Existencia do Triangulo

**Implementacao** (`crisis.ts:3-8`):
```typescript
return (E + O > P && E + P > O && O + P > E)
```

**AVALIACAO:** Matematicamente **correto**. E a desigualdade triangular padrao.

**PROBLEMA #M4 — CEt usa valores pre-normalizacao, mas deveria usar pos-normalizacao:**
- Em `gerarTrianguloCDT`, os valores `E, O, P` sao normalizados para `En, On, Pn` dividindo por `max(E,O,P)`.
- A desigualdade triangular **sempre sera satisfeita** apos a normalizacao `x/max` (porque max <= soma dos outros dois).
- Portanto, a CEt so faz sentido **antes** da normalizacao, com os valores brutos.
- Mas `checkCDTExistence` nao e chamado em `gerarTrianguloCDT` — e chamado separadamente, sem garantia de qual versao dos valores (brutos ou normalizados) e usada.

**IMPACTO:** A CEt pode parecer "estavel" quando na verdade os valores brutos indicariam crise geometrica. O KPI de crise perde sensibilidade.

**CORRECAO:** Chamar `checkCDTExistence(E, O, P)` ANTES da normalizacao dentro de `gerarTrianguloCDT`, e retornar o status junto com o triangulo.

---

#### 4.1.5 MATED como KPI

**Implementacao** (`euclidian.ts:33-51`):
```typescript
orthic = calculateOrthicTriangle(original)
barycenter = calculateBarycenter(orthic)
dist = distance(decision, barycenter)
```

**AVALIACAO:** A logica e geometricamente **correta**. O baricentro do triangulo ortico e um ponto valido como "ponto otimo" dentro de um triangulo acutangulo.

**PROBLEMA #M5 — Triangulo Ortico so e valido para triangulos acutangulos:**
- Se o triangulo CDT for **obtusangulo** (um angulo > 90°), o pe da altitude cai **fora** do lado oposto.
- Nesse caso, o "triangulo ortico" pode ter vertices fora do triangulo original.
- O baricentro do ortico pode cair fora do triangulo original, tornando o MATED incoerente.
- **Nao ha validacao** de que o triangulo e acutangulo antes de calcular o ortico.

**IMPACTO:** Em projetos com forte desequilibrio (ex: muito orcamento, pouco prazo), o MATED pode indicar que a decisao otima esta FORA da zona viavel — um absurdo geometrico.

**CORRECAO:** Adicionar verificacao: se o triangulo e obtusangulo, usar o **incentro** (centro do circulo inscrito) como ponto otimo em vez do baricentro ortico.

---

#### 4.1.6 OLS Regression para Retas Tangentes

**Implementacao** (`math.ts:97-123`):

**AVALIACAO:** A regressao OLS (Minimos Quadrados Ordinarios) esta **correta matematicamente**. O tratamento de `setupJump` (ignorar dia 0 para inclinacao) e uma heuristica razoavel.

**PROBLEMA #M6 — OLS Global nao captura inflexoes da Curva S:**
- A Curva S financeira de um projeto tem formato sigmoide (crescimento lento, aceleracao, desaceleracao).
- Uma regressao linear global (OLS) calcula a **inclinacao media** — que nao representa o comportamento real em nenhum ponto especifico da curva.
- Para o CDT, a reta tangente deveria representar o **burn rate instantaneo** (taxa de queima no momento atual), nao a tendencia global.
- A funcao `tangentePontual()` existe mas **nao e usada** no pipeline principal — so `regressaoOLS` alimenta o motor.

**IMPACTO:** O vertice `O` (Orcamento) do triangulo CDT reflete uma media historica em vez do comportamento atual, fazendo com que o triangulo reaja lentamente a crises financeiras.

**CORRECAO:** Usar `tangentePontual()` no ponto mais recente (ultimo dia com dados) para alimentar `retaOrc` no `gerarTrianguloCDT`.

---

#### 4.1.7 Projecao Financeira

**Implementacao** (`math.ts:231-266`):

**AVALIACAO:** Logicamente **correta** — distribui custo linear por tarefa ao longo de ES→EF e soma marcos pontuais.

**PROBLEMA #M7 — Dependencia circular com custosTarefas:**
- `calcularProjecaoFinanceira` precisa de `custosTarefas[t.id]` para cada tarefa.
- `custosTarefas` e preenchido **manualmente** na pagina de Funcoes (tab "Custos por Tarefa").
- Se o usuario nao preencher, `custosTarefas = {}` e toda a projecao retorna `acumulado: 0`.
- Sem projecao financeira, a reta OLS nao pode ser calculada.
- Sem reta OLS, o CDT nao pode ser gerado.

**CASCATA DE FALHA:** `custosTarefas vazio → projecao zerada → OLS invalida → CDT impossivel → MATED impossivel → KPI morto`

---

#### 4.1.8 Monte Carlo para Confianca CDT

**Implementacao** (`math.ts:285-318`):

**AVALIACAO:** A implementacao usa ruido uniforme (`Math.random() - 0.5`) **em vez de gaussiano**. Isso significa que a "volatilidade" nao segue uma distribuicao normal — os resultados sao plausiveis mas nao estatisticamente rigorosos.

**Nota:** `math-tools.ts:56-70` tem uma implementacao **correta** de Box-Muller para Monte Carlo, mas **nao e usada** no `calcularConfiancaMonteCarlo`. Duplicacao com inconsistencia.

---

### 4.2 Tabela de Consistencia Matematica

| ID | Componente | Status | Severidade | Descricao |
|----|-----------|--------|-----------|-----------|
| M1 | Normalizacao CDT | INCONSISTENTE | CRITICO | O/P dependem de escala absoluta, nao sao verdadeiramente adimensionais |
| M2 | Mapeamento Lado-Vertice | AMBIGUO | ALTO | Sem documentacao de qual lado = qual metrica |
| M3 | Implementacao Duplicada | INCONSISTENTE | ALTO | Dois caminhos para ortico/baricentro com tipos incompativeis |
| M4 | CEt Timing | INCORRETO | CRITICO | CEt pos-normalizacao sempre true; deveria ser pre-normalizacao |
| M5 | Ortico em obtusangulo | INVALIDO | CRITICO | Baricentro ortico pode cair fora do triangulo viavel |
| M6 | OLS vs Tangente Pontual | INADEQUADO | ALTO | OLS media global, deveria ser burn rate instantaneo |
| M7 | Dependencia custosTarefas | BLOQUEANTE | CRITICO | Pipeline inteiro para se custos nao preenchidos |
| M8 | Monte Carlo Distribuicao | IMPRECISO | MEDIO | Usa uniforme em vez de gaussiana (Box-Muller disponivel mas nao usado) |

---

### 4.3 Debitos Tecnicos de Sistema

| ID | Debito | Area | Severidade |
|----|--------|------|-----------|
| S1 | RLS incompleta — policies nao aplicadas | Seguranca | CRITICO |
| S2 | Ghost Actions no GabineteDeCrise (mocks) | UX | ALTO |
| S3 | Thread blocking em calculos geometricos | Performance | MEDIO |
| S4 | `as any` casts mascaram shape mismatches | Type Safety | CRITICO |
| S5 | `projecaoFinanceira` declarada 2x em orcamento/page.tsx | Bug | ALTO |
| S6 | `modeloCurva` referenciada mas nao declarada em funcoes/page.tsx | Bug | ALTO |
| S7 | `dataInicio` referenciada mas nao importada em orcamento/page.tsx | Bug | ALTO |
| S8 | WBS extractor parseia linhas nao-estruturais | Data Quality | ALTO |
| S9 | EAP save sobrescreve duracao com default 5 | Data Integrity | ALTO |
| S10 | Campo duracao vs duracao_estimada inconsistente | Type Safety | CRITICO |

---

*Generated by @architect (Aria) — Brownfield Discovery Phase 1 | 2026-03-14*
