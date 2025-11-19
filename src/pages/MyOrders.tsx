import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ShoppingBag, LogOut, ArrowLeft } from "lucide-react";

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string | null;
  order_items: OrderItem[];
  clients: {
    address: string | null;
  };
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  preparing: "bg-blue-500",
  ready: "bg-green-500",
  delivered: "bg-gray-500",
  cancelled: "bg-red-500",
};

export default function MyOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const restaurantId = new URLSearchParams(location.search).get("restaurantId");

  useEffect(() => {
    const checkAuthAndLoadOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate(`/client-auth${restaurantId ? `?restaurantId=${restaurantId}` : ""}`);
        return;
      }

      await loadOrders(session.user.id);
    };

    checkAuthAndLoadOrders();
  }, [navigate, restaurantId]);

  const loadOrders = async (userId: string) => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, address")
        .eq("user_id", userId)
        .single();

      if (clientError) throw clientError;

      setUserName(clientData.name);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            products (name)
          ),
          clients (address)
        `)
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      setOrders(ordersData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pedidos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/client-auth${restaurantId ? `?restaurantId=${restaurantId}` : ""}`);
  };

  const handleBackToStore = () => {
    if (restaurantId) {
      navigate(`/r/${restaurantId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
            <p className="text-muted-foreground">Olá, {userName}!</p>
          </div>
          <div className="flex gap-2">
            {restaurantId && (
              <Button variant="outline" onClick={handleBackToStore}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à Loja
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">Você ainda não tem pedidos</p>
              {restaurantId && (
                <Button className="mt-4" onClick={handleBackToStore}>
                  Fazer um pedido
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Pedido #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.products.name}
                        </span>
                        <span>R$ {item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    {order.payment_method && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Forma de pagamento:</span>
                        <span className="capitalize">{order.payment_method}</span>
                      </div>
                    )}
                    {order.clients.address && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Endereço:</span>
                        <span className="text-right">{order.clients.address}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2">
                      <span>Total:</span>
                      <span>R$ {order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}