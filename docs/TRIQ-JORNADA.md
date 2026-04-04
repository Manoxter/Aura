# A Jornada do MetodoAura — Da Metafora ao Objeto Geometrico

**Registro cronologico da descoberta, erros, correções e evolucao do metodo**
**Periodo:** 2026-03-14 a 2026-03-29 | **Sessoes:** 1–24
**Autor:** Criador do MetodoAura

---

## Prologo — O Triangulo que Ninguem Levava a Serio

O Triangulo da Qualidade (Escopo, Prazo, Custo) e ensinado em todo curso de gerenciamento de projetos. E tambem ignorado em todo projeto real. A razao e simples: ele e qualitativo. Ninguem sabe quantificar "o triangulo mudou". Ninguem sabe calcular "quanto custa mover um vertice". Ninguem sabe dizer "o triangulo ainda fecha" — porque ninguem verifica a Condicao de Existencia.

O MetodoAura nasceu da pergunta: e se o triangulo nao fosse metafora? E se fosse um objeto geometrico real, com area calculavel, angulos mensuráveis e limites fisicos de existencia?

---

## Fase 1 — Brownfield e o Equilatero Falso (Sessoes 1–8)

### O Começo: Auditoria de um Sistema Existente

O Aura 6.1 ja existia como um sistema SaaS com 33 paginas, 8 migrations e um motor CDT. O primeiro passo foi uma auditoria completa — 10 fases de Brownfield Discovery com 29 agentes especializados.

O que encontramos:

**O triangulo era equilatero forçado.** E = C = P = 1.0 no baseline. Isso significava que todo projeto comecava identico — um projeto de software e uma obra civil tinham o mesmo triangulo inicial. A informacao sobre a *forma* do projeto era descartada antes de comecar.

**A CEt era avaliada pos-normalizacao.** Depois de normalizar E=1, a desigualdade triangular |P-C| < E < P+C torna-se quase trivialmente verdadeira. Projetos que deveriam ser geometricamente impossiveis passavam despercebidos.

**Os lados eram OLS global, nao tangentes pontuais.** O MetodoAura define que os lados sao derivadas instantaneas das curvas. O sistema usava regressao linear sobre todo o historico — um indicador atrasado e suavizado.

**A area nao existia como KPI.** O conceito mais fundamental do metodo — a area do triangulo como medida de qualidade — nao era exibida em nenhum lugar.

### Simulacao Big Dig (Sessao 1.6)

Para validar que o sistema funcionaria com dados reais, simulamos o Boston Central Artery/Tunnel Project (1991–2007). O Big Dig e o caso perfeito: orcamento de US$2.8B que terminou em US$14.8B, 8 anos de atraso, fraude contabil.

Resultado: o Aura teria alertado em **1993** (Zona RISCO, Qualidade 38%) — **8 anos antes** do reconhecimento publico em 2001. Este teste validou que a abordagem geometrica tem poder preditivo real.

---

## Fase 2 — CEt Dupla e o Nascimento do Motor v2 (Sessoes 8–13)

### 25 Decisoes Canonicas (Sessao 11)

A sessao 11 foi um ponto de inflexao. O squad matematico (@aura-math + @roberta) debateu 25 decisoes sobre denominadores, normalizacao e o sistema de zonas. As mais importantes:

- **CEt pre-normalizacao**: verificar a desigualdade com valores brutos antes de normalizar
- **CEt dupla**: verificar pre E pos, bloqueando se qualquer uma falhar
- **Tangente pontual**: lados derivados de slopes instantaneos, nao OLS global
- **Area como KPI primario**: A_atual / A_baseline × 100%
- **Incentro para obtusangulos**: quando o baricentro do ortico cai fora do triangulo

### 49 Bugs Mapeados (Sessao 12)

Uma auditoria sistematica revelou 49 bugs em 3 sprints de implementacao. 14 criticos, 35 menores. Todos corrigidos em uma sessao maratona de Sprints FIX A-E (568 testes ao final).

---

## Fase 3 — A Sintese de Clairaut e os Protocolos (Sessoes 16–18)

### O Problema dos Obtusangulos

Quando um angulo do triangulo ultrapassa 90°, o triangulo ortico (inscrito pelos pes das altitudes) perde um vertice — o pe da altitude cai *fora* do triangulo. O NVO (baricentro do ortico) tambem sai, tornando o indicador MATED sem referencia.

### A Solucao: Protocolos α/β/γ

Inspirados na Sintese de Clairaut (geodesia), criamos tres protocolos:

- **Protocolo α (agudo):** NVO = baricentro do ortico. ZRE = triangulo ortico. Operacao normal.
- **Protocolo β (obtuso em C):** Custo dominante. Traslado por paralelismo — retas mestras transladadas. NVO → incentro.
- **Protocolo γ (obtuso em P):** Prazo dominante. Mesmo mecanismo, eixo diferente.

### Manometros Angulares

Tres gauges SVG semicirculares (α/ω/ε) que mostram os angulos do triangulo em tempo real, com marcacao em 90° para detectar a transicao agudo→obtuso.

---

## Fase 4 — MASTERPLAN-X: A Revolucao Integral (Sessao 17)

### O Debate que Mudou Tudo

Na sessao 17, o squad plenario debateu 11 decisoes fundamentais que reescreveram o §2 do MetodoAura. A mais importante: **o triangulo nao precisa ser equilatero no baseline.**

### Novas Construcoes Matematicas

- **Reta-Mestra**: regressao piecewise nos pontos de inflexao das curvas, ponderada por curvatura
- **A_mancha**: integral discreta max(C_norm, P_norm) — o campo real de operacao do projeto
- **A_rebarba**: A_mancha - A_TM — zona plastica (limite de escoamento)
- **R² como KPI**: coeficiente de determinacao da reta-mestra como metadado de confiabilidade
- **y₀**: custo minimo irredutivel (mobilizacao) — CEt inferior nova
- **Hierarquia 5 zonas**: NVO → ZRE → TM → A_rebarba → Fratura

### CDT v3.0: C = sqrt(1 + mc²)

Os lados passaram a ser calculados como comprimento geometrico da reta-mestra no espaco normalizado. Para uma curva perfeitamente linear, mc_norm = 1 → C = sqrt(2). O baseline deixou de ser equilatero (E=C=P=1) e virou isosceles (E=1, C=P=sqrt(2)).

---

## Fase 5 — O Isosceles Tambem Era Falso (Sessao 24)

### O Momento de Clareza

Na sessao 24, apos corrigir 3 bugs no burndown e dashboard, o criador do MetodoAura fez a observacao que redefiniu o sistema:

> "Um triangulo assim tao simetrico passa a ideia de falsa seguranca. Nao me parece real. O que acho que estamos cometendo de erro e tratar o TM como se fosse um grafico e ele nao E."

### O TM Nao E um Grafico

O insight fundamental: o Triangulo Matriz nao e um grafico Cartesiano cujos vertices tem coordenadas com significado PM (data, valor). E um **diagrama geometrico** onde apenas lados, angulos e areas carregam significado diagnostico.

Os vertices sao consequencia da geometria, nao pontos com significado proprio. O vertice entre P e C nao tem um "x = dia 47 do projeto" — tem uma posicao que resulta dos comprimentos dos lados.

### A Metafora das Sombras

O criador descreveu a construcao correta:

- E (Escopo) e a reta base comum
- A curva custo projeta sua "sombra" sobre E de um lado
- A curva prazo projeta sua "sombra" sobre E do outro lado
- Onde as sombras se sobrepoem = zona de maxima densidade de tarefas
- O TM e sobreposto SOBRE este campo (a mancha)

### Tres Camadas de Simetria Artificial

O squad matematico diagnosticou tres niveis do problema:

1. **Override forçado**: `if (diaAtual === 0) { C = P = sqrt(2) }` — descartava o fingerprint do projeto
2. **Normalizacao propria**: dividir cada curva pela sua propria avgRate → mc_norm ≈ mp_norm → C ≈ P
3. **TM como grafico**: tratar vertices como coordenadas confunde a interpretacao

### CDT v4.0: Espaco Geometrico Comum

A correcao: usar o **mesmo denominador temporal** T = max(totalDiasCusto, totalDiasPrazo) para ambas as curvas. Isso preserva a diferenca de forma entre custo e prazo, permitindo triangulos escalenos naturais.

O override `diaAtual=0` foi removido. O fingerprint escaleno do projeto emerge das curvas CPM/custo desde o dia 0.

### Controle Bidirecional (Cinematica Inversa)

A segunda grande inovacao da sessao 24: o mapeamento inverso. Ate entao, o fluxo era unidirecional: graficos → TM. Agora:

- **Forward**: curvas de custo e prazo → lados E, C, P → triangulo
- **Inverse**: variacao angular delta → novos lados → traducao em dias e R$

O inverso de C = sqrt(1 + mc²) e mc = sqrt(C² - 1). Com a lei dos cossenos e senos, qualquer variacao angular pode ser traduzida em mudancas concretas de prazo e custo.

### Motor Bayesiano

Cada estado TM ao longo do projeto e um vetor (E, C, P, area, α, β, γ, data, fase). Com historico:

- **Monte Carlo aprendido**: distribuicoes calibradas pela geometria real do projeto
- **Bayesiano**: prior setorial → posterior atualizado a cada medicao
- **Calibracao institucional**: "angulo α < 55° na fase 2 antecede CRISE em X% dos casos"

---

## Licoes Aprendidas

### O que parecia correto mas nao era

| Ideia | Por que parecia certa | Por que estava errada |
|-------|----------------------|----------------------|
| Equilatero no baseline | "Todos comecam iguais" | Elimina a forma real do projeto |
| Isosceles (C=P=sqrt(2)) | "Melhor que equilatero" | Normalização propria esconde diferenças |
| Override diaAtual=0 | "Sem execucao = estado canonico" | Descarta fingerprint do planejamento |
| Vertices como coordenadas | "E um grafico, tem eixos" | TM e diagrama, nao grafico |

### O que resistiu a todo teste

- **CEt como condicao inegociavel**: se o triangulo nao fecha, o projeto e impossivel
- **Area como KPI**: A_atual/A_TM × 100% e o indicador mais robusto
- **MATED como distancia**: a metrica euclidiana ao NVO funciona em todo cenario
- **Hierarquia de zonas**: elastico → plastico → fratura mapeia para decisoes reais
- **Big Dig como validacao**: 8 anos de antecedencia em cada teste

### O principio mais importante

> O triangulo nao e uma metafora. E um modelo mecanico. Ele tem limites fisicos de existencia, regimes de deformacao e pontos de fratura. Tratar como metafora e perder todo o poder preditivo.

---

## Fase 6 — A Ancora Semantica e o Pipeline Dual TM/TA (Sessao 29)

### O Imbroglio das Sombras

Na sessao 29, uma auditoria profunda revelou que as sombras (A_mancha) estavam sistematicamente incoerentes com o triangulo nos protocolos beta e gamma. O squad matematico completo (@fermat, @aura-math, @roberta, @aura-production) foi ativado em paralelo.

O diagnostico: **6 bugs interconectados**, desde cores P/C trocadas nos lados ate transforms SVG ad-hoc que acumularam 12+ fixes em sessoes anteriores. A raiz era arquitetural — o triangulo era construido generico e depois deformado por transforms condicionais (transformY, transformX, transformY_terrain), criando 3 sistemas de coordenadas coexistentes num unico SVG.

### A Solucao: Ancora Semantica

@fermat propôs a **Opcao 4 — Construcao por Ancora Semantica**: uma formula unica onde o vertice-ancora muda por protocolo. Um switch seleciona quais lados sao (a, b, c) e um flipY semantico distingue beta de gamma. Prova de congruencia SSS em 2 linhas.

Tres pilares aprovados pelo criador:
1. **Ancora Semantica** — triangulo ja nasce na posicao final, sem transforms SVG posteriores
2. **Sombras invariantes** — eliminar inversao de dados, manter campo real como terreno estavel
3. **Pre-classificacao via slopes** — `mc²-mp² > 1` determina o protocolo ANTES de construir o triangulo

### A Ressalva Academica

O criador registrou a **Opcao 3c (rotacao parametrica)** como alternativa para testes em campo e formalizacao academica. A rotacao por theta_base pertence ao grupo SO(2), com prova de congruencia em 1 linha por isometria — potencialmente mais elegante para publicacao.

### O Pipeline Dual

A grande inovacao conceitual: separar TM (Triangulo Matriz, baseline imutavel do dia 0) e TA (Triangulo Atual, curvas reais). Ambos construidos pela mesma funcao. A sobreposicao no dashboard mostra ao gestor: "como planejei vs como esta". A deformacao do TA em relacao ao TM e a propria consciencia situacional.

### Questao Aberta: O Estado Singular

O protocolo singular (angulo reto = 90°) permanece sem renderizacao adequada. O squad foi convocado para propor tratamento em prazo e custo — o ultimo estado sem solucao visual.

---

## Fase 7 — A Grande Divisao: Aura Corporate × Aura (Sessao 31–35)

### O Momento da Bifurcacao

Na sessao 31 (01/Abr/2026), o criador do Aura convocou uma assembleia do Squad Matematico para discutir a integracao do CCPM (Critical Chain Project Management) ao motor geometrico. O que comecou como uma discussao sobre "aditivos de combustivel" para projetos tech terminou em uma decisao estrategica: **dividir o Aura em dois produtos independentes**.

### Motivacao Tecnica

O motor CDT e agnostico a fonte de dados — recebe E, P, C como escalares e roda CEt, Heron, MATED, Clairaut sem saber de onde vieram. Porem, a **qualidade dos dados de entrada** (o "combustivel") varia drasticamente entre ambientes de projeto:

```
PROJETOS TECH/DEV (5-30 pessoas):
  4 vicios comportamentais dominantes:
  - Sindrome do Estudante (comecar no ultimo momento)
  - Lei de Parkinson (trabalho expande para preencher tempo)
  - Multitarefa prejudicial (context switching)
  - Estimativas infladas por seguranca individual
  → Combustivel CONTAMINADO → Motor roda, mas diagnostico e impreciso
  → Solucao: CCPM como ADITIVO — centraliza seguranca, remove gordura

MEGAPROJETOS CONSTRUCAO (100+ pessoas):
  Vicios se diluem entre centenas de recursos
  Supervisao presencial, contratos por empreitada, estimativas historicas
  → Combustivel LIMPO (suficiente) → CPM classico e adequado
```

A tentativa de manter ambos os regimes num unico produto gerou **complexidade de UI inaceitavel**: seletores de skin, condicionais por tipo de projeto, duplicacao de fluxos. A solucao natural foi a divisao.

### Motivacao de Mercado

| Mercado | Tamanho | Concorrencia | Diferencial Aura |
|---------|---------|-------------|-----------------|
| **Infraestrutura/Construcao** | >US$10T global | MS Project, Primavera, Procore | Geometria preditiva (Big Dig 8 anos antes) |
| **Software/Digital** | >US$600B global | Jira, Asana, Monday | CCPM+Geometria integrados (nenhum concorrente faz) |

Dois produtos permitem **posicionamento de mercado preciso** e **pitch diferenciado para investidores institucionais**. O motor CDT compartilhado garante que a propriedade intelectual central permanece unica.

### O Framework de 33 Decisoes

As assembleias do Squad Matematico (sessoes 31-35) produziram 33 decisoes formalizadas em 3 sessoes:

**Sessao 1 — CCPM como Aditivo (D1-D4):**
- D1: Corte de estimativa (otimista + segura, 2 inputs)
- D2: Buffer RSS √(Σsi²) — equilibrio entre fidelidade e pratica
- D3: Notificacao Resend + Magic Link + RLS (1 clique, 4 campos: duracao O+S, custo O+S)
- D4: Temporizador 48h configuravel + escalacao Klauss

**Sessao 2 — Retas e Custo (D5-D6):**
- D5: Reta P(t) bifurcada — zona de cadeia (ingreme) + zona de buffer
- D6: Buffer de custo RSS — contingencia centralizada analoga ao prazo

**Sessao 3 — Fractais e CEt Hierarquica (D7-D16):**
- D7: Sprint Triangles (fractais) com Transition Buffer Zones (triangulos inversos)
- D8: Aporte como crashing (nao cria sprints; efeito multiplicativo)
- D9: Sprints predominantemente sequenciais
- D10: Fever Chart Geometrico (2D, buffer penetration como area)
- D11: C(t) como custo acumulado EVM (crescente) — resolve impasse de retas decrescentes
- D12: Saude por sprint sem pesos — global = CDT(totais), nao media
- D13: CEt Hierarquica em 3 etapas (total → sprint → buffer)
- D14: CEt como limitador de buffer ★ CONTRIBUICAO ORIGINAL
- D15: Propagacao de falha — sprint com CC falha = efeito geral; so feeding = efeito local
- D16: Nomenclatura Tech (Sprint Triangle, TBZ, Contributor, Critical Chain, etc.)

**Sessoes 4-5 — Dashboard e IA (D17-D33):**
- D17-D20: 6 cores fractais, gauge impacto, formula N recrutamento, granularidade dual
- D21: 3 camadas backend (decisao perfura prazo/custo/escopo)
- D22-D26: Revisao C_buffer>75%, Clairaut TM+ultimo sprint, obtusangulos OK, TBZ algoritmico, letras A,B,C
- D27-D30: Board ocultavel, azul resiliente, Fever Chart 4 zonas, Ghost TM fractal
- D31: Castelo de Cartas (propagacao direcional com atenuacao exponencial e^-λk)
- D32: Sanfona setup vs dashboard (funcao tracejada imutavel vs solida viva)
- D33: Klauss causal (narrativas por zona do Fever Chart)

### A Contribuicao Original: CEt como Limitador de Buffer (D14)

O CCPM de Goldratt nao impoe teto para o buffer — ele pode crescer indefinidamente. O Aura introduz uma restricao geometrica inedita: **o buffer nao pode ser tao grande que destrua o triangulo**. Se o buffer excede o limite permitido pela CEt do sprint, ele e truncado automaticamente:

```
Se buffer_prazo → faz P_sprint' violar CEt:
  Buffer truncado ao maximo geometricamente permitido
  Klauss: "Buffer truncado de Y para Z dias pela CEt. Protecao reduzida."
```

Nenhum metodo na literatura combina CCPM com restricao geometrica triangular. Esta e uma contribuicao potencialmente publicavel.

### A Execucao da Divisao (02/Abr/2026)

A divisao foi executada em paralelo usando Claude Code CLI em dois terminais:

**Terminal 1 — Aura Corporate (Aura-6.1/):**

| Fase | Descricao | Status |
|------|-----------|--------|
| A1 | Remover sistema de skins, hardcode infraestrutura | ✅ 14 arquivos, 0 erros TS |
| A2 | Linguagem corporate (Sprint→Etapa, Feature→Entrega, Deploy→Comissionamento) | ✅ 6 arquivos |
| A3 | Klauss reescrito como Engenheiro Consultor de infraestrutura (few-shot Big Dig + BR-101) | ✅ 1 arquivo |

**Terminal 2 — Aura (Aura/):**

| Fase | Descricao | Status |
|------|-----------|--------|
| Fase 1 (B0, B1) | Setup + hardcode skin tech | ✅ 814→886 testes |
| Fase 2 (B2, B3, B5, B6) | Motor CCPM: ccpm.ts, buffer.ts, contributor.ts, decision.ts + CEt hierarquica + custo EVM | ✅ 886 testes (72 novos) |
| Fase 3 (B4, B9, B8) | Fractais, Castelo de Cartas, 3 camadas backend | ⚠️ INTERROMPIDA (tokens) — fractals.ts e castle.ts criados, castle.test.ts parcial |
| Fase 4 (B7, B10, B13-B15) | Dashboard: Fever Chart, Sanfona, componentes UI, Clairaut fractais, Formula N | ❌ Pendente |
| Fase 5 (B11, B12) | Klauss Tech + Priors Bayesianos calibrados para software | ❌ Pendente |
| Fase 6 | QA: npm test, tsc, build, lint → deploy separado | ❌ Pendente |

### A Arquitetura Pos-Divisao

```
Aura Corporate (Aura-6.1/)          Aura (Aura/)
├── Motor CDT (core compartilhado)  ├── Motor CDT (herdado)
├── CPM classico                    ├── CCPM (cadeia critica + buffers RSS)
├── Lingua: Etapa, Entrega, Recurso ├── Lingua: Sprint, Feature, Contributor
├── C(t): curva S acumulada         ├── C(t): EVM acumulado (D11)
├── P(t): burndown tradicional      ├── P(t): burndown bifurcado CCPM (D5)
├── Klauss: eng. civil              ├── Klauss: tech causal (D33)
├── Supabase Projeto A              ├── Supabase Projeto B (NOVO)
├── Vercel Projeto A (existente)    ├── Vercel Projeto B (NOVO)
└── GitHub repo existente           └── GitHub repo NOVO
```

### O Motor Permanece Uno

> "NENHUM item toca o motor CDT. Tudo acontece ANTES — na camada de scheduling. O CDT recebe o P que sai do CCPM exatamente como recebe o P do CPM. O motor e agnostico a fonte. O que falta e carroceria, nao motor." — @aura-production

---

## Proximo Capitulo

Com a divisao concluida no Corporate e em andamento no Tech, o MetodoAura se prepara para dois mercados distintos com um unico motor geometrico. O Tech traz inovacoes ineditas: CCPM+geometria integrados, CEt como limitador de buffer, Fever Chart geometrico, e Castelo de Cartas para propagacao de decisoes.

A publicacao academica ganha mais dois teoremas: CEt como Limitador Geometrico de Buffer e Propagacao Fractal de Falha.

---

*Documento atualizado a partir de 35 sessoes de desenvolvimento, 886+ testes automatizados, validacao com Big Dig (1991–2007) e divisao de produto em 02/Abr/2026.*
*Sessao 35 — 2026-04-02*
