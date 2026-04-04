# Story DS-5 — Design System: Sidebar com Grupos Semânticos
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Pré-requisito:** DS-1 (tokens documentados), DS-3 (mobile sidebar)
**UX:** UX1 — Sidebar sem organização semântica não comunica o pipeline Aura

---

## User Story
Como usuário do Aura,
quero que a sidebar organize as funcionalidades em grupos semânticos (SETUP / MOTOR / GOVERNANÇA),
para que eu entenda o estágio atual do projeto e saiba para onde navegar.

## Background
A sidebar atual lista todas as rotas de forma plana sem agrupamento, indicadores de estado ou contexto do pipeline. O usuário não sabe que SETUP deve ser feito antes de MOTOR, e MOTOR antes de GOVERNANÇA.

O Aura tem 3 camadas funcionais:
- **SETUP**: Projeto, Tarefas, EAP, Recursos
- **MOTOR**: CDT, CPM, Calibração, Execução
- **GOVERNANÇA**: Klauss IA, Relatórios, Histórico, Configurações

Cada grupo deve mostrar indicador de completude (checklist visual) e estar habilitado/desabilitado conforme pré-requisitos.

## Acceptance Criteria
- [x] AC-1: Sidebar dividida em 3 grupos com header: `SETUP`, `MOTOR`, `GOVERNANÇA`
- [x] AC-2: Grupo SETUP: Projeto, Tarefas, EAP, Recursos — ícone de status por item (✓ completo / ○ pendente / ⚠ atenção)
- [x] AC-3: Grupo MOTOR: CDT Dashboard, CPM, Calibração Bayesiana, Módulo de Execução — desbloqueado quando SETUP ≥ 60% completo
- [x] AC-4: Grupo GOVERNANÇA: Klauss IA, Relatórios, Histórico MATED, Configurações — sempre acessível
- [x] AC-5: Indicador de progresso do grupo: barra fina horizontal abaixo do header do grupo (tokens zona-otimo/seguro/risco)
- [x] AC-6: Item de menu ativo usa token `zona-otimo` como accent (não apenas sublinhado)
- [x] AC-7: Tooltip em itens bloqueados: "Complete o SETUP para acessar o MOTOR"
- [x] AC-8: Sidebar colapsa para ícones (sem label) em `md:` (768-1024px) — labels reaparecem em `lg:` (1025px+)
- [x] AC-9: Compatível com AC-1 da DS-3 (hamburguer overlay em mobile < 768px)

## Tasks
- [x] 1. Refatorar `Sidebar.tsx` para estrutura com `SidebarGroup` e `SidebarItem` subcomponentes
- [x] 2. Criar lógica de completude do SETUP: verificar se projeto tem nome, tem tarefas, tem EAP, tem datas
- [x] 3. Implementar desbloqueio de MOTOR baseado em `setupCompletionPercent >= 60`
- [x] 4. Adicionar indicador de status por item (ícone + cor token)
- [x] 5. Implementar barra de progresso de grupo usando tokens de zona
- [x] 6. Adicionar estado collapsed `md:` (apenas ícones) com tooltip nos itens
- [x] 7. Garantir integração com DS-3: hamburguer em mobile, overlay ao abrir
- [x] 8. Atualizar rota ativa: usar `zona-otimo` como accent em vez de apenas `font-bold`

## File List
- `src/components/Sidebar.tsx` (refatorado)
- `src/components/layout/SidebarGroup.tsx` (criado)
- `src/components/layout/SidebarItem.tsx` (criado)
- `src/hooks/useSetupCompletion.ts` (criado — lógica de completude SETUP)

## Definition of Done
- [x] 3 grupos semânticos visíveis na sidebar
- [x] Grupo MOTOR bloqueado se SETUP < 60%
- [x] Indicadores de status por item funcionais
- [x] Colapso para ícones em 768px-1024px
- [x] TypeCheck 0 erros, Lint 0 warnings (novos arquivos limpos)
- [x] Compatível com DS-3 (mobile hamburguer)

## Escopo
**IN:** Agrupamento semântico SETUP/MOTOR/GOVERNANÇA, indicadores de completude, desbloqueio de MOTOR por threshold SETUP, colapso para ícones em md:, integração DS-3 mobile, barra de progresso por grupo.
**OUT:** Não implementa onboarding wizard, não cria sidebar drawer (sheet) separado, não persiste estado de colapso no localStorage (comportamento reativo à viewport), não reordena grupos dinamicamente.

## Estimativa
**Esforço:** 4h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Lógica de completude do SETUP pode ser complexa e variar por tipo de projeto — threshold fixo 60% pode ser inadequado | Média | Médio | Implementar como hook `useSetupCompletion` com lógica ponderada e threshold configurável via constante — fácil de ajustar após feedback |
| Sidebar refatorada pode quebrar testes e2e que selecionam por seletor de texto ou role atual | Média | Baixo | Adicionar `data-testid` em cada SidebarItem antes do refactor para que e2e não dependam de estrutura interna |

## QA Results
```yaml
storyId: DS-5
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — Status: Done |
