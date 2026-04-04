# REQUISIÇÃO SESSÃO 28 — Plano Oficial de Implementação

**Data:** 2026-03-31 | **Autoridade:** Criador MetodoAura
**Presidência:** @sm (River) + @qa (Quinn)
**Squad completo convocado:** TODOS os 34 agentes

---

## ITENS DE IMPLEMENTAÇÃO (17 itens)

### CANVAS & VISUALIZAÇÃO

**R1. Mapa de Calor no Canvas TM**
- Filtro de heatmap ligável/desligável
- Gradação: NVO → ZRE → Interseção manchas → Interior TM → Mancha exclusiva prazo → Mancha exclusiva custo → A_rebarba → Fora
- Legenda explicativa de cada zona
- Documentar para tutorial futuro

**R2. Dashboard herda canvas TM**
- Mesmo diagrama geométrico do TM no Dashboard
- Mesmos parâmetros, mesmas camadas
- Diferença: TM = snapshot imutável (fotografia), Dashboard = simulação ativa

**R3. Camadas ocultáveis no Dashboard**
- Botões de seleção para mostrar/ocultar cada camada do triângulo
- ZRE, NVO, manchas, bandas, eixos — cada uma controlável

**R4. Cards de aviso ocultáveis**
- Todos os cards informativos podem ser minimizados/ocultados

**R5. Remover notações gregas (α/ω/ε) do canvas**
- Painel Clairaut já informa — redundância no canvas

**R6. Painel Clairaut no Dashboard**
- Manômetros α/ω/ε presentes também no Dashboard

**R7. Remover "Campo Operacional — Curvas Reais Camadas" do Dashboard**

**R8. Cores das retas: Escopo=verde, Prazo=amarelo, Custo=azul**

**R9. SINGULAR conforme imagem "retos.png"**
- Triângulo reto com Escopo como cateto base
- Ângulo 90° no vértice crítico (prazo ou custo)

### SNAPSHOT & RELATÓRIOS

**R10. Snapshot TM imutável**
- Após registro, TM vira fotografia de comparação
- Decisões simuladas no Dashboard mostram distorções sobrepostas ao original
- Comparação visual em tempo real (antes vs depois)

**R11. Sistema de Pesos e Contrapesos**
- Se um lado diminui por decisão, outro aumenta proporcionalmente
- Objetivo: manter área o mais próximo possível da original
- Mudança de protocolo → sistema Pecado/Remissão → novo TM com nova área 100%

**R12. Pasta de Relatórios no Dashboard**
- Sistema de pastas: ID - Nome do Projeto - Data e Hora
- Conteúdo: tarefas do dia (iniciadas, andamento, atrasadas, concluídas)
- Entregas nos marcos, orçamento gasto/disponível
- Registro de eventos de impacto
- Decisões tomadas com razões
- Área para digitar ou subir documentos
- Klauss pode ler documentos e implementar decisões automáticas (não-autônomas)
- Assinatura digital: PM ou PO credenciado obrigatório

### FERRAMENTAS & INTERAÇÃO

**R13. Ferramentas funcionais (não mockups)**
- Cada ferramenta deve ser instrumento utilizável
- Dispara decisão da simulação para o projeto
- Avisos, interpretações, alertas e registro no relatório diário
- Buscar modelos open-source compatíveis

**R14. Evento Atípico → caixa própria na barra lateral**
- Sair do botão Ferramentas
- Ir para estrutura da barra (junto com Kanban, MATED, War Room)

**R15. MATED sai do Canvas TM → só no Dashboard**
- Ocultável
- Mostrar tradução em prazo e custo (não pontos brutos)

### INTEGRIDADE

**R16. Integridade do banco de dados**
- @data-engineer valida todas as mudanças de schema
- Sem efeitos colaterais nas tabelas existentes

**R17. Push exclusivo para AuraX → produção**

---

## PRIORIDADES (definidas por @sm + @qa)

### P0 — Imediato (esta sessão)
- R9: SINGULAR conforme retos.png (FIX PENDENTE)
- R5: Remover notações gregas do canvas
- R7: Remover "Campo Operacional" do Dashboard
- R8: Cores das retas confirmadas

### P1 — Sprint 1 (próxima sessão)
- R2: Dashboard herda canvas TM
- R6: Painel Clairaut no Dashboard
- R3: Camadas ocultáveis
- R4: Cards ocultáveis

### P2 — Sprint 2
- R1: Mapa de calor
- R10: Snapshot imutável + comparação visual
- R11: Pesos e contrapesos (compensação de lados)

### P3 — Sprint 3
- R12: Pasta de Relatórios completa
- R15: MATED traduzido no Dashboard

### P4 — Sprint 4
- R13: Ferramentas funcionais
- R14: Evento Atípico na barra lateral

---

*Registrado por @sm (River) | Aprovado por @qa (Quinn)*
*Squad completo ciente: @fermat, @aura-math, @roberta, @kenki, @aura-production, @dev, @devops, @architect, @data-engineer, @ux-design-expert, @visual-designer, @klauss*
