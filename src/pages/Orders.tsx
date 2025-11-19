import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
  needs_change: boolean | null;
  change_amount: number | null;
  clients: {
    name: string;
    phone: string;
  } | null;
  order_items: {
    quantity: number;
    unit_price: number;
    products: {
      name: string;
    } | null;
  }[];
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients(name, phone),
          order_items(quantity, unit_price, products(name))
        `)
        .eq("restaurant_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Status atualizado com sucesso!");
      loadOrders();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    preparing: "bg-blue-500",
    ready: "bg-green-500",
    delivered: "bg-gray-500",
    cancelled: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Em Preparo",
    ready: "Pronto",
    delivered: "Entregue",
    cancelled: "Cancelado",
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie os pedidos do seu restaurante</p>
        </div>

        <div className="grid gap-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Nenhum pedido realizado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {order.clients?.name || "Cliente não identificado"}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(order.created_at), "PPpp", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Itens do Pedido:</h4>
                    <div className="space-y-1">
                      {order.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.products?.name || "Produto desconhecido"}
                          </span>
                          <span>R$ {Number(item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.payment_method && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                      <p className="text-sm font-medium capitalize">
                        {order.payment_method}
                        {order.payment_method === "dinheiro" && order.needs_change && order.change_amount && (
                          <span className="text-muted-foreground">
                            {" "}• Troco para R$ {Number(order.change_amount).toFixed(2)}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="preparing">Em Preparo</SelectItem>
                        <SelectItem value="ready">Pronto</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {order.clients?.phone && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        window.open(
                          `https://wa.me/${order.clients?.phone.replace(/\D/g, "")}?text=Olá%20${order.clients?.name},%20seu%20pedido%20está%20${statusLabels[order.status]}!`,
                          "_blank"
                        );
                      }}
                    >
                      Enviar mensagem no WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Orders;