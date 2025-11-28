import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  pedidos_total: number;
  pedidos_por_dia: number[];
  cancelamentos: number;
  abandonos: number;
  produtos_mais_vendidos: Array<{ produto: string; vendas: number }>;
  produtos_menos_vendidos: Array<{ produto: string; vendas: number }>;
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(*, product:products(name))")
        .eq("restaurant_id", user.id);

      // Calculate metrics
      const pedidos_total = orders?.length || 0;
      const cancelamentos = orders?.filter(o => o.status === "cancelled").length || 0;

      // Orders by day (last 7 days)
      const today = new Date();
      const pedidos_por_dia = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        return orders?.filter(o => {
          const orderDate = new Date(o.created_at || "");
          return orderDate >= date && orderDate < nextDate;
        }).length || 0;
      });

      // Cart abandonment rate
      const { data: carts } = await supabase
        .from("carts")
        .select("*")
        .eq("restaurant_id", user.id);

      const abandonedCarts = carts?.filter(c => c.is_abandoned).length || 0;
      const totalCarts = carts?.length || 1;
      const abandonos = (abandonedCarts / totalCarts) * 100;

      // Top and bottom products
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
        cancelamentos,
        abandonos,
        produtos_mais_vendidos,
        produtos_menos_vendidos,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, refetch: fetchData };
}
