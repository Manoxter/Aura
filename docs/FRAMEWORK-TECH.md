# FRAMEWORK Aura — EXTENSÃO TECH (CCPM)

**Documento:** Extensão Arquitetural Específica Tech
**Abrangência:** EXCLUSIVA para a Pasta `Aura/` (Aplicável à Gestão Digital/Ágil).
**Data da Revisão:** Abril de 2026

Este documento guarda as decisões arquiteturais criadas para suprir ambientes de projetos infestados de variância e de vícios comportamentais (Estudante/Parkinson), substituindo o agendador clássico por Cadeia Crítica e implementando Sprints.

---

## 1. MUDANÇA DE PARADIGMA: O MOTOR CCPM

Na área Tech, a adoção do PERT/CPM Clássico gerava sobrecarga e prazos fantasiosos em função da multitarefa, síndrome de estudante e Lei de Parkinson. A extensão usa CCPM (Critical Chain Project Management):

### 1.1 Aditivos do CCPM (D1 a D6)
- **Corte de Estimativa (D1):** Estimativas por tarefas são requisitadas em duplicidade aos agentes (Otimista + Seguro). O `Agressivo` (Otimista) é utilizado como valor de base. 
- **Calculo de Buffer em RSS (D2, D6):** Toda segurança extraída no *Corte*, vira um pool contínuo de buffer global (Project Buffer), gerado com equação Raiz das Somas dos Quadrados `√(Σsᵢ²)`. Aplica-se ao Prazo e Custo.
- **Formulário Auth e Autenticação (D3, D4):** Os próprios designados à tarefa apontam as estimativas O+S através de formulários `Magic Link`. PM possui Dashboard com Status com escalamento via Klauss após 48h.
- **Burndown Bifurcado (D5):** `P(t)` agora é um Burndown bifurcado. A "Zona Restante" cai íngreme no final, englobando invasão do Buffer.

---

## 2. METODOLOGIA ÁGIL — FRACTAIS E O TM VIVO (BOTTOM-UP)

O regime ágil CCPM rompeu com o conceito de triângulo estático do passado. O Triângulo de Qualidade aqui é um **Organismo Vivo**. Jamais forçaremos uma condição de "falso equilíbrio equilátero". As mínimas deformidades geradas em Custo e Prazo torcem o triângulo alterando seus ângulos em tempo real, denunciando visualmente as restrições impostas.

### 2.1 Construção Bottom-Up Reversa e Sprints (D7, D30)
- O TM agora nasce "De baixo para cima". Primeiro, partilhamos o projeto em Sprints e distribuimos os recursos.
- **A Base da CEt:** A duração da "Cadeia Crítica" determina o tamanho do escopo (Base da Geometria) para amparar o cálculo da *Condição de Existência do Triângulo (CEt)*.
- **Normalização:** A duração de cada Sprint (milestone) é matematicamente normalizada em proporção `1` (sendo 1 o somatório do tempo total das Sprints).
- **Backward Pass:** Aplica-se a validação CEt partindo do *último fractal* e distribuindo os recursos de trás para a frente com rigor extremo.

### 2.2 A Decisão D15: Hierarquia de Sub-Falhas (Cadeia vs Paralelo)
O Triângulo é intransigente com o fluxo crítico, refletindo o rigor de Goldratt:
- **Golpe Fatal (Cadeia Crítica Corrompida):** Se a CEt detectar a impossibilidade da existência geométrica de um fractal (Sprint) em que passe uma tarefa da Cadeia Crítica, o sistema aborta. **O TM global é considerado 100% INVÁLIDO.** Exige-se recalibragem de custos e prazos no zero.
- **Golpe Local (Restrição Paralela Afetada):** Se a CEt invalidar a geometria de um fractal paralelo e marginal (livre da Cadeia Crítica), a macroestrutura não afunda. **Apenas este fractal é tido como inválido** e será fustigado e recalculado.

### 2.3 Formula N e Transition Buffers (D19, D25)
Ainda mantemos as métricas TBZ para intersection handoff entre Sprints, além de sugerir os quadros populacionais ideais via Formula N sem gerar gargalo pela Lei de Brooks.

---

## 3. O FEVER CHART GEOMÉTRICO (D10, D29)

Monitoramento do CCPM via Gráfico de Febre atrelado aos "Pecados" geométricos:

- Tradução de buffer penetration em mancha plana visual (2D) cruzando Área Geometria da CEt Reversa e Penetração Linear 1D Tradicional.
- Criação e segmentação de 4 Zonas de Aderência: Verde, Amarelo, Vermelho, Preto (Extinto/Falho) sem o Peso Moralizador do RAG original e incorporando o IC90 log-normal assimétrico.
- As integrações e atuações de mudança no cronograma formam Pins Históricos na rota gerada do FeverChart.

---

## 4. O CASTELO DE CARTAS E BACKEND (D21, D31)

### 4.1 Backbone 3-Tier Layer Decision (D21)
O Backend do motor Tech lida com os offsets e desvios de rotação atrelando eventos como Aporte Adicional, Paralisão e Retomadas operando com três instâncias:
- Camada de Input do Custo.
- Camada de Input de Prazo.
- Camada de Escopo que reflete CDT unificado.

### 4.2 Castelo de Cartas - Propagação Exponential Decay (D31)
Se um Feature Branch sofre atraso no começo, as decisões atreladas (o escorregamento) propagam os dias excedentes pelas tabelas (Timeline) encarecendo atrasos como Juros Compostos Exponenciais (atenuado por Buffers `e^(-lambda * k)`). Causa um "Skew Visual" e deforma Sprints Futuros.

---

## 5. EXPERIÊNCIA PM, SANFONA & IA DEDICADA

- **A Sanfona de Versionamento (D32):** UI Exclusiva de Desvios (Setup Pontilhado Base vs Corrente Execução Contínua Sólida) expõe O Impacto Acumulado.
- **Klauss Causal (D33):** Adaptação do Assistente da LLM usando Prompts voltados para Agilidade, Sprints, Crashing e Features. Templates dedicados a FeverChart que emitem conselhos narrativos.
- **Priors Bayesianos Nativos (D12-Tech):** O Algoritmo de Inteligência de Risco carrega Defaults Inbound do *Standish CHAOS (70% Overtime Rate)*, difíceis e cruéis em discrepância com CEt da Civil do Aura Base.

---

## 6. RELAÇÃO DE DECISÕES EXCLUSIVAS TECH

| Código | Decisão Matemática CCPM & Fractais (Exclusivas Tech) |
|--------|-------------------------------------------------------|
| **D1** | Adotamento da Estimativa O+S e Agreessiva. |
| **D2** | Fim da Gordura Local; O Project Buffer RSS (Matemático) globalizado. |
| **D3/D4** | WorkFlow MagicLink Recrutados & Lembrete de Extensão (Klauss Push). |
| **D5** | P(t) em duas fases Descendentes (Inclinado vs Planejado). |
| **D6** | Integração do Cost Buffer à regra do CCPM (RSS aplicado). |
| **D7** | Sprint Triangles e TBZs Fractais de transição (Triângulo de Ponta-Cabeça Base). |
| **D8** | Resgate atrelado via Crashing - Alocação (Efeito Multiplicador) Evidenciado na Feature Branch de Gargalo. |
| **D9** | Regra CCPM restritiva (Contributor exclusivo à Critical Chain - Fluxo Sequencial Forçado). |
| **D10** | Heatmap CEt em ZII Transposto para Zona do Buffer do FeverChart de Penetração. |
| **D12** | Heron's Distorção (Aceite inegociável da não média unificada de status fractais). |
| **D13** | Regra em Camadas do CEt - Baseline -> Sprint -> Buffer Limit. |
| **D14** | Buffer TRUNCADO no Teto imposto Pela CEt (Proteção do Triângulo vs CCPM de Goldratt Clássico). |
| **D15** | Hierarquia de Falha (Se a CC falha, Aborta. Apenas Local falhando reflete Localmente). |
| **D16-33**| (Termos Ágeis, Ghost TM, Sanfona de Setup, FeverChart Ágil e Prompts IA) |
| **D38** | As Configurações Universais D40-42 aplicadas por Sprint Autônomo. |
