# PRD: Aura SaaS - Requisitos

> [PT](../pt/prd/03-requirements.md)

---

**Version:** 0.1.0
**Last Updated:** 2026-03-11
**Status:** Active

---

## Requisitos Funcionais (FR)

| ID | Requisito | Descrição |
| --- | --- | --- |
| FR-01 | Extração de TAP | O sistema deve ler textos via API e retornar JSON estruturado. |
| FR-02 | Setup Proativo | O sistema deve gerar tarefas, orçamentos e marcos via IA. |
| FR-03 | Cálculo Geométrico | O sistema deve calcular métricas baseadas em Geometria Euclidiana. |
| FR-04 | Persistência | Todos os dados de projeto devem ser salvos no Supabase. |

## Requisitos Não Funcionais (NFR)

| ID | Requisito | Descrição |
| --- | --- | --- |
| NFR-01 | Performance IA | Respostas do LLM devem ser processadas e validadas em menos de 10s. |
| NFR-02 | Precisão Matemática | Cálculos geométricos devem ter precisão de pelo menos 2 casas decimais. |
| NFR-03 | Segurança | Apenas usuários autenticados via Supabase Auth podem acessar projetos. |

## Restrições (CON)

| ID | Restrição | Descrição |
| --- | --- | --- |
| CON-01 | Stack Técnica | Next.js 14, TypeScript, Tailwind, Supabase. |
| CON-02 | AI Model | O uso prioritário é do modelo Llama-3.3-70b via Groq. |

---
_Last Updated: 2026-03-11 | AIOS Framework Integration_
