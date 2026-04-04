# Arquitetura: Aura SaaS - Tech Stack

> [PT](../pt/architecture/02-tech-stack.md)

---

**Version:** 0.1.0
**Last Updated:** 2026-03-11
**Status:** Active

---

## Frontend
*   **Framework**: Next.js 14.2.15 (App Router).
*   **Estilização**: Tailwind CSS.
*   **Gráficos**: Recharts para dashboards e Triangle Plotter.
*   **Componentes**: Lucide React para ícones, `clsx` e `tailwind-merge` para classes dinâmicas.

## Backend & Serviços
*   **Persistência**: Supabase (PostgreSQL).
*   **Serverless**: Next.js API Routes (TypeScript).
*   **Orquestração AI**: Groq SDK (Modelos Llama-3).
*   **Pagamentos**: Stripe Integration.

## Governança & Qualidade
*   **Gestão de Processos**: AIOX Framework Core.
*   **Hook System**: Husky (pre-push gates).
*   **CI & Testes**: Vitest para o motor matemático.

---
_Last Updated: 2026-03-11 | AIOS Framework Integration_
