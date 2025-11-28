import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analisarDadosInteligente } from "@/lib/analytics/intelligentAnalytics";
import { AnalysisInput, AnalysisOutput } from "@/lib/analytics/types";

/**
 * Hook React para usar o sistema de análise inteligente
 */
export function useIntelligentAnalytics() {
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Usuário não autenticado");
        return;
      }

      // Buscar dados históricos (últimas 12 semanas)
      const dozeSemanasAtras = new Date();
      dozeSemanasAtras.setDate(dozeSemanasAtras.getDate() - 84);

      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(*, product:products(name))")
        .eq("restaurant_id", user.id)
        .gte("created_at", dozeSemanasAtras.toISOString());

      const { data: carts } = await supabase
        .from("carts")
        .select("*")
        .eq("restaurant_id", user.id)
        .gte("created_at", dozeSemanasAtras.toISOString());

      // Preparar dados históricos por semana
      const semanas = 12;
      const pedidosPorSemana: number[] = [];
      const cancelamentosPorSemana: number[] = [];
      const abandonosPorSemana: number[] = [];
      const conversaoPorSemana: number[] = [];

      for (let i = semanas - 1; i >= 0; i--) {
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7 + 7));
        const fimSemana = new Date();
        fimSemana.setDate(fimSemana.getDate() - (i * 7));

        const pedidosSemana = orders?.filter((o) => {
          const date = new Date(o.created_at || "");
          return date >= inicioSemana && date < fimSemana;
        }) || [];

        const cartsSegmana = carts?.filter((c) => {
          const date = new Date(c.created_at || "");
          return date >= inicioSemana && date < fimSemana;
        }) || [];

        pedidosPorSemana.push(pedidosSemana.length);
        cancelamentosPorSemana.push(pedidosSemana.filter((o) => o.status === "cancelled").length);

        const abandonados = cartsSegmana.filter((c) => c.is_abandoned).length;
        const totalCarts = cartsSegmana.length || 1;
        abandonosPorSemana.push((abandonados / totalCarts) * 100);

        // Conversão simplificada (pedidos / visitas * 100)
        conversaoPorSemana.push(pedidosSemana.length > 0 ? (pedidosSemana.length / totalCarts) * 100 : 0);
      }

      // Calcular produtos mais/menos vendidos com histórico
      const produtosVendasHistorico: Record<string, number[]> = {};
      
      for (let i = semanas - 1; i >= 0; i--) {
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - (i * 7 + 7));
        const fimSemana = new Date();
        fimSemana.setDate(fimSemana.getDate() - (i * 7));

        const pedidosSemana = orders?.filter((o) => {
          const date = new Date(o.created_at || "");
          return date >= inicioSemana && date < fimSemana;
        }) || [];

        const vendasSemana: Record<string, number> = {};
        pedidosSemana.forEach((order) => {
          order.order_items?.forEach((item) => {
            const nome = item.product?.name || "Desconhecido";
            vendasSemana[nome] = (vendasSemana[nome] || 0) + item.quantity;
          });
        });

        Object.keys(vendasSemana).forEach((produto) => {
          if (!produtosVendasHistorico[produto]) {
            produtosVendasHistorico[produto] = new Array(semanas).fill(0);
          }
          produtosVendasHistorico[produto][semanas - 1 - i] = vendasSemana[produto];
        });
      }

      // Dados atuais (última semana)
      const umaSemanaAtras = new Date();
      umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);

      const pedidosRecentes = orders?.filter((o) => {
        const date = new Date(o.created_at || "");
        return date >= umaSemanaAtras;
      }) || [];

      const cartsRecentes = carts?.filter((c) => {
        const date = new Date(c.created_at || "");
        return date >= umaSemanaAtras;
      }) || [];

      const vendasAtuais: Record<string, number> = {};
      pedidosRecentes.forEach((order) => {
        order.order_items?.forEach((item) => {
          const nome = item.product?.name || "Desconhecido";
          vendasAtuais[nome] = (vendasAtuais[nome] || 0) + item.quantity;
        });
      });

      const produtosOrdenados = Object.entries(vendasAtuais).sort((a, b) => b[1] - a[1]);
      const maisVendidos = produtosOrdenados.slice(0, 5).map(([produto, vendas]) => ({ produto, vendas }));
      const menosVendidos = produtosOrdenados.slice(-5).reverse().map(([produto, vendas]) => ({ produto, vendas }));

      const abandonadosRecentes = cartsRecentes.filter((c) => c.is_abandoned).length;
      const totalCartsRecentes = cartsRecentes.length || 1;

      // Construir input para análise
      const input: AnalysisInput = {
        historico: {
          semanas,
          pedidos: pedidosPorSemana,
          cancelamentos: cancelamentosPorSemana,
          abandonos: abandonosPorSemana,
          conversao: conversaoPorSemana,
          produtos: {
            mais_vendidos: Object.entries(produtosVendasHistorico)
              .map(([produto, vendas]) => ({ produto, vendas }))
              .sort((a, b) => b.vendas.reduce((x, y) => x + y, 0) - a.vendas.reduce((x, y) => x + y, 0))
              .slice(0, 10),
            menos_vendidos: Object.entries(produtosVendasHistorico)
              .map(([produto, vendas]) => ({ produto, vendas }))
              .sort((a, b) => a.vendas.reduce((x, y) => x + y, 0) - b.vendas.reduce((x, y) => x + y, 0))
              .slice(0, 10),
          },
        },
        dados_atual: {
          pedidos_total: pedidosRecentes.length,
          cancelamentos: pedidosRecentes.filter((o) => o.status === "cancelled").length,
          abandonos: (abandonadosRecentes / totalCartsRecentes) * 100,
          conversao: (pedidosRecentes.length / totalCartsRecentes) * 100,
          produtos_mais_vendidos: maisVendidos,
          produtos_menos_vendidos: menosVendidos,
        },
      };

      // Executar análise inteligente
      const resultado = analisarDadosInteligente(input);
      setAnalysis(resultado);
    } catch (err) {
      console.error("Erro na análise inteligente:", err);
      setError("Erro ao processar análise");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndAnalyze();
  }, []);

  return { analysis, loading, error, refetch: fetchAndAnalyze };
}
