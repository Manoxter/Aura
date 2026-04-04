# Mapeamento de Problemas e Melhorias: Aura-6.1 (Wave 08)

> [PT](../pt/status/issues-mapping.md)

---

**Version:** 1.0.0
**Status:** Auditado por @qa, @aura-math & @aura-pm
**Date:** 2026-03-11

---

## 🛑 1. Problemas Identificados (Prio: Alta)

### 🛡️ Segurança: RLS Incompleta
- **Descrição**: O arquivo `schema.sql` habilita RLS, mas o repositório carece de políticas de isolamento reais aplicadas.
- **Risco**: Vazamento de dados entre tenantes caso a API seja mal utilizada.
- **Solução**: Aplicar imediatamente as políticas de `rls-policy-draft.sql`.

### 📉 UX/UI: Ações Fantasmas
- **Descrição**: No `GabineteDeCrise.tsx`, os botões "Simular Impacto" e "Aprovar Decisão" são puramente visuais (Mocks).
- **Risco**: Frustração do usuário e percepção de sistema incompleto.
- **Solução**: Conectar ações de IA reais para simulação de ZRE via @aura-math.

### 🧩 Performance: Thread Bloqueante
- **Descrição**: Cálculos geométricos síncronos em `triangle-logic.ts`.
- **Risco**: Lag na interface ao manipular triângulos com muitas tarefas.
- **Solução**: Delegar para Web Workers (Fase 4 do Roadmap).

### 🧐 Dúvida Estratégica: Gestão de Re-ancoragem
- **Dúvida**: Como equilibrar a fidelidade à TAP original (Escopo Fixo) com a necessidade operacional de mudar o escopo (Scope Creep)?
- **Insight**: Implementar o "Rastro do Pecado Original" — manter a deformação gravada em um snapshot histórico permanente, mas permitir uma nova baseline para cálculo operacional.
- **Dono**: @aura-production & @aura-math

### 🛑 Protocolo de Crise CET
- **Problema**: O que fazer quando $|P - C| < E < P + C$ é violado?
- **Solução**: Não bloquear o sistema (evitar engessamento). Gerar Relatório de Inconsistência e acionar o Gabinete de Crise (War Room) com suporte do Klauss IA.

## 💡 2. Melhorias Propostas (Prio: Média)

### 🤖 Validação de Resposta de IA
- **Melhoria**: Implementar um `middleware` de validação de schema para todas as rotas de chat/extração.
- **Benefício**: Estabilidade do frontend contra "alucinações" de formato da LLM.

### 🧪 Expansão de Testes de Bordo
- **Melhoria**: Criar testes para triângulos degenerados (lados zero ou colineares).
- **Benefício**: Resiliência matemática extrema em cenários de crise.

---
_Last Audit: 2026-03-11 | Wave 08_
