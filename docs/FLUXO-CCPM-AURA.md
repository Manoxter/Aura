# FLUXO CCPM AURA — Da Entrada ao Triângulo
**Data:** 2026-04-05 | **Autor:** Squad triq-engineering (Yuri presidente)
**Objetivo:** Mapear o fluxo completo de dados para que o motor CCPM funcione de ponta a ponta.

---

## 1. ESTADO ATUAL vs ESTADO NECESSÁRIO

### O que FUNCIONA hoje
| Módulo | Status | Motor |
|--------|--------|-------|
| TAP (nome, prazo, orçamento) | ✓ Salva em `projetos` | — |
| WBS/EAP (árvore de tarefas) | ✓ Salva em `eap_nodes` + `tarefas` | — |
| CPM (forward/backward pass) | ✓ Calcula ES/EF/LS/LF/folga | `cpm.ts` |
| Caminho Crítico | ✓ Identifica e rankeia | `cpm.ts` |
| Calendário (marcos, regime) | ✓ Baseline congelado | — |
| Orçamento (custos por tarefa) | ✓ Salva em `orcamentos` | — |
| Curva S financeira | ✓ Projeção acumulada | `math.ts` |
| CDT (triângulo) | ✓ Gera do S-curve + burndown | `math.ts` |

### O que FALTA para CCPM completo
| Módulo | Status | Motor | Bloqueio |
|--------|--------|-------|----------|
| **Estimativa otimista/pessimista** | ✗ UI inexistente | `ccpm.ts` | Sem isso, buffer = 0 |
| **Corte Goldratt (D1)** | ✗ Não é acionado | `ccpm.ts → cortarEstimativa()` | Função existe, sem trigger |
| **Buffer RSS (D2)** | ✗ Não calcula | `buffer.ts → calcularProjectBuffer()` | Precisa de duracao_otimista |
| **Buffer de Custo (D6)** | ✗ Não calcula | `buffer.ts → calcularCostBuffer()` | Precisa de custo_otimista |
| **Alocação de recursos** | ✗ Sem UI | `ccpm.ts → nivelarRecursos()` | Sem recurso_id |
| **Sprints/Fractais** | ✗ Dados existem em `sprints_fractais` mas sem conexão ao motor | `fractal-builder.ts` | Sem trigger |
| **TM escaleno com fractais** | ✗ SierpinskiMesh existe mas sem dados reais do motor | `sierpinski.ts` | Sem TM calculado |
| **MATED composto** | ✗ Engine pronto, sem dados | `nvo-ponderado.ts` | Sem fractais construídos |

---

## 2. O FLUXO CCPM CORRETO (como deve ser)

```
ETAPA 1: TAP (PM define projeto)
  ↓ Nome, prazo contratual, orçamento total, contingência %
  ↓ Data início, data fim
  ↓ "Inclui sábado?" [toggle, default: não]
  ↓ "Conectar ClickUp?" [botão opcional]
  ↓ Sistema deduz: 8h/dia, seg-sex, feriados nacionais automáticos
  ↓ SEM tela de calendário separada — tudo dentro do TAP
  ↓ Se conectou ClickUp → importa sprints/tarefas automaticamente
  ↓ Se não → fluxo manual (Etapas 2-4)
  ↓ Salva em: projetos (com unidade_tempo='dias', horas_por_dia=8)
  
ETAPA 2: ESCOPO (PM define entregas/milestones)
  ↓ Define N sprints como MILESTONES (entregas)
  ↓ Cada sprint = nome + data_entrega (backward do Ômega)
  ↓ Salva em: sprints_fractais (ordem, nome, data_inicio, data_fim)
  
ETAPA 3: WBS (PM define tarefas por sprint)
  ↓ Para cada sprint, PM lista tarefas com dependências
  ↓ Cada tarefa: nome, sprint_id, predecessoras
  ↓ Salva em: tarefas (com sprint_id linkado)
  ↓ Salva em: eap_nodes (estrutura hierárquica)

ETAPA 4: COLETA DE ESTIMATIVAS (colaboradores por email)
  ↓ PM recruta colaboradores (convites_projeto)
  ↓ Cada colaborador recebe email com link (token JWT)
  ↓ Colaborador responde SEM login:
    - Tempo otimista (horas)
    - Tempo pessimista (horas)
    - Custo otimista (R$)
    - Custo pessimista (R$)
    - Papel no sprint
  ↓ Salva em: estimativas_colaborador → atualiza tarefas
  ↓ Sistema monitora: X/Y responderam
  ↓ Quando 100% respondeu → dispara ETAPA 5 automaticamente
  
ETAPA 5: MOTOR CCPM (automático, sem intervenção do PM)
  ↓
  ↓ 5.1 — CPM Forward Pass
  ↓   ES = max(EF predecessoras), EF = ES + duracao_pessimista
  ↓   Motor: cpm.ts → calculateCPMLocal()
  ↓
  ↓ 5.2 — CPM Backward Pass
  ↓   LF = min(LS sucessoras), LS = LF - duracao_pessimista
  ↓   Folga = LS - ES. Crítica se folga = 0.
  ↓   Motor: cpm.ts → calculateCPMLocal()
  ↓
  ↓ 5.3 — Caminho Crítico
  ↓   Enumerar todos os caminhos com folga = 0 (PMBOK ranking)
  ↓   Motor: cpm.ts → findAllCriticalPaths()
  ↓
  ↓ 5.4 — Corte Goldratt (D1)
  ↓   duracao_agressiva = max(1, ceil(duracao_pessimista × 0.5))
  ↓   custo_agressivo = custo_pessimista × (duracao_agressiva / duracao_pessimista)
  ↓   Motor: ccpm.ts → cortarEstimativa()
  ↓
  ↓ 5.5 — Prazo Mínimo (Cadeia Crítica)
  ↓   prazo_minimo = Σ(duracao_agressiva) das tarefas do caminho crítico
  ↓   Este é o tempo LÍQUIDO mínimo para o projeto existir.
  ↓   Motor: soma das EF agressivas
  ↓
  ↓ 5.6 — Buffer do Projeto (D2 — RSS)
  ↓   gordura_i = duracao_pessimista_i - duracao_otimista_i
  ↓   PB = ceil(√(Σ gordura_i²))
  ↓   Motor: buffer.ts → calcularProjectBuffer()
  ↓
  ↓ 5.7 — Buffer de Custo (D6 — RSS)
  ↓   gordura_custo_i = custo_pessimista_i - custo_otimista_i
  ↓   CB = ceil(√(Σ gordura_custo_i²))
  ↓   Motor: buffer.ts → calcularCostBuffer()
  ↓
  ↓ 5.8 — Feeding Buffers
  ↓   Para caminhos não-críticos que alimentam a CC
  ↓   Motor: buffer.ts → calcularFeedingBuffers()
  ↓
  ↓ 5.9 — Truncamento CEt (D14)
  ↓   Buffer não pode exceder 25% do baseline
  ↓   Motor: buffer.ts → truncarBufferCEt()
  ↓
  ↓ 5.10 — Prazo Total do Projeto
  ↓   prazo_total = prazo_minimo + PB
  ↓   Este é o prazo com proteção CCPM.
  ↓
  ↓ 5.11 — Distribuição de Buffers por Sprint
  ↓   Cada sprint recebe proporção do buffer:
  ↓   buffer_sprint_i = PB × (duracao_sprint_i / duracao_total)
  ↓   Salva em: sprints_fractais.buffer_original
  ↓
  ↓ 5.12 — Construção do TM (Triângulo Mestre)
  ↓   E = 1.0 (escopo normalizado)
  ↓   P = prazo_total / prazo_baseline (normalizado)
  ↓   C = custo_total / custo_baseline (normalizado)
  ↓   Área = Heron(E, P, C)
  ↓   Motor: math.ts → gerarTrianguloCDT()
  ↓
  ↓ 5.13 — Construção dos Fractais (Backward)
  ↓   Para cada sprint, regra de 3:
  ↓   E'_i = E_tm × (escopo_sprint_i / escopo_total)
  ↓   P'_i = P_tm × (prazo_sprint_i / prazo_total)
  ↓   C'_i = C_tm × (custo_sprint_i / custo_total)
  ↓   Motor: fractal-builder.ts → construirFractaisBackward()
  ↓
  ↓ 5.14 — Sierpinski Layout
  ↓   Malha fixa: nivel = ceil(log2(N))
  ↓   Triângulos ↑ = sprints, ↓ = TBZ
  ↓   Motor: sierpinski.ts → sierpinskiLayout()
  ↓
  ↓ 5.15 — Colinearidade + Clairaut
  ↓   Verificar que fractais estão alinhados ao TM
  ↓   Classificar protocolo (agudo/beta/gamma)
  ↓   Motor: fractal-builder.ts → verificarColinearidade()
  ↓   Motor: clairaut.ts → sintetizarClairaut()
  ↓
  ↓ 5.16 — NVO Ponderado
  ↓   NVO = baricentro ponderado (TM + sprints)
  ↓   Motor: nvo-ponderado.ts → calcularNVOPonderado()
  ↓
  → RESULTADO: TM + Fractais + Buffers + NVO prontos
  → PM notificado: "Projeto pronto para validação"

ETAPA 6: VALIDAÇÃO (PM revisa e coloca pra rodar)
  ↓ PM abre o dashboard
  ↓ Vê o TM escaleno com fractais coloridos
  ↓ Valida e muda status para "execucao"
  ↓ Sistema começa monitoramento contínuo

ETAPA 7: MONITORAMENTO (contínuo, automático)
  ↓ A cada atualização de tarefa (ou webhook):
  ↓   - Recalcular TA (Triângulo Atual)
  ↓   - Calcular MATED composto
  ↓   - Atualizar Fever Chart (5 zonas)
  ↓   - Castle propagação na malha
  ↓   - Klauss narração por sprint
  ↓   - Alertas se zona mudou

ETAPA 8: ARQUIVAMENTO (ao encerrar)
  ↓ SDO ponderado por sprint
  ↓ Bayesian update (priors do setor)
  ↓ Capital intelectual (narrativa Klauss)
```

---

## 3. O QUE PRECISA SER CONSTRUÍDO NO SETUP

### Etapa 2 — Tela de Sprints/Milestones (NOVA)
```
Rota: /[projetoId]/setup/sprints

Funcionalidade:
  - PM define N sprints como entregas (milestones)
  - Cada sprint: nome, data de entrega, descrição
  - Construção BACKWARD: primeiro define o Ômega (entrega final),
    depois define sprints de trás para frente
  - Interface: timeline horizontal com pontos conectados por seta ←
    (como na imagem backward_pass_concept)

Salva em: sprints_fractais + marcos

UI inspiração: Layer 4 (backward pass concept image)
```

### Etapa 3 — WBS por Sprint (REFATORAR)
```
Rota: /[projetoId]/setup/wbs (existente, adaptar)

Mudança:
  - Cada tarefa precisa de campo sprint_id (dropdown de sprints)
  - Agrupar tarefas por sprint na visualização
  - Manter dependências (predecessoras) cross-sprint

Salva em: tarefas (com sprint_id)
```

### Etapa 4 — Coleta por Email (JÁ CRIADA — API route exists)
```
Rota: /[projetoId]/setup/coleta

Funcionalidade:
  - PM vê lista de colaboradores e status de resposta
  - Botão "Enviar convites" → cria tokens + envia emails
  - Progress bar: X/Y responderam
  - Quando 100% → botão "Calcular CCPM" aparece

API: /api/estimativas (GET/POST — já existe)
```

### Etapa 5 — Motor CCPM (AUTOMÁTICO)
```
Rota: nenhuma (processo automático)
Trigger: quando 100% das estimativas chegaram

Sequência:
  1. calculateCPMLocal() com duracao_pessimista
  2. findAllCriticalPaths()
  3. cortarEstimativa() em cada tarefa
  4. calcularProjectBuffer() → PB
  5. calcularCostBuffer() → CB
  6. calcularFeedingBuffers()
  7. truncarBufferCEt()
  8. Distribuir buffers por sprint
  9. gerarTrianguloCDT() → TM
  10. construirFractaisBackward() → Fractais
  11. sierpinskiLayout() → Malha
  12. sintetizarClairaut() → Protocolo
  13. calcularNVOPonderado() → NVO
  14. Salvar tudo no DB
  15. Notificar PM

Arquivo: src/lib/engine/pipeline-ccpm.ts (A SER CRIADO)
```

---

## 4. COMO CALCULAR O PRAZO MÍNIMO (CCPM)

O prazo mínimo é o tempo LÍQUIDO necessário para o projeto, calculado pelo CCPM:

```
PASSO 1: Coletar estimativas (otimista + pessimista) de cada tarefa

PASSO 2: CPM com durações pessimistas
  → Forward/Backward pass
  → Identificar Cadeia Crítica (CC)
  → prazo_pessimista = max(EF) de todas as tarefas

PASSO 3: Corte Goldratt 50%
  → duracao_agressiva_i = max(1, ceil(pessimista_i × 0.5))
  → Recalcular CPM com durações agressivas
  → prazo_agressivo = max(EF) com durações cortadas

PASSO 4: Calcular Buffer (RSS)
  → gordura_i = pessimista_i - otimista_i (por tarefa da CC)
  → PB = ceil(√(Σ gordura_i²))

PASSO 5: Prazo CCPM
  → prazo_ccpm = prazo_agressivo + PB
  
  Este é o prazo mínimo com proteção estatística.
  É MENOR que o prazo pessimista (por causa do corte Goldratt)
  mas PROTEGIDO pelo buffer coletivo (RSS).

PASSO 6: Comparar com prazo contratual (TAP)
  → Se prazo_ccpm ≤ prazo_tap → VIÁVEL (buffer sobra)
  → Se prazo_ccpm > prazo_tap → INVIÁVEL (precisa negociar escopo ou prazo)

EXEMPLO:
  5 tarefas no CC com pessimistas: [10, 8, 12, 6, 14] = 50 dias
  Corte 50%: [5, 4, 6, 3, 7] = 25 dias (prazo agressivo)
  Gorduras: [10-6, 8-5, 12-7, 6-3, 14-8] = [4, 3, 5, 3, 6]
  Buffer = ceil(√(16+9+25+9+36)) = ceil(√95) = 10 dias
  Prazo CCPM = 25 + 10 = 35 dias
  
  Prazo contratual (TAP) = 50 dias → VIÁVEL com 15 dias de folga extra
```

---

## 5. COMO GERAR AS CURVAS DE PRAZO E CUSTO

### Curva de Prazo P(t)
```
Eixo X: tempo (dias/horas)
Eixo Y: progresso do CC (% restante, burndown)

Baseline (TM — dia 0, imutável):
  P_baseline(t) = 1 - (t / prazo_ccpm)
  Reta decrescente de 1 (nada feito) a 0 (tudo entregue)

Real (TA — execução, recalculado continuamente):
  P_real(t) = 1 - (Σ progresso_tarefas_CC / N_tarefas_CC)
  Curva real baseada no progresso físico reportado

Lado P do TM = P_real(hoje) / P_baseline(hoje)
  Se P = 1.0 → exatamente no plano
  Se P > 1.0 → atrasado (mais trabalho restante que o esperado)
  Se P < 1.0 → adiantado
```

### Curva de Custo C(t)
```
Eixo X: tempo (dias/horas)
Eixo Y: custo acumulado (R$)

Baseline (TM — dia 0, imutável):
  C_baseline(t) = Σ custos_tarefas que DEVERIAM estar feitas até dia t
  Curva S acumulada (baseada no cronograma CPM)

Real (TA — execução):
  C_real(t) = Σ custos REAIS gastos até dia t

Lado C do TM = C_real(hoje) / C_baseline(hoje)
  Se C = 1.0 → no orçamento
  Se C > 1.0 → gastou mais que o planejado
  Se C < 1.0 → gastou menos (economia)
```

### TM (Triângulo Mestre)
```
Com E, P, C normalizados:
  E = 1.0 (escopo fixo, âncora)
  P = burndown_real / burndown_baseline
  C = custo_real / custo_baseline

O TM é o triângulo com esses 3 lados.
Área = Heron(E, P, C)
Ângulos = Lei dos Cossenos
Protocolo = Clairaut (agudo/beta/gamma)
```

---

## 6. ORDEM DE IMPLEMENTAÇÃO

### Fase 1 — Fluxo CCPM (2-3 sessões)
1. Criar tela `/setup/sprints` (milestones backward)
2. Refatorar WBS para vincular tarefas a sprints
3. Criar tela `/setup/coleta` (painel de convites + status)
4. Criar `pipeline-ccpm.ts` (orquestrador automático)
5. Conectar pipeline ao banco (salvar TM + fractais + buffers)

### Fase 2 — Dashboard Real (1-2 sessões)
6. Reescrever dashboard para consumir TM + fractais do banco
7. SierpinskiMesh alimentado por dados reais (não mock)
8. Alert Center com dados reais
9. Página do sprint com Fever + MATED reais

### Fase 3 — Brownfield Final (1 sessão)
10. Remover rotas mortas (Gabinete, War Room, etc.)
11. Remover componentes Triq Corporate não usados
12. Limpar sidebar para 3 grupos: Setup → Dashboard → Sprint Drill-Down
13. Testes E2E do fluxo completo

---

## 7. TABELAS SUPABASE NECESSÁRIAS

Todas já existem (migrations 001-006):
- `projetos` — TAP + config
- `sprints_fractais` — sprints com buffer
- `tarefas` — com duracao_otimista, custo_otimista, custo_pessimista, sprint_id
- `eap_nodes` — WBS
- `marcos` — milestones
- `orcamentos` — custos
- `convites_projeto` — coleta por email
- `estimativas_colaborador` — respostas
- `calibration_priors` — Bayesian

O schema está pronto. O que falta é o FLUXO DE DADOS entre as telas e o motor.

---

*Documento gerado por: Yuri (presidente), Fermat (motor), Kenji (produção)*
*Squad: triq-engineering | Sessão: 2026-04-05*
