# PLANO DE IMPLEMENTACAO — AURA CCPM PIPELINE
**Data:** 2026-04-04 | **Versao:** 1.0
**SM:** River | **QA:** Quinn | **Presidente:** Yuri
**Base documental:** FLUXO-CCPM-AURA, FRAMEWORK-TECH D1-D33, FRAMEWORK-UNIVERSAL D34-D43, GEOMETRIA-SIERPINSKI, UI-SPEC, DEPENDENCY-MAP, MASTERPLAN-X, SPRINT-MEMORY ss11-14, como-e-porque P01-P09, TRIQ-6.1-PRD (59 decisoes), TRIQ-SDC-CHARTER, tutorial.log (38 decisoes), relatorio1.log, worklog-sessao-2026-04-04.log

**Premissa fundamental:** Aura e SOFTWARE-ONLY. Nao existe perfil CONSTRUCAO em producao. Calendario NAO e tela separada — sao 3 campos dentro do TAP. Sprints sao MILESTONES (entregas) definidos backward a partir do Omega. Cada sprint = triangulo UP na malha Sierpinski escalena. Triangulos DOWN = TBZ (buffers de transicao CCPM).

---

# PARTE 1 — SM: Plano de Implementacao

---

## ITEM 1: TAP (Termo de Abertura do Projeto)

### Objetivo
Capturar os dados fundacionais do projeto: nome, datas, orcamento, regime de trabalho e integracao opcional com ClickUp. O TAP e o ponto de entrada de todo o fluxo CCPM. Dele derivam todos os denominadores de normalizacao (BAC operacional, caminho critico baseline).

### Rota
```
/[projetoId]/setup/tap  (JA EXISTE — refatorar)
```

### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| MODIFICAR | `src/app/(dashboard)/[projetoId]/setup/tap/page.tsx` | Adicionar campos: data_inicio, data_fim, toggle sabado, botao ClickUp opcional. Remover dependencia de perfil CONSTRUCAO. Simplificar para fluxo TECH-only |
| MODIFICAR | `src/context/ProjectContext.tsx` | Adicionar campos `data_inicio`, `data_fim`, `inclui_sabado`, `horas_por_dia`, `unidade_tempo` ao tipo TAP |
| MODIFICAR | `src/lib/types.ts` | Atualizar `ProfileType` — remover CONSTRUCAO, manter TECH + DEFAULT |
| CRIAR | `src/lib/engine/calendario.ts` | Funcoes: `calcularDiasUteis(inicio, fim, incluiSabado, feriados)`, `buscarFeriadosNacionais(ano)` — lookup automatico de feriados BR |
| MODIFICAR | `src/components/aura/SetupStepper.tsx` | Atualizar steps: TAP > Sprints > WBS > Coleta > (Motor auto) > Validacao |

### Dados de entrada (usuario fornece)
- Nome do projeto (string)
- Justificativa (text)
- Objetivo SMART (text)
- Escopo sintetizado (text)
- Orcamento total (R$)
- Percentual de contingencia (%, default 10% para TECH — D12-Tech, SPRINT-MEMORY s12)
- Data inicio (date)
- Data fim / Omega (date)
- Inclui sabado? (toggle, default: nao)
- Conectar ClickUp? (botao opcional)

### Dados de saida (Supabase)

**Tabela: `projetos`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| nome | text | Nome do projeto |
| orcamento_total | numeric | Orcamento bruto |
| percentual_contingencia | numeric(5,2) | % contingencia (default 10 TECH) |
| prazo_inicio | date | Data inicio |
| prazo_fim | date | Data fim (Omega) |
| data_inicio_real | date nullable | Preenchido quando projeto arranca |
| unidade_tempo | text | 'dias' (fixo) |
| horas_por_dia | integer | 8 (default) |
| inclui_sabado | boolean | false (default) |
| status | text | 'rascunho' > 'planejamento' > 'coleta' > 'calculando' > 'validacao' > 'execucao' > 'arquivado' |
| clickup_space_id | text nullable | ID do espaco ClickUp (se integrado) |

### Motor acionado
- Nenhum motor na etapa TAP. Apenas persistencia.
- `calendario.ts → calcularDiasUteis()` e chamado para exibir "X dias uteis" no form.

### Dependencias
- Migration 001 (tabela `projetos`) — JA EXISTE
- Migration 005 (campos complementares) — JA EXISTE
- Migration 006 (campos calendario: unidade_tempo, horas_por_dia, inclui_sabado) — JA EXISTE

### Criterios de aceite
- [ ] PM preenche todos os campos obrigatorios e salva com sucesso
- [ ] Sistema calcula e exibe dias uteis entre data_inicio e data_fim (excluindo fins de semana e feriados nacionais BR)
- [ ] Toggle sabado altera calculo de dias uteis em tempo real
- [ ] Default horas_por_dia = 8, seg-sex, sem necessidade de tela de calendario separada
- [ ] Se ClickUp conectado, importa sprints/tarefas automaticamente (skip etapas 2-4)
- [ ] Se ClickUp NAO conectado, fluxo manual continua para Etapa 2
- [ ] Campo percentual_contingencia tem default 10% (TECH) com possibilidade de ajuste
- [ ] Ao salvar, status muda para 'planejamento'
- [ ] Nao existe mais referencia a perfil CONSTRUCAO no formulario

### Estimativa
**8 horas** (refatoracao TAP + calendario.ts + testes)

---

## ITEM 2: SPRINTS (Milestones Backward)

### Objetivo
Permitir que o PM defina N sprints como entregas (milestones), construidos de tras para frente a partir do Omega. Cada sprint tem nome, data de entrega e descricao. A construcao backward garante que o Ponto Omega e a ancora e todo o planejamento parte dele.

### Rota
```
/[projetoId]/setup/sprints  (A CRIAR — rota nova)
```

### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| CRIAR | `src/app/(dashboard)/[projetoId]/setup/sprints/page.tsx` | Tela de definicao de sprints backward. Timeline horizontal com setas <- |
| CRIAR | `src/components/aura/SprintTimeline.tsx` | Componente visual: timeline horizontal com pontos conectados por seta <- (backward) |
| MODIFICAR | `src/components/aura/SetupStepper.tsx` | Incluir step "Sprints" entre TAP e WBS |
| MODIFICAR | `src/context/ProjectContext.tsx` | Adicionar array de sprints ao contexto |

### Dados de entrada (usuario fornece)
- Numero de sprints (1 a 12)
- Para cada sprint:
  - Nome (string)
  - Data de entrega (date) — construida backward a partir do Omega
  - Descricao (text opcional)
- Ordem backward: Sprint N (mais proximo do Omega) e definido primeiro

### Dados de saida (Supabase)

**Tabela: `sprints_fractais`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| projeto_id | uuid | FK projetos |
| ordem | integer | Ordem sequencial (1 = primeiro, N = ultimo) |
| nome | text | Nome do sprint/milestone |
| data_inicio | date | Calculado: fim do sprint anterior (ou inicio do projeto) |
| data_fim | date | Data de entrega (milestone) |
| descricao | text | Descricao opcional |
| buffer_original | numeric | Preenchido pelo motor (Etapa 5) |
| buffer_consumido | numeric | Atualizado em execucao |
| fever_zone | text | Classificacao fever (verde/amarelo/vermelho/preto/azul) |

**Tabela: `marcos`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| projeto_id | uuid | FK projetos |
| sprint_id | uuid | FK sprints_fractais |
| nome | text | Nome do marco |
| data_prevista | date | Data de entrega |
| data_real | date nullable | Preenchido em execucao |

### Motor acionado
- `calendario.ts → calcularDiasUteis()` — para calcular duracao de cada sprint em dias uteis
- `sierpinski.ts → sierpinskiLayout()` — preview da malha (nivel = ceil(log2(N))) — INFORMATIVO, nao definitivo

### Dependencias
- Item 1 (TAP) completo — precisa de data_inicio e data_fim
- Migration 004 (tabela `sprints_fractais`) — JA EXISTE
- Tabela `marcos` — JA EXISTE

### Criterios de aceite
- [ ] PM define sprints de tras para frente: primeiro define o Omega, depois recua
- [ ] Timeline horizontal mostra sprints conectados por setas <- (backward visual)
- [ ] Cada sprint tem: nome, data de entrega, descricao opcional
- [ ] Sistema valida: data_entrega_sprint_N <= data_fim_projeto (Omega)
- [ ] Sistema valida: sprints nao se sobrepom temporalmente
- [ ] Sistema calcula automaticamente data_inicio de cada sprint (= data_fim do anterior)
- [ ] Preview informativo: "Sua malha Sierpinski tera nivel X com Y slots"
- [ ] Minimo 2 sprints, maximo 12
- [ ] Ao salvar, registra em `sprints_fractais` + `marcos`
- [ ] Status do projeto muda para 'planejamento' (se ainda nao estava)

### Estimativa
**12 horas** (rota nova + componente timeline + logica backward + testes)

---

## ITEM 3: WBS (Tarefas por Sprint)

### Objetivo
Permitir que o PM defina tarefas para cada sprint, com dependencias (predecessoras), incluindo dependencias cross-sprint. Cada tarefa fica vinculada a um sprint via `sprint_id`. A WBS existente precisa ser refatorada para agrupar tarefas por sprint.

### Rota
```
/[projetoId]/setup/wbs  (JA EXISTE — refatorar)
```

### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| MODIFICAR | `src/app/(dashboard)/[projetoId]/setup/wbs/page.tsx` | Adicionar dropdown de sprint por tarefa. Agrupar visual por sprint. Manter dependencias cross-sprint |
| MODIFICAR | `src/context/ProjectContext.tsx` | Adicionar `sprint_id` ao tipo Tarefa |
| MODIFICAR | `src/lib/types.ts` | Tipo Tarefa recebe `sprint_id: string \| null` |

### Dados de entrada (usuario fornece)
- Para cada tarefa:
  - Nome (string)
  - Sprint (dropdown dos sprints definidos no Item 2)
  - Predecessoras (multi-select de IDs de tarefa — permite cross-sprint)
  - Duracao estimada (horas) — esta e a duracao PESSIMISTA inicial, sera refinada na Coleta
  - Descricao (opcional)

### Dados de saida (Supabase)

**Tabela: `tarefas`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| projeto_id | uuid | FK projetos |
| sprint_id | uuid nullable | FK sprints_fractais — NOVO campo de vinculacao |
| nome | text | Nome da tarefa |
| duracao_estimada | numeric | Duracao pessimista (horas) |
| duracao_otimista | numeric nullable | Preenchido na Coleta (Etapa 4) |
| custo_otimista | numeric nullable | Preenchido na Coleta |
| custo_pessimista | numeric nullable | Preenchido na Coleta |
| predecessoras | text[] | Array de IDs de tarefa predecessora |
| ordem | integer | Ordem dentro do sprint |

**Tabela: `eap_nodes`** (estrutura hierarquica WBS)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| projeto_id | uuid | FK |
| nome | text | Nome do no WBS |
| pai_id | uuid nullable | FK eap_nodes (hierarquia) |
| nivel | integer | Profundidade na arvore |

### Motor acionado
- `cpm.ts → calculateCPMLocal()` — preview do caminho critico (usando duracao_estimada como proxy ate a Coleta fornecer pessimista/otimista)
- `cpm.ts → findAllCriticalPaths()` — identificacao e ranking de caminhos criticos

### Dependencias
- Item 2 (Sprints) completo — precisa dos sprints para o dropdown
- Tabelas `tarefas` e `eap_nodes` — JA EXISTEM
- Coluna `sprint_id` em `tarefas` — PRECISA ser adicionada (migration nova ou patch)

### Criterios de aceite
- [ ] Cada tarefa tem dropdown para selecionar sprint
- [ ] Tarefas sao agrupadas visualmente por sprint na WBS
- [ ] Dependencias cross-sprint sao permitidas e visualizadas
- [ ] CPM preview funciona com duracao_estimada provisoria
- [ ] Caminho critico e destacado em vermelho (#ef4444)
- [ ] Minimo 1 tarefa por sprint (validacao)
- [ ] Ao salvar, cada tarefa tem sprint_id preenchido
- [ ] Diagrama PERT (Sugiyama layout) mostra tarefas agrupadas por sprint com cores distintas

### Estimativa
**10 horas** (refatoracao WBS + sprint grouping + CPM preview + testes)

---

## ITEM 4: COLETA (Estimativas por Email)

### Objetivo
Permitir que o PM convide colaboradores para estimar tarefas. Cada colaborador recebe email com link unico (token JWT) e responde SEM login: tempo otimista, tempo pessimista, custo otimista, custo pessimista, papel no sprint. Quando 100% responderam, o motor CCPM dispara automaticamente.

### Rota
```
/[projetoId]/setup/coleta  (A CRIAR — rota nova)
/api/estimativas           (JA EXISTE — GET token + POST estimativas)
/estimativas/[token]       (A CRIAR — pagina publica para colaborador responder)
```

### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| CRIAR | `src/app/(dashboard)/[projetoId]/setup/coleta/page.tsx` | Painel do PM: lista de colaboradores, status de resposta, progress bar X/Y, botao "Enviar convites" |
| CRIAR | `src/app/estimativas/[token]/page.tsx` | Pagina publica (sem auth) onde colaborador responde. Formulario: otimista/pessimista por tarefa |
| MODIFICAR | `src/app/api/estimativas/route.ts` | Ja existe GET/POST. Adicionar: logica de envio de email (Resend/SendGrid), verificacao de completude, trigger para Motor CCPM |
| CRIAR | `src/lib/email/enviar-convite.ts` | Template de email + funcao de envio via Resend API |
| CRIAR | `src/app/api/estimativas/enviar-convites/route.ts` | Endpoint para PM disparar convites em batch |
| CRIAR | `src/app/api/estimativas/status/route.ts` | Endpoint para consultar status X/Y responderam |

### Dados de entrada (usuario fornece — PM)
- Lista de emails dos colaboradores
- Nome de cada colaborador
- Papel de cada colaborador (opcional)

### Dados de entrada (colaborador responde — via link publico)
- Para cada tarefa atribuida:
  - Tempo otimista (horas)
  - Tempo pessimista (horas)
  - Custo otimista (R$)
  - Custo pessimista (R$)
  - Papel no sprint (texto livre)

### Dados de saida (Supabase)

**Tabela: `convites_projeto`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| projeto_id | uuid | FK |
| email | text | Email do colaborador |
| nome | text | Nome do colaborador |
| papel | text | Papel/funcao |
| token | text | Token JWT unico |
| respondido | boolean | Se ja respondeu |
| respondido_em | timestamptz | Quando respondeu |
| criado_em | timestamptz | Quando foi convidado |

**Tabela: `estimativas_colaborador`**
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| convite_id | uuid | FK convites_projeto |
| tarefa_id | uuid | FK tarefas |
| tempo_otimista | numeric | Horas otimistas |
| tempo_pessimista | numeric | Horas pessimistas |
| custo_otimista | numeric | R$ otimista |
| custo_pessimista | numeric | R$ pessimista |
| papel_sprint | text | Papel no sprint |
| criado_em | timestamptz | Timestamp |

**Atualizacao na tabela `tarefas`** (ao receber estimativas):
- `duracao_otimista` = media das estimativas otimistas de todos os colaboradores
- `duracao_estimada` = media das estimativas pessimistas (= duracao_segura no CCPM)
- `custo_otimista` = media dos custos otimistas
- `custo_pessimista` = media dos custos pessimistas

### Motor acionado
- `api/estimativas/route.ts → verificarCompletude()` — checa se 100% responderam
- Quando 100%: atualiza `tarefas` com medias e muda status do projeto para 'calculando'
- Dispara Motor CCPM (Item 5) automaticamente

### Dependencias
- Item 3 (WBS) completo — precisa das tarefas definidas
- Migration 006 (tabelas `convites_projeto`, `estimativas_colaborador`) — JA EXISTE
- Servico de email (Resend API key em .env)

### Criterios de aceite
- [ ] PM adiciona colaboradores por nome + email
- [ ] PM clica "Enviar convites" — sistema gera token JWT por colaborador e envia email
- [ ] Email contem link publico: `/estimativas/[token]`
- [ ] Colaborador abre link SEM login e ve formulario com suas tarefas
- [ ] Colaborador preenche: otimista, pessimista (tempo e custo) por tarefa
- [ ] Validacao: otimista < pessimista (tempo e custo)
- [ ] Ao submeter, `convites_projeto.respondido = true`
- [ ] Painel do PM mostra progress bar: "X de Y responderam"
- [ ] Se colaborador nao respondeu em 48h: Klauss Push (D4) — lembrete automatico
- [ ] Quando 100% responderam: sistema agrega medias nas `tarefas` e dispara Motor CCPM
- [ ] Colaborador que ja respondeu ve mensagem "Estimativas ja enviadas" (status 409 — ja implementado)

### Estimativa
**16 horas** (pagina coleta + pagina publica + envio email + logica completude + Klauss push 48h + testes)

---

## ITEM 5: MOTOR CCPM (Automatico)

### Objetivo
Executar AUTOMATICAMENTE toda a cadeia de calculo CCPM quando 100% das estimativas chegaram. O PM nao intervem — o sistema faz tudo. Ao final, TM + fractais + buffers + NVO estao prontos e o PM e notificado para validacao. Este e o coracao matematico da Aura.

### Rota
```
Nenhuma rota de UI — processo automatico server-side
Trigger: quando verificarCompletude() retorna true
```

### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| CRIAR | `src/lib/engine/pipeline-ccpm.ts` | Orquestrador: executa os 25 passos do motor em sequencia. Salva resultado no DB |
| CRIAR | `src/app/api/motor/executar/route.ts` | API endpoint que dispara o pipeline (chamado internamente ou por webhook) |
| MODIFICAR | `src/lib/engine/ccpm.ts` | Verificar que `cortarEstimativa()` funciona com dados reais do DB (nao so mock) |
| MODIFICAR | `src/lib/engine/buffer.ts` | Verificar `calcularProjectBuffer()`, `calcularCostBuffer()`, `calcularFeedingBuffers()`, `truncarBufferCEt()` com dados reais |
| MODIFICAR | `src/lib/engine/fractal-builder.ts` | Verificar `construirFractaisBackward()` com dados reais do DB |
| MODIFICAR | `src/lib/engine/sierpinski.ts` | Verificar `sierpinskiLayout()` com N sprints reais |
| MODIFICAR | `src/lib/engine/nvo-ponderado.ts` | Verificar `calcularNVOPonderado()` e `calcularMATEDComposto()` com dados reais |
| MODIFICAR | `src/lib/engine/math.ts` | Verificar `gerarTrianguloCDT()` gera TM baseline com dados CCPM |
| MODIFICAR | `src/lib/engine/clairaut.ts` | Verificar `sintetizarClairaut()` classifica TM corretamente |

### Pipeline de execucao (25 passos — ref. tutorial.log Parte 8)

```
PASSO   FUNCAO                              ARQUIVO
──────────────────────────────────────────────────────────────────
 1.     calculateCPMLocal()                  cpm.ts          — Forward/Backward com duracao_pessimista
 2.     findAllCriticalPaths()               cpm.ts          — Enumera + rankeia caminhos criticos
 3.     cortarEstimativa()                   ccpm.ts         — Corte Goldratt 50% (D1)
 4.     Recalcular CPM com duracoes agressivas                — prazo_agressivo
 5.     calcularProjectBuffer()              buffer.ts       — PB = RSS das gorduras (D2)
 6.     calcularCostBuffer()                 buffer.ts       — CB = RSS das gorduras custo (D6)
 7.     calcularFeedingBuffers()             buffer.ts       — FBs nos pontos de juncao
 8.     truncarBufferCEt()                   buffer.ts       — Buffer nao excede 25% baseline (D14)
 9.     nivelarRecursos()                    ccpm.ts         — Resolve conflitos de recurso
10.     calcularFormulaN()                   contributor.ts  — Recursos extras + Brooks 1.2x (D19)
11.     prazo_total = prazo_agressivo + PB                   — Prazo CCPM final
12.     Distribuir buffers por sprint (proporcional)          — buffer_sprint_i = PB * (dur_sprint_i / dur_total)
13.     checkCETDupla()                      crisis.ts       — CEt pre + pos normalizacao
14.     gerarTrianguloCDT()                  math.ts         — Gera TM baseline (E=1.0, P, C normalizados)
15.     normalizeAnchor()                    math.ts         — E=1.0 ancora
16.     calcularAngulos()                    math.ts         — Lei dos Cossenos (alpha, omega, epsilon)
17.     sintetizarClairaut()                 clairaut.ts     — Protocolo agudo/beta/gamma
18.     areaTri()                            math.ts         — Area Heron do TM
19.     calculateBarycenter()                triangle-logic.ts — Baricentro TM
20.     calculateOrthicTriangle()            triangle-logic.ts — ZRE (triangulo ortico)
21.     sierpinskiLayout()                   sierpinski.ts   — Malha fixa nivel=ceil(log2(N))
22.     construirFractaisBackward()          fractal-builder.ts — Normalizacao proporcional (regra de 3)
23.     checkCDTExistence() por fractal      crisis.ts       — CEt individual por sprint
24.     verificarColinearidade()             fractal-builder.ts — Razoes +-5%
25.     calcularNVOPonderado()               nvo-ponderado.ts — Baricentro ponderado TM + sprints
```

### Dados de saida (Supabase)

**Atualizacao: `projetos`**
- `prazo_ccpm` = prazo_agressivo + PB
- `buffer_projeto` = PB (dias)
- `buffer_custo` = CB (R$)
- `caminho_critico_baseline_dias` = duracao CC
- `forma_triangulo_viva` = classificacao Clairaut
- `iqo_global` = IQ baseline (area_TA / area_TM)
- `status` = 'validacao'

**Atualizacao: `tarefas`**
- `duracao_agressiva` = resultado cortarEstimativa()
- `custo_agressivo` = resultado cortarEstimativa()
- `es`, `ef`, `ls`, `lf`, `folga`, `critica` = resultado CPM

**Atualizacao: `sprints_fractais`**
- `buffer_original` = parcela do PB
- `e_normalizado`, `p_normalizado`, `c_normalizado` = lados do fractal
- `area_fractal` = area Heron do fractal
- `colinearidade_ok` = boolean

**Nova tabela (ou JSONB em projetos): `tm_baseline`**
- `lados` JSONB: {E, P, C}
- `angulos` JSONB: {alpha, omega, epsilon}
- `area` numeric
- `protocolo` text
- `nvo` JSONB: {x, y}
- `malha_sierpinski` JSONB: layout completo

### Motor acionado
Todos os 25 passos listados acima, em sequencia. Ver DEPENDENCY-MAP para rastreabilidade documento-motor.

### Dependencias
- Item 4 (Coleta) completo — precisa de 100% estimativas
- Todos os engine files existentes: cpm.ts, ccpm.ts, buffer.ts, fractal-builder.ts, sierpinski.ts, nvo-ponderado.ts, math.ts, crisis.ts, clairaut.ts, castle-sierpinski.ts
- Tabelas: projetos, tarefas, sprints_fractais

### Criterios de aceite
- [ ] Pipeline executa automaticamente quando 100% estimativas chegaram
- [ ] CPM Forward/Backward pass funciona com duracao_pessimista real
- [ ] Corte Goldratt 50% aplica: duracao_agressiva = max(1, ceil(pessimista * 0.5))
- [ ] Buffer RSS calcula corretamente: PB = ceil(sqrt(sum(gordura_i^2)))
- [ ] Buffer de Custo calcula: CB = ceil(sqrt(sum(gordura_custo_i^2)))
- [ ] Feeding Buffers inseridos em pontos de juncao CC
- [ ] Buffer truncado a 25% do baseline (D14)
- [ ] TM baseline gerado com E=1.0, P e C normalizados
- [ ] CEt Dupla valida (pre + pos normalizacao)
- [ ] Malha Sierpinski gerada: nivel = ceil(log2(N_sprints))
- [ ] Fractais backward normalizados por regra de 3 (NAO E=1 fixo por sprint — Decisao 21)
- [ ] Colinearidade verificada (tolerancia +-5%)
- [ ] NVO ponderado calculado (TM peso dominante = sum(w_sprints) + 1)
- [ ] Clairaut classifica protocolo correto (agudo/beta/gamma)
- [ ] Tudo salvo no DB (projetos, tarefas, sprints_fractais)
- [ ] PM notificado: "Projeto pronto para validacao"
- [ ] Se CEt viola no CC → ABORT: "TM INVALIDO" (D15)
- [ ] Se CEt viola em sprint paralelo → alerta local (apenas fractal invalido)
- [ ] Prazo CCPM comparado com prazo contratual: VIAVEL / INVIAVEL
- [ ] 21/21 cenarios de teste existentes continuam passando (fractal-scenarios.test.ts)

### Estimativa
**20 horas** (pipeline-ccpm.ts + integracao DB + API trigger + testes E2E do pipeline completo)

---

## ITEM 6: VALIDACAO → MONITORAMENTO → ARQUIVAMENTO

### Objetivo
Completar o ciclo de vida do projeto: (1) PM valida o calculo e lanca o projeto em execucao, (2) sistema monitora continuamente (MATED, Fever, Castle, Klauss), (3) ao encerrar, calcula SDO e atualiza Bayesian.

### 6A — VALIDACAO

#### Rota
```
/[projetoId]  (dashboard principal — JA EXISTE — refatorar para consumir dados reais)
```

#### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| MODIFICAR | `src/app/(dashboard)/[projetoId]/page.tsx` | Reescrever para consumir TM + fractais do DB (nao mock). Exibir malha Sierpinski real. Botao "Validar e Lancar" |
| MODIFICAR | `src/components/aura/SierpinskiMesh.tsx` | Alimentar com dados reais do motor (vertices TM escaleno, fever zones por sprint) |
| MODIFICAR | `src/components/aura/SprintSanfona.tsx` | Alimentar com dados reais (MATED, Fever, Klauss) |
| CRIAR | `src/app/api/projeto/validar/route.ts` | Endpoint: muda status 'validacao' → 'execucao', congela baseline |

#### Dados de entrada
- PM clica "Validar e Lancar"
- Sistema congela TM baseline (versao 1.0 imutavel)

#### Dados de saida
- `projetos.status` = 'execucao'
- `triangulo_matriz_versoes` recebe versao 1.0 (baseline congelado)

#### Criterios de aceite
- [ ] Dashboard exibe TM escaleno com fractais coloridos (Sierpinski real, nao mock)
- [ ] Cada sprint tem cor = fever zone (azul/verde/amarelo/vermelho/preto)
- [ ] TBZ exibidos como triangulos invertidos cinza tracejado
- [ ] Ghost TM (sombra baseline) exibido com opacity 0.15
- [ ] Botao "Validar e Lancar" muda status para 'execucao'
- [ ] Baseline TM congelado como versao 1.0 em `triangulo_matriz_versoes`
- [ ] Click em sprint abre Sanfona (Tela 3) como accordion

### 6B — MONITORAMENTO

#### Rota
```
/[projetoId]                     (dashboard — Tela 2: Board Sierpinski)
/[projetoId]/sprint/[sprintId]   (JA EXISTE — refatorar para dados reais)
```

#### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| CRIAR | `src/lib/engine/monitor.ts` | Orquestrador de monitoramento: recalcula TA, MATED, Fever, Castle, alertas |
| CRIAR | `src/app/api/motor/recalcular/route.ts` | Endpoint de recalculo (chamado por webhook ou cron) |
| MODIFICAR | `src/components/aura/SprintSanfona.tsx` | 5 abas com dados reais: Fever Chart, MATED Decomp, Klauss, Curvas, Ponto no Triangulo |
| MODIFICAR | `src/app/(dashboard)/[projetoId]/sprint/[sprintId]/page.tsx` | Pagina dedicada do sprint com dados reais |

#### Pipeline de monitoramento (passos 26-33 do tutorial.log)
```
A cada atualizacao de tarefa (ou webhook):
  26. executarPipelineDual()          pipeline-dual.ts   — TM baseline vs TA atual
  27. calcularMATEDComposto()         nvo-ponderado.ts   — Distancia ponderada
  28. buildFeverPoint() + MC          fever-chart.ts     — Zona + Monte Carlo P50/P80/IC90
  29. propagarNaMalha()               castle-sierpinski.ts — Castle por adjacencia
  30. classificarCandidatoCEt()       zones.ts           — 5 zonas operacionais
  31. verificarAlertas()              alertas.ts         — Alerta se zona mudou
  32. POST /api/ai/klauss             route.ts           — Narracao automatica
  33. calcularVelocidadeDegradacao()  execution.ts       — OLS regressao + projecao
```

#### Criterios de aceite
- [ ] A cada atualizacao de progresso, TA e recalculado
- [ ] MATED composto atualizado (TM + sprints ponderados)
- [ ] Fever Chart com trajetoria real + Monte Carlo
- [ ] Castle propaga impacto por adjacencia na malha
- [ ] Alertas disparados quando zona muda
- [ ] Klauss narra automaticamente por sprint
- [ ] Acordeao visual: sprint que consome buffer ENCOLHE horizontalmente
- [ ] Sanfona com 5 abas funcionais (Fever, MATED, Klauss, Curvas, Ponto)

### 6C — ARQUIVAMENTO

#### Rota
```
/[projetoId]/arquivar  (JA EXISTE — verificar)
```

#### Arquivos a criar/modificar

| Acao | Arquivo | Descricao |
|------|---------|-----------|
| MODIFICAR | `src/app/(dashboard)/[projetoId]/arquivar/page.tsx` | Exibir SDO ponderado final, classificacao, narrativa Klauss |
| CRIAR | `src/lib/engine/arquivamento.ts` | Orquestrador: SDO + Bayesian + Capital Intelectual |

#### Pipeline de arquivamento (passos 34-36)
```
  34. calcularSDO()                   sdo.ts            — 40% area + 35% trajetoria + 25% benchmark
  35. bayesianUpdate()                bayesian.ts       — Atualiza priors do setor
  36. Capital intelectual             sdo.ts + bayesian.ts — Registro permanente
```

#### Criterios de aceite
- [ ] SDO ponderado por sprint (Decisao 7/25): peso = complexidade de cada sprint
- [ ] Bayesian update: projeto arquivado recalibra priors do setor
- [ ] Capital intelectual registrado: narrativa Klauss + dados para predicao
- [ ] Status muda para 'arquivado'
- [ ] Dados disponíveis para portfolio (Tela 1)

### Estimativa total Item 6
**24 horas** (6A: 8h validacao + dashboard real | 6B: 10h monitoramento + pipeline | 6C: 6h arquivamento)

---

# PARTE 2 — QA: Revisao e Validacao

---

## ITEM 1: TAP — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapa 1: "Nome, prazo contratual, orcamento total, contingencia %, data inicio, data fim, inclui sabado toggle, ClickUp opcional" — **CONFORME**
- FRAMEWORK-TECH D3/D4: Magic Link para colaboradores — nao se aplica ao TAP (aplica na Coleta)
- SPRINT-MEMORY s12: `percentual_contingencia` default por setor, construcao=15%, tecnologia=10% — **CONFORME** (plano usa 10% default TECH)
- tutorial.log Decisao 17/18: "Calendario em horas/dias, 8h/dia, seg-sex, feriados nacionais automaticos" — **CONFORME**

### Gaps identificados
1. **Feriados nacionais:** O plano menciona `buscarFeriadosNacionais()` mas nao especifica a fonte de dados. Recomendacao: usar API publica (brasilapi.com.br/feriados) ou lista hardcoded de feriados nacionais fixos + moveis.
2. **ClickUp integration:** O plano menciona "botao ClickUp opcional" mas a rota `/api/webhooks/clickup` existente esta 20% mock (relatorio1.log). Precisa de integracao real.
3. **Custo mobilizacao e reserva contingencia:** TAP atual tem campos `custo_mobilizacao` e `custo_reserva_contingencia` (Story 7.0 MASTERPLAN-X). O plano SM nao menciona explicitamente. Devem ser mantidos.

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| TAP minimo | Nome, orcamento 100k, inicio 2026-04-10, fim 2026-06-10 | Salva, calcula ~43 dias uteis |
| Toggle sabado | Mesmo input + inclui_sabado=true | ~52 dias uteis (inclui sabados) |
| Feriados BR | Inicio 2026-04-01, fim 2026-04-30 | Desconta 21/abr (Tiradentes) |
| Contingencia default | Sem preencher contingencia | Assume 10% (TECH) |
| Contingencia custom | 20% | Salva 20%, BAC_operacional = 80k |

### Riscos
- ClickUp API pode ter rate limits em plano free
- Feriados moveis (Pascoa, Carnaval) exigem calculo anual

### Bloqueios
- Nenhum bloqueio critico. Tabelas existem, rota existe, e refatoracao.

---

## ITEM 2: SPRINTS — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapa 2: "N sprints como MILESTONES, backward do Omega" — **CONFORME**
- GEOMETRIA-SIERPINSKI: "nivel = ceil(log2(N)), triangulos UP = sprints, DOWN = TBZ" — **CONFORME** (preview informativo)
- FRAMEWORK-TECH D7: "Sprint Triangles e TBZ fractais de transicao" — **CONFORME**
- tutorial.log Decisao 20-23: "Topologia automatica, preenchimento backward, TBZ = buffer" — **CONFORME**

### Gaps identificados
1. **Mapa de capacidade:** tutorial.log especifica "Nivel 1: ate 3 sprints, Nivel 2: ate 6, Nivel 3: ate 12". O plano SM diz "max 12 sprints" mas nao explicita a correspondencia nivel-capacidade ao usuario. UI deve informar: "Com 5 sprints, sua malha sera nivel 2 (6 slots UP, 3 TBZ)".
2. **Backward UX:** O plano diz "timeline horizontal com setas <-". A UI-SPEC nao detalha interacao especifica. Recomendacao QA: drag-and-drop de milestones na timeline, com snap para datas.

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| 2 sprints | Sprint 1: 2026-04-10 a 2026-05-10, Sprint 2: 2026-05-11 a 2026-06-10 | Malha nivel 1 (2 UP + 1 TBZ) |
| 4 sprints | Datas sequenciais cobrindo periodo TAP | Malha nivel 2 (4 UP + 3 TBZ) |
| 8 sprints | Datas sequenciais | Malha nivel 3 |
| Overlap | Sprint 2 comeca antes de Sprint 1 terminar | Erro de validacao |
| Sprint alem Omega | Sprint 3 data_fim > data_fim_projeto | Erro de validacao |
| Sprint minimo | 1 sprint | Erro: minimo 2 |

### Riscos
- Sprints com duracoes muito desiguais podem gerar fractais com CEt violada (triangulo inexistente). O motor deve detectar isso no Item 5.
- UX backward pode confundir PMs acostumados com forward planning.

### Bloqueios
- Depende do Item 1 (TAP) para ter datas inicio/fim.

---

## ITEM 3: WBS — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapa 3: "Para cada sprint, PM lista tarefas com dependencias, sprint_id linkado" — **CONFORME**
- SPRINT-MEMORY s3: "PERT auto-calculo + Sugiyama layout, caminho critico vermelho #ef4444" — **CONFORME** (CPM preview)
- TRIQ-6.1-PRD RF-04: "PERT auto-calculo CPM sem edicao manual" — **CONFORME**
- tutorial.log: `tarefas` precisa de `sprint_id` — **CONFORME**

### Gaps identificados
1. **Coluna `sprint_id` em `tarefas`:** O worklog (migration 006) adiciona `duracao_otimista`, `custo_otimista`, `custo_pessimista` mas NAO menciona `sprint_id`. Verificar se esta na migration 002 ou se precisa de nova migration.
2. **Import de tarefas via ClickUp:** Se TAP conectou ClickUp, as tarefas devem ser importadas automaticamente com sprint_id pre-preenchido. O plano SM nao detalha este fluxo.
3. **Duracao estimada vs pessimista:** Na WBS, PM coloca uma "duracao estimada" provisoria. Na Coleta (Item 4), colaboradores fornecem otimista/pessimista que substituem essa estimativa. O plano deve deixar claro que a duracao da WBS e PROVISORIA.

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| 3 tarefas, 2 sprints | T1→T2 (sprint 1), T3 (sprint 2, depende T2) | CPM identifica CC: T1→T2→T3. Cross-sprint ok. |
| Tarefa sem sprint | Tarefa sem sprint_id | Erro de validacao |
| Dependencia circular | T1→T2→T1 | Erro: ciclo detectado |
| Sprint vazio | Sprint 2 sem tarefas | Warning (nao bloqueante, pode preencher depois) |

### Riscos
- WBS existente e complexa (~300 LOC). Refatoracao para agrupar por sprint pode introduzir regressoes.
- Dependencias cross-sprint aumentam complexidade do CPM.

### Bloqueios
- Depende do Item 2 (Sprints) para ter sprints no dropdown.
- Se `sprint_id` nao existe em `tarefas`, precisa de migration patch.

---

## ITEM 4: COLETA — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapa 4: "PM recruta colaboradores, email com link JWT, responde SEM login" — **CONFORME**
- FRAMEWORK-TECH D3/D4: "Magic Link + Klauss Push 48h" — **CONFORME** (push apos 48h)
- tutorial.log 2.1-2.5: "Colaborador responde: otimista, pessimista, custo otimista, custo pessimista, papel" — **CONFORME**
- API `/api/estimativas` JA EXISTE (worklog Epico 1) — **CONFORME**

### Gaps identificados
1. **Agregacao de estimativas:** O plano SM diz "media dos colaboradores". tutorial.log nao especifica metodo de agregacao (media simples? media ponderada? mediana?). Recomendacao QA: usar MEDIANA para robustez contra outliers, com flag se desvio padrao > 50% (indica divergencia de estimativas).
2. **Email service:** O plano menciona Resend mas nao ha `RESEND_API_KEY` no .env.example. Precisa ser adicionado.
3. **Seguranca do token:** O plano diz JWT mas a API existente usa token simples (nao JWT). Verificar se a implementacao atual e suficiente (token UUID vs JWT com expiracao).
4. **Klauss Push 48h:** O plano menciona D4 mas nao especifica mecanismo (cron job? Supabase scheduled function? Vercel cron?). Recomendacao: Vercel Cron Job (`/api/cron/lembrete-estimativas`).

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| Convite basico | Email: dev@test.com, projeto com 5 tarefas | Email enviado com link. Colaborador ve 5 tarefas para estimar |
| Estimativa valida | Otimista=3h, Pessimista=10h, Custo_O=500, Custo_P=1500 | Salvo. Validacao otimista < pessimista passa |
| Estimativa invalida | Otimista=10h, Pessimista=3h | Erro: otimista deve ser menor que pessimista |
| 100% completude | 3/3 colaboradores responderam | Status muda para 'calculando'. Motor CCPM dispara |
| Token expirado | Token usado apos 30 dias | Erro 404 ou 410 |
| Dupla resposta | Colaborador tenta responder 2x | Erro 409 "Ja enviadas" |
| Lembrete 48h | Colaborador nao respondeu apos 48h | Email de lembrete automatico |

### Riscos
- Email pode cair em spam (SPF/DKIM necessarios no dominio)
- Sem rate limit no POST /api/estimativas, pode sofrer abuse
- Token sem expiracao e risco de seguranca

### Bloqueios
- Depende do Item 3 (WBS) para ter tarefas a estimar.
- Servico de email (Resend ou similar) precisa estar configurado.
- Variavel `RESEND_API_KEY` no .env.

---

## ITEM 5: MOTOR CCPM — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapa 5 (16 sub-etapas): Todas cobertas no pipeline de 25 passos — **CONFORME**
- FRAMEWORK-TECH D1: Corte Goldratt `max(1, ceil(pessimista * 0.5))` — **CONFORME**
- FRAMEWORK-TECH D2: Buffer RSS `ceil(sqrt(sum(si^2)))` — **CONFORME**
- FRAMEWORK-TECH D6: Cost Buffer RSS — **CONFORME**
- FRAMEWORK-TECH D14: Buffer truncado pela CEt (25% baseline) — **CONFORME**
- GEOMETRIA-SIERPINSKI: Nivel ceil(log2(N)), UP=sprint, DOWN=TBZ — **CONFORME**
- tutorial.log Decisao 21: Normalizacao fractal por regra de 3 (NAO E=1 fixo) — **CONFORME**
- tutorial.log Decisao 13: NVO = baricentro ponderado (TM peso = sum(w)+1) — **CONFORME**
- FRAMEWORK-TECH D15: CC falha = abort global, paralelo falha = local — **CONFORME**

### Gaps identificados
1. **Persistencia do TM:** O plano SM menciona salvar em `projetos` como campos individuais e possivelmente JSONB. A tabela `triangulo_matriz_versoes` (SPRINT-MEMORY s5) ja existe para versionamento TM. Usar essa tabela para baseline v1.0.
2. **Issue M4 (relatorio1.log Fermat):** CEt valida pos-normalizacao mas deve usar pre-normalizacao em Stage 1. `checkCETDupla()` existe mas o pipeline nao executa Stage 1 consistentemente. **BLOQUEIO CRITICO** — corrigir antes do launch.
3. **Monte Carlo seed (relatorio1.log Roberta):** Sem seed control, resultados nao reproduziveis para debugging. Adicionar seed no pipeline.
4. **Priors hardcoded (relatorio1.log Roberta):** Priors Standish estao hardcoded em bayesian.ts. Migration 006 criou `calibration_priors`. Migrar priors para DB.
5. **Topologia automatica:** tutorial.log Decisao 20 diz "nivel automatico, PM NAO escolhe". O pipeline deve calcular sem input do PM.

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| Pipeline completo 2 sprints | 5 tarefas CC, otimistas [3,2,4,3,5], pessimistas [10,8,12,6,14] | PB = ceil(sqrt(49+36+64+9+81)) = ceil(sqrt(239)) = 16 dias |
| Corte Goldratt | Pessimista=10 | Agressiva = max(1,ceil(10*0.5)) = 5 |
| Corte Goldratt edge | Pessimista=1 | Agressiva = max(1,ceil(0.5)) = 1 |
| CEt violacao CC | Fractal no CC com E+C <= P | ABORT global, "TM INVALIDO" (D15) |
| CEt violacao paralelo | Fractal fora CC com CEt falha | Alerta local, TM continua |
| Buffer truncamento | PB calculado > 25% baseline | PB truncado para 25% (D14) |
| Feeding Buffer | Caminho nao-critico alimenta CC | FB inserido no ponto de juncao |
| Colinearidade | Fractal com razoes dentro +-5% | colinearidade_ok = true |
| Colinearidade falha | Fractal com razao E 15% diferente | Alerta desvio |
| FLUXO-CCPM exemplo | 5 tarefas CC pessimistas [10,8,12,6,14], otimistas [6,5,7,3,8] | prazo_agressivo=25, PB=10, prazo_ccpm=35 (conforme doc) |
| Cenarios 1-5 worklog | Os 5 cenarios ficticios da sessao 2026-04-04 | 21/21 testes continuam passando |

### Riscos
- Pipeline server-side pode exceder timeout de Serverless Function (10s free tier Vercel). Considerar Vercel Fluid Compute ou background job.
- Projetos com >100 tarefas podem causar lentidao no CPM enumeration (limite 100 caminhos ja existe).

### Bloqueios
- **M4 (CEt timing):** Bug conceitual que pode mascarar crises. DEVE ser corrigido ANTES.
- Depende do Item 4 (Coleta) para ter estimativas reais.

---

## ITEM 6: VALIDACAO/MONITORAMENTO/ARQUIVAMENTO — Revisao QA

### Coerencia com documentacao
- FLUXO-CCPM-AURA Etapas 6-8: Validacao, Monitoramento, Arquivamento — **CONFORME**
- UI-SPEC Tela 1 (Portfolio), Tela 2 (Board Sierpinski), Tela 3 (Sanfona) — **CONFORME** na estrutura
- FRAMEWORK-TECH D31: Castle e^(-0.3k) por adjacencia — **CONFORME**
- FRAMEWORK-TECH D32: Sanfona setup vs dashboard (tracejado vs solido) — **CONFORME**
- FRAMEWORK-TECH D10/D29: Fever Chart geometrico 4+1 zonas — **CONFORME**
- tutorial.log Decisao 24: 5 zonas Fever (azul adicionado) — **CONFORME**
- tutorial.log Decisao 35-38: Cor fractal=Fever, sanfona detalhada, accordion read-only — **CONFORME**
- como-e-porque P02: TM versionado (Historico de Pecados) — **CONFORME** (triangulo_matriz_versoes)
- como-e-porque P06: SDO algoritmico 40%+35%+25% — **CONFORME**

### Gaps identificados
1. **Tela 1 (Portfolio):** O plano SM foca no dashboard do projeto (Tela 2) mas nao detalha a Tela 1 (Portfolio/Home). UI-SPEC especifica: projetos rankeados por MATED, cards com Fever badge + IQ + Klauss 1-phrase. Precisa ser implementada.
2. **Webhook real-time:** relatorio1.log menciona Realtime Supabase como MEDIA prioridade. O plano SM usa polling ou trigger manual. Para UX ideal, Supabase Realtime subscriptions devem ser consideradas.
3. **Klauss proativo:** relatorio1.log menciona que Klauss so responde quando chamado. O plano deveria incluir auto-trigger quando zona muda.
4. **Slack outbound:** relatorio1.log e Klauss pedem webhook Slack para crises. Nao incluido no plano SM.
5. **EVM completo (SPI, CPI, EAC, TCPI):** Kenji (relatorio1.log) pede como ALTA prioridade. Nao incluido no plano SM. Pode ser adiado para v2.

### Testes necessarios
| Caso | Input | Esperado |
|------|-------|----------|
| Validacao launch | PM clica "Validar e Lancar" | Status → execucao, baseline congelado |
| Monitoramento | Tarefa T1 progresso 50% | TA recalculado, MATED atualizado, Fever atualizado |
| Castle propagacao | Sprint 2 buffer 80% | Impacto propaga para Sprint 3: 74% (e^(-0.3*1)), Sprint 4: 55% |
| Zona muda | Sprint vai de verde para amarelo | Alerta disparado, Klauss narra |
| Acordeao visual | Sprint com 50% buffer consumido | Largura = 50% do original |
| SDO ponderado | Projeto com 3 sprints, pesos diferentes | SDO = sum(peso_i * area_i) / area_baseline |
| Bayesian update | Projeto TECH arquivado | Prior setor TECH atualizado com dados reais |
| Remissao (azul) | Sprint devolve buffer | Zona azul, Klauss: "Remissao ativa" |

### Riscos
- Dashboard com dados reais pode ser lento se nao tiver cache adequado (SWR/React Query)
- Sanfona com 5 abas e potencialmente pesada em mobile. Considerar lazy loading.
- Klauss AI usa Groq com rate limit 60 req/h por tenant — pode ser insuficiente com muitos sprints.

### Bloqueios
- Depende do Item 5 (Motor) para ter TM + fractais calculados.
- Tela 1 (Portfolio) depende de ter ao menos 1 projeto com dados reais para ranking MATED.

---

# PARTE 3 — Checklist de Brownfield

## O que REMOVER do codebase atual

### Rotas a deletar

| Rota | Motivo |
|------|--------|
| `/[projetoId]/setup/calendario/page.tsx` | Calendario NAO e tela separada — sao 3 campos dentro do TAP (FLUXO-CCPM-AURA) |
| `/[projetoId]/setup/eap/page.tsx` | Duplicata da WBS. A rota correta e `/setup/wbs` (ja existe) |
| `/[projetoId]/setup/cpm/page.tsx` | Redundante. CPM e calculado automaticamente pelo motor, nao e tela de setup |
| `/[projetoId]/setup/funcoes/page.tsx` | Funcoes (Prazo/Custo) sao do motor antigo Corporate. No CCPM, as curvas sao geradas automaticamente |
| `/[projetoId]/setup/governanca/page.tsx` | Setup de governanca nao faz sentido no fluxo CCPM |
| `/[projetoId]/decisao/war-room/page.tsx` | Renomeado para Gabinete de Crise (ja existe em `/governanca/gabinete`) |
| `/[projetoId]/decisao/ia/page.tsx` | IA e integrada ao Klauss no Gabinete e na Sanfona, nao precisa de rota separada |
| `/[projetoId]/decisao/mated/page.tsx` | MATED esta na Sanfona (Tela 3 aba 2), nao precisa de rota separada |
| `/[projetoId]/motor/cdt/page.tsx` | CDT e o TM — esta no dashboard principal, nao precisa de rota motor separada |
| `/[projetoId]/motor/burndown/page.tsx` | Burndown esta na Sanfona (Tela 3 aba 4 curva de prazo) |
| `/[projetoId]/motor/curva-s/page.tsx` | Curva S esta na Sanfona (Tela 3 aba 4 curva de custo) |
| `/[projetoId]/motor/recursos/page.tsx` | Recursos sao calculados pela Formula N automaticamente |
| `/[projetoId]/motor/cpm/page.tsx` | CPM e automatico, nao precisa de rota de visualizacao separada |
| `/[projetoId]/governanca/warroom/page.tsx` | Duplicata. O correto e `/governanca/gabinete` |
| `/[projetoId]/governanca/riscos/page.tsx` | Riscos sao tratados pelo Fever Chart + MATED na Sanfona |
| `/[projetoId]/governanca/relatorios/page.tsx` | Relatorios via Klauss + SDO, nao precisam de rota separada |
| `/[projetoId]/relatorios/page.tsx` | Duplicata de relatorios |
| `/[projetoId]/report/page.tsx` | Duplicata de relatorios |
| `/[projetoId]/admin/perfis/page.tsx` | Admin fica no header/avatar (SPRINT-MEMORY s1), nao na sidebar |
| `/[projetoId]/admin/planos/page.tsx` | Admin fica no header/avatar |

### Componentes a avaliar/deletar

| Componente | Motivo |
|------------|--------|
| Qualquer componente que referencie perfil `CONSTRUCAO` exclusivamente | Aura e SOFTWARE-ONLY |
| `SetupStepper.tsx` antigo com steps: TAP > EAP > Calendario > CPM > Orcamento > Funcoes | Substituir por: TAP > Sprints > WBS > Coleta |
| Componentes de Gantt Lupa legado (se existirem como standalone) | Gantt esta na Sanfona |

### SkinProvider perfis a remover

| Perfil | Acao |
|--------|------|
| `CONSTRUCAO` | REMOVER completamente do `SkinContext.tsx`. Aura e SOFTWARE-ONLY. Manter TECH + DEFAULT |

### Sidebar items a remover

A sidebar deve ter APENAS 3 grupos (conforme UI-SPEC + FLUXO-CCPM-AURA):

```
SETUP (so aparece quando status in ['rascunho', 'planejamento', 'coleta'])
  ├── TAP
  ├── Sprints (NOVO)
  ├── WBS
  └── Coleta (NOVO)

DASHBOARD (aparece quando status in ['validacao', 'execucao'])
  └── Board de Controle (Sierpinski — Tela 2)

SPRINT DRILL-DOWN (dinamico, aparece quando sprint selecionado)
  └── Sanfona (Tela 3 — accordion dentro da Tela 2)
```

REMOVER da sidebar:
- Motor Matematico (todo o grupo)
- Governanca > Gerenciamento, Kanban, MATED, Indice de Qualidade, Gabinete de Crise
- Alertas (item separado)
- Relatorios
- Configuracoes > Membros
- Admin (vai pro header)

### Database colunas/tabelas que sao remnants Triq Corporate

| Tabela/Coluna | Status | Acao |
|---------------|--------|------|
| `projetos.profile_type = 'CONSTRUCAO'` | Dados podem existir | Nao deletar coluna, mas nao permitir 'CONSTRUCAO' no cadastro novo |
| Tabela `orcamentos` | Existe, e usada no fluxo Corporate | Manter — orcamentos sao usados no CCPM tambem (custo por tarefa) |
| Scripts raiz: `debug_db.js`, `diagnose_db.js`, `full_diagnose.js`, `tmp_force_inject.js`, `tmp_inject_bigdig.js`, `verify_data.js`, `simulate_big_dig.ts` | Debug artifacts (relatorio1.log Kenji) | DELETAR |
| `fix-gantt.cjs` | Patch script | DELETAR |

---

# PARTE 4 — Ordem de Execucao (Sprint Plan)

---

## Sprint 1: Fundacao CCPM (2 semanas)
**Objetivo:** Estabelecer o fluxo de setup TAP→Sprints→WBS refatorado.

### Entregas
1. **TAP refatorado** (Item 1): campos calendario embutidos, sem tela separada, sem CONSTRUCAO, calendario.ts com dias uteis + feriados
2. **Tela de Sprints** (Item 2): rota nova `/setup/sprints`, componente SprintTimeline, logica backward
3. **WBS refatorada** (Item 3): agrupamento por sprint, dropdown sprint_id, dependencias cross-sprint
4. **Brownfield limpeza Fase 1**: deletar rotas mortas (calendario, eap, cpm, funcoes, governanca setup, war-room, decisao/ia, decisao/mated)
5. **Migration**: se `sprint_id` nao existe em `tarefas`, criar patch migration
6. **Fix M4 (CEt timing)**: corrigir checkCETDupla() para executar Stage 1 pre-normalizacao consistentemente (BLOQUEIO CRITICO do relatorio1.log)

### Definition of Done Sprint 1
- [ ] PM consegue fazer TAP → Sprints → WBS em sequencia completa
- [ ] Dias uteis calculados corretamente (com feriados BR)
- [ ] Sprints backward salvos em `sprints_fractais`
- [ ] Tarefas agrupadas por sprint na WBS
- [ ] CPM preview funciona com duracao provisoria
- [ ] CEt Stage 1 pre-normalizacao funciona
- [ ] 0 rotas mortas da lista Brownfield Fase 1
- [ ] TypeCheck: 0 erros novos
- [ ] Vitest: cenarios 1-5 fractal passando + novos testes TAP/Sprints/WBS

### Estimativa: 30 horas

---

## Sprint 2: Coleta + Motor CCPM (2 semanas)
**Objetivo:** Implementar coleta por email e o pipeline CCPM automatico completo.

### Entregas
1. **Coleta por email** (Item 4): pagina PM `/setup/coleta`, pagina publica `/estimativas/[token]`, envio via Resend, progress bar X/Y, validacao otimista < pessimista
2. **pipeline-ccpm.ts** (Item 5): orquestrador dos 25 passos, salva TM+fractais+buffers no DB
3. **API /api/motor/executar**: endpoint de trigger
4. **Lembrete 48h**: Vercel Cron Job para push automatico
5. **Integracao DB completa**: projetos, tarefas, sprints_fractais atualizados pelo pipeline
6. **Migrar priors para DB**: Mover priors Standish de bayesian.ts hardcoded para tabela `calibration_priors`
7. **Seed Monte Carlo**: adicionar seed parameter em simularMonteCarlo()

### Definition of Done Sprint 2
- [ ] Colaborador recebe email, abre link, estima tarefas SEM login
- [ ] 100% estimativas → motor CCPM dispara automaticamente
- [ ] Pipeline 25 passos executa sem erro com dados reais
- [ ] TM baseline salvo com lados, angulos, area, protocolo Clairaut
- [ ] Fractais backward normalizados por regra de 3
- [ ] Malha Sierpinski gerada corretamente
- [ ] Buffer RSS calculado e distribuido por sprint
- [ ] NVO ponderado calculado
- [ ] Lembrete 48h funciona
- [ ] Priors em calibration_priors (DB)
- [ ] Monte Carlo com seed reproduzivel
- [ ] Exemplo documentado: 5 tarefas CC, prazo_ccpm = prazo_agressivo + PB
- [ ] 21/21 cenarios fractal passando + novos testes pipeline

### Dependencias com Sprint 1
- TAP, Sprints e WBS devem estar completos
- Fix M4 deve estar aplicado

### Estimativa: 36 horas

---

## Sprint 3: Dashboard Real + Lifecycle (2 semanas)
**Objetivo:** Dashboard com dados reais, monitoramento continuo e arquivamento.

### Entregas
1. **Dashboard refatorado** (Item 6A): Sierpinski com dados reais, Ghost TM, cores Fever, botao "Validar e Lancar"
2. **Tela 1 Portfolio**: cards rankeados por MATED, Fever badge, IQ, Klauss 1-phrase
3. **Monitoramento** (Item 6B): pipeline recalculo, MATED composto, Fever, Castle propagacao, Klauss narracao
4. **Sanfona completa** (Item 6B): 5 abas com dados reais (Fever Chart, MATED Decomp, Klauss, Curvas, Ponto no Triangulo)
5. **Arquivamento** (Item 6C): SDO ponderado, Bayesian update, capital intelectual
6. **Brownfield limpeza Fase 2**: deletar rotas restantes (motor/*, governanca/warroom, riscos, relatorios, report, admin/*)
7. **Sidebar 3 grupos**: Setup / Dashboard / Sprint Drill-Down
8. **Remover perfil CONSTRUCAO** do SkinContext
9. **Deletar scripts debug da raiz**

### Definition of Done Sprint 3
- [ ] Dashboard exibe malha Sierpinski real (nao mock) com cores Fever
- [ ] Ghost TM visivel com opacity 0.15
- [ ] Click em sprint abre Sanfona com 5 abas funcionais
- [ ] Portfolio (home) mostra projetos rankeados por MATED
- [ ] Monitoramento recalcula TA a cada atualizacao de progresso
- [ ] Castle propaga impacto por adjacencia na malha
- [ ] SDO calculado ao arquivar (40%+35%+25%)
- [ ] Bayesian atualizado ao arquivar
- [ ] Sidebar tem apenas 3 grupos
- [ ] Perfil CONSTRUCAO removido
- [ ] 0 scripts debug na raiz
- [ ] 0 rotas mortas restantes
- [ ] TypeCheck: 0 erros
- [ ] Vitest: todos os testes passando
- [ ] E2E Playwright: fluxo completo TAP���Sprints→WBS→Coleta→Motor→Dashboard→Arquivar

### Dependencias com Sprint 2
- Pipeline CCPM deve funcionar e salvar dados no DB
- Coleta deve disparar motor automaticamente

### Estimativa: 32 horas

---

## Resumo de Estimativas

| Sprint | Conteudo | Horas | Semanas |
|--------|----------|-------|---------|
| Sprint 1 | Fundacao (TAP + Sprints + WBS + Brownfield + M4 fix) | 30h | 2 |
| Sprint 2 | Coleta + Motor CCPM completo | 36h | 2 |
| Sprint 3 | Dashboard real + Monitoramento + Arquivamento + Limpeza final | 32h | 2 |
| **TOTAL** | **Pipeline CCPM completo end-to-end** | **98h** | **6 semanas** |

---

## Grafo de Dependencias

```
Sprint 1                    Sprint 2                    Sprint 3
──────────                  ──────────                  ──────────
TAP ─────────────┐
                 ├──► Coleta ──────────┐
Sprints ─────────┤                     ├──► Dashboard Real
                 ├──► Pipeline CCPM ───┤
WBS ─────────────┘                     ├──► Monitoramento
                                       │
Fix M4 ──────────────► Pipeline CCPM   ├──► Arquivamento
                                       │
Brownfield F1 ─────────────────────────┴──► Brownfield F2

                                       Portfolio ◄── MATED ranking
                                       Sanfona  ◄── Fever + Castle + Klauss
                                       Sidebar  ◄── 3 grupos
```

---

## Criterios de Aceite Globais (cross-sprint)

Derivados do TRIQ-6.1-PRD s8 e TRIQ-SDC-CHARTER:

- [ ] Fluxo completo TAP→Sprints→WBS→Coleta��Motor→Dashboard→Arquivar funciona end-to-end
- [ ] Nenhuma referencia a CONSTRUCAO no UI de cadastro
- [ ] Calendario embutido no TAP (sem tela separada)
- [ ] Sprints sao milestones backward
- [ ] Sierpinski e escaleno (herda forma do TM), NAO equilatero
- [ ] Cada triangle UP = sprint, cada triangle DOWN = TBZ
- [ ] Motor CCPM dispara automaticamente quando 100% estimativas chegaram
- [ ] PM so valida e lanca — sistema faz todo o calculo
- [ ] 38 decisoes do tutorial.log respeitadas
- [ ] D1-D43 do FRAMEWORK-TECH + FRAMEWORK-UNIVERSAL respeitados
- [ ] Suite de testes existente nao regride
- [ ] TypeCheck: 0 erros novos por sprint
- [ ] CI/CD bloqueia merge com falha em lint/typecheck/vitest (TRIQ-SDC-CHARTER Fase 5)

---

*Documento gerado por: SM (River) e QA (Quinn) | Squad: triq-engineering | Sessao: 2026-04-04*
*Cross-referenciado com 14 documentos fonte + 45+ arquivos engine + 38 decisoes squad*
