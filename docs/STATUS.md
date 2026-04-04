# Estado Atual do Sistema: Aura-6.1 (Wave 07)

> [PT](../pt/status/current-state.md)

---

**Version:** 1.0.0
**Status:** Auditado por @aiox-master & Team
**Date:** 2026-03-11

---

## 1. Visão Geral Técnica
O Aura é uma plataforma SaaS modular construída em **Next.js 14**, focada em governança de projetos e qualidade geométrica.

### Core Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React.
- **Visualização**: Recharts (Dashboard & Triangle Plotter).
- **Backend**: Next.js API Routes (TypeScript), Supabase (PostgreSQL/RLS).
- **IA**: Groq SDK (LLM), orquestração via rotas dedicadas.
- **Pagamentos**: Stripe Integration.

## 2. Inventário de Componentes Críticos

### 🧠 Inteligência Artificial (AIOS Ready)
- `api/ai/extract`: Extração de TAP.
- `api/ai/tap`: Processamento estruturado de dados de abertura.
- `api/ai/proactive-setup`: Motor proativo do Klauss (Setup inicial).
- `api/ai/cpm`: Motor de Caminho Crítico assistido por IA.

### 📐 Motor Lógico (The Engine)
- `src/lib/engine/triangle-logic.ts`: Núcleo matemático de qualidade geométrica.
- `src/lib/engine/euclidian.ts`: Utilitários espaciais.
- `src/lib/engine/mapper.ts`: Transformação de dados de negócio para geometria.

### 💼 Governança de Interface
- `TrianglePlotter.tsx`: Renderização do triângulo de qualidade.
- `GabineteDeCrise.tsx`: Dashboard de monitoramento de risco.
- `ProjectContext.tsx`: Gerenciamento de estado global reativo.

## 3. Maturidade de Governança Agêntica
- **Documentação**: Sharded e indexada em `docs/`.
- **Quality Gates**: Vitest + Husky (pre-push) operacional par ao engine.
- **Processo**: Story-Driven e CLI-First integrados na Constituição.
- **Time**: Agentes especializados `@aura-math` e `@aura-pm` formalizados.

---
_Last Audit: 2026-03-11 | Wave 07_
