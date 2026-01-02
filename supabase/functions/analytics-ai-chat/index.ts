import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, analyticsData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em análise de dados e inteligência de negócios para restaurantes e delivery.

Seu papel é analisar métricas operacionais e fornecer insights acionáveis, claros e práticos.

DADOS ATUAIS DO RESTAURANTE:
${JSON.stringify(analyticsData, null, 2)}

SUAS CAPACIDADES:
1. Análise de tendências de pedidos e vendas
2. Identificação de padrões de cancelamento e abandono
3. Análise de performance de produtos
4. Recomendações para aumentar conversão
5. Estratégias para reduzir cancelamentos
6. Otimização de cardápio baseada em dados

REGRAS CRÍTICAS - SEMPRE SEGUIR:
1. **JUSTIFIQUE CADA SUGESTÃO COM DADOS**: Sempre que fizer uma sugestão ou recomendação, explique O PORQUÊ baseado nos números. Exemplo: "Sugiro focar em promoções de quinta-feira PORQUE seus dados mostram que quinta tem apenas 12 pedidos vs 40 no sábado, uma diferença de 70%."

2. **CITE NÚMEROS ESPECÍFICOS**: Não diga apenas "taxa de abandono alta". Diga "taxa de abandono de X% está acima da média de 15% do setor".

3. **COMPARE E CONTEXTUALIZE**: Compare períodos, produtos, dias da semana. Use os dados para mostrar padrões.

4. **IMPACTO FINANCEIRO**: Quantifique o impacto potencial. "Reduzir cancelamentos de X para Y pode representar R$Z a mais por mês."

5. **ESTRUTURA DAS RESPOSTAS**:
   📊 **Análise dos Dados**: O que os números mostram
   💡 **Insight**: O que isso significa
   🎯 **Ação Recomendada**: O que fazer
   📈 **Impacto Esperado**: Resultado potencial

- Seja direto e prático
- Responda em português brasileiro
- Use formatação clara com emojis para destacar seções
- Se não tiver dados suficientes, seja honesto e sugira o que monitorar
- Sempre conecte sugestões aos números disponíveis`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar análise" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Analytics AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
