import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Store } from "lucide-react";
import { toast } from "sonner";
import { CartModal } from "@/components/CartModal";

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

const PublicStore = () => {
  const { restaurantId } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [guestCartId, setGuestCartId] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId) {
      loadStoreData();
      loadGuestCart();
    }
  }, [restaurantId]);

  const loadGuestCart = () => {
    const savedCartId = localStorage.getItem(`guestCart_${restaurantId}`);
    if (savedCartId) {
      setGuestCartId(savedCartId);
      const savedItems = localStorage.getItem(`cartItems_${savedCartId}`);
      if (savedItems) {
        setCart(JSON.parse(savedItems));
      }
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
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da loja");
    } finally {
      setLoading(false);
    }
  };

  const createGuestCart = () => {
    const tempCartId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setGuestCartId(tempCartId);
    localStorage.setItem(`guestCart_${restaurantId}`, tempCartId);
    return tempCartId;
  };

  const addToCart = (product: Product) => {
    let cartId = guestCartId;
    
    if (!cartId) {
      cartId = createGuestCart();
    }

    const existingItem = cart.find(item => item.id === product.id);

    let updatedCart: CartItem[];
    if (existingItem) {
      updatedCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...cart, { ...product, quantity: 1 }];
    }

    setCart(updatedCart);
    localStorage.setItem(`cartItems_${cartId}`, JSON.stringify(updatedCart));
    setCartModalOpen(true);
    toast.success("Produto adicionado ao carrinho!");
  };

  const handleCheckout = () => {
    setCartModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (!restaurantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">
            A loja que você está procurando não existe ou não está mais disponível.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{restaurantInfo.restaurant_name}</h1>
                <p className="text-sm text-muted-foreground">{restaurantInfo.phone}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="relative"
              onClick={() => setCartModalOpen(true)}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Carrinho
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Nosso Cardápio</h2>
        
        {products.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted-foreground">
              Nenhum produto disponível no momento
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {product.image_url && (
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </span>
                    <Button onClick={() => addToCart(product)}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        onContinue={() => setCartModalOpen(false)}
        onCheckout={handleCheckout}
        items={cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))}
        restaurantId={restaurantId!}
        guestCartId={guestCartId}
      />
    </div>
  );
};

export default PublicStore;
