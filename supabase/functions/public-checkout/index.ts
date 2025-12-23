import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  step: "save-data" | "finalize";
  restaurantId: string;
  // Step 1: save-data
  name?: string;
  phone?: string;
  address?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedOptions?: Array<{
      optionItemId: string;
      optionItemName: string;
      priceModifier: number;
    }>;
  }>;
  // Step 2: finalize
  cartId?: string;
  paymentMethod?: string;
  needsChange?: boolean;
  changeAmount?: number | null;
  notes?: string;
  totalAmount?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CheckoutRequest = await req.json();

    if (body.step === "save-data") {
      // Validate required fields
      if (!body.name || !body.phone || !body.address || !body.restaurantId || !body.items?.length) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format phone to WhatsApp standard
      const cleanPhone = body.phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? `+${cleanPhone}` : `+55${cleanPhone}`;

      // Check if client exists
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", formattedPhone)
        .eq("restaurant_id", body.restaurantId)
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        clientId = existingClient.id;
        // Update client data
        await supabase
          .from("clients")
          .update({ name: body.name, address: body.address })
          .eq("id", clientId);
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            name: body.name,
            phone: formattedPhone,
            address: body.address,
            restaurant_id: body.restaurantId,
            is_registered: false,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create cart
      const { data: newCart, error: cartError } = await supabase
        .from("carts")
        .insert({
          client_id: clientId,
          restaurant_id: body.restaurantId,
          is_abandoned: false,
        })
        .select()
        .single();

      if (cartError) throw cartError;

      // Insert cart items
      const cartItems = body.items.map((item) => ({
        cart_id: newCart.id,
        product_id: item.id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("cart_items")
        .insert(cartItems);

      if (itemsError) throw itemsError;

      return new Response(
        JSON.stringify({ success: true, cartId: newCart.id, clientId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.step === "finalize") {
      // Validate required fields
      if (!body.cartId || !body.paymentMethod || !body.restaurantId || body.totalAmount === undefined) {
        return new Response(
          JSON.stringify({ error: "Dados incompletos para finalizar" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get cart to retrieve client_id
      const { data: cart, error: cartFetchError } = await supabase
        .from("carts")
        .select("client_id")
        .eq("id", body.cartId)
        .single();

      if (cartFetchError || !cart) {
        return new Response(
          JSON.stringify({ error: "Carrinho não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          cart_id: body.cartId,
          client_id: cart.client_id,
          restaurant_id: body.restaurantId,
          total_amount: body.totalAmount,
          status: "pending",
          payment_method: body.paymentMethod,
          needs_change: body.needsChange || false,
          change_amount: body.changeAmount || null,
          notes: body.notes || null,
        })
        .select("id, tracking_code")
        .single();

      if (orderError) throw orderError;

      // Get cart items to create order items
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("product_id, quantity")
        .eq("cart_id", body.cartId);

      if (cartItems && cartItems.length > 0) {
        // Get product prices
        const productIds = cartItems.map(item => item.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("id, price")
          .in("id", productIds);

        const productPrices = new Map(products?.map(p => [p.id, p.price]) || []);

        // Create order items
        const orderItems = cartItems.map(item => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: productPrices.get(item.product_id) || 0,
          subtotal: (productPrices.get(item.product_id) || 0) * item.quantity,
        }));

        await supabase.from("order_items").insert(orderItems);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: newOrder.id, 
          trackingCode: newOrder.tracking_code 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Step inválido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar checkout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
