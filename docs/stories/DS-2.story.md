# Story DS-2 — Design System: Componentizar Toast/Alert System
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @dev (Dex), @ux-design-expert (Uma)
**Pré-requisito:** DS-1 (tokens documentados)
**Bug:** B4 — `alert()` nativo em 3 lugares (na verdade encontrados 20 em 7 arquivos)

---

## User Story
Como usuário do Aura,
quero receber feedback visual inline (toast/notificação) em vez de pop-ups bloqueadores do browser,
para que a experiência seja fluida e os alertas sigam o Design System MATED.

## Background
Há 3 usos de `alert()` nativo no código (estimativa — real foi 20 em 7 arquivos):
- `src/components/EAP/EapExportModal.tsx` — "Exportação concluída"
- `src/app/cpm/page.tsx` — "Erro ao salvar cronograma"
- `src/components/Klauss/KlaussChat.tsx` — Erro de API Klauss

`alert()` é bloqueador (para JS enquanto aberto), não é estilizável, quebra em mobile, e viola a identidade visual Aura. O sistema já tem tokens de zona (otimo/seguro/risco/crise) que mapeiam semanticamente para: sucesso/info/atenção/erro.

## Acceptance Criteria
- [x] AC-1: Componente `Toast.tsx` criado em `src/components/ui/` com 4 variantes: `success` (zona-otimo), `info` (klauss), `warning` (zona-risco), `error` (zona-crise)
- [x] AC-2: Hook `useToast()` criado para enfileirar e dispensar toasts programaticamente
- [x] AC-3: `ToastProvider` adicionado ao layout raiz (`src/app/layout.tsx`) — contexto global via `ToastProviderWrapper`
- [x] AC-4: Todos os `alert()` (20 ocorrências em 7 arquivos) substituídos por `useToast()` com variante semântica correta
- [x] AC-5: Toast com auto-dismiss configurável (default: 4s para success/info, 8s para warning/error)
- [x] AC-6: Toast acessível: `role="status"` (info/success) ou `role="alert"` (warning/error), `aria-live`
- [x] AC-7: Animação de entrada com Tailwind `animate-in slide-in-from-right-4 fade-in`
- [x] AC-8: Máximo 3 toasts simultâneos na tela (fila interna FIFO, deduplication 500ms)
- [x] AC-9: `tsc --noEmit` 0 erros, testes 242/242 passando

## Tasks
- [x] 1. Criar `src/components/ui/Toast.tsx` com 4 variantes usando tokens existentes
- [x] 2. Criar `src/hooks/useToast.tsx` com Context API (enqueue/dismiss/clear)
- [x] 3. Criar `src/components/ui/ToastProviderWrapper.tsx` (client boundary) e adicionar ao layout
- [x] 4. Substituir `alert()` em `setup/tap/page.tsx` (10 ocorrências) com variante semântica
- [x] 5. Substituir `alert()` em `setup/cpm/page.tsx` (3 ocorrências) com variante semântica
- [x] 6. Substituir `alert()` em `setup/calendario/page.tsx` (5 ocorrências) com variante semântica
- [x] 7. Substituir `alert()` em `motor/cdt/page.tsx` (2 ocorrências) com variante semântica
- [x] 8. Substituir `alert()` em `page.tsx` home (2 ocorrências) com variante semântica
- [x] 9. Substituir `alert()` em `governanca/gabinete/page.tsx` (2 ocorrências) com variante semântica
- [x] 10. Substituir `alert()` em `governanca/warroom/page.tsx` (1 ocorrência) com variante semântica
- [x] 11. Verificar acessibilidade: aria-live, role correto, Esc dismiss implementado
- [x] 12. Typecheck + testes passando

## File List
- `src/components/ui/Toast.tsx` (criado)
- `src/components/ui/ToastProviderWrapper.tsx` (criado — client boundary para layout.tsx Server Component)
- `src/hooks/useToast.tsx` (criado)
- `src/app/layout.tsx` (modificado — ToastProviderWrapper adicionado)
- `src/app/page.tsx` (modificado — 2 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/setup/tap/page.tsx` (modificado — 10 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/setup/cpm/page.tsx` (modificado — 3 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/setup/calendario/page.tsx` (modificado — 5 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/motor/cdt/page.tsx` (modificado — 2 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/governanca/gabinete/page.tsx` (modificado — 2 alert() substituídos)
- `src/app/(dashboard)/[projetoId]/governanca/warroom/page.tsx` (modificado — 1 alert() substituído)

## Definition of Done
- [x] 0 ocorrências de `alert()` no codebase (verificado via grep)
- [x] Toast usa exclusivamente tokens do Design System (Tailwind classes, sem hex hardcoded)
- [x] Acessibilidade validada (aria-live, role, Esc dismiss)
- [x] TypeCheck 0 erros (`tsc --noEmit` limpo)
- [x] 242 testes passando
- [ ] Testado em Chrome + Firefox (mobile 375px) — teste manual pendente

## Escopo
**IN:** Criar Toast.tsx + useToast hook, substituir todos os alert() existentes (20 em 7 arquivos), ToastProvider no layout, 4 variantes semânticas, auto-dismiss, acessibilidade básica.
**OUT:** Não inclui toast persistente (sticky), não cobre modais de confirmação (confirm()), não integra com sistema de erros global (Error Boundary), não cria Storybook.

## Estimativa
**Esforço:** 2h | **Complexidade:** P

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| ToastProvider no layout raiz pode conflitar com Server Components (Next.js 14 App Router — layout.tsx é Server Component por default) | Alta | Alto | Criado `ToastProviderWrapper` com `'use client'` como arquivo separado — layout.tsx permanece Server Component |
| Múltiplos toasts disparados em rafagas (ex: erro + retry automático Klauss) podem criar spam visual | Média | Médio | Fila FIFO com max 3 simultâneos + deduplicate por mensagem idêntica nos últimos 500ms — implementado |

## QA Results
<!-- @qa preenche após implementação -->
```yaml
storyId: DS-2
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — 20 alert() substituídos em 7 arquivos, typecheck limpo, 242 testes passando — Status: Done |
