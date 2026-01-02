import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";

export interface AnalyticsData {
  pedidos_total: number;
  pedidos_por_dia: number[];
  pedidos_por_dia_labels: string[];
  cancelamentos: number;
  abandonos: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
  periodo: {
    de: string;
    ate: string;
  };
}

export function useAnalyticsData(dateFrom?: Date, dateTo?: Date) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = dateFrom ? startOfDay(dateFrom) : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const to = dateTo ? endOfDay(dateTo) : endOfDay(new Date());

      // Fetch orders within date range
      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(*, product:products(name))")
        .eq("restaurant_id", user.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      // Calculate metrics
      const pedidos_total = orders?.length || 0;
      const cancelamentos = orders?.filter(o => o.status === "cancelled").length || 0;

      // Orders by day for the selected period
      const daysInRange = eachDayOfInterval({ start: from, end: to });
      const pedidos_por_dia: number[] = [];
      const pedidos_por_dia_labels: string[] = [];

      daysInRange.forEach(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        const ordersInDay = orders?.filter(o => {
          const orderDate = new Date(o.created_at || "");
          return orderDate >= dayStart && orderDate <= dayEnd;
        }).length || 0;
        
        pedidos_por_dia.push(ordersInDay);
        pedidos_por_dia_labels.push(format(day, "dd/MM"));
      });

      // Cart abandonment rate within date range
      const { data: carts } = await supabase
        .from("carts")
        .select("*")
        .eq("restaurant_id", user.id)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      const abandonedCarts = carts?.filter(c => c.is_abandoned).length || 0;
      const totalCarts = carts?.length || 1;
      const abandonos = (abandonedCarts / totalCarts) * 100;

      // Top and bottom products within date range
      const productSales: Record<string, number> = {};
      
      orders?.forEach(order => {
        order.order_items?.forEach(item => {
          const productName = item.product?.name || "Produto Desconhecido";
          productSales[productName] = (productSales[productName] || 0) + item.quantity;
        });
      });

      const sortedProducts = Object.entries(productSales)
        .map(([produto, vendas]) => ({ produto, vendas }))
        .sort((a, b) => b.vendas - a.vendas);

      const produtos_mais_vendidos = sortedProducts.slice(0, 5);
      const produtos_menos_vendidos = sortedProducts.slice(-5).reverse();

      setData({
        pedidos_total,
        pedidos_por_dia,
        pedidos_por_dia_labels,
        cancelamentos,
        abandonos,
        produtos_mais_vendidos,
        produtos_menos_vendidos,
        periodo: {
          de: from.toISOString(),
          ate: to.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom?.toISOString(), dateTo?.toISOString()]);

  return { data, loading, refetch: fetchData };
}
