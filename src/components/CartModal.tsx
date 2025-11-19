import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onCheckout: () => void;
  items: CartItem[];
  restaurantId: string;
  guestCartId: string | null;
}

const checkoutSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().regex(/^(\d{10,11})$/, "WhatsApp inválido. Use apenas números (ex: 85999999999)"),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
});

export function CartModal({ isOpen, onClose, onContinue, onCheckout, items, restaurantId, guestCartId }: CartModalProps) {
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleFinalizarClick = () => {
    setShowCheckoutForm(true);
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = checkoutSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Verificar se cliente já existe pelo WhatsApp
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", formData.phone)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        clientId = existingClient.id;
        
        // Atualizar dados do cliente
        await supabase
          .from("clients")
          .update({
            name: formData.name,
            address: formData.address,
          })
          .eq("id", clientId);
      } else {
        // Criar novo cliente
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            restaurant_id: restaurantId,
            is_registered: false,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Criar carrinho no banco de dados
      const { data: newCart, error: cartError } = await supabase
        .from("carts")
        .insert({
          client_id: clientId,
          restaurant_id: restaurantId,
          is_abandoned: false,
        })
        .select()
        .single();

      if (cartError) throw cartError;

      // Adicionar itens ao carrinho
      const cartItemsToInsert = items.map(item => ({
        cart_id: newCart.id,
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("cart_items")
        .insert(cartItemsToInsert);

      if (itemsError) throw itemsError;

      // Limpar carrinho local
      if (guestCartId) {
        localStorage.removeItem(`cartItems_${guestCartId}`);
        localStorage.removeItem(`guestCart_${restaurantId}`);
      }

      toast.success("Dados salvos! Finalize seu pedido.");
      setShowCheckoutForm(false);
      onCheckout();
      
      // Recarregar página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Erro ao processar checkout:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {showCheckoutForm ? "Seus Dados para Entrega" : "Item Adicionado ao Carrinho"}
          </DialogTitle>
        </DialogHeader>

        {!showCheckoutForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleFinalizarClick} size="lg" className="w-full">
                Finalizar Pedido
              </Button>
              <Button onClick={onContinue} variant="outline" size="lg" className="w-full">
                Continuar Comprando
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitCheckout} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                placeholder="85999999999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço de Entrega</Label>
              <Input
                id="address"
                placeholder="Rua, número, bairro"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Processando..." : "Confirmar Pedido"}
              </Button>
              <Button 
                type="button" 
                onClick={() => setShowCheckoutForm(false)} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
