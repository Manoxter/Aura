import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: '../../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to act as agent accessing underlying data

const supabase = createClient(supabaseUrl, supabaseKey);

const server = new Server(
    {
        name: "aura-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_project_triangles",
                description: "Recupera o Triângulo de Ferro (Escopo/Duração e Orçamento) atual de um Projeto específico. Utilizado para alimentar simulações geométricas, NVO e análise de restrição (TOC).",
                inputSchema: {
                    type: "object",
                    properties: {
                        projeto_id: { type: "string", description: "O UUID do projeto no Supabase." }
                    },
                    required: ["projeto_id"]
                }
            }
        ]
    };
});

// Handle Tools Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "get_project_triangles": {
            const projetoId = request.params.arguments?.projeto_id as string;
            
            if (!projetoId) {
                return {
                    content: [{ type: "text", text: "Erro: projeto_id é obrigatório." }],
                    isError: true
                };
            }

            try {
                // Fetch Budget Constraints
                const { data: budgetData, error: budgetErr } = await supabase
                    .from('orcamentos')
                    .select('total_estimado')
                    .eq('projeto_id', projetoId)
                    .single();

                // Fetch Timeline Constraints
                const { data: tasksData, error: tasksErr } = await supabase
                    .from('tarefas')
                    .select('duracao_estimada')
                    .eq('projeto_id', projetoId);

                if (budgetErr && budgetErr.code !== 'PGRST116') throw budgetErr; // Ignore '0 rows' error
                if (tasksErr) throw tasksErr;

                const totalDuration = tasksData?.reduce((acc, t) => acc + (t.duracao_estimada || 0), 0) || 0;
                const totalCost = budgetData?.total_estimado || 0;

                const result = {
                    projeto_id: projetoId,
                    restricoes_aprovadas: {
                        custo_total_projeto: totalCost,
                        tempo_sprints_projeto: totalDuration,
                        observacao: "Este é o triângulo base (Baseline Original) extraído das restrições aprovadas do TAP."
                    }
                };

                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Supabase Extraction Error: ${error.message}` }],
                    isError: true
                };
            }
        }
        default:
            return {
                content: [{ type: "text", text: "Tool não encontrada no Custom MCP do Aura." }],
                isError: true
            };
    }
});

// Start StdIO Transport
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Aura MCP Server está rodando (Transport: STDIO)...");
}

run().catch(console.error);
