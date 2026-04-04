# Story RFN-2 — Sidebar Retrátil com Ícones
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-1
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Prioridade:** ALTA

---

## User Story
Como usuário do Aura,
quero uma sidebar que collapse para ícones ao clicar em um botão,
para ter mais espaço de trabalho sem perder acesso rápido à navegação.

## Acceptance Criteria

- [x] AC1: Botão toggle (ícone `PanelLeftClose`/`PanelLeftOpen`) no topo da sidebar
- [x] AC2: Estado colapsado: largura 56px (w-14), mostra apenas ícones centrados, sem labels
- [x] AC3: Cada item tem tooltip nativo (title) com nome da seção
- [x] AC4: Estado persistido em localStorage key aura_sidebar_collapsed
- [x] AC5: Item ativo colapsado: ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950
- [x] AC6: Logo colapsa para TrIQLogo variant="icon" (xs=16px) no estado colapsado
- [x] AC7: Layout flex — main ajusta automaticamente com sidebar static (md:static)

## Scope
**IN:** `src/components/Sidebar.tsx`, `src/app/(dashboard)/[projetoId]/layout.tsx`
**OUT:** Redesign do conteúdo dos itens da sidebar, reordenação da navegação

## Dependencies
- RFN-1 (design tokens para o ring de item ativo)

## Estimativa
M (3–5h)

## Definition of Done
- [ ] Sidebar funciona em desktop 1280px+
- [ ] Estado persiste entre navegações
- [ ] Sem layout shift no conteúdo principal
- [ ] 0 erros TypeScript/ESLint
