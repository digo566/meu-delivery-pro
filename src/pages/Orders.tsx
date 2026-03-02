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
  tracking_code: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method: string | null;
  needs_change: boolean | null;
  change_amount: number | null;
  notes: string | null;
  clients: {
    name: string;
    phone: string;
    address: string | null;
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
          clients(name, phone, address),
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
    pending: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
    preparing: "border-blue-500/30 bg-blue-500/20 text-blue-400",
    on_the_way: "border-purple-500/30 bg-purple-500/20 text-purple-400",
    ready: "border-green-500/30 bg-green-500/20 text-green-400",
    delivered: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
    cancelled: "border-red-500/30 bg-red-500/20 text-red-400",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    preparing: "Em Preparo",
    on_the_way: "A Caminho",
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos do seu restaurante</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum pedido realizado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {orders.map((order) => (
              <Card key={order.id} className="flex flex-col">
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold truncate">
                        {order.clients?.name || "Cliente não identificado"}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge className={`${statusColors[order.status]} text-[10px] px-1.5 py-0.5 shrink-0`}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                  <code className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30 w-fit">
                    {order.tracking_code}
                  </code>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex-1 flex flex-col gap-2 text-xs">
                  {order.clients?.address && (
                    <p className="text-muted-foreground truncate" title={order.clients.address}>
                      📍 {order.clients.address}
                    </p>
                  )}

                  <div className="space-y-0.5 flex-1">
                    {order.order_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="truncate mr-2">
                          {item.quantity}x {item.products?.name || "—"}
                        </span>
                        <span className="shrink-0 text-muted-foreground">R$ {Number(item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.order_items.length > 3 && (
                      <p className="text-muted-foreground">+{order.order_items.length - 3} itens</p>
                    )}
                  </div>

                  {order.payment_method && (
                    <p className="text-muted-foreground capitalize">
                      💳 {order.payment_method}
                      {order.payment_method === "dinheiro" && order.needs_change && order.change_amount && (
                        <span> • Troco p/ R$ {Number(order.change_amount).toFixed(2)}</span>
                      )}
                    </p>
                  )}

                  {order.notes && (
                    <p className="text-muted-foreground bg-muted p-1.5 rounded text-[11px] line-clamp-2">
                      📝 {order.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                    <p className="text-base font-bold">
                      R$ {Number(order.total_amount).toFixed(2)}
                    </p>
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[130px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="preparing">Em Preparo</SelectItem>
                        <SelectItem value="on_the_way">A Caminho</SelectItem>
                        <SelectItem value="ready">Pronto</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {order.clients?.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        window.open(
                          `https://wa.me/${order.clients?.phone.replace(/\D/g, "")}?text=Olá%20${order.clients?.name},%20seu%20pedido%20está%20${statusLabels[order.status]}!`,
                          "_blank"
                        );
                      }}
                    >
                      WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;