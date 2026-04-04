# PRD — Aura 6.1: Motor Matemático Robusto + Sistema de Coordenadas Dual
**Product Manager:** @pm (Morgan)
**Data:** 2026-03-17 | **Status:** APROVADO
**Branch:** aura1703 → aplicacoes → main

---

## 1. VISÃO DO PRODUTO

O Aura é um SaaS de gestão de projetos baseado em geometria analítica que transforma o Triângulo da Qualidade (Escopo, Prazo, Custo) em um KPI dinâmico, calculável e auditável. A versão 6.1 consolida as decisões das Sessões P1–P5 em uma implementação completa, corrigindo falhas matemáticas identificadas em auditoria e expandindo o sistema com capacidades inéditas na literatura de gestão de projetos.

---

## 2. PROBLEMA

### 2.1 Problemas Críticos (bloqueadores)
| ID | Problema | Impacto |
|----|---------|---------|
| PR-01 | CEt verificada pós-normalização — pode aceitar triângulos inválidos | Motor calcula área de triângulo que não existe |
| PR-02 | NVO indefinido para triângulos obtusângulos — triângulo órtico cai fora de TA | MATED mede distância sem sentido gerencial |
| PR-03 | Burndown serializa tarefas paralelas — Lado P não reflete CPM real | Função Prazo incorreta em projetos com paralelismo |
| PR-04 | Zonas MATED calibradas em n=1 (Big Dig) — sem validade estatística | Alertas de crise podem ser falsos positivos/negativos |
| PR-05 | Fator 1.5 na regressão ponderada sem base estatística | Função Custo distorcida em projetos reais |
| PR-06 | σ=0.1 no Monte Carlo subestima variabilidade real de obras civis | Intervalos de confiança otimistas demais |

### 2.2 Problemas de Produto (experiência)
| ID | Problema |
|----|---------|
| PR-07 | PERT com layout desorganizado — não usa algoritmo Sugiyama |
| PR-08 | Gantt ilegível em projetos longos |
| PR-09 | Lado E fixo em 1.0 torna triângulo cego a scope creep |
| PR-10 | Navegação inconsistente com nomenclatura desatualizada (EAP, CPM, CDT) |
| PR-11 | Nenhuma ferramenta de diagnóstico integrada ao fluxo de crise |
| PR-12 | Resultado final de projeto declarado subjetivamente pelo PM |

---

## 3. OBJETIVOS DA VERSÃO 6.1

| # | Objetivo | Métrica de Sucesso |
|---|---------|-------------------|
| O1 | Motor matemático 100% correto e auditável | 0 falhas no suite Big Dig + 3 projetos piloto |
| O2 | Sistema de coordenadas dual para triângulos obtusângulos | Modo Invertido ativo e testado em fixture obtusângulo |
| O3 | Calibração Bayesiana com priors de 3+ fontes publicadas | Zonas MATED com base em n≥1000 projetos históricos |
| O4 | PERT com auto-cálculo CPM e layout Sugiyama | ES/EF/LS/LF calculados automaticamente, 0 edição manual |
| O5 | SDO: resultado de projeto calculado algoritmicamente | SDO calculado ao arquivar projeto, sem declaração humana |
| O6 | Navegação redesenhada (P5) implementada | Todas as rotas corretas, sidebar nova estrutura |
| O7 | CI/CD funcional com qualidade automatizada | PR falha se lint/typecheck/vitest falharem |

---

## 4. ESCOPO DA VERSÃO 6.1

### IN SCOPE
- Todos os 11 épicos do MASTERPLAN (docs/MASTERPLAN.md)
- 59 decisões das listas E1–E26, D1–D10, S1–S7, M1–M4, P1–P4, K1–K4
- 4 novas tabelas de banco (triangulo_matriz_versoes, progresso_tarefas, decisoes_mated, aura_calibration_events)
- Piloto com Gênesis Empreendimentos (Teresópolis, RJ)

### OUT OF SCOPE (v6.2+)
- Opção C do σ (calibração manual pelo PM) — roadmap enterprise
- CCPM/TOC integração (agenda P4)
- Aura poligonal N-dimensional (agenda P1)
- Multi-idioma

### DECISÕES ADIADAS (pós-piloto, per E13)
- Zonas MATED finais (aguardam dados reais do piloto)
- Fator de setor final (aguarda validação Gênesis)
- Monte Carlo empírico (aguarda n≥30 projetos arquivados)

---

## 5. REQUISITOS FUNCIONAIS

### RF-01 — Motor Geométrico
- CEt verificada em dois momentos: valores brutos e valores normalizados (E19)
- NVO calculado por hierarquia: baricentro órtico TA → baricentro TM → incentro TM (E18)
- Burndown baseado em ES/EF do CPM, não soma serializada (P1-INSIGHTS)
- Lado E dinâmico: E = tarefas_atuais / tarefas_baseline (M1)

### RF-02 — Sistema de Coordenadas Dual
- Detectar classificação do triângulo (acutângulo / obtusângulo / tipo β/γ)
- TM que nasce obtusângulo → Modo Invertido ativo desde criação (E23)
- Badge "Regime Obtuso" visível quando TA em β ou γ (E20)
- Evento Remissão registrado ao detectar transição obtusângulo→acutângulo (E24)
- Gabinete de Crise Positiva acionado em Remissão (E25)

### RF-03 — Calibração Bayesiana
- Priors importados por setor (construção, infraestrutura, energia, TI) (E1, E4)
- Fator regressão ponderada por setor: 1.2/1.4/1.6/1.0 (E11)
- σ Monte Carlo por setor com migração automática após n≥30 projetos (E17)
- Tabela aura_calibration_events com registro de cada projeto arquivado (E8)
- Interface mostra "régua baseada em N projetos" ao PM (E6)

### RF-04 — Diagramas
- PERT: auto-cálculo CPM (ES/EF/LS/LF/TF/FF) sem edição manual (S1)
- PERT: layout Sugiyama + nodes ID+duração + caminho crítico vermelho (S2)
- PERT: empate de caminho → listar todos + PM seleciona (S3)
- Gantt lupa: hover ±15% sobre Função Custo (S4)

### RF-05 — Execução e SDO
- % avanço por tarefa em Gerenciamento e Kanban (P1-SPRINT-MEMORY)
- Recalcular TA ao registrar progresso
- SDO = 40% área + 35% trajetória MATED + 25% benchmark setorial (E2, E3)
- TM versionado: novo TM ao aprovar aditivo, motivo obrigatório (S6)
- Alerta automático TA/TM desvia >5% (S7)
- Histórico de Remissões paralelo ao Histórico de Pecados (E24)

### RF-06 — Navegação
- Rotas: /wbs, /tarefas-diagramas, /triangulo-matriz (D2, D3, D4)
- Sidebar: SETUP / MOTOR MATEMÁTICO / GOVERNANÇA (D1)
- Administração no header/avatar, fora da sidebar (D7)

### RF-07 — IA Klauss
- Endpoint POST /api/ai/klauss-to-mated: texto → parâmetros numéricos
- Rota /api/ai/dica-metodo-prazo (paridade com orçamento) (K3)
- Klauss sugere ferramenta mais adequada ao contexto de crise (D10)
- Klauss explica Modo Invertido e Remissão ao PM (E23, E24)

### RF-08 — Infraestrutura
- GitHub Actions: lint + typecheck + vitest obrigatórios no PR
- Deploy automático Vercel ao merge em main
- RLS em todas as novas tabelas

---

## 6. REQUISITOS NÃO-FUNCIONAIS

| ID | Requisito |
|----|---------|
| NF-01 | TypeCheck: 0 erros novos introduzidos por sprint |
| NF-02 | Vitest: cobertura ≥80% nas funções do engine matemático |
| NF-03 | Big Dig como fixture obrigatória em todos os testes do motor |
| NF-04 | Transformações do Mundo Invertido ocorrem no backend; frontend não conhece coordenadas inversas |
| NF-05 | Klauss explica qualquer mudança de modo ao PM antes que ela apareça na UI |
| NF-06 | Migrations com rollback testado antes do merge |

---

## 7. ÉPICOS E PRIORIDADE

| Épico | Título | Tier | Sprints |
|-------|--------|------|---------|
| EP-01 | Fundamentos Geométricos | 🔴 Crítico | B-FIX, C-CEt, C1, C2, C4, C5 |
| EP-02 | Triângulo Obtuso / Mundo Invertido | 🔴 Crítico | TM-SHADOW, EXEC-MODULE |
| EP-03 | Calibração Bayesiana | 🔴 Crítico | DB-EXEC, F-CICD |
| EP-04 | Diagramas PERT e Gantt | 🟠 Alta | PERT-V2, GANTT-LUPA |
| EP-05 | Módulo de Execução | 🟠 Alta | EXEC-MODULE, C8 |
| EP-06 | Redesign de Navegação | 🟡 Média | RENAME-ROUTES |
| EP-07 | IA Klauss | 🟡 Média | KLAUSS-MATED, C7, C10 |
| EP-08 | Infraestrutura CI/CD | 🔴 Crítico | DB-EXEC, F-CICD |
| EP-09 | Caixa de Ferramentas | 🟢 Baixa | FERRAMENTAS |
| EP-10 | Administração e Billing | 🟢 Baixa | ADMIN-SIDEBAR |
| EP-11 | Pesquisa e Publicação | 🔵 Estratégico | Piloto + Paper |

---

## 8. CRITÉRIOS DE ACEITE GLOBAIS

- [ ] Suite Big Dig passa com 100% das asserções matemáticas
- [ ] Projeto obtusângulo-fixture processa no Modo Invertido sem erros
- [ ] Projeto acutângulo que vira obtusângulo durante execução registra evento Remissão
- [ ] PM nunca precisa inserir ES/EF/LS/LF manualmente
- [ ] CEt falha bloqueada em ambos os momentos (pré e pós-normalização)
- [ ] Todas as rotas renomeadas funcionando sem 404
- [ ] CI/CD bloqueia merge com falha em lint/typecheck/vitest

---

## 9. REFERÊNCIAS

| Documento | Localização |
|-----------|------------|
| MASTERPLAN.md | `docs/MASTERPLAN.md` |
| SPRINT-MEMORY.md | `docs/SPRINT-MEMORY.md` |
| INSIGHTS-LOG.md | `docs/INSIGHTS-LOG.md` |
| como-e-porque.md | `docs/como-e-porque.md` |
| Contribuição Original | `prints para teste/.../Aura_Coordenadas_Dual_*.md` |
| MetodoAura.md | `MetodoAura.md` |

---

*@pm Morgan | PRD aprovado para início do pipeline SDC | 2026-03-17*
