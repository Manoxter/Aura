# Story DS-9 — Design System: SetupStepper com Status Real dos Dados
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex)
**Pré-requisito:** DS-4 (empty states), DS-5 (sidebar grupos semânticos)
**UX:** UX1 — Usuário não sabe o que preencheu e o que falta para usar o MOTOR

---

## User Story
Como usuário configurando um novo projeto no Aura,
quero ver um stepper visual mostrando o progresso real do SETUP com status de cada etapa,
para que eu saiba exatamente o que falta antes de usar o Motor Matemático.

## Background
O pipeline SETUP→MOTOR→GOVERNANÇA exige que dados específicos existam antes do motor funcionar:
1. **Projeto criado** — nome, tipo, setor, datas globais
2. **Tarefas definidas** — ao menos 1 tarefa com duração
3. **EAP estruturada** — tarefas organizadas hierarquicamente
4. **Predecessoras definidas** — ao menos 1 relação de dependência (para CPM funcionar)
5. **Valores CDT** — Escopo, Prazo e Orçamento definidos (para o triângulo)

Atualmente, o usuário descobre os gaps apenas quando tenta usar uma feature e recebe erro ou dado vazio. Não há feedback proativo.

## Acceptance Criteria
- [x] AC-1: Componente `SetupStepper.tsx` criado — 5 passos com status real: `complete` (verde), `in-progress` (amarelo), `pending` (cinza), `blocked` (vermelho)
- [x] AC-2: Status de cada passo baseado em dados reais do projeto ativo (não hardcoded)
- [x] AC-3: Passo "Tarefas" mostra: "3 tarefas criadas, 2 com duração definida" — não apenas ✓/✗
- [x] AC-4: Passo "Predecessoras" mostra contagem de relações definidas e avisa se nenhuma (CPM requer ≥1)
- [x] AC-5: Passo "Valores CDT" mostra quais das 3 dimensões estão preenchidas
- [x] AC-6: Passo bloqueado tem CTA direto: "Definir agora →" que navega para a rota correta
- [x] AC-7: SetupStepper aparece no Dashboard quando SETUP < 100%, desaparece (ou mostra "Completo") quando 100%
- [x] AC-8: Versão compacta (horizontal) para sidebar DS-5 — versão expandida para Dashboard
- [x] AC-9: Cálculo de completude do SETUP é o mesmo usado em DS-5 `useSetupCompletion` — DRY

## Tasks
- [x] 1. Criar `src/components/Setup/SetupStepper.tsx` com 5 passos e 4 estados visuais
- [x] 2. Criar ou estender `useSetupCompletion.ts` (de DS-5) para retornar status detalhado por passo
- [x] 3. Lógica de status por passo: consultar ProjectContext para dados reais
- [x] 4. Versão compacta: horizontal com indicadores de ponto (para sidebar)
- [x] 5. Versão expandida: vertical com título, status, contagem e CTA (para dashboard)
- [x] 6. Integrar no Dashboard: mostrar SetupStepper acima do CDT quando projeto tem SETUP < 100%
- [x] 7. Integrar na sidebar DS-5: versão compacta sob o header do grupo SETUP
- [x]  Testar com projeto novo (0%), parcial (40%) e completo (100%)

## File List
- `src/components/Setup/SetupStepper.tsx` (criar)
- `src/hooks/useSetupCompletion.ts` (criar/estender — compartilhado com DS-5)
- `src/components/Dashboard/DashboardPage.tsx` (modificar — integrar SetupStepper)
- `src/components/layout/SidebarGroup.tsx` (modificar — stepper compacto em grupo SETUP)

## Definition of Done
- [x] SetupStepper mostra status real (não hardcoded) em 5 passos
- [x] CTA funcional em cada passo bloqueado
- [x] Versão compacta na sidebar e expandida no dashboard
- [x] `useSetupCompletion` é fonte única compartilhada com DS-5
- [x] TypeCheck 0 erros, Lint 0 warnings

## Escopo
**IN:** Componente SetupStepper (5 passos, 4 estados), hook useSetupCompletion com dados reais, versão compacta/expandida, integração no Dashboard e sidebar, CTA por passo bloqueado.
**OUT:** Não inclui onboarding wizard (modal passo-a-passo), não bloqueia acesso ao MOTOR via UI (apenas informa), não persiste estado do stepper no DB, não cria SetupWizard interativo separado.

## Estimativa
**Esforço:** 4h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `useSetupCompletion` depende de ProjectContext que tem 22 estados — pode ser lento de calcular em projetos grandes | Baixa | Baixo | Calcular via `useMemo` com dependências específicas — não recalcular a cada render do pai |
| Dashboard ficará muito carregado com SetupStepper + CDT Triangle + Histórico MATED — pode virar "página de informação demais" | Média | Médio | SetupStepper usa modo colapsado por default com expand on click; desaparece quando SETUP = 100% |

## QA Results
<!-- @qa preenche após implementação -->
```yaml
storyId: DS-9
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — TypeCheck 0 erros, 254 testes passando — Status: InProgress |
