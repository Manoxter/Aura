# CLAUDE CODE CLI — SPECIFICATION GUIDE
# REFACTOR: RENDERIZAÇÃO TM, PROTOCOLOS ADAPTATIVOS E ZONA PLÁSTICA (DECISÕES D34-D43)

## 📌 CONTEXTO PARA O AGENTE (CLAUDE)

Você está encarregado de implementar as Decisões D34 a D43 aprovadas pela Assembleia do Squad Matemático do projeto Aura. O objetivo central deste refactoring é corrigir as inconsistências de renderização ("manche de avião") no Canvas do Triângulo Matemático (TM), eliminando translações forçadas e adotando troca de posição de lados baseada na orientação cartesiana natural.

**IMPORTANTE:** Estas mudanças se aplicam prioritariamente ao Motor Core (CDT) e à abstração do Canvas (frontend). Aplique as mudanças de forma a não quebrar as lógicas de cálculo de tempo e custo do projeto, apenas a forma como são derivadas e desenhadas.

---

## 🛠️ INSTRUÇÕES DE IMPLEMENTAÇÃO POR ETAPA

Execute as etapas abaixo de forma iterativa, rodando os testes (`npm run test`) a cada etapa concluída para garantir que a quebra de dependências não afete a lógica subjacente da CEt (Condição de Existência do Triângulo).

### ETAPA 1: Limpeza de Renderização e Geometria Natural (D34, D35, D39, D41)
**Arquivos prováveis:** `src/components/aura/CDTCanvas.tsx`, `src/lib/engine/math.ts` (ou equivalentes de renderização).

1. **Remoção de Eixos (D39):** O TM não é mais um gráfico cartesiano formal visualmente. Remova as linhas e marcações de eixos X e Y duplos do desenho. O escopo (`E`) deve continuar sempre sendo a base perfeitamente horizontal na parte inferior do desenho.
2. **Eliminação de Traslado (D34, D35):** Remova QUALQUER código de SVG transform (`transformX`, `transformY`, `flipY`) que forçava a rotação e espelhamento em caso de protocolos obtusos. Remova a multiplicação da inclinação de custo por -1 (`mc * (-1)`). O triângulo deve ser renderizado sempre na sua posição natural baseada na Lei dos Cossenos, partindo da base `E`.
3. **Organização Direcional (D35):** Mantenha estrita obediência visual à leitura cartesiana: `L→R` (Esquerda para Direita) é o vetor principal (Positivo). A base geométrica será sempre Escopo (`E`).
4. **Posição Natural do Reto (D41):** Quando encontrar o ângulo reto em um dos vértices da base, não inverta com *transform*. O Reto em Custo fica no lado Esquerdo (hipotenusa prazo decrescente) e o Reto em Prazo no lado Direito (hipotenusa custo crescente). Crie rotina matemática no backend (sem transform CSS) para espelhar para garantir que o cateto reto vertical sempre fique ao lado onde faz leitura ascendente (caso necessário para renderizar). Caso contrário, mantenha em sua posição original. O *Modal* garantirá a semântica.

### ETAPA 2: Função Adaptativa por Protocolo e Swap de Lados (D40)
**Arquivos prováveis:** `src/lib/engine/clairaut.ts`, camada de adaptadores de visualização TM.

1. **Identificação de Protocolo Adaptada:** Modifique ou crie o service que passa os dados de cálculo paramétricos da simulação `f(x)` para o Canvas. Implemente a lógica de escolha da função:
   - **Se α (Acutângulo):** Esquerda = Custo Acumulado (↗); Direita = Prazo Burndown (↘).
   - **Se β (Obtuso em Custo):** Esquerda = **Prazo Earned Schedule (↗)**; Direita = **Custo Acumulado (↗)**. Haverá swap dos lados: Prazo vira o Lado Esquerdo, Custo o Direito.
   - **Se γ (Obtuso em Prazo):** Esquerda = **Prazo Burndown (↘)**; Direita = **Custo Burndown de Orçamento (↘)**. Haverá swap dos lados visuais (aqui também).
2. **Implementar Funções Ausentes:** Se a função Earned Schedule (ES) ou Burndown de Orçamento não existir na camada de adapters/math, crie-as: 
   - *Burndown_Orçamento* = `Custo_Total - Custo_Acumulado(t)`
   - *Earned_Schedule* = `Tempo equivalente interpolado pelo progresso real do Escopo (EV = PV)`

### ETAPA 3: A Faixa de Singularidade (D36, D37, D42, D43)
**Arquivos prováveis:** Lógica de CEt, Validação de TM e Modais.

1. **Adeus ao Ponto 90° Fixo (D42):** Altere a validação de "Ângulo Reto" de `valor === 90` para verificação de zonas, assumindo o range da Zona Plástica `[85°, 105°]`.
2. **Eventos de Transição Angular (D36):** No verificador do sistema (hook ou store), crie disparo paramétrico de log para as seguintes verificações nos ângulos das bases (em Custo ou Prazo):
   - Entre `80°` e `84.99°`: Estado de ATENÇÃO (Avisar aproximação à zona plástica).
   - Entre `85°` e `94.99°`: Estado ZONA PLÁSTICA.
   - Entre `95°` e `105°`: Estado TRANSIÇÃO CONFIRMADA.
   - `> 105°`: Estado OBTUSO ESTÁVEL.
3. **Modais da Zona Plástica (D37):** Crie os novos modais contextuais que apontam exatamente que lado apresenta o risco (`Custo` ou `Prazo`). As decisões devem ser sempre tomadas em função do ângulo que formará uma sombra (área sob a curva). O texto contextual deve alertar a impossibilidade de recuperação do ângulo plástico sem aporte/replanejamento abrupto.
4. **Validação no Setup inicial D0 (D43):** Na camada de criação de baseline (ao gerar o `snapshot do dia 0`), se a angulação natural das estimativas gerar ângulo ∈ `[85°, 105°]`, interrompa na UI emitindo o aviso: *"PROJETO NASCE EM ZONA PLÁSTICA: Acúmulo excessivo de tarefas... rever TAP, WBS, Crashing..."*. Obtenha consentimento explícito do usuário para prosseguir, registrando isso como Pecado inicial no Histórico se ele confirmar.

### ETAPA 4: Compatibilidade Multi-Fractal Sprint-Based (D38) *[Exclusivo Tech]*
**Arquivos prováveis:** `Aura/src/lib/engine/fractals.ts`

- Aplique as mudanças de protocolo do D40 dinamicamente para interações Sprint-by-Sprint. Um triângulo fractal pode instanciar o backend de β, enquanto o adjacente instância a versão em α, cada um respeitando a sua renderização específica local, orientados pelas cores textuais texturizadas dos *Sprint Triangles*.

---

## 🎯 COMO OPERAR ESTE GUIA COM O CLAUDE CLI

Diga ao Claude, referenciando este arquivo recém-criado:

`Claude, implemente primeiro a "ETAPA 1 e 2" descrita no arquivo TM-RENDER-SPEC.md, verificando os testes a cada mudança para garantir a eliminação do traslado em favor do refactor logístico.`

E depois:
`Claude, passe para a ETAPA 3 do TM-RENDER-SPEC.md. Verifique e modifique a lógica do verificador angular, implementando a validação da Faixa Plástica (85 - 105).`
