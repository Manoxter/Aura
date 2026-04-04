# AUDITORIA MATEMATICA PROFUNDA — Aura 6.1 (v2)
## Squad Review: @aura-math + @aura-production + @aura-klauss + @aura-qa-auditor
## Orquestrada por @aiox-master (Orion)
**Data:** 2026-03-14

---

## 0. AUTOCRITICA DA AUDITORIA v1

A auditoria v1 (system-architecture.md, Fase 1 do Brownfield) foi **competente na identificacao de bugs de codigo** mas **superficial no entendimento do metodo**. Erros especificos:

| Ponto | v1 disse | Correcao |
|-------|---------|----------|
| M1 (Normalizacao) | "O deveria ser custo_real/BAC (ratio 0-1)" | **ERRADO.** O MetodoAura define P, C, E como FUNCOES (retas tangentes), nao ratios. A inclinacao da tangente e a "intensidade" do lado. A implementacao atual esta mais proxima do metodo do que o fix proposto. |
| Area como KPI | Nao mencionada | **OMISSAO GRAVE.** O MetodoAura define `A_atual/A_original × 100` como O KPI primario de qualidade. Nenhum componente no frontend usa isso. |
| MATED | "Distancia ao baricentro" | **SUPERFICIAL.** O MATED e um sistema de decisao com zonas semanticas (dentro do ortico = seguro, fora = risco, fora do original = impossivel). Nao e so uma distancia. |
| Funcoes vs Valores | Nao distinguiu | **OMISSAO CRITICA.** Os lados do triangulo sao funcoes dinamicas que mudam ao longo do tempo, nao valores estaticos. |
| Ortico | "Zona de Resiliencia" | **INCOMPLETO.** O ortico representa o triangulo de MENOR area inscrito — a margem entre ortico e original e o buffer produtivo (TOC). |

**Veredicto sobre a v1:** Util para bugs de codigo e pipeline, mas **insuficiente como auditoria de metodo**. Esta v2 corrige isso.

---

## 1. RELEITURA DO METODOAura.MD — @aura-math

### 1.1 O que o Metodo REALMENTE Diz

O Aura modela o projeto como um **triangulo cujos lados sao funcoes**:

```
E = f(escopo) = constante (ancora, eixo das abscissas)
P = f(prazo) = funcao derivada do CPM (variacao do tempo disponivel)
C = f(custo) = funcao derivada da Curva S (comportamento dos valores acumulados)
```

**Ponto crucial:** Os lados NAO sao valores estaticos como "orcamento = R$2.5M" ou "prazo = 180 dias". Os lados sao as **intensidades instantaneas** — quanto custo esta sendo queimado por unidade de tempo, quanto prazo esta sendo consumido por unidade de escopo.

Em termos matematicos:
- **C** (lado Custo) = coeficiente angular da reta tangente a Curva S no ponto atual → `dCusto/dTempo`
- **P** (lado Prazo) = coeficiente angular da reta tangente ao Burndown no ponto atual → `dEscopo/dTempo`
- **E** (lado Escopo) = constante de referencia = `1.0`

**Isso significa:** o triangulo muda de forma a cada dia conforme o projeto evolui. Um projeto saudavel mantem o triangulo relativamente estavel. Um projeto em crise ve o triangulo deformar-se rapidamente.

### 1.2 A CEt (Condicao de Existencia)

$$|P - C| < E < P + C$$

Forma classica da desigualdade triangular. Note que:
- Se P e C sao intensidades (inclinacoes de tangentes), E e a ancora constante
- A CEt falha quando uma intensidade cresce descontroladamente (ex: burn rate dispara mas prazo nao avanca)
- Quando a CEt falha, **nao existe triangulo fisico** que represente aquele estado do projeto
- Isso equivale a dizer: "nao ha configuracao geometrica viavel para esse Escopo com esse ritmo de Custo e esse ritmo de Prazo"

### 1.3 A Area como KPI de Qualidade

$$A = \sqrt{s(s-P)(s-C)(s-E)}, \quad s = \frac{P+C+E}{2}$$

$$\text{Desvio de Qualidade} = \frac{A_{atual}}{A_{original}} \times 100$$

**Significado operacional:**
- `A_original` = area do triangulo no momento T0 (baseline, apos TAP)
- `A_atual` = area do triangulo no momento T_n (execucao)
- Se `A_atual < A_original` → qualidade caiu (triangulo encolheu)
- Se `A_atual > A_original` → escopo/recurso expandiu (pode ser bom ou ruim)
- `100%` = projeto perfeitamente no plano
- `< 80%` = alerta de degradacao de qualidade
- `> 120%` = investigar scope creep ou superalocacao

**ESTE E O KPI PRIMARIO DO Aura** e a auditoria v1 nem o mencionou.

### 1.4 O Triangulo Ortico e o MATED

O MetodoAura define:
1. **Triangulo Ortico (To)** = "triangulo de menor area possivel inscrito no original"
2. **Interior do To** = "campo de decisoes mais factiveis"
3. **Baricentro do To (G)** = "ponto de equilibrio ideal"
4. **MATED** = distancia euclidiana de qualquer decisao D_n ao baricentro G

**Zonas semanticas do MATED:**

```
┌─────────────────────────── Triangulo Original ──────────────────────────┐
│                                                                         │
│   ┌───────────── Triangulo Ortico (ZRE) ─────────────┐                 │
│   │                                                    │                 │
│   │              ● G (Baricentro/NVO)                 │                 │
│   │           d < 0.05 → OTIMO                        │                 │
│   │                                                    │                 │
│   │        d < 0.10 → SEGURO (dentro do ortico)       │                 │
│   └────────────────────────────────────────────────────┘                 │
│                                                                         │
│         d < 0.15 → RISCO (fora do ortico, dentro do original)          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

          d > 0.15 → CRISE (fora do original = CEt violada ou quase)
```

---

## 2. AVALIACAO DA IMPLEMENTACAO — @aura-math + @aura-qa-auditor

### 2.1 gerarTrianguloCDT() — Fidelidade ao Metodo

**Codigo atual** (`math.ts:176-229`):

```typescript
const E = 1.0
const coefOrc = Math.abs((retaOrc.y2 - retaOrc.y1) / dx)  // inclinacao da reta de custo
const taxaMedia = bac / totalDias
let O = coefOrc / taxaMedia  // normalizacao relativa a media
let P = Math.abs(retaPrazo.a)  // inclinacao da reta de prazo
```

**Avaliacao @aura-math:**

A INTENCAO esta correta: os lados sao derivados de inclinacoes (tangentes). O problema nao e conceitual — e de IMPLEMENTACAO:

| Aspecto | MetodoAura | Implementacao | Veredicto |
|---------|-----------|---------------|-----------|
| E como constante | E = funcao constante (ancora) | E = 1.0 | CORRETO |
| C como tangente de custo | dCusto/dTempo (instantaneo) | coefOrc / taxaMedia | PARCIAL — usa reta de 2 pontos em vez de tangente pontual |
| P como tangente de prazo | dEscopo/dTempo (instantaneo) | `abs(retaPrazo.a)` | PARCIAL — `retaPrazo.a` vem de onde? Se vem de OLS global, e media, nao instantaneo |
| Normalizacao | Nao especificada no MetodoAura | `O = coefOrc / taxaMedia`, depois `x/max(E,O,P)` | PROBLEMATICO — dupla normalizacao distorce as proporcoes |

**Diagnostico refinado:**

O problema NAO e "usar ratios em vez de tangentes" (como a v1 disse). O problema e:
1. **C usa reta de 2 pontos** (retaOrc.x1,y1 → x2,y2) em vez de tangente pontual no dia atual
2. **P usa um coeficiente generico** sem garantia de que vem da tangente pontual do burndown
3. **A dupla normalizacao** (primeiro `coefOrc/taxaMedia`, depois `x/max`) perde a proporcionalidade real

**Fix correto (revisado):**
```
C = tangentePontual(curvaS, diaAtual).a / tangentePontual(curvaS, dia0).a
P = tangentePontual(burndown, diaAtual).a / tangentePontual(burndown, dia0).a
E = 1.0

// UMA UNICA normalizacao: dividir todos por max(E,C,P)
// Isso preserva proporcoes E garante que o maior lado = 1.0
```

Normalizando pela tangente do dia 0 (baseline), garantimos que:
- No dia 0, C=1, P=1, E=1 → triangulo equilatero (projeto perfeitamente no plano)
- Se custo acelera, C > 1 (lado cresce)
- Se prazo atrasa, P > 1 (lado cresce)
- Escopo fixo, E = 1 sempre

### 2.2 Calculo da Area — AUSENTE

**@aura-qa-auditor constata:**

O codigo calcula `cdt_area` (area do triangulo original) e `cdt_area_ortico` (area do ortico) em `gerarTrianguloCDT`. MAS:
- **Nenhuma funcao calcula `A_original` (baseline do dia 0)**
- **Nenhuma funcao calcula o Desvio de Qualidade `A_atual/A_original × 100`**
- **Nenhum componente no frontend exibe esse KPI**
- A tabela `orcamentos` armazena `cdt_area` mas nao `cdt_area_baseline`

**Isso e uma OMISSAO CRITICA** — o KPI mais importante do MetodoAura nao existe no sistema.

**Fix necessario:**
1. Armazenar `cdt_area_baseline` no primeiro calculo do CDT (dia 0 / setup)
2. Calcular `desvio_qualidade = (cdt_area / cdt_area_baseline) * 100` em cada recalculo
3. Exibir no frontend: "Qualidade do Projeto: 87%" com semaforo visual
4. Adicionar coluna `cdt_area_baseline` na tabela `orcamentos`

### 2.3 CEt — Timing Correto

**@aura-math confirma parcialmente a v1:**

A CEt deve ser avaliada com os valores E, O, P ANTES da normalizacao por `max()`. Apos normalizar por max, a desigualdade triangular e satisfeita trivialmente (porque `max(a,b,c) <= a + b + c - max(a,b,c)` sempre que `a,b,c > 0`).

**Porem @aura-production adiciona nuance:**

Na pratica, a CEt TAMBEM deve ser avaliada em termos de **tendencia**. Se o triangulo hoje e valido mas a tangente de custo indica que em 5 dias sera invalido, o Klauss deve alertar ANTECIPADAMENTE. Isso requer:
- CEt no instante atual (valores brutos)
- CEt projetada (valores brutos + extrapolacao linear de C e P por N dias)

### 2.4 Triangulo Ortico em Obtusangulos

**@aura-math confirma a v1:**

Para triangulos obtusangulos, o pe da altitude cai fora do lado oposto. O ortico tem vertices FORA do triangulo original. O baricentro do ortico pode estar fora.

**@aura-production pondera:**

Na gestao real, triangulos obtusangulos ocorrem quando uma dimensao domina brutalmente as outras (ex: projeto com orcamento enorme mas prazo curtissimo). Nesse cenario, usar o incentro (centro do circulo inscrito) como ponto otimo e mais adequado porque o incentro e SEMPRE interno ao triangulo, independente dos angulos.

**@aura-klauss complementa:**

Para o War Room, a narrativa deveria ser: "O projeto esta tao desequilibrado que a zona de resiliencia padrao (ortico) nao se aplica. Estamos operando no modo de contingencia — o ponto otimo foi recalculado para o incentro."

### 2.5 MATED como Sistema de Decisao

**@aura-production avalia:**

O MATED e conceitualmente analogo ao **EVM (Earned Value Management)** do PMBOK, mas em dimensao geometrica:

| EVM (PMBOK) | MATED (Aura) |
|-------------|-------------|
| CPI (Cost Performance Index) | Projecao do ponto de decisao no eixo de Custo |
| SPI (Schedule Performance Index) | Projecao do ponto de decisao no eixo de Prazo |
| CPI × SPI (indice composto) | Distancia ao baricentro (KPI unificado) |
| "Replanning threshold" | Threshold 0.15 |

**Vantagem do MATED sobre EVM:** O EVM trata custo e prazo como dimensoes independentes. O MATED trata como dimensoes **geometricamente acopladas** — mover uma afeta a outra via a restricao triangular. Isso e mais fiel a realidade da gestao de projetos.

**Gap identificado:** O MATED atual so mede distancia. Deveria tambem indicar a **direcao** do desvio:
- "Voce esta longe do otimo PORQUE o custo esta acelerado" (desvio na direcao C)
- "Voce esta longe do otimo PORQUE o prazo esta atrasado" (desvio na direcao P)

Isso pode ser feito decompondo o vetor decisao→baricentro nas componentes de cada lado do triangulo.

### 2.6 Funcao `tangentePontual()` — O Elo Perdido

**@aura-math identifica:**

A funcao `tangentePontual()` (`math.ts:142-152`) existe e esta CORRETA. Ela calcula a derivada discreta no ponto `index` usando pontos vizinhos:

```typescript
const a = (p2.y - p1.y) / (p2.x - p1.x)  // inclinacao instantanea
```

POREM esta funcao **nao e usada no pipeline principal**. O `gerarTrianguloCDT` recebe `retaOrc` e `retaPrazo` como parametros pre-calculados, e quem os calcula usa `regressaoOLS` (media global) em vez de `tangentePontual` (instantanea).

**Impacto:** O triangulo CDT reflete o comportamento MEDIO do projeto inteiro em vez do comportamento ATUAL. Um projeto que comecou bem mas esta em crise AGORA tera um triangulo "amenizado" pela media historica.

---

## 3. INVENTARIO DE GAPS ENTRE METODO E IMPLEMENTACAO — @aura-qa-auditor

| # | MetodoAura Diz | Implementacao Faz | Gap | Severidade |
|---|---------------|-------------------|-----|-----------|
| G1 | Lados sao FUNCOES (tangentes instantaneas) | Usa OLS global ou reta de 2 pontos | Triangulo reflete media, nao estado atual | CRITICO |
| G2 | Area = KPI primario de qualidade | Area calculada mas nao exibida nem comparada com baseline | KPI central do metodo NAO EXISTE no produto | CRITICO |
| G3 | Desvio % = A_atual/A_original × 100 | Nao implementado | PM/PO nao ve degradacao de qualidade | CRITICO |
| G4 | CEt com |P-C| < E < P+C | Usa forma expandida (equivalente) mas pos-normalizacao | CEt perde sensibilidade | ALTO |
| G5 | Ortico = campo de decisoes factiveis | Ortico calculado mas semantica de "zonas" nao implementada | MATED nao distingue "dentro do ortico" de "fora mas dentro do original" | ALTO |
| G6 | Decisao com menor d ao baricentro = melhor | Distancia calculada mas sem ranking de alternativas | PM/PO nao ve opcoes comparadas geometricamente | ALTO |
| G7 | Triangulo muda dinamicamente ao longo do tempo | Triangulo calculado uma vez (setup), nao recalculado em execucao | CDT estatico em vez de dinamico | CRITICO |
| G8 | E = funcao constante (ancora) | E = 1.0 hardcoded | CORRETO (fiel ao metodo) | OK |
| G9 | Nao especificado | Dupla normalizacao (ratio + max) | Distorce proporcoes originais | ALTO |
| G10 | Nao especificado | Nenhuma decomposicao direcional do MATED | PM/PO nao sabe QUAL dimensao causa o desvio | MEDIO |

---

## 4. PLANO DE CORRECAO REVISADO (v2) — Squad Unificado

### Prioridade ABSOLUTA: Gaps de Metodo (G1-G3, G7)

Estes nao sao bugs de codigo — sao **ausencias fundamentais** que impedem o Aura de ser o que o MetodoAura define.

| # | Correcao | Resp. | Horas |
|---|---------|-------|-------|
| R1 | Usar `tangentePontual()` para alimentar C e P no `gerarTrianguloCDT` | @aura-math | 6h |
| R2 | Normalizar C e P pela tangente do baseline (dia 0) | @aura-math | 4h |
| R3 | Implementar `cdt_area_baseline` + `desvio_qualidade` | @aura-math | 4h |
| R4 | Adicionar coluna `cdt_area_baseline` na tabela `orcamentos` | @data-engineer | 1h |
| R5 | Componente `QualityGauge` que exibe "Qualidade: 87%" com semaforo | @ux-design-expert | 6h |
| R6 | Recalcular CDT periodicamente (nao so no setup) — trigger por save | @dev | 4h |
| R7 | CEt avaliada pre-normalizacao + projecao de tendencia (5 dias) | @aura-math | 4h |

### Prioridade ALTA: Semantica MATED (G5-G6, G10)

| # | Correcao | Resp. | Horas |
|---|---------|-------|-------|
| R8 | Implementar zonas semanticas: OTIMO / SEGURO / RISCO / CRISE | @aura-math | 4h |
| R9 | Decomposicao direcional do vetor MATED (qual dimensao causa desvio) | @aura-math | 6h |
| R10 | Ranking de decisoes alternativas por distancia ao baricentro | @aura-math + @aura-klauss | 8h |
| R11 | Fallback incentro para triangulos obtusangulos | @aura-math | 4h |

### Prioridade NECESSARIA: Bugs de Pipeline (da v1)

Os bugs P1-P7 da auditoria v1 continuam validos e necessarios:

| # | Bug | Horas |
|---|-----|-------|
| B1 | Crash fixes (UX4/UX5/UX7) | 3h |
| B2 | Shape mismatch `as any` (P2/P5) | 7h |
| B3 | WBS extractor (P1) + EAP duracao (P4) | 6h |
| B4 | custosTarefas seed (M7 da v1) | 6h |
| B5 | RLS (DB1) + indices (DB5) | 10h |

---

## 5. NOVA ORDEM DE EXECUCAO

```
SPRINT 0 (2 dias): B1 + B2 (crashes + shape)
    ↓
SPRINT 1 (1 semana): R1-R7 + B3-B4 (Motor fiel ao metodo + pipeline)
    ↓
SPRINT 2 (1 semana): R8-R11 + B5 (MATED semantico + seguranca)
    ↓
SPRINT 3 (1 semana): R5 + MetricTranslator + UX PM/PO (frontend)
```

**Diferenca da v1:** O Sprint 1 agora foca em FIDELIDADE AO METODO (gaps G1-G7) em vez de "normalizacao diferente". O fix correto e usar `tangentePontual` com normalizacao por baseline, nao trocar para ratios.

---

## 6. METRICAS DE SUCESSO (Revisadas)

| Metrica | Valor Alvo | Como Medir |
|---------|-----------|-----------|
| Desvio de Qualidade funcional | Exibido no frontend | Componente QualityGauge visivel |
| CDT gera triangulo com tangentes reais | 100% dos projetos com CPM + custos | Test E2E |
| CDT atualiza dinamicamente em execucao | Recalculo a cada save de dados | Test integracao |
| CEt detecta crise com 5 dias de antecedencia | Projecao correta em teste sintetico | Unit test |
| MATED indica DIRECAO do desvio | Componente mostra "custo acelerado" ou "prazo atrasado" | Test visual |
| Triangulo equilatero no dia 0 | E=C=P=1 quando projeto comeca | Unit test |
| Obtusangulo usa incentro | NVO dentro do triangulo em 100% dos casos | Unit test |

---

## 7. VEREDICTO FINAL DO SQUAD

**@aura-math:** A matematica base (lei dos cossenos, Heron, ortico, baricentro) esta CORRETA. Os gaps sao de IMPLEMENTACAO, nao de teoria. O fix mais importante e R1 (tangente pontual) + R3 (area como KPI).

**@aura-production:** O Aura e uma evolucao geometrica do EVM (PMBOK). A forca do metodo e tratar custo e prazo como dimensoes ACOPLADAS, nao independentes. O gap mais importante do ponto de vista de gestao e G2 (area como KPI de qualidade) — sem ele, o PM/PO nao tem o numero que importa.

**@aura-klauss:** Para o War Room funcionar, preciso de: (1) desvio de qualidade em %, (2) direcao do desvio (custo ou prazo), (3) projecao de CEt em 5 dias. Com esses tres dados, consigo gerar narrativas de crise e justificativas de aditivo que nenhum outro software gera.

**@aura-qa-auditor:** A v1 identificou 32 debitos. Esta v2 adiciona 7 gaps de metodo (G1-G7) que sao mais graves que os bugs de codigo porque representam **ausencia do core product**. Total revisado: 39 itens, dos quais 4 sao omissoes fundamentais (G1, G2, G3, G7).

---

*Deep Audit v2 — Squad Aura | 2026-03-14*
*Validated by: @aura-math, @aura-production, @aura-klauss, @aura-qa-auditor*
*Orchestrated by: @aiox-master (Orion)*
