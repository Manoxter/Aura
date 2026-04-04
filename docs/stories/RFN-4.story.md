# Story RFN-4 — Consciência Situacional: Dados → Frases de Gestão
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-2
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @dev (Dex), @aura-klauss (Klauss)
**Prioridade:** ALTA

---

## User Story
Como gestor de projeto não-especialista em geometria,
quero ver o estado do projeto em frases simples de gestão (ex: "Prazo 12% além do crítico — risco de paralisação"),
ao invés de dados brutos de lados e r²,
para tomar decisões sem precisar interpretar a matemática.

## Acceptance Criteria

- [x] AC1: traduzirCDT(cdtData): SituacaoProjetoTexto em src/lib/engine/traducao.ts — { titulo, descricao, acao_recomendada, severidade, tendencia, forma_natural }
- [x] AC2: Painel "Situação do Projeto" 3 cards (Saúde / Tendência Geométrica / Próxima Ação) entre semáforo e CDT Canvas
- [ ] AC3: Tooltips de dados matemáticos com tradução natural — parcial (IQBadge atualizado, r²/lados pendentes)
- [ ] AC4: Mapa de calor ângulos CDT — pendente Sprint D
- [x] AC5: Dados técnicos brutos no Level 3 colapsável — mantidos
- [x] AC6: 11 testes unitários traduzirCDT (4 zonas + CET + retângulo + contrato)

## Scope
**IN:** `traducao.ts`, painel de situação no dashboard, tooltips de tradução, mapa de calor com legendas
**OUT:** Remoção dos dados técnicos (mantidos no Level 3), alteração do motor matemático

## Dependencies
- RFN-3 (Level 3 como drawer)

## Estimativa
M (5–7h)

## Definition of Done
- [ ] Painel de situação visível no dashboard por padrão
- [ ] Gerente sem background matemático consegue interpretar o estado em < 10 segundos
- [ ] Testes unitários para `traduzirCDT` passando
- [ ] 0 erros TypeScript/ESLint
