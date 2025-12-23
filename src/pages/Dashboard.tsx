import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Package, ShoppingBag, TrendingUp, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  topProduct: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topProduct: "N/A",
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  const storeUrl = `${window.location.origin}/r/${userId}`;

  const copyStoreUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Link copiado!");
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Buscar TODOS os pedidos para estatísticas
      const { data: allOrders, error: statsError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("restaurant_id", user.id);

      if (statsError) throw statsError;

      // Buscar pedidos recentes para exibição
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, clients(name), order_items(quantity, product_id, products(name))")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      // Calcular estatísticas com TODOS os pedidos
      const totalOrders = allOrders?.length || 0;
      const totalRevenue = allOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalOrders,
        totalRevenue,
        averageTicket,
        topProduct: "N/A",
      });

      setRecentOrders(orders || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
    preparing: "border-blue-500/30 bg-blue-500/20 text-blue-400",
    ready: "border-green-500/30 bg-green-500/20 text-green-400",
    delivered: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
    cancelled: "border-red-500/30 bg-red-500/20 text-red-400",
    on_the_way: "border-purple-500/30 bg-purple-500/20 text-purple-400",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Em Preparo",
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
    on_the_way: "A Caminho",
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        <Card className="bg-gradient-to-r from-primary/15 via-accent/10 to-primary/5 border-primary/30 shadow-xl shadow-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ExternalLink className="w-5 h-5 text-primary" />
              Link da Sua Loja Online
            </CardTitle>
            <CardDescription>Compartilhe este link para seus clientes fazerem pedidos</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={storeUrl} readOnly className="font-mono text-sm bg-background/50" />
            <Button onClick={copyStoreUrl} variant="outline" className="border-primary/30 hover:bg-primary/10">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={() => window.open(storeUrl, "_blank")}>
              Abrir
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">pedidos realizados</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">em vendas</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                R$ {stats.averageTicket.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">por pedido</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produto Mais Vendido</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                <Package className="h-5 w-5 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topProduct}</div>
              <p className="text-xs text-muted-foreground">mais popular</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum pedido realizado ainda</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{order.clients?.name || "Cliente não identificado"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-lg">R$ {parseFloat(order.total_amount).toFixed(2)}</p>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;