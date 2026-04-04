# Story DS-7 — Design System: Reconciliar CSS Variables vs Tailwind Tokens
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @visual-designer (Pixel), @dev (Dex)
**Pré-requisito:** DS-1 (TOKENS.md criado — identifica o conflito)
**AC:** DS-1 AC-8 — Conflito `--surface` CSS vs `surface.DEFAULT` Tailwind

---

## User Story
Como desenvolvedor do Aura,
quero que exista uma única fonte de verdade para os tokens de design (CSS variables OU Tailwind config),
para que novos componentes nunca usem o token errado causando inconsistências visuais.

## Background
O projeto tem um conflito estrutural documentado na DS-1:

**CSS Variables em `globals.css`:**
```css
--surface: hsl(222, 47%, 11%);
--surface-secondary: hsl(222, 47%, 14%);
--border: hsl(222, 47%, 20%);
```

**Tailwind tokens em `tailwind.config.ts`:**
```js
surface: { DEFAULT: 'hsl(222, 47%, 11%)', secondary: 'hsl(222, 47%, 15%)' }
border: { DEFAULT: 'hsl(222, 47%, 21%)' }
```

Valores SIMILARES mas não IDÊNTICOS (ex: secondary: 14% vs 15%, border: 20% vs 21%).
Componentes que usam `bg-surface` (Tailwind) ficam levemente diferentes dos que usam `var(--surface)` (CSS).
Além disso, há inconsistência de fonte: layout.tsx usa Geist, globals.css declara Inter como fallback principal.

## Acceptance Criteria
- [x] AC-1: Decisão documentada em `docs/design-system/TOKENS.md` (DS-1): CSS variables são fonte CANÔNICA; Tailwind consome as vars via `var()`
- [x] AC-2: `tailwind.config.ts` atualizado: todos os tokens surface/border referenciam `var(--surface)` em vez de valores HSL duplicados
- [x] AC-3: `globals.css` permanece como fonte de verdade — não duplicar valores em tailwind.config.ts
- [x] AC-4: Valores discrepantes harmonizados: `--surface-secondary` → `hsl(222, 47%, 14%)` (globals.css ganha); tailwind atualizado para usar var
- [x] AC-5: Fonte canônica definida: **Geist** (layout.tsx já importa — é o correto). `globals.css` atualiza fallback: `font-family: var(--font-geist-sans), system-ui, sans-serif`
- [x] AC-6: Inter removida de `globals.css` `@import` se presente (verificar) — ou marcada como deprecated com comentário
- [x] AC-7: `npm run build` passa sem erros (Tailwind purge não quebra com `var()` references)
- [x] AC-8: TypeCheck 0 erros, Lint 0 warnings após a mudança

## Tasks
- [x] 1. Ler DS-1 TOKENS.md — confirmar lista completa dos tokens com conflito
- [x] 2. Atualizar `tailwind.config.ts`: substituir HSL duplicados por `var(--token-name)` para surface, border, background
- [x] 3. Harmonizar valores em `globals.css`: resolver os 2 valores discrepantes (secondary 14% vs 15%, border 20% vs 21%)
- [x] 4. Atualizar `globals.css`: substituir `font-family` para usar `var(--font-geist-sans)` como primário
- [x] 5. Verificar se Inter é importada separadamente — remover se for apenas fallback que conflita
- [x] 6. Rodar `npm run build` — verificar que Tailwind resolve `var()` corretamente (não gera CSS vazio)
- [x] 7. Visual regression: abrir app localmente e comparar 5 telas antes/depois — sem mudança perceptível
- [x] 8. Atualizar `docs/design-system/TOKENS.md` com decisão de fonte canônica

## File List
- `tailwind.config.ts` (modificar — tokens → var())
- `src/app/globals.css` (modificar — harmonizar valores, fonte canônica)
- `docs/design-system/TOKENS.md` (modificar — documentar decisão)

## Definition of Done
- [x] Tailwind tokens de surface/border usam `var()` — sem HSL duplicado
- [x] Geist declarado como fonte canônica em globals.css
- [x] `npm run build` 0 erros
- [x] Nenhuma mudança visual perceptível nas 5 telas principais
- [x] TOKENS.md atualizado com a decisão

## Escopo
**IN:** Reconciliar surface/border/background tokens (CSS vars → Tailwind var()), harmonizar valores discrepantes (2 tokens), definir fonte canônica Geist, atualizar globals.css font-family, documentar decisão.
**OUT:** Não muda tokens de cores de zona MATED (esses estão corretos), não refatora componentes existentes que usam `bg-surface` (continuam funcionando pois Tailwind vai resolver para var()), não introduz tokens novos, não migra para design tokens JSON (fora do escopo).

## Estimativa
**Esforço:** 2h | **Complexidade:** P

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Tailwind CSS com `var()` como valor de cor pode não suportar modificadores de opacidade (ex: `bg-surface/50`) — o plugin `tailwindcss/colors` usa formato diferente | Alta | Médio | Testar `bg-surface/50` após mudança; se quebrar, usar `hsl(var(--surface-hsl) / 0.5)` — requer split da var em componentes H S L |
| Harmonizar valor de secondary (14% vs 15%) pode causar mudança visual pequena mas perceptível em dark mode | Baixa | Baixo | Fazer diff visual antes de commit — capturar screenshots de /dashboard antes e depois |

## QA Results
<!-- @qa preenche após implementação -->
```yaml
storyId: DS-7
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-17 | @dev (Dex) | DS-7 implementada — tailwind.config.ts surface/border → var(), globals.css vars completos + font Geist, TOKENS.md criado — Status: Done |
