# Story RFN-1 — Design System: Logo v2 + Design Tokens
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-1
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Prioridade:** ALTA

---

## User Story
Como usuário do Aura,
quero uma identidade visual moderna com logo que represente o triângulo dinâmico de qualidade,
para que o produto comunique profissionalismo e propósito desde o primeiro contato.

## Acceptance Criteria

- [x] AC1: Logo Aura v2 — ícone SVG do triângulo escáleno assimétrico com gradiente azul→esmeralda, funciona em 16px (favicon), 32px (badge), 240px (header)
- [x] AC2: Design tokens definidos em `globals.css`: glassmorphism backdrop-blur, shadow-color (shadow-blue-500/20 etc), border-glow (ring + ring-color)
- [x] AC3: Componente `<TrIQLogo size="sm|md|lg" variant="icon|full" />` exportado de `@/components/ui/TrIQLogo`
- [x] AC4: Favicon atualizado com o novo ícone triangular (src/app/icon.svg)
- [x] AC5: Botões base: aura-btn-sm/md/lg em globals.css (h-7/h-9/h-11)
- [x] AC6: .aura-selected usa box-shadow ring azul — padrão definido

## Scope
**IN:** Logo SVG, design tokens CSS, componente TrIQLogo, favicon, sistema de tamanhos de botão
**OUT:** Redesign completo de todas as páginas, dark/light theme toggle

## Dependencies
- Nenhuma

## Estimativa
M (4–6h)

## Definition of Done
- [ ] Logo renderiza corretamente em todos os 3 tamanhos
- [ ] Design tokens aplicados sem quebrar testes existentes
- [ ] 0 erros TypeScript/ESLint
- [ ] Componente documentado no design-system route
