# Aura — Insights Log
## Registro de Análises, Pareceres e Propostas do Squad

**Criado:** 2026-03-16 | **Mantido por:** @aiox-master (Orion)

---

## Como usar este documento

Cada entrada registra uma **sessão de análise** do squad sobre documentos, descobertas ou propostas. As entradas são cronológicas e acumulativas — nunca deletar, apenas adicionar.

**Status de implementação:**
- 🔴 CRÍTICA — bloqueia consistência do método
- 🟠 ALTA — impacto direto na qualidade do motor
- 🟡 MÉDIA — melhoria importante, não urgente
- 🟢 BAIXA — nice-to-have
- 🔵 ESTRATÉGICA — diferencial de mercado/publicação
- ✅ IMPLEMENTADO — já no código
- ❌ DESCARTADO — testado e rejeitado com justificativa

---

## ENTRADA #001 — 2026-03-16

### Documentos Analisados
- `prints para teste/Aura_Memoria_Matematica_Decisoes.pdf` — Histórico de decisões matemáticas (teoria / falhou / solução / a testar)
- `prints para teste/Aura_Memoria_Matematica_v2.pdf` — Memória técnica completa v2.0 (Marco 2026)

### Squad Convocado
- **@aura-math** — Geômetra Sênior, motor matemático
- **@aura-production** — Engenharia de Produção / TOC / PMBOK
- **@pm-engineer (Dr. Kenji)** — Engenharia de Valor & Implementação

### Requisição Original
> "Reuna o squad, principalmente o Aura-production.md, Aura-math.md e o Kenji para avaliar as propostas, soluções e insights do documento e gerar um relatório analítico com o parecer de cada um deles sobre o que desse documento podemos implementar e que traga mais consistência ao motor matemático tanto para as funções prazo e custo quanto para a metodologia do triângulo matriz e o MATED."

---

### Propostas Identificadas

| ID | Proposta | Autor | Status | Prioridade |
|----|---------|-------|--------|-----------|
| M1 | Lado E dinâmico — scope creep geométrico via razão EAP atual/baseline | @aura-math | 🔴 Pendente | CRÍTICA |
| M2 | Modelo Quadrático de Curva S (3º modelo para obras civis) | @aura-math | 🟡 Pendente | MÉDIA |
| M3 | OLS puro como opção comparativa de reta de orçamento | @aura-math | 🟢 Pendente | BAIXA |
| M4 | Zona de sensibilidade mínima MATED (desvio subclínico) | @aura-math | 🟡 Pendente | MÉDIA |
| P1 | Burndown baseado em ES/EF do CPM real (não soma sequencial) | @aura-production | 🔴 Pendente | CRÍTICA |
| P2 | Classificar zeros de burndown: Murphy (peso 1.8x) vs planejado (excluir) | @aura-production | 🟠 Pendente | ALTA |
| P3 | MATED causal por processo produtivo (diagnóstico de causa raiz) | @aura-production | 🟡 Pendente | MÉDIA |
| P4 | Publicar Opção 3 (Vetores de Intensidade Adimensional) como paper técnico | @aura-production | 🔵 Pendente | ESTRATÉGICA |
| K1 | Nomear Fase 2 como "Motor de Calibração Adaptativa" + gate A/B test Big Dig | @pm-engineer | 🟠 Pendente | ALTA |
| K2 | Persistir modelo_curva_s + metodo_reta_orc + metodo_reta_prazo no Supabase por projeto | @pm-engineer | 🟠 Pendente | ALTA |
| K3 | Implementar rota `/api/ai/dica-metodo-prazo` (paridade com orçamento) | @pm-engineer | 🟡 Pendente | MÉDIA |
| K4 | Propagar SVGPoint (onCanvasClick) para boards Orçamento e Prazo | @pm-engineer | 🟢 Pendente | BAIXA |

---

### Consenso — TOP 3 do Squad

> **"Se implementarmos apenas 3 itens, estes são os que trazem mais consistência ao motor matemático"** — unanimidade do squad

**1. M1 — Lado E dinâmico (scope creep geométrico)**
- **Problema:** E=1.0 fixo torna o triângulo CDT cego a violações de escopo
- **Solução:** `E = tarefas_atuais / tarefas_baseline` ou razão ponderada de pacotes EAP
- **Arquivos afetados:** `src/lib/engine/math.ts`, `src/lib/engine/extractors.ts`, pages do motor
- **Validação:** Novo teste Big Dig — scope creep entre 1993-1997 deve gerar E>1.0

**2. P1 — Burndown baseado em ES/EF do CPM real**
- **Problema:** `xAcum += duracao_estimada` serializa tarefas paralelas — Lado P não reflete o CPM
- **Solução:** Usar `tarefa.ES` como eixo X do burndown em vez de soma acumulada
- **Arquivos afetados:** `src/app/.../setup/funcoes/page.tsx`, `src/lib/engine/math.ts`
- **Validação:** Projeto com 3 tarefas paralelas deve gerar Lado P ≠ versão serializada

**3. K2 — Persistência de método por projeto no Supabase**
- **Problema:** Usuário recalibra método manualmente a cada sessão
- **Solução:** Campos `modelo_curva_s`, `metodo_reta_orc`, `metodo_reta_prazo` na tabela `projetos`
- **Arquivos afetados:** `supabase/migrations/`, `src/context/ProjectContext.tsx`, pages Orçamento e Prazo
- **Validação:** Salvar, fechar, reabrir — configuração persiste

---

### Detalhes por Agente

#### @aura-math — Parecer Completo

**M1 — Lado E Dinâmico (CRÍTICA)**
O triângulo CDT com E fixo é geometricamente inconsistente. Scope creep é a principal causa de falha em projetos PMBOK e é atualmente invisível no motor. Proposta: `E = f(pacotes_atuais, pacotes_baseline)`. O valor 1.0 preserva o significado de "estado ideal" da Opção 3.

**M2 — Modelo Quadrático (MÉDIA)**
O cúbico (`3t²-2t³`) assume simetria de desaceleração que obras civis raramente exibem. O quadrático (`t²`) captura aceleração sem desaceleração — mais realista para fase de acabamento. Implementação trivial: 3º botão na UI, sem mudar padrão.

**M3 — OLS como comparativo (BAIXA)**
Não para uso principal — o OLS subestima o pico da curva S. Mas como "régua de calibração" visível no gráfico é útil: divergência grande entre OLS e Ponderado indica projeto com mudança abrupta de ritmo.

**M4 — Sensibilidade mínima MATED (MÉDIA)**
Quando E≈O≈P≈1.05, o triângulo é quase equilátero e MATED≈0. Mas um desvio de 5% em cada dimensão é materialmente significativo. Proposta: alerta de "desvio subclínico" quando dist<ε mas alguma dimensão variou >5% do baseline.

---

#### @aura-production — Parecer Completo

**P1 — Burndown ES/EF (CRÍTICA)**
O burndown atual acumula durações sequencialmente ignorando o paralelismo do CPM. No TOC, o Throughput do projeto é determinado pelo caminho crítico — não pela soma das durações. O Lado P calculado sobre soma serializada não corresponde ao ritmo real. Fix: usar `tarefa.ES` do CPM já calculado.

**P2 — Zeros de Murphy (ALTA)**
Zeros no burndown têm dois significados opostos: paralisação não-planejada (sinal de crise — peso alto) vs. feriado/recesso (ruído — excluir). A regressão ponderada atual não distingue os dois. Implementar via calendário de trabalho do projeto.

**P3 — MATED Causal (MÉDIA)**
O MATED detecta "onde o projeto está" mas não "por qual processo chegou lá". Proposta: decompor o vetor MATED por tarefa CPM — qual tarefa mais contribuiu para o desvio? Alinha com PMBOK 7 Performance Domains e Six Sigma causa raiz.

**P4 — Paper Técnico Opção 3 (ESTRATÉGICA)**
A decisão de usar Vetores de Intensidade Adimensional com E=O=P=1 como referência universal é inédita em literatura de gestão de projetos. Nenhum framework existente (EVM, Earned Schedule, OKRs) oferece comparabilidade entre projetos de qualquer escala de forma geométrica. Recomendo submissão ao PMI ou IEEE.

---

#### @pm-engineer (Dr. Kenji) — Parecer Completo

**K1 — Nomear Fase 2 (ALTA)**
A Fase 2 do roadmap está em branco no v2. Os itens 🟡 (A Testar) pertencem a ela mas sem escopo formal criam risco de implementação ad hoc. Proposta: Fase 2 = "Motor de Calibração Adaptativa". Gate de aceitação: A/B test com Big Dig — modelo com menor erro de previsão no dia 1460 vira padrão.

**K2 — Persistência por projeto (ALTA)**
Sem persistência, o Aura é uma calculadora estática. Com persistência, é um sistema que acumula a calibração do gestor. Migração simples: 3 campos na tabela `projetos`. ROI imediato para usuários recorrentes.

**K3 — IA para Prazo (MÉDIA)**
A rota `/api/ai/dica-metodo-prazo` foi especificada no documento mas não implementada. Custo marginal próximo de zero: o padrão da rota de orçamento já existe. Paridade de funcionalidade entre os dois boards.

**K4 — SVGPoint nos outros boards (BAIXA)**
O TrianglePlotter já é interativo no CDT. Propagar `onCanvasClick` para Orçamento e Prazo completaria o ciclo de "decision intelligence by click" — o gestor simula cenários apontando na curva diretamente.

---

### Decisão dos Documentos Analisada — Itens [A TESTAR] Catalogados

| Item do Documento | Status Atual | Proposta do Squad | Sprint |
|------------------|--------------|-------------------|--------|
| Modelo Quadrático de Curva S | 🟡 A Testar | Implementar como 3ª opção (M2) | Sprint 6.1 |
| OLS puro para orçamento | 🟡 A Testar | Adicionar como comparativo visual (M3) | Sprint 6.2 |
| Regressão ponderada no burndown de prazo | 🟢 Já documentado como Solução | Verificar se está usando ES/EF ou soma (P1) | Sprint 6.1 |
| SVGPoint em todos os boards | 🟡 Fase 6 | Priorizar após K2 (K4) | Sprint 6.3 |

---

*Relatório gerado por @aiox-master com squad @aura-math + @aura-production + @pm-engineer | 2026-03-16*
