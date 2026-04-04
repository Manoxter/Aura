# Auditoria de Sincronização Estratégica: PRD v3.0 vs PRD v4.0

> [PT](../pt/reviews/prd-audit-v3-v4.md)

---

**Auditores:** @aiox-master, @aura-math, @aura-pm, @architect
**Data:** 2026-03-11
**Contexto**: O projeto Aura-6.1 está em fase de consolidação. Esta auditoria visa identificar divergências entre a especificação mestre e a implementação/estratégia atual.

---

## 🛑 Inconsistências Críticas Identificadas

### 1. Motor de Custo (Segmentação)
- **PRD v3/v4**: Exige **Dois Segmentos Distintos** (Azul para Base, Laranja para Contingência).
- **Estado Atual**: O motor `triangle-logic.ts` e o dashboard tratam o custo como um valor linear único adimensionado.
- **Risco**: Violação da regra de visibilidade de reserva de contingência e bloqueio de teto da TAP.

### 2. Motor de Prazo (CPM vs. Linear)
- **PRD v4**: Exige integração com **CPM (Caminho Crítico)**, incluindo ES, EF, LS, LF e folgas, ajustado por calendário real (feriados).
- **Estado Atual**: O prazo é calculado como uma função linear decrescente simples no motor matemático.
- **Risco**: O triângulo não reflete a saúde real da rede de tarefas, apenas a passagem do tempo cronológico.

### 3. Conceito de Qualidade (IQ vs. IQo)
- **PRD v3**: Define o **Triângulo Órtico (IQo)** como o segundo cinturão de governança.
- **PRD v4**: Foca na relação `Qualidade = f(Custo, Prazo)` e em **Envelopes de Possibilidade (4 Extremos)**.
- **Resolução**: A estratégia deve unificar as duas: IQo como métrica de estabilidade e Envelopes como métrica de risco.

### 4. Gestão de Escopo
- **PRD v3**: `REGRA INVIOLÁVEL`: Escopo nunca é alterado automaticamente como trade-off.
- **Discussão atual**: Existe uma tendência de tratar o escopo como variável flexível na UI. Isso deve ser corrigido para ser um evento formal e explícito.

## 🛠️ Plano de Correção (Norte Estratégico)

1.  **Refatoração do Engine**: Reescrita de `triangle-logic.ts` para suportar funções de custo por segmentos e integração com Caminho Crítico.
2.  **Hardening da TAP**: Imposição de campos `tap_*` imutáveis no banco de dados, conforme Seção 7.3 do PRD v3.
3.  **UI de Governança**: Implementação da "Dupla Régua" no eixo Y, ocultando valores adimensionais do usuário final.
4.  **Handoffs Agênticos**: `@aura-math` deve ser o guardião único da Camada 2 a 7, enquanto `@aura-pm` gerencia a Camada 1 (TAP e Entregas).

---
_Aguardando validação do Sponsor para atualizar a Definição de Projeto Mestre._
