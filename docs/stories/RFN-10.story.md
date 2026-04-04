# Story RFN-10 — Transições Fluidas + Visual Moderno
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-4
**Status:** Draft
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Prioridade:** MEDIA

---

## User Story
Como usuário do Aura,
quero que a interface tenha formas tridimensionais, cantos arredondados generosos, transições suaves entre telas e feedback visual claro ao selecionar elementos,
para ter uma experiência de uso moderna e agradável que reflita a sofisticação do produto.

## Acceptance Criteria

- [ ] AC1: Cards principais usam `rounded-2xl` (já existe) + `shadow-lg shadow-blue-950/30` + `border border-slate-800` + `backdrop-blur-sm bg-slate-900/80` (glassmorphism)
- [ ] AC2: Transição entre rotas: `@starting-style` CSS nativo ou wrapper `<PageTransition>` com `opacity 0→1` + `translateY 4px→0` em 200ms
- [ ] AC3: Elemento selecionado/ativo usa: `ring-2 ring-blue-500/60 ring-offset-2 ring-offset-slate-950` + `shadow-blue-500/20`
- [ ] AC4: Hover em cards interativos: `hover:border-slate-600 hover:shadow-blue-950/50 transition-all duration-200`
- [ ] AC5: Botões primários: gradiente `from-blue-600 to-blue-500` + `shadow-blue-500/30` + `hover:shadow-blue-500/50`
- [ ] AC6: Títulos e labels refatorados para linguagem direta: "Triangulo CDT" → "Estado Geométrico", "Motor v3.0" → "Análise do Projeto", "CET" → "Validade do Triângulo"
- [ ] AC7: Responsividade mobile: breakpoints `sm:` garantem que dashboard funciona em 375px+ (iPhone SE)

## Scope
**IN:** Globals CSS, componentes base de card, sistema de transições, títulos/labels, responsividade básica
**OUT:** Dark/Light toggle (story separada), redesign completo de páginas individuais de motor

## Dependencies
- RFN-1 (design tokens base), RFN-2 (sidebar estabilizada)

## Estimativa
M (5–7h)

## Definition of Done
- [ ] Interface visualmente testada em Chromium 1440px e 375px
- [ ] Nenhum layout break em < 768px no dashboard principal
- [ ] 0 erros TypeScript/ESLint | todos os testes passando
