import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { formatPhoneToWhatsApp, validateBrazilianPhone } from "@/lib/utils";

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
  phone: z.string().refine(validateBrazilianPhone, {
    message: "WhatsApp inválido. Use DDD + número (ex: 85999998888)"
  }),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
});

export function CartModal({ isOpen, onClose, onContinue, onCheckout, items, restaurantId, guestCartId }: CartModalProps) {
  const [step, setStep] = useState<'cart' | 'data' | 'payment' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [savedCartId, setSavedCartId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    paymentMethod: "",
    needsChange: false,
    changeAmount: "",
    notes: "",
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleFinalizarClick = () => {
    setStep('data');
  };

  const handleDataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataValidation = checkoutSchema.safeParse({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });
    
    if (!dataValidation.success) {
      toast.error(dataValidation.error.errors[0].message);
      return;
    }
    
    setLoading(true);

    try {
      // Formatar número para o padrão WhatsApp
      const formattedPhone = formatPhoneToWhatsApp(formData.phone);
      
      // Verificar se cliente já existe pelo WhatsApp
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", formattedPhone)
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
            phone: formattedPhone,
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

      // Transferir itens do guest cart para o carrinho permanente
      const cartItems = items.map((item) => ({
        cart_id: newCart.id,
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("cart_items")
        .insert(cartItems);

      if (itemsError) throw itemsError;

      // Salvar o ID do carrinho para usar no pedido
      setSavedCartId(newCart.id);
      
      setStep('payment');
    } catch (error) {
      console.error("Erro ao salvar carrinho:", error);
      toast.error("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    if (formData.paymentMethod === "dinheiro" && formData.needsChange && !formData.changeAmount) {
      toast.error("Informe o valor para o troco");
      return;
    }

    if (!savedCartId) {
      toast.error("Erro: carrinho não encontrado");
      return;
    }

    setLoading(true);

    try {
      // Obter o client_id do carrinho
      const { data: cart } = await supabase
        .from("carts")
        .select("client_id")
        .eq("id", savedCartId)
        .single();

      if (!cart) throw new Error("Carrinho não encontrado");

      // Criar pedido
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          cart_id: savedCartId,
          client_id: cart.client_id,
          restaurant_id: restaurantId,
          total_amount: total,
          status: "pending",
          payment_method: formData.paymentMethod,
          needs_change: formData.needsChange,
          change_amount: formData.needsChange && formData.changeAmount ? parseFloat(formData.changeAmount) : null,
          notes: formData.notes || null,
        })
        .select("tracking_code")
        .single();

      if (orderError) throw orderError;

      // Salvar código de rastreamento
      setTrackingCode(newOrder?.tracking_code || null);

      // Limpar carrinho local
      if (guestCartId) {
        localStorage.removeItem(`cartItems_${guestCartId}`);
        localStorage.removeItem(`guestCart_${restaurantId}`);
      }

      toast.success("Pedido realizado com sucesso!");
      setStep('success');
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (step === 'data') return "Seus Dados para Entrega";
    if (step === 'payment') return "Forma de Pagamento";
    if (step === 'success') return "Pedido Realizado!";
    return "Item Adicionado ao Carrinho";
  };

  const handleCloseSuccess = () => {
    setStep('cart');
    setFormData({
      name: "",
      phone: "",
      address: "",
      paymentMethod: "",
      needsChange: false,
      changeAmount: "",
      notes: "",
    });
    setTrackingCode(null);
    onClose();
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        {step === 'cart' && (
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
        )}

        {step === 'data' && (
          <form onSubmit={handleDataSubmit} className="space-y-4">
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
              <Label htmlFor="phone">WhatsApp (DDD + número)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="85999998888"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                maxLength={11}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: 85999998888 (será salvo como +5585999998888)
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Sem cebola, ponto da carne mal passada, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" size="lg" className="w-full">
                Continuar
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep('cart')} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          </form>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value, needsChange: false, changeAmount: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentMethod === "dinheiro" && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="needsChange"
                    checked={formData.needsChange}
                    onChange={(e) => setFormData({ ...formData, needsChange: e.target.checked, changeAmount: "" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="needsChange" className="cursor-pointer">Preciso de troco</Label>
                </div>

                {formData.needsChange && (
                  <div className="space-y-2">
                    <Label htmlFor="changeAmount">Troco para quanto?</Label>
                    <Input
                      id="changeAmount"
                      type="number"
                      placeholder="Ex: 50"
                      value={formData.changeAmount}
                      onChange={(e) => setFormData({ ...formData, changeAmount: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleFinalSubmit} 
                size="lg" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Processando..." : "Confirmar Pedido"}
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep('data')} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Pedido Confirmado!</h3>
              <p className="text-sm text-muted-foreground">
                Seu pedido foi recebido e está sendo preparado
              </p>
            </div>

            {trackingCode && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">Código de Rastreamento:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-bold tracking-wider bg-background px-4 py-2 rounded border-2 border-primary">
                    {trackingCode}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Salve este código para acompanhar seu pedido
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Você receberá atualizações sobre o status do seu pedido
              </p>
              <Button onClick={handleCloseSuccess} size="lg" className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
