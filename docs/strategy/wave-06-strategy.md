# Estratégia de Excelência Colaborativa: Aura-6.1 (Wave 06)

> [PT](../pt/strategy/wave-06-strategy.md)

---

**Version:** 1.0.0
**Status:** Under Proposal
**Lead Agents:** @aiox-master, @architect
**Target:** Estabilidade, Segurança e Eficiência Interdependente

---

## 🏗️ 1. Desenvolvimento e Estabilidade (@aura-math & @dev)

Para garantir que o motor geométrico não impacte a experiência do usuário durante cálculos complexos de cenários extremos:

*   **Infraestrutura de Web Workers**: Migrar o `triangle-logic.ts` para um Web Worker dedicado. Isso permite que `@aura-math` execute simulações pesadas sem travar a UI principal.
*   **Shadow DOM Sandboxing**: Componentes críticos como o `TrianglePlotter` e `GabineteDeCrise` devem usar Shadow DOM para evitar vazamento de estilos e garantir isolamento funcional.

## 🛡️ 2. Segurança e Integridade (@devops & @qa)

Garantir que os dados de governança sejam imutáveis e protegidos:

*   **Supabase RLS Hardening**: Implementar as políticas de Row Level Security (RLS) faltantes detectadas na `schema.sql`. Somente o `gestor_id` pode mutar dados do projeto.
*   **Environment Scrubbing**: Agentes devem rodar um linter de segurança que impede que segredos (STRIPE_KEY, SUPABASE_SERVICE_ROLE) apareçam em logs de "Handoff" ou Stories.

## ⚡ 3. Eficiência e Interdependência (@aiox-master & @aura-pm)

Otimizar a forma como os agentes trabalham juntos:

*   **Custom MCP (Model Context Protocol)**: Criar um servidor MCP local para o Aura. Isso permitirá que os agentes consultem o estado do banco de dados e as métricas geométricas via ferramentas nativas (`list_projects`, `get_geometric_quality`), reduzindo tokens e aumentando a precisão.
*   **Proactive Notification Gate**: `@aura-pm` deve ser notificado automaticamente sempre que `@aura-math` detectar um "Triangle Collapse" (Cenário de falha iminente), disparando um handoff imediato para o Gabinete de Crise.

---

## 🗺️ Roadmap de Implementação (Wave 06)

| Etapa | Ação | Responsável | Status |
| --- | --- | --- | --- |
| 01 | Definição de Políticas RLS | @devops | ⏳ Pendente |
| 02 | Bootstrap Web Worker Alpha | @aura-math | ⏳ Pendente |
| 03 | Draft do Servidor MCP Aura | @aiox-master| ⏳ Pendente |

---
_Aprovado pelo Conselho Agêntico | 2026-03-11_
