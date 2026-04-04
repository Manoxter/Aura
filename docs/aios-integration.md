# AIOS Base: Filosofia e Integração Aura-6.1

Este documento serve como a base de conhecimento e guia de melhores práticas para a integração total do framework AIOS (AI-Orchestrated System) no projeto Aura-6.1.

## 🧠 Filosofia e Princípios Fundamentais

A integração respeita os três pilares da **Synkra AIOX Constitution**:

1.  **CLI First**: Toda funcionalidade deve ser executável via CLI/Scripts antes da UI.
2.  **Autoridade dos Agentes**: Escopo estrito para cada agente (ex: `@devops` para push).
3.  **Story-Driven Development**: Todo código deriva de uma Story em `docs/stories/`.

## 📑 Central de Documentação (Single Source of Truth)

Toda a inteligência do projeto está sharded para otimização agêntica:
- **[PRD (Requisitos)](./prd/01-overview.md)**: O "O QUE" do sistema.
- **[Arquitetura](./architecture/01-system-design.md)**: O "COMO" técnico.
- **[Knowledge Base](./Aura-KB.md)**: O cérebro técnico e motor matemático.
- **[Relatórios de Revisão](./reviews/phase-2-review.md)**: Auditorias de conformidade.
- **[Stories](./stories/)**: Backlog ativo de implementação.

## ✅ Quality Gates

*   Lint & Typecheck (sem erros).
*   Testes Unitários e de Integração.
*   Build de Produção.
*   Validação de Acceptance Criteria na Story.
