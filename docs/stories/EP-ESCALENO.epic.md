# EP-ESCALENO: TM Escaleno Natural + Controle Bidirecional

**Epic ID:** EP-ESCALENO
**Data criacao:** 2026-03-29
**Criado por:** @pm (Morgan) | **Autoridade matematica:** @aura-math + @roberta
**Status:** Done (8/8 stories Done)
**Prioridade:** CRITICA — Fundacao metodologica do Aura

---

## 1. VISAO GERAL

O Triangulo Matriz (TM) sera refatorado de gráfico Cartesiano para **diagrama geometrico puro**, onde apenas lados, angulos e areas carregam significado diagnostico. A normalizacao sera corrigida para permitir **triangulos escalenos emergentes por natureza**, eliminando a simetria artificial que transmite falsa seguranca.

**Resultado:** um sistema bidirecional onde mudancas nos graficos alteram o TM e decisoes no TM mostram as mudancas nos graficos geradores — funcionando como um controle remoto geometrico para a gestao do projeto.

---

## 2. PROBLEMA

### 2.1 Simetria Artificial (Diagnostico Sessao 24)

| Problema | Impacto |
|----------|---------|
| Override `diaAtual=0 → C=P=sqrt(2)` | Descarta fingerprint do projeto planejado |
| Normalizacao por avgRate propria | Elimina diferenca de forma entre custo e prazo |
| TM tratado como grafico Cartesiano | Vertices sem significado PM real confundem interpretacao |
| Isosceles no traslado beta/gamma | Crise simetrica → "custo e prazo igualmente ruins" (falso) |

### 2.2 Ausencia Funcional

| Funcionalidade | Estado atual |
|---------------|-------------|
| Mapeamento inverso TM→Graficos | NAO existe |
| A_mancha como plano de fundo visual do diagrama | Apenas numerico |
| Rotulos geometricos (alpha, beta, gamma, E, P, C) | NAO existem no diagrama |
| Calibracao progressiva (Bayesiano + historico geometrico) | NAO existe |
| Registro de estados geometricos no relatorio | NAO existe |

---

## 3. PRINCIPIOS INEGOCIAVEIS

1. **TM e diagrama, nao grafico** — vertices nao tem coordenadas PM
2. **Escaleno por natureza** — isosceles so por coincidencia, nunca por default
3. **E como ancora comum** — C e P medidos no MESMO espaco geometrico
4. **Bidirecionalidade** — forward (graficos→TM) + inverse (TM→graficos)
5. **A_mancha e o campo** — sombra das integrais = plano de fundo visual do TM
6. **Sem mudanca no setup** — dados preenchidos e exportados da mesma forma
7. **Protocolos preservados** — Clairaut, obtuso, agudo na sequencia logica
8. **Manometros mantidos** — alpha, omega, epsilon nos gauges existentes

---

## 4. STORIES (8 stories, 3 sprints)

### Sprint G1 — Fundacao Matematica Escalena (semana 1)
| Story | Titulo | Responsaveis | Dependencias | Status |
|-------|--------|-------------|--------------|--------|
| ESC-1 | Normalizacao espaco geometrico comum | @aura-math, @roberta, @dev | Nenhuma | Done |
| ESC-2 | Remocao override diaAtual=0 + fingerprint baseline | @aura-math, @dev | ESC-1 | Done |
| ESC-3 | Ajuste de testes (653+ testes) + validacao Big Dig + Horizonte | @qa, @aura-math | ESC-1, ESC-2 | Done |

### Sprint G2 — Diagrama Geometrico + Visualizacao (semana 2)
| Story | Titulo | Responsaveis | Dependencias | Status |
|-------|--------|-------------|--------------|--------|
| ESC-4 | A_mancha como plano de fundo + borda rebarba + Escopo como base inferior | @dev, @dataviz, @aura-math | ESC-1 | Done |
| ESC-5 | Rotulos geometricos (alpha/beta/gamma, E/P/C) + reconfiguracao traslado | @dev, @aura-math | ESC-4 | Done |
| ESC-6 | Mapeamento inverso TM→Graficos (cinemática inversa) | @aura-math, @roberta, @dev | ESC-1, ESC-4 | Done |

### Sprint G3 — Calibracao + Registro + Documentacao (semana 3)
| Story | Titulo | Responsaveis | Dependencias | Status |
|-------|--------|-------------|--------------|--------|
| ESC-7 | Historico geometrico + alimentacao Monte Carlo/Bayesiano + calibracao | @aura-math, @data-engineer, @dev | ESC-6 | Done |
| ESC-8 | Documentacao formal: jornada do metodo + metodologia para publicacao | @analyst, @sm, @qa | ESC-1..ESC-7 | Done |

---

## 5. CRITERIOS DE ACEITACAO DO EPIC

- [ ] Projeto Aurora v2 (15 tarefas) produz triangulo escaleno no baseline (C != P)
- [ ] Projeto Horizonte (37 tarefas) produz triangulo escaleno distinto de Aurora
- [ ] Big Dig simulacao passa em todas as zonas com valores escalenos
- [ ] A_mancha visivel como plano de fundo sombreado sob o TM
- [ ] Borda da rebarba visivel quando A_rebarba > 0
- [ ] Rotulos alpha/beta/gamma nos angulos, E/P/C nos lados
- [ ] Mapeamento inverso: alterar angulo no TM → ver mudanca no burndown e custo
- [ ] Manometros angulares funcionais com novos angulos escalenos
- [ ] Traslado beta/gamma funciona com triangulo escaleno
- [ ] 653+ testes passando (novos valores escalenos nos asserts)
- [ ] Monte Carlo amostra distribuicoes aprendidas do historico geometrico
- [ ] Relatorio registra trilha de estados geometricos
- [ ] Setup preenchido da mesma forma (sem mudanca UX de entrada)
- [ ] Dois documentos finais: jornada do metodo + metodologia formal

---

## 6. RISCOS

| Risco | Mitigacao | Severidade |
|-------|----------|------------|
| Mudanca de valores baseline quebra 653+ testes | Ajustar asserts em sprint dedicado (ESC-3) | ALTA |
| Valores escalenos violam CEt em projetos existentes | Validar CEt dupla com novos valores antes de deploy | ALTA |
| Mapeamento inverso ambiguo para triangulos degenerados | Restringir inverso a triangulos dentro da CEt | MEDIA |
| UX de controle remoto confusa para PM | Traduzir delta-angulo para dias/R$ na interface | MEDIA |

---

## 7. IMPACTO NO BANCO DE DADOS

| Tabela | Mudanca | Tipo |
|--------|---------|------|
| `projetos` | Nova coluna `historico_geometrico` (JSONB array) | ADD |
| `tm_versoes` | Novos campos: `angulo_alpha`, `angulo_beta`, `angulo_gamma`, `escaleno` (bool) | ADD |
| `decisoes` | Novos campos: `delta_angulo`, `slope_custo_resultado`, `slope_prazo_resultado` | ADD |
| Setup existente | SEM MUDANCA — dados preenchidos e exportados da mesma forma | NENHUMA |

---

## 8. SEQUENCIA DE IMPLEMENTACAO

```
ESC-1 (normalizacao) ──→ ESC-2 (fingerprint) ──→ ESC-3 (testes)
       │                                                │
       └──→ ESC-4 (visualizacao) ──→ ESC-5 (rotulos) ──┤
                    │                                    │
                    └──→ ESC-6 (inverso) ───────────────→┤
                                                         │
                                              ESC-7 (calibracao) ──→ ESC-8 (docs)
```

---

*Autoridade: @pm (Morgan) + @aura-math + @roberta*
*Aprovado pelo criador do MetodoAura na Sessao 24 (2026-03-29)*
