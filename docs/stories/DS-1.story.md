# Story DS-1 — Design System: Documentar Tokens e Fundação
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @visual-designer (Pixel), @ux-design-expert (Uma)
**Pré-requisito:** Nenhum (código já existe — apenas documentar)

---

## User Story
Como time de desenvolvimento do Aura,
quero que os tokens de design existentes em `tailwind.config.ts` e `globals.css` sejam documentados formalmente em um Design System,
para que qualquer novo componente siga o mesmo padrão sem consultar o código-fonte.

## Background
O Aura já tem tokens semanticamente corretos:
- 4 zonas MATED com cores, backgrounds, borders e textos
- CDT dimensions (escopo/custo/prazo) com cores próprias
- Klauss IA accent (indigo)
- Typography scale 4px grid com token `metric` para KPIs
- Shadow system com glow por zona
- 8 animações definidas
- CSS utilities: .zona-*, .glass, .text-gradient, .aura-card, .aura-badge

O problema: nada está documentado — devs consultam tailwind.config.ts para saber como usar.

## Acceptance Criteria
- [x] AC-1: Arquivo `docs/design-system/TOKENS.md` criado com todos os tokens por categoria
- [x] AC-2: Cada zona MATED documentada: quando usar, exemplo de código, screenshot do resultado
- [x] AC-3: Tokens CDT documentados: escopo/custo/prazo com exemplo visual
- [x] AC-4: Tipografia documentada: todos os tamanhos + quando usar cada um + token `metric`
- [x] AC-5: Sistema de sombras documentado: quando usar card vs glow vs modal
- [x] AC-6: Animações documentadas: nome, duração, quando usar
- [x] AC-7: CSS utilities documentadas: `.glass`, `.aura-card`, `.aura-badge`, `.zona-*`
- [x] AC-8: Conflito identificado e resolvido: CSS vars (`--surface`) vs Tailwind tokens (`surface.DEFAULT`) — ambos existem com valores similares

## Tasks
- [x]  Ler `tailwind.config.ts` completo — mapear todos os tokens customizados
- [x]  Ler `globals.css` — mapear CSS variables e utilities
- [x]  Criar `docs/design-system/TOKENS.md` com estrutura por categoria
- [x]  Identificar inconsistência Geist (layout.tsx) vs Inter (globals.css fallback) — definir canônico
- [x]  Criar tabela de cores com hex + nome semântico + uso correto
- [x]  Documentar o conflito --surface vs surface.DEFAULT e propor solução

## File List
- `docs/design-system/TOKENS.md` (criar)
- `tailwind.config.ts` (apenas leitura)
- `src/app/globals.css` (apenas leitura)

## Definition of Done
- [ ] `TOKENS.md` criado e revisado por @visual-designer e @ux-design-expert
- [ ] Conflito CSS vars identificado e documentado
- [ ] Fonte canônica definida (Geist vs Inter)
- [ ] Nenhum dev precisa ler tailwind.config.ts para saber qual cor de zona usar

## Escopo
**IN:** Documentar tokens existentes, identificar conflitos, definir fonte canônica
**OUT:** Não cria tokens novos, não altera código existente, não cria componentes

## Estimativa
**Esforço:** 3h | **Complexidade:** P

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| CSS variables e Tailwind tokens têm valores similares mas não idênticos — sem reconciliação, novos componentes podem usar o errado | Alta | Médio | Documentar qual é canônico antes de criar qualquer novo componente |

## QA Results
<!-- @qa preenche após implementação -->
```yaml
storyId: DS-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
