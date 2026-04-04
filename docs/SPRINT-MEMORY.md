# SPRINT MEMORY — Aura 6.1
## Memória de Trabalho para Implementação de Sprints
**Criado:** 2026-03-17 | **Branch de trabalho:** aura1703
**Orquestrado por:** @aiox-master (Orion) | **Squad:** 32 agentes

---

## 1. DECISÃO CONFIRMADA — NOVA ESTRUTURA DE NAVEGAÇÃO

### Sidebar Principal
```
SETUP
  ├── TAP (Termo de Abertura)
  ├── WBS (renomear de EAP)
  ├── Calendário
  ├── Tarefas e Diagramas (renomear de CPM)
  └── Orçamento

MOTOR MATEMÁTICO
  ├── Funções
  │   ├── [aba] Função Prazo   → burndown + OLS/Ponderada
  │   └── [aba] Função Custo   → Curva S + Ponderada/Tangente Exata
  └── Triângulo Matriz         → TM (sombra) + TA (atual) + ZRE + NVO

GOVERNANÇA
  ├── Gerenciamento            → progresso real (%) + Caixa de Ferramentas
  ├── Kanban                   → board de tarefas em execução
  ├── MATED                    → simulador de decisões + histórico
  ├── Índice de Qualidade      → badge TA/TM em série temporal
  └── Gabinete de Crise        → alertas + Klauss IA + Caixa de Ferramentas

ADMINISTRAÇÃO (FORA da sidebar — menu avatar/header)
  ├── Conta e plano
  ├── Faturamento (Stripe)
  └── Configurações
```

### Nomenclatura Confirmada
| Antigo | Novo | Decisão |
|--------|------|---------|
| CDT | Triângulo Matriz (TM) | ✅ Confirmado pelo fundador |
| EAP | WBS | ✅ Confirmado |
| CPM (page) | Tarefas e Diagramas | ✅ Confirmado |
| Funções | Funções (2 abas: Prazo + Custo) | ✅ Confirmado |
| Motor de Razão | Índice de Qualidade (TA/TM badge) | ✅ Definido no debate |
| War Room | Gabinete de Crise | ✅ Confirmado |

---

## 2. FUNDAMENTOS MATEMÁTICOS — DECISÕES CANÔNICAS

Fonte: `Aura_Fundamentos_Matematicos.md` + `Aura_Memoria_Matematica_Decisoes.md` + `Aura_Memoria_Matematica_v2.md`

### Curva S
- **ADOTADO:** Modelo Cúbico `y(t) = C·(3t²-2t³)` — padrão para obras civis
- **A TESTAR:** Linear (projetos constantes), Quadrático (crescimento contínuo)
- Ponto de inflexão sempre em `t=0.5` (50% da duração)

### Reta Tangente — Orçamento (Lado O)
| Método | Fórmula | Uso |
|--------|---------|-----|
| Tendência no Pico | Regressão Ponderada `Peso_i = (i+1)/n × fator_atividade` | **Padrão** |
| Tangente Exata | Derivada central 2ª ordem no ponto de inflexão | Projeto estável |
| (futuro) OLS puro | Regressão simples | Comparação |

### Reta Tangente — Prazo (Lado P)
| Método | Fórmula | Uso |
|--------|---------|-----|
| Rota Completa | OLS global sobre burndown | **Padrão** |
| Tendência no Pico | Regressão Ponderada | Projeto com variação de ritmo |
- **A TESTAR:** Regressão polinomial grau 2 sobre burndown (captura aceleração do atraso)

### Vetores de Intensidade (Adimensionalização)
```
E = 1.0                              (Escopo — âncora fixa)
O = coefOrc / (BAC / totalDias)      (taxa real / taxa média planejada)
P = |coefPrazo|                      (dias realizados / dia planejado)
```
- `O = 1.0` → gastando na taxa planejada
- `O > 1.0` → acima do planejado
- `P = 1.0` → ritmo perfeito
- `P > 1.0` → consumindo mais dias que planejado

### Limites de Descarte (CEt)
```
limOrcMax = 1 + (contingenciaPct / 100)
limOrcMin = 0.05 | limPrzMax = 2.0 | limPrzMin = 0.05
CEt verificada PRÉ-normalização
```

### Zonas MATED (calibradas no Big Dig — D21 do paper)
| Zona | Range | Cor |
|------|-------|-----|
| ÓTIMO | 0.00–0.05 | Verde |
| SEGURO | 0.05–0.15 | Amarelo-verde |
| RISCO | 0.15–0.30 | Laranja |
| CRISE | > 0.30 | Vermelho |
**Status:** provisórios — agenda de pesquisa M1 requer calibração com 50+ projetos reais

### Ponto de Operação
- **ADOTADO:** Centroide do triângulo atual (não vértice C)
- NVO = baricentro do triângulo órtico (ou incentro se obtusângulo)

---

## 3. DIAGRAMAS — ESPECIFICAÇÃO TÉCNICA APROVADA

### 3.1 PERT — Auto-cálculo obrigatório

**Requisito:** sistema preenche ES/EF/LS/LF e folgas automaticamente a partir da lista de tarefas e predecessoras. Usuário não edita manualmente.

**Algoritmo CPM:**
```
FORWARD PASS:
  ES(tarefa_raiz) = 0
  EF(t) = ES(t) + duração(t)
  ES(t) = max(EF(predecessoras(t)))

BACKWARD PASS:
  LF(tarefa_final) = max(EF de todas as tarefas)
  LS(t) = LF(t) - duração(t)
  LF(t) = min(LS(sucessoras(t)))

FOLGAS:
  Folga Total  (TF) = LF(t) - EF(t)  [ou LS(t) - ES(t)]
  Folga Livre  (FF) = min(ES(succ)) - EF(t)

CAMINHO CRÍTICO:
  Tarefas com TF = 0
  Empate de duração total: listar todos os caminhos empatados
  Priorizar: caminho cuja TAREFA MAIOR duração for a maior
```

**Especificação visual dos nodes PERT:**
```
┌─────────┐
│  T01    │   ← ID da tarefa (display)
│  15d    │   ← duração em dias
└─────────┘
```
- Nodes: retângulos com bordas arredondadas (8px radius)
- Caminho crítico: borda vermelha (`#ef4444`), seta vermelha espessa (2.5px)
- Demais tarefas: borda cinza (`#475569`), seta cinza (`#94a3b8`, 1.5px)
- Arrowhead: preenchido, tamanho 8px
- Layout: algoritmo Sugiyama (camadas por nível de dependência)
- Viewport: scroll + zoom (mouse wheel), sem minimap obrigatório na v1

**Regra de empate de caminho crítico:**
1. Calcular duração total de cada caminho
2. Se empate: listar todos os caminhos empatados no CriticalPathPanel
3. Destacar no PERT: priorizar o caminho com maior duração individual de tarefa
4. PM pode selecionar qual caminho visualizar no painel

### 3.2 Gantt — Efeito Lupa

**Posição:** abaixo do gráfico da Função Custo (como referência de orientação temporal)

**Comportamento:**
- Estado normal: Gantt NÃO renderiza barras completas — exibe apenas eixo temporal fino (linha de base)
- Hover sobre qualquer ponto do gráfico Função Custo: aparece um overlay tipo tooltip-lupa mostrando SOMENTE a região de ± 15% do período hovered
- O overlay lupa mostra: barras do Gantt para as tarefas ativas naquela janela temporal, com cores crítico (vermelho) / folga (cinza-azul)
- Click fixa a lupa até novo click fora

**Implementação sugerida:**
```tsx
// Componente GanttLupa
// onMouseMove no gráfico → calcula dia central hovered
// Renderiza overlay com width ~280px mostrando janela [diaHovered-15%, diaHovered+15%]
// Barras com altura 12px, label truncado a 10 chars
// Critical path bars: bg-red-500/70
// Normal bars: bg-slate-500/50
```

---

## 4. CAIXA DE FERRAMENTAS — DISTRIBUIÇÃO APROVADA

**Decisão do fundador (2026-03-17):**

### Em "Gerenciamento" (Governança)
Ferramentas de **diagnóstico e planejamento de ação:**
- @aura-production + Dr. Kenji definem lista final
- Sugestão preliminar: 5W2H, Espinha de Peixe (Ishikawa), PDCA, Lote Econômico (EOQ), Simplex
- Klauss sugere a ferramenta mais adequada ao contexto atual do projeto

### No "Gabinete de Crise"
Ferramentas de **resposta a crises e decisão rápida:**
- @aura-production + Dr. Kenji definem lista final
- Sugestão preliminar: Árvore de Decisão, FTA (Fault Tree Analysis), Monte Carlo (simulação), FMEA simplificado, 5 Porquês
- Klauss aciona automaticamente a ferramenta mais relevante ao tipo de crise detectada

---

## 5. NOVAS ENTIDADES DE BANCO (PRÉ-REQUISITO)

```sql
-- TM versionado (Histórico de Pecados)
triangulo_matriz_versoes: id, projeto_id, versao, area_baseline, lados JSONB, motivo, criado_em

-- Progresso real (execução)
progresso_tarefas: id, tarefa_id, percentual_avanco, registrado_em, registrado_por

-- Histórico de decisões MATED
decisoes_mated: id, projeto_id, descricao, parametros_numericos JSONB,
                distancia_nvo, zona_resultado, impacto_area_percent, criado_em
```

---

## 6. NOVO ENDPOINT DE API (PRÉ-REQUISITO)

```
POST /api/ai/klauss-to-mated
  Input:  { texto: "quero adicionar 30 dias e R$50k" }
  Output: { dias_extra: 30, custo_extra: 50000, confianca: 0.92 }
  Objetivo: Klauss converte linguagem natural em parâmetros numéricos para o MATED
```

---

## 7. AGENDA DE PESQUISA FUTURA (do paper)

| ID | Descrição | Responsável |
|----|-----------|-------------|
| M1 | Calibrar zonas MATED com 50+ projetos reais | @roberta + @aura-math |
| P1 | Generalizar Aura para polígono N-dimensional | @aura-math |
| K2 | Aura probabilístico via Monte Carlo | @roberta + @aura-math |
| P4 | Integração com Critical Chain (CCPM/TOC) | @aura-production + @aura-math |

---

## 8. ORDEM DE IMPLEMENTAÇÃO DOS SPRINTS

| Ordem | Sprint | Conteúdo | Agente Principal |
|-------|--------|---------|-----------------|
| 1 | B-FIX | Bugs B1-B5 (CPM layout, PERT setas, banner, alert(), bigdig deprecated) | @dev + @qa |
| 2 | PERT-V2 | PERT com Sugiyama + nodes compactos + empate caminho crítico | @dev + @dataviz |
| 3 | GANTT-LUPA | Gantt efeito lupa sob Função Custo | @dev + @dataviz |
| 4 | C-CEt | CEt check pré-normalização + Badge Área no motor | @dev (@aura-math guia) |
| 5 | F-CICD | GitHub Actions CI/CD | @devops |
| 6 | RENAME-ROUTES | Renomear rotas (EAP→WBS, CPM→tarefas-diagramas, CDT→triangulo-matriz) | @dev |
| 7 | TM-SHADOW | Triângulo Matriz com sombra TM + TA sobrepostos | @dev + @dataviz |
| 8 | DB-EXEC | 3 novas tabelas + migrations (TM versoes, progresso, decisoes_mated) | @data-engineer |
| 9 | EXEC-MODULE | Módulo execução: % avanço por tarefa + recalcula TA | @dev |
| 10 | KLAUSS-MATED | Novo endpoint klauss-to-mated + Klauss sugere ferramentas | @jordy + @dev |
| 11 | FERRAMENTAS | Caixa de Ferramentas em Gerenciamento e Gabinete de Crise | @dev + @aura-production |
| 12 | ADMIN-SIDEBAR | Administração fora da sidebar (header/avatar menu) | @dev + @ux-design-expert |

---

## 9. PONTOS ABERTOS RESOLVIDOS (Sessão P5)

| # | Ponto | Resposta |
|---|-------|---------|
| P1 | Fluxo de execução | Kanban + Gerenciamento → % avanço → recalcula TA |
| P2 | Motor de Razão | = `TA/TM` badge — renomear para "Índice de Qualidade" |
| P3 | Problema Tarefas e Diagramas | Precedência/simultaneidade + bugs B1/B2. Auto-cálculo CPM resolve o manual |
| P4 | 4 sessões sequenciais | ✅ S1→S2→S3→S4 confirmadas |

---

## 10. ALTERNATIVAS MATEMÁTICAS A TESTAR (🟡)

1. Pesos exponenciais na regressão ponderada
2. Regressão polinomial grau 2 sobre burndown de prazo
3. Normalização por perímetro (En+On+Pn=1)
4. Comparação de área com equilátero inscrito (métrica absoluta)
5. OLS no orçamento como 3ª opção para o board

---

## 11. CALIBRAÇÃO CDT — DECISÕES CANÔNICAS (Sessão 11 — 2026-03-19)

**Fonte:** Debate fundador + squad (@aura-math, @roberta, @pm-engineer, @aura-production)
**Story:** `docs/stories/3.0.story.md` — detalhamento completo com ACs e componentes

### Denominadores Corretos

```
lado_P = duracao_acumulada / duracao_caminho_critico_baseline
  → "caminho_critico" = tarefas com TF=0 via CPM (não prazo_total)
  → folgas são buffers, não capacidade produtiva (TOC)

lado_O = custo_acumulado / orcamento_operacional
  → orcamento_operacional = orcamento_total × (1 − percentual_contingencia / 100)
  → equivalente ao BAC PMBOK (exclui Management Reserve)

percentual_contingencia: campo no TAP, default por setor
  → Construção=15%, TI=10%, Serviços=12%
  → Management Reserve NÃO entra no modelo
```

### Sistema de Zonas (CEt + Dashboards)

| Zona | Prazo | Custo | Ação |
|------|-------|-------|------|
| **Verde** | ≤ caminho crítico | ≤ orçamento operacional | Normal |
| **Amarela** | dentro da folga | dentro da contingência | Sinaliza, permite |
| **Vermelha** | esgota folga | esgota contingência | Pecado + triângulo marcado |
| **Cinza** | além do prazo total | — | Possível, aviso dano externo |
| **Nula** | — | além do total | Impossível — bloqueado* |

*Zona Nula: desbloqueável apenas com declaração PM/PO + justificativa textual + timestamp no registro de pecados.

### Hierarquia de Leitura (3 Modos)
```
RÁPIDO   → semáforo 🟢🟡🔴⚫ no header
PAINEL   → triângulo com faixas de zona (opacidade aditiva)
DECISÃO  → tabela candidatos CEt: +X dias / +R$ Y / zona
```

### Velocidade de Degradação
```
d(distância_NVO)/dt → se positivo e acelerando:
alerta preditivo: "Ritmo atual leva à Zona Amarela em ~X dias"
janela: regressão linear nos últimos 5 pontos de distância_NVO
```

### Assimetria Prazo × Custo
- **Custo além do total:** impossibilidade física — dinheiro não existe → Zona Nula
- **Prazo além do total:** o tempo existe — Zona Cinza com aviso de dano externo
- Não são simétricas e não devem ter o mesmo tratamento

---

*Gerado por @aiox-master (Orion) | Sessão P5 — 2026-03-17*
*Referência: `docs/WORK-LOG.md §7`, `Aura_Fundamentos_Matematicos.md`, `Aura_Memoria_Matematica_Decisoes.md`, `Aura_Memoria_Matematica_v2.md`, `memória.md`*
*Seção §11 adicionada: Sessão 11 — 2026-03-19*

---

## 12. AUDITORIA + DECISÕES ARQUITETURAIS (Sessão 12 — 2026-03-21)

**Fonte:** Auditoria de código + debate squad completo
**Story atualizada:** `docs/stories/3.0.story.md` (v2 — 2026-03-21)

### D-ARCH-1 — `duracao_acumulada`
```
duracao_acumulada = data_atual − data_inicio_real  (dias calendário)
data_inicio_real  = campo nullable no TAP (PM preenche quando projeto arranca)
fallback          = prazo_inicio do TAP + aviso explícito na UI
```
TA usa POSIÇÃO: `lado_P = dias_corridos / caminho_critico_baseline_dias`
TM usa VELOCIDADE: coef. burndown de `math.ts` (sem mudança — Story 1.3 está correta)
TODO incorreto em `execution.ts:110` removido em Story 3.0-B

### D-ARCH-2 — Separação TA vs TM
| Triângulo | Arquivo | Lado P | Propósito |
|-----------|---------|--------|-----------|
| TA (onde está) | `execution.ts` | dias_corridos / caminho_critico | Story 3.0-B |
| TM (para onde vai) | `math.ts` | coef. burndown (reta tangente) | Story 1.3 — não muda |

### Nomenclatura de Zonas — Dois sistemas distintos
| Sistema | Arquivo | Zonas | Limites |
|---------|---------|-------|---------|
| Eixo de Dimensão (geométrico) | `cet-dimension.ts` | `faixa_nominal / faixa_ajuste / fora_do_cone` | Fixos: 1.10/1.25 |
| Zonas Operacionais (financeiro) | `zones.ts` (novo) | `verde / amarela / vermelha / cinza / nula` | Dinâmicos por projeto |

`faixa_contingencia` em `cet-dimension.ts` renomeado para `faixa_ajuste` — elimina ambiguidade com contingência financeira.

### Defaults de Contingência por Setor (D7 corrigido)
| Setor | Default | Observação |
|-------|---------|------------|
| construcao_civil | 15% | Literatura: Flyvbjerg/PMI |
| tecnologia | 10% | Literatura: PMI Pulse |
| infraestrutura | 15% | Literatura: World Bank |
| saude | 10% | Literatura: PMI Pulse |
| (outros) | 10% | Fallback global + aviso UI |

"Serviços" removido — sem benchmark confiável na literatura.

### Re-calibração dos Priors Bayesianos (N1)
Migration SQL na Story 3.0-A aplica fator de ajuste antes de 3.0-B alterar o engine:
```sql
fator = 1.0 / (1.0 - percentual_contingencia_default / 100.0)
-- construcao_civil: ×1.176 | tecnologia: ×1.111 | infraestrutura: ×1.176 | saude: ×1.111
UPDATE aura_calibration_events SET mated_medio = mated_medio * fator
WHERE tipo = 'prior'
```

### Fluxo PERT/CPM Aprovado (N2) — Story PERT-1
```
[1] Tem documento formal O/M/P? → SIM → upload → PERT via documento
                                 → NÃO ↓
[2] Quer ajuda do Klauss?       → SIM → Klauss guia (recomendado: alto risco)
   (aviso: X tarefas ≈ Y min)   → NÃO ↓
[3] Prefere PERT ou CPM?        → PERT → campos O/M/P manuais por tarefa
                                → CPM  → durações do WBS (motor atual)
```
Nova story PERT-1 — separada de 3.0, não bloqueia SDC atual.
Campo `metodo_estimativa` em `projetos`: `cpm | pert_manual | pert_documento | pert_assistido`

### Campos novos no TAP (Story 3.0-A)
- `percentual_contingencia` NUMERIC(5,2) nullable — default via setor
- `data_inicio_real` DATE nullable — fallback `prazo_inicio` + aviso
- `caminho_critico_baseline_dias` INTEGER — snapshot imutável no momento de criação

### Pré-condição para Story 3.0-B
Story 5.2 DoD pendente: `calcularMATED()` não executado + @aura-math não assinou.
**Deve ser fechado antes de iniciar 3.0-B.**

### Inconsistências de código a corrigir (mapeadas para sub-stories)
| Arquivo | Problema | Story |
|---------|---------|-------|
| `execution.ts:127` | `orcamento_base` → `orcamento_operacional` | 3.0-B |
| `execution.ts:114` | `P = E` proxy → fórmula real | 3.0-B |
| `execution.test.ts:199` | testes quebram com 3.0-B | reescrever em 3.0-B |
| `math.ts:556` | fallback `\|\| 10` → lookup setorial | 3.0-B |
| `curva-s/page.tsx:100` | `contingenciaPct` hardcoded 10% | 3.0-D |
| `cet-dimension.ts:26` | renomear `faixa_contingencia` | 3.0-C |

---

*Seção §12 adicionada: Sessão 12 — 2026-03-21*


---

## §13 — FIX-B3: Auditoria calcularMATED + decisão regressaoPonderadaMurphy (2026-03-25)

### calcularMATED — Assinatura @aura-math

Função `evaluateDecision()` em `euclidian.ts` validada formalmente.

| Caso | Input | d_MATED | Zona | Direção |
|------|-------|---------|------|---------|
| Big Dig 2001 | E=1.0, P=1.0, O=2.5 | **0.705** | CRISE | CUSTO |
| Equilátero | E=P=O=1.0 | **~0.000** | ÓTIMO | — |

**Confirmado:** NVO = baricentro do triângulo órtico. Big Dig 2001 → d_custo=0.705 >> d_prazo=0.000 → deformação por custo corretamente identificada. Equilátero → d≈0 conforme teoria. **Story 5.2 DoD formalmente fechado.**

### regressaoPonderadaMurphy — Decisão formal

**Opção B: Manter como utilitário, não obrigatório no pipeline CDT**

- Peso 1.8 = convenção interna sem base formal no MetodoAura.md
- Pipeline atual usa regressaoOLS em P do TM (correto — MASTERPLAN Passo 1)
- Função permanece em `math.ts` com JSDoc de status
- Integração ao pipeline adiada para v7.0 quando MetodoAura formalizar tratamento de zeros Murphy
- Sub-story FIX-B3a: **não criada** (premature optimization)

**@aura-math assinou em 2026-03-25**

---

## §14 — Sessão 14: Lint Zero + MetodoAura §3 Revisado + Projeto Laboratório (2026-03-26)

### Lint Cleanup — Estado Final

Após `.eslintrc.json` atualizado (Sessão 13) + fixes pontuais (Sessão 14):

| Métrica | Antes (Sessão 13) | Depois (Sessão 14) |
|---------|-------------------|---------------------|
| Erros ESLint | ~110 | **0** |
| Erros TypeScript | 0 | **0** |
| Testes | 568/568 | **568/568** |
| Build produção | OK | **OK** |

**Fixes aplicados (Sessão 14):**
- Removido `// eslint-disable-next-line @typescript-eslint/no-explicit-any` solto dentro de JSX children em `funcoes/page.tsx:393` (jsx-no-comment-textnodes — introduzido por agente background)
- `eapCount` → `_eapCount` (destructure alias) em `wbs/page.tsx`
- `handleTableInputChange` → `_handleTableInputChange` em `wbs/page.tsx`
- Adicionados `.eslintignore` e `fix-gantt.cjs` ao tracking

**Commits:** `d0554cb` (lint zero) · `3e44a9f` (untracked files)

---

### MetodoAura.md §3 — Formalização Dual do MATED (decisão canônica)

**Lacuna identificada por @aura-math durante FIX-B3:** O MetodoAura.md descrevia MATED apenas como ferramenta de seleção ex-ante (decisões candidatas). O código (`euclidian.ts` + `execution.ts`) implementa também uso ex-post (centroide do TA como Ponto de Operação Atual). Ambos corretos, mas o MetodoAura não documentava o segundo uso.

**Resolução:** MetodoAura.md §3 reescrito com 4 subseções:

| Seção | Conteúdo |
|-------|---------|
| §3.1 | Fundação geométrica — triângulo órtico + NVO (baricentro) |
| §3.2 | MATED seleção ex-ante — ranqueia decisões candidatas Dₙ por d ao NVO |
| §3.3 | MATED monitoramento ex-post — centroide do TA como POA + tabela de zonas + eixo dominante |
| §3.4 | Tabela de distinção ex-ante vs ex-post com referência ao código |

**Tabela de Zonas de Saúde (agora canônica no MetodoAura.md):**

| Zona | d | Significado |
|------|----|-------------|
| ÓTIMO | d < 0,05 | Equilíbrio perfeito |
| SEGURO | 0,05 ≤ d < 0,15 | Desvio gerenciável |
| RISCO | 0,15 ≤ d < 0,30 | Monitoramento intensificado |
| CRISE | d ≥ 0,30 | Intervenção imediata |

**Decisão canônica:** Centroide do TA = POA. Justificativa matemática: minimizador L2 (menor soma de distâncias quadráticas aos vértices). Confirmado: equilátero → centroide = NVO → d=0. Big Dig 2001 → d=0,705, zona CRISE, eixo CUSTO.

**Commit:** `c96e25d`
**Autoridade:** @aura-math + @aura-production + @kenki + @roberta

---

### Projeto Laboratório — "Edifício Comercial Horizonte"

Squad @aura-math + @kenki + @aura-production + @roberta projetou projeto de laboratório PMI completo para validação sistemática do Aura.

**Parâmetros:**
- Setor: construcao_civil | Data início: 2026-04-01 | Prazo: 165 dias úteis
- Orçamento Base: R$ 1.650.000 | Operacional: R$ 1.402.500 (contingência 15%)
- 10 tarefas CPM | 2 caminhos paralelos | WBS 3 níveis

**Caminho crítico calculado:** T01→T02→T03→T07→T09→T10 = 165 dias
- T02 (Estrutura Metálica): 32,1% do orçamento — testa desvio no vértice O
- T05 tem folga 10 dias; T04 folga 5 dias; T06 folga 25 dias

**Valores esperados para validação (calculados manualmente pelo squad):**

| Cenário | E | P | O | d_MATED | Zona |
|---------|---|---|---|---------|------|
| Baseline (t=0) | 1,0 | 1,0 | 1,0 | **0,067** | SEGURO |
| t=50% / custo=110% BAC_op total | 0,50 | 0,50 | 1,10 | **0,198** | RISCO |
| Big Dig 2001 (referência) | 1,0 | 1,0 | 2,5 | **0,705** | CRISE |

**SDO esperado ao arquivar com estouro:** ~0,478 (abaixo da meta SMART de 0,75)
- Componente área: 0,787 (bom — triângulo não colapsou)
- Componente trajetória: 0,385 (penaliza MATED crescente ao longo da execução)
- Componente benchmark: 0,111 (MATED final 39% acima da média setorial)

**Nota @roberta:** cenário de validação usa O=1,10 como fração do BAC operacional **total** (não proporcional ao avanço), representando extrapolação do orçamento na metade da obra — CPI=0,909.

*§14 adicionado: Sessão 14 — 2026-03-26*

---

## §15. Sessão 16 — Deliberações Executivas da Assembleia (2026-03-27)

Reunião do squad completo liderada por @aiox-master, com pareceres de @aura-math, @aura-production, @roberta e @pm-engineer (Kenji). As seguintes diretrizes foram aprovadas e implementadas:

**1. Congelamento de Features Complexas**
Ficam suspensas novas implementações no motor e integrações de IA avançadas (como o Crashing IA). O foco total e exclusivo do próximo sprint será o Design Sprint do Dashboard de 3 Níveis para reduzir a carga cognitiva do PM.

**2. Migração Documental: Story 4.0**
A Story 4.0 ("Advisor de Compressão IA") extrapolava o PRD e o Masterplan do Épico 04 (restrito a diagramas PERT/Gantt). Ela foi legalmente migrada para o Épico 07 (Klauss IA) sob o arquivo `7.10.story.md`.

**3. Correção Crítica do Gap de Baseline (M1)**
Para garantir a sanidade da calibração Bayesiana, a função `criarVersaoInicial()` (Baseline TMv1) agora é engatilhada automaticamente e de forma segura no *exato momento* em que a rede CPM é salva/aprovada pela primeira vez.

**4. Mapeamento de Stories Pendentes**
O squad gerou os primeiros rascunhos para as stories administrativas faltantes (Admin/Billing no Épico 10 e DevOps no Épico 08, resolvendo o gap de 83 stories não documentadas).

**5. Resolução da Singularidade T=0 (Colapso no Dashboard)**
Avaliamos a queixa de que o TA no instante de baseline (t=0) estava colapsando e gerando parâmetros deformados (`P=-0.012`, `Area=0.0050`) apesar do TM estar de acordo e com saúde 100%.
- **Diagnóstico:** O Dashboard estava injetando `diaAtual: 0` de modo hardcoded, enquanto o cálculo para $t=0$ resultava em tangentes 0, o que dividia $0/0$ e limitava os valores `C_raw` e `P_raw` a `0.01`, reprovando a CEt e colapsando o triângulo.
- **Implementação:** Sincronizou-se o Dashboard para puxar `diaAtualProjeto` relativo à `data_inicio_real`, e a lógica matemática (`math.ts`) recebeu hard-guards para retornar `1.0` (equilátero perfeito C=1, P=1, E=1) no exato instante onde tangentes base e atual equivalem a 0 simultaneamente.

*Fim da ata da Assembleia.*

---

## §16. Sessão 21 — Sprint A MASTERPLAN-X: Compensação TM + Klauss v3.0 + Botões Órfãos (2026-03-28)

### calcularCompensacao() — Bisecção sobre Heron

**Decisão matemática (@aura-math):** Dado ΔP proposto pelo PM, o sistema calcula ΔC compensatório para manter A_TM constante.

**Propriedade central:** Para triângulo com lados fixos e e p_novo, a área como função de c é côncava com máximo em:
- `c_pico = sqrt(e² + p_novo²)` → `A_max = e × p_novo / 2`

Isso permite bisecção determinística em dois ramos (esquerdo e direito), sem ternary search.

**Algoritmo:**
1. Calcular p_novo = p + delta_p
2. Verificar viabilidade: area_alvo < A_max (se não, sem_solucao=true)
3. Bisecção ramo esquerdo: c ∈ [cet_lo, c_pico] (área crescente)
4. Bisecção ramo direito: c ∈ [c_pico, cet_hi] (área decrescente)
5. Retornar solução mais próxima de c atual

**Fix y₀ detectado durante análise:** avgCustoRate incluía o intercepto y₀ (mobilização) na normalização do eixo custo, gerando assimetria entre eixo custo e eixo prazo. Corrigido para `custoRange = |custoEnd - custoStart|` (mirrors burndownRange existente).

### Klauss v3.0 — Narrativas de Transição Geométrica

**Princípio:** O assistente IA deve comunicar mudanças de forma do triângulo em linguagem de gestão, não em linguagem matemática abstrata.

**Transições implementadas:**
- `acutângulo → obtusângulo_C`: "pressão financeira estrutural — risco de deformação plástica"
- `acutângulo → obtusângulo_P`: "cronograma consumindo geometria — comprima o caminho crítico"
- `qualquer → retângulo`: "ponto de inflexão — dissociação prazo/custo — perda de resiliência elástica"
- `qualquer → inválido`: "ruptura geométrica — CET violada — intervenção imediata"

**Compensação TM injetada no [CONTEXT]:** quando compensacaoData disponível, Klauss recebe ΔP/ΔC calculados pelo motor e os traduz para Dias e R$.

### Fix TypeScript — ProjectContextType

`cdtAtual` não existe em `ProjectContextType`. A forma correta de obter estado CDT nos componentes que não têm acesso ao `cdtData` local é:
- `matedAtual: number | null` → MATED distance (Story 5.3)
- `taAtual: TrianguloAtual | null` → lados E, P, O (Story 5.2)
- `classificarFormaTriangulo(E, C, P)` de math.ts → deriva forma localmente
- Triangle inequality local → deriva cetOk

`diaAtualProjeto` não existe em context — deve ser computado localmente via `useMemo` a partir de `dataInicio` e `dataInicioReal`.

*§16 adicionado: Sessão 21 — 2026-03-28*
