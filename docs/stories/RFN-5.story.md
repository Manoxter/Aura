# Story RFN-5 — TAP e WBS: Modo Leitura (Read-Only)
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-1
**Status:** Done ✅ (implementado em 2026-03-28)
**Agentes:** @dev (Dex)
**Prioridade:** ALTA

---

## User Story
Como gestor de projeto,
quero poder abrir a TAP e a WBS já salvas para leitura e auditoria,
sem ser redirecionado automaticamente para o formulário de edição,
para revisar os dados do projeto sem risco de alteração acidental.

## Acceptance Criteria

- [x] AC1: `setup/tap` — quando TAP existe no contexto, abre em modo leitura por padrão (estado `isViewMode = true`)
- [x] AC2: `setup/wbs` — quando EAP carrega do banco com nodes > 0, abre em modo leitura por padrão
- [x] AC3: Modo leitura exibe: nome, escopo, objetivo, justificativa, restrições, orçamento, prazo, contingência (TAP) e tabela de nós (WBS)
- [x] AC4: Botão "Editar TAP" / "Editar EAP" visível no modo leitura, ao clicar exibe o formulário de edição completo
- [x] AC5: Ícone de cadeado (Lock) identifica visualmente o modo leitura
- [x] AC6: 0 erros TypeScript/ESLint após implementação

## Implementação
- `src/app/(dashboard)/[projetoId]/setup/tap/page.tsx` — estado `isViewMode`, painel read-only
- `src/app/(dashboard)/[projetoId]/setup/wbs/page.tsx` — estado `isViewMode`, tabela read-only com eapCodes

## Notes
Bug reportado em assembleia do squad (2026-03-28). Corrigido na mesma sessão.
