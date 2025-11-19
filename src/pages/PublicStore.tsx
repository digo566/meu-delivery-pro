import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, ShoppingCart, Store, Trash2, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { ClientAuth } from "@/components/ClientAuth";
import { CartModal } from "@/components/CartModal";

const customerSchema = z.object({
  address: z.string().trim().min(10, "Endereço deve ter no mínimo 10 caracteres").max(500, "Endereço muito longo"),
  paymentMethod: z.string().min(1, "Selecione uma forma de pagamento"),
});

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface RestaurantInfo {
  restaurant_name: string;
  phone: string;
}

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
}

const PublicStore = () => {
  const { restaurantId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentCartId, setCurrentCartId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId) {
      loadStoreData();
      checkAuth();
    }
  }, [restaurantId]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          await loadClientData(session.user.id);
          await loadOrCreateCart(session.user.id);
        } else {
          setIsAuthenticated(false);
          setClientData(null);
          setCurrentCartId(null);
          setCart([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [restaurantId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setIsAuthenticated(true);
      await loadClientData(session.user.id);
      await loadOrCreateCart(session.user.id);
    }
  };

  const loadClientData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.error("Cliente não encontrado para este restaurante");
        return;
      }
      
      setClientData(data);
      if (data.address) {
        setCustomerAddress(data.address);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
    }
  };

  const loadOrCreateCart = async (userId: string) => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", userId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (clientError) throw clientError;
      
      if (!clientData) {
        console.error("Cliente não encontrado para este restaurante");
        return;
      }

      const { data: cartData, error: cartError } = await supabase
        .from("carts")
        .select(`
          id,
          cart_items(
            id,
            quantity,
            product_id,
            products(*)
          )
        `)
        .eq("client_id", clientData.id)
        .eq("restaurant_id", restaurantId)
        .eq("is_abandoned", false)
        .is("abandoned_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cartError) throw cartError;

      if (cartData && cartData.length > 0) {
        const existingCart = cartData[0];
        setCurrentCartId(existingCart.id);

        const items: CartItem[] = existingCart.cart_items.map((item: any) => ({
          ...item.products,
          quantity: item.quantity,
        }));
        setCart(items);
      } else {
        const { data: newCart, error: newCartError } = await supabase
          .from("carts")
          .insert({
            client_id: clientData.id,
            restaurant_id: restaurantId,
          })
          .select()
          .single();

        if (newCartError) throw newCartError;
        setCurrentCartId(newCart.id);
      }
    } catch (error) {
      console.error("Erro ao carregar/criar carrinho:", error);
    }
  };

  const loadStoreData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("restaurant_name, phone")
        .eq("id", restaurantId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        setRestaurantInfo(null);
        setLoading(false);
        return;
      }
      
      setRestaurantInfo(profileData);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados da loja");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    
    let newCart: CartItem[];
    if (existingItem) {
      newCart = cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }

    setCart(newCart);
    await syncCartToDatabase(newCart);
    setCartModalOpen(true);
    toast.success("Produto adicionado ao carrinho!");
  };

  const syncCartToDatabase = async (cartItems: CartItem[]) => {
    if (!currentCartId) return;

    try {
      await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", currentCartId);

      const itemsToInsert = cartItems.map((item) => ({
        cart_id: currentCartId,
        product_id: item.id,
        quantity: item.quantity,
      }));

      if (itemsToInsert.length > 0) {
        await supabase.from("cart_items").insert(itemsToInsert);
      }

      await supabase
        .from("carts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentCartId);
    } catch (error) {
      console.error("Erro ao sincronizar carrinho:", error);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = cart.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCart(newCart);
    await syncCartToDatabase(newCart);
  };

  const removeFromCart = async (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    setCart(newCart);
    await syncCartToDatabase(newCart);
    toast.success("Produto removido do carrinho");
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    if (!clientData) {
      toast.error("Dados do cliente não encontrados");
      return;
    }

    const validation = customerSchema.safeParse({
      address: customerAddress,
      paymentMethod,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      if (customerAddress !== clientData.address) {
        await supabase
          .from("clients")
          .update({ address: customerAddress })
          .eq("id", clientData.id);
      }

      const orderData: any = {
        restaurant_id: restaurantId,
        client_id: clientData.id,
        total_amount: getCartTotal(),
        payment_method: paymentMethod,
        status: "pending",
        cart_id: currentCartId,
      };

      if (paymentMethod === "dinheiro" && needsChange && changeAmount) {
        orderData.needs_change = true;
        orderData.change_amount = parseFloat(changeAmount);
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setCart([]);
      setCheckoutOpen(false);
      setPaymentMethod("");
      setNeedsChange(false);
      setChangeAmount("");

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadOrCreateCart(user.id);
      }

      toast.success("Pedido realizado com sucesso! O restaurante entrará em contato.");
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao processar pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setClientData(null);
    setCart([]);
    setCurrentCartId(null);
    toast.success("Você saiu da sua conta");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!restaurantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Restaurante não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">{restaurantInfo.restaurant_name}</h1>
              <p className="text-sm opacity-90">{restaurantInfo.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && clientData && (
              <div className="text-right">
                <p className="text-sm font-medium">{clientData.name}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-auto p-0 text-xs hover:bg-transparent"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sair
                </Button>
              </div>
            )}
            
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
              className="relative"
              disabled={cart.length === 0}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Carrinho ({cart.length})
              {cart.length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {cart.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        {!isAuthenticated && (
          <Card className="mb-6 border-primary">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground mb-4">
                Faça login ou crie uma conta para adicionar produtos ao carrinho
              </p>
              <Button onClick={() => setAuthModalOpen(true)} className="w-full">
                Entrar / Cadastrar
              </Button>
            </CardContent>
          </Card>
        )}

        <h2 className="text-2xl font-bold mb-6">Nosso Cardápio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-primary">
                    R$ {product.price.toFixed(2)}
                  </span>
                  <Button onClick={() => handleAddToCart(product)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ClientAuth
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          toast.success("Bem-vindo! Agora você pode adicionar produtos ao carrinho.");
        }}
        restaurantId={restaurantId!}
      />

      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        onContinue={() => setCartModalOpen(false)}
        onCheckout={() => {
          setCartModalOpen(false);
          setCheckoutOpen(true);
        }}
        items={cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))}
      />

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Itens do Pedido</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>R$ {getCartTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {clientData && (
              <div>
                <h3 className="font-semibold mb-3">Dados do Cliente</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Nome:</strong> {clientData.name}</p>
                  <p><strong>Telefone:</strong> {clientData.phone}</p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="address">Endereço de Entrega</Label>
              <Input
                id="address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div>
              <Label htmlFor="payment">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "dinheiro" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsChange"
                    checked={needsChange}
                    onChange={(e) => setNeedsChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="needsChange">Precisa de troco?</Label>
                </div>

                {needsChange && (
                  <div>
                    <Label htmlFor="changeAmount">Troco para quanto?</Label>
                    <Input
                      id="changeAmount"
                      type="number"
                      value={changeAmount}
                      onChange={(e) => setChangeAmount(e.target.value)}
                      placeholder="Ex: 50.00"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={submitting}>
              {submitting ? "Processando..." : "Confirmar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicStore;
