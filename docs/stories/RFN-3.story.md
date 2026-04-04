# Story RFN-3 — Pattern Gaveta: Workspace Focado no Triângulo
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-2
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Prioridade:** ALTA

---

## User Story
Como gestor de projeto,
quero que o dashboard principal mostre apenas o triângulo CDT, manômetro e semáforo,
e que as ferramentas se abram em uma gaveta ao clicar, fechando automaticamente após salvar,
para ter uma mesa de trabalho limpa e focada.

## Acceptance Criteria

- [x] AC1: Dashboard mostra Level 1 semáforo + CDT canvas como padrão visível
- [x] AC2: `<DrawerPanel>` em @/components/ui/DrawerPanel — slide-in direita + overlay backdrop-blur-sm + fechar Esc
- [x] AC3: Botão flutuante "⚙ Ferramentas" bottom-right com sub-ações Evento Atípico e Simulador de Decisão
- [x] AC4: EventoAtipicoForm e DecisionSimulator acessíveis via drawer com seletor de ferramenta
- [x] AC5: Drawer fecha via onClose callback (X, Esc, overlay click)
- [x] AC6: translate-x-full → translate-x-0 com duration-300 ease-out
- [x] AC7: EventoAtipicoForm e DecisionSimulator disponíveis no drawer (mantidos também no Level 3)

## Scope
**IN:** Dashboard `page.tsx`, novo componente `DrawerPanel`, migração dos painéis Level 3
**OUT:** Páginas de setup (mantêm fluxo sequencial), páginas de motor (mantêm layout atual)

## Dependencies
- RFN-1 (design tokens), RFN-2 (sidebar estabilizada)

## Estimativa
L (8–10h)

## Definition of Done
- [ ] Dashboard principal renderiza CDT + Manômetro + Semáforo sem o Level 3 expandido
- [ ] Drawer abre/fecha com animação fluida
- [ ] Nenhum formulário existente perdido — apenas realocado
- [ ] Mobile: drawer ocupa 100% da largura em < 768px
- [ ] 0 erros TypeScript/ESLint | 642+ testes passando
