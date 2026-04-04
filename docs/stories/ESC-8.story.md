# Story ESC-8 — Documentacao Formal: Jornada + Metodologia para Publicacao

**Epic:** EP-ESCALENO
**Sprint:** G3 — Calibracao + Registro + Documentacao
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @analyst (Alex), @sm (River), @qa (Quinn)
**Complexidade:** L | **Prioridade:** ALTA
**Dependencias:** ESC-1 a ESC-7

---

## Contexto

Dois documentos finais sao requeridos:
1. **Jornada do Metodo**: narrativa cronologica de como o MetodoAura foi descoberto, cada sessao de aprendizado, cada decisao que evoluiu a matematica — para registro historico e eventual publicacao academica.
2. **Metodologia Formal**: documento limpo, tecnico, com a matematica implementada de fato — o que sera publicado como o MetodoAura oficial.

---

## Acceptance Criteria

### AC-1: Documento 1 — Jornada do Metodo
- [ ] Arquivo: `docs/Aura-JORNADA.md`
- [ ] Narrativa cronologica: sessao 1 → sessao 24+
- [ ] Cada sessao: o que foi descoberto, o que mudou, por que mudou
- [ ] Registra erros cometidos e como foram corrigidos (equilatero→isosceles→escaleno)
- [ ] Registra debates do squad e decisoes tomadas
- [ ] Tom: historico/narrativo, primeira pessoa (do criador)
- [ ] Inclui referencias ao work-log e sprint-memory

### AC-2: Documento 2 — Metodologia Formal
- [ ] Arquivo: `MetodoAura.md` atualizado para v4.0 (ou novo `docs/Aura-METODOLOGIA-FORMAL.md`)
- [ ] Matematica limpa: definicoes, teoremas, formulas, exemplos
- [ ] Sem referencias a sessoes, bugs ou debates internos
- [ ] Estrutura para publicacao academica:
  - Introducao (problema)
  - Fundamentacao (geometria do TM)
  - Modelo (formulas, CEt, MATED, A_mancha)
  - Validacao (Big Dig, Horizonte, Aurora v2)
  - Resultados (predicoes vs realidade)
  - Conclusao

### AC-3: QA review
- [ ] @qa revisa ambos os documentos para coerencia e completude
- [ ] Formulas nos documentos coincidem com o codigo implementado
- [ ] Nenhuma formula no documento que nao esteja no codigo (e vice-versa)

---

## Scope

### IN
- `docs/Aura-JORNADA.md`: NOVO
- `MetodoAura.md`: atualizar para v4.0
- ou `docs/Aura-METODOLOGIA-FORMAL.md`: NOVO

### OUT
- Codigo de producao (ja implementado)

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @analyst | Implementado — Aura-JORNADA.md + MetodoAura v4.0 |
