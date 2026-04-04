# Aura — Tutorial Completo de Navegacao e Uso

**Versao:** 4.0 | **Data:** 2026-03-29
**Para:** Gerentes de Projeto, PMOs, Analistas

---

## 1. VISAO GERAL

O Aura transforma o Triangulo da Qualidade (Escopo, Prazo, Custo) em um **sistema de navegacao ativo**. Voce nao apenas ve onde o projeto esta — voce pode simular o impacto de decisoes antes de toma-las.

### Conceitos em 60 segundos

| Conceito | O que e | Para que serve |
|----------|---------|----------------|
| **TM** (Triangulo Matriz) | Triangulo escaleno derivado das curvas reais | KPI geometrico de qualidade |
| **TA** (Triangulo Atual) | TM no instante presente | Estado real do projeto |
| **CEt** | Condicao de Existencia: \|P-C\| < E < P+C | Se viola, projeto impossivel |
| **MATED** | Distancia euclidiana ao NVO | Quanto menor, mais saudavel |
| **NVO** | Nucleo Viavel Otimo (baricentro do ortico) | Ponto de equilibrio ideal |
| **ZRE** | Zona de Resiliencia Executiva (triangulo ortico) | Zona mais segura |
| **A_mancha** | Area total das curvas normalizadas | Campo real de operacao |
| **A_rebarba** | A_mancha - A_TM | Zona plastica (deformacao permanente) |

---

## 2. SETUP — 7 Etapas (Stepper)

O motor Aura precisa de 7 etapas configuradas. O SetupStepper mostra o progresso.

### 2.1. TAP (Termo de Abertura)
**Onde:** Setup → TAP
**O que preencher:** Nome do projeto, justificativa, objetivo SMART, restricoes, sponsor
**Minimo:** nome preenchido
**IA:** Botao "Gerar TAP com IA" extrai dados de PDF ou texto livre

### 2.2. EAP/WBS (Estrutura Analitica)
**Onde:** Setup → EAP
**O que preencher:** Estrutura hierarquica (pacotes de trabalho)
**Opcoes de importacao:**
- Digitar manualmente (arrastar nos)
- Smart Import (colar tabela Markdown/CSV/TSV)
- Upload PDF (IA extrai)
**Minimo:** pelo menos 1 no

### 2.3. CPM (Tarefas e Diagramas)
**Onde:** Setup → CPM
**O que preencher:** Tarefas com duracao, predecessoras
**Funcionalidades:**
- Tabela de tarefas editavel
- PERT circular (diagrama de rede)
- Gantt com zoom (GanttLupa)
- Calcular CPM (botao) → calcula ES/EF/LS/LF/Folga
- Predecessoras por IA ou determinísticas (Layer 1 + Layer 2)
**Minimo:** pelo menos 1 tarefa com EF > 0

### 2.4. Calendario
**Onde:** Setup → Calendario
**O que preencher:** Data de inicio, dias uteis, feriados
**Minimo:** data de inicio preenchida

### 2.5. Orcamento
**Onde:** Setup → Orcamento
**O que preencher:** Orcamento base, contingencia %, custos por tarefa
**Opcoes:** Importar custos da EAP (localStorage)
**Minimo:** orcamento base > 0

### 2.6. Funcoes (Compressao)
**Onde:** Setup → Funcoes
**O que preencher:** Funcoes de crashing/fast-tracking
**Funcionalidades visíveis com motor ativo:**
- Burndown do prazo (com overlay TM referencia e A_mancha)
- Curva S de custo acumulado
- Tangente de custo (ponto de inflexao)
**Minimo:** pelo menos 1 funcao tipo 'crashing' ou 'prazo'

### 2.7. Governanca
**Onde:** Setup → Governanca
**Opcional:** riscos, stakeholders, comunicacao

---

## 3. MOTOR — O Cerebro do Aura

Com as 7 etapas configuradas, o motor calcula automaticamente.

### 3.1. Triangulo Matriz (TM)
**Onde:** Motor → Triangulo Matriz
**O que voce ve:**
- **Diagrama SVG** com o triangulo escaleno atual
- **Sombra A_mancha** atras do triangulo (campo de operacao)
- **Borda rebarba** (rosa tracejada) quando A_rebarba > 0
- **Rotulos:** α/β/γ nos angulos com graus, E/P/C nos lados
- **ZRE** (triangulo ortico verde) — zona mais segura
- **NVO** (ponto amarelo) — equilibrio ideal
- **Manometros angulares** (semicirculares α/ω/ε)
- **Integrais de Desvio:** A_mancha, A_intersecao, A_rebarba numéricas + grafico
- **Projecao +5 dias:** tendencia da CEt

### 3.2. Como interpretar

| Indicador | Verde | Amarelo | Vermelho |
|-----------|-------|---------|----------|
| **MATED d** | < 0.05 (OTIMO) | 0.05-0.15 (SEGURO) | > 0.30 (CRISE) |
| **Desvio %** | 85-100% (perto do TM) | 60-85% | < 60% |
| **R²** | > 0.7 (previsivel) | 0.3-0.7 | < 0.3 (caotico) |
| **Angulos** | Todos < 90° (agudo) | Um proximo de 90° | > 90° (obtuso) |

### 3.3. Protocolos

**Protocolo α (Agudo — normal):**
- Todos angulos < 90°
- NVO = baricentro do ortico
- ZRE = triangulo ortico
- Operacao normal

**Protocolo β (Obtuso em Custo):**
- Angulo C > 90° → custo dominante
- NVO → incentro (sempre interno)
- Traslado por paralelismo (retas mestras transladadas)
- Triangulo invertido flutuante
- Acao: reduzir custo ou aumentar escopo

**Protocolo γ (Obtuso em Prazo):**
- Angulo P > 90° → prazo dominante
- Mesma mecanica do β, eixo diferente
- Acao: compressao de prazo (crashing/fast-tracking) ou expandir escopo

### 3.4. Burndown e Curva-S
**Onde:** Motor → Burndown / Curva-S
- Burndown de prazo: 100% → 0% com reta OLS + Murphy
- Curva S de custo acumulado
- Tangente no ponto de inflexao

---

## 4. DECISAO — MATED e Gabinete de Crise

### 4.1. Simulador de Decisao
**Onde:** Motor → TM (slider ou click no canvas)
**Como funciona:**
1. Mova o slider de Prazo e Custo
2. O TM se redeforma em tempo real
3. A distancia MATED muda
4. O sistema mostra "esta decisao te leva da zona X para a zona Y"

**Controle remoto (ESC-6):**
- Altere um angulo → veja impacto em dias e R$
- Funcoes: `inverseTM()`, `inverseFromAngle()`, `traduzirDeltaGeometrico()`

### 4.2. Gabinete de Crise (War Room)
**Onde:** Decisao → War Room
**Quando acionar:** zona CRISE (d_MATED > 0.30) ou CEt proxima de violacao
**Funcionalidades:**
- Klauss (IA): analisa contexto do projeto e sugere acoes
- What-if: simula cenarios alternativos
- Registro: toda decisao do gabinete fica registrada em `decisoes_mated`

### 4.3. MATED como Ranqueador de Decisoes
**Onde:** Decisao → MATED
**Como usar:**
1. Liste 3-5 opcoes de decisao
2. Cada uma gera um ponto no plano do TM
3. A mais proxima do NVO (menor d_MATED) e a melhor
4. Se todas cairem em zona CRISE, nenhuma e boa — acione o gabinete

### 4.4. Decisoes como Texto (IA)
O Klauss pode analisar decisoes descritas em linguagem natural:
1. Descreva: "Quero contratar 3 devs extras para antecipar o backend em 15 dias"
2. Klauss converte para parametros numericos (delta dias, delta custo)
3. O sistema calcula o ponto MATED resultante
4. Mostra o impacto no triangulo

---

## 5. RELATORIOS

**Onde:** Relatorios
**O que mostra:**
- Monitor de Razao (IQ ao longo do tempo)
- Snapshots MATED
- Historico de zonas (timeline semanal)
- Decisoes registradas

---

## 6. COMO LER O DASHBOARD

O dashboard principal (pagina do projeto) tem 3 niveis de informacao:

**Nivel 1 — Semaforo (topo):**
Badge colorido com zona atual (OTIMO/SEGURO/RISCO/CRISE) + mensagem

**Nivel 2 — CDT Visual:**
Triangulo + KPIs (lados E/C/P, desvio %, MATED d, forma, Monte Carlo)

**Nivel 3 — Tecnico (colapsavel):**
R², A_mancha, A_rebarba, forma triangulo, projecao financeira

---

## 7. GLOSSARIO RAPIDO

| Termo | Significado PM |
|-------|---------------|
| E = 1.0 | Escopo no plano (referencia) |
| C > 1.0 | Custo acima do planejado |
| P > 1.0 | Prazo acima do critico |
| d_MATED = 0 | Projeto perfeito (estado de graca) |
| A_rebarba > 0 | Zona plastica: dano permanente |
| CEt violada | Projeto geometricamente impossivel |
| Protocolo β | Custo dominante: traslado ativo |
| R² < 0.3 | Comportamento caotico: risco autonomo |

---

*Tutorial gerado para Aura v4.0 — EP-ESCALENO (2026-03-29)*
