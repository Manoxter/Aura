# Backlog e Estratégia de Desenvolvimento: Aura-6.1 (Wave 09)

> [PT](../pt/status/backlog-strategy.md)

---

**Version:** 1.0.0
**Status:** Orquestrado por @po, @sm & @devops
**Strategy**: Quality First | Interdependent Agents

---

## 📅 1. Sprint de Curto Prazo (Foco: Estabilidade & Segurança)

### [BE-01] Hardening de Segurança (Prio: S)
- **Ação**: Aplicar `docs/strategy/rls-policy-draft.sql` no Supabase.
- **Dono**: @devops & @qa
- **Gate**: Auditoria de RLS pós-deploy.

### [MC-01] Desbloqueio do Motor Matemático (Prio: P0) - ✅ CONCLUÍDO
- **Ação**: Migrar `triangle-logic.ts` para Web Worker.
- **Dono**: @aura-math & @dev
- **Interdependência**: @aura-math garante a exatidão; @dev garante a integração UI.

## 📈 2. Sprint de Médio Prazo (Foco: Inteligência & UX)

### [AI-01] Validação Unificada de Response (Prio: P1) - ✅ CONCLUÍDO
- **Ação**: Criar middleware de Zod/Schema para todas as rotas de IA.
- **Dono**: @architect
- **Benefício**: Prevenir crashes por alucinação de formato.

### [UX-01] Ativação do Gabinete de Crise (Prio: P1)
- **Ação**: Conectar botões de simulação e aprovação ao State Real.
- **Dono**: @dev & @aura-pm
- **Fluxo**: @aura-pm valida o contexto do projeto antes da simulação.

## 🚀 3. Visão de Longo Prazo (Foco: Escalabilidade)

### [SYS-01] Aura Custom MCP (Prio: P2)
- **Ação**: Implementar servidor MCP para consulta de estado de engenharia.
- **Dono**: @aiox-master
- **Visão**: Agentes consultando o banco sem intermediários lentos.

---

## 🛠️ Próximos Quality Gates
1. **Pre-commit**: Linter de segredos (no handoffs).
2. **Pre-push**: Cobertura de testes > 90% no motor matemático (via Vitest).
3. **Daily**: Registro automático de decisões (ADR) em cada Wave.

---
_Last Updated: 2026-03-11 | Wave 09_
