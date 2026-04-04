# Arquitetura: Aura SaaS - Padrões e Convenções

> [PT](../pt/architecture/04-patterns.md)

---

**Version:** 0.1.0
**Last Updated:** 2026-03-11
**Status:** Active

---

## Padrões de Código

*   **Imports Absolutos**: Obrigatório o uso de `@/` para referência à pasta `src/`.
*   **Componentes**: Funcionais em React com hooks.
*   **Mecanismo de IA**: Centralizado em `src/lib/engine/ai-client.ts`.
*   **Lógica de Negócio**: Isolada em `src/lib/engine/` para facilitar testes unitários.

## Convenções de Documentação (AIOS)

*   **Sharding**: Documentação dividida em arquivos granulares para facilitar o contexto dos agentes.
*   **Checklists**: Uso de checklists em `docs/checklists/` para validar entregas.
*   **Stories**: Todo desenvolvimento deve ser documentado em `docs/stories/`.

## Quality Gates (Husky)

1.  **Linter**: `npm run lint` deve passar.
2.  **Tests**: `npx vitest run` é obrigatório antes de cada push.

---
_Last Updated: 2026-03-11 | AIOS Framework Integration_
