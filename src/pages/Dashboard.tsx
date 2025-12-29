import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Package, ShoppingBag, TrendingUp, ExternalLink, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

      const { data: allOrders, error: statsError } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("restaurant_id", user.id);

      if (statsError) throw statsError;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, clients(name), order_items(quantity, product_id, products(name))")
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

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
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    preparing: "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-green-100 text-green-800 border-green-200",
    delivered: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    on_the_way: "bg-purple-100 text-purple-800 border-purple-200",
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
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do seu negócio</p>
        </div>

        {/* Store Link Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-4 h-4 text-primary" />
              Link da Sua Loja
            </CardTitle>
            <CardDescription>Compartilhe com seus clientes</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input value={storeUrl} readOnly className="font-mono text-sm" />
            <Button onClick={copyStoreUrl} variant="outline" size="icon">
              <Copy className="w-4 h-4" />
            </Button>
            <Button onClick={() => window.open(storeUrl, "_blank")}>
              Abrir
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
              <ShoppingBag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                R$ {stats.averageTicket.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Produto</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.topProduct}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum pedido ainda</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-md bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{order.clients?.name || "Cliente não identificado"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">R$ {parseFloat(order.total_amount).toFixed(2)}</p>
                      <Badge variant="outline" className={statusColors[order.status]}>
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
