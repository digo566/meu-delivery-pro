import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
    };

    // ========== CHECK SUBSCRIPTION STATUS ==========
    if (action === "check-status") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!subscription) {
        return new Response(
          JSON.stringify({ status: "none", subscription: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If has asaas subscription, check latest payment status
      if (subscription.asaas_subscription_id) {
        try {
          const paymentsRes = await fetch(
            `${ASAAS_API_URL}/subscriptions/${subscription.asaas_subscription_id}/payments?limit=1&sort=dueDate&order=desc`,
            { headers: asaasHeaders }
          );
          const paymentsData = await paymentsRes.json();

          if (paymentsData.data && paymentsData.data.length > 0) {
            const latestPayment = paymentsData.data[0];
            const paymentStatus = latestPayment.status;

            // Update local status based on payment
            let newStatus = subscription.status;
            if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(paymentStatus)) {
              newStatus = "active";
            } else if (paymentStatus === "OVERDUE") {
              newStatus = "overdue";
            } else if (paymentStatus === "PENDING") {
              newStatus = "pending_payment";
            }

            if (newStatus !== subscription.status) {
              await supabase
                .from("subscriptions")
                .update({ status: newStatus })
                .eq("id", subscription.id);
            }

            return new Response(
              JSON.stringify({
                status: newStatus,
                subscription: { ...subscription, status: newStatus },
                latestPayment,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (e) {
          console.error("Error checking Asaas payment status:", e);
        }
      }

      return new Response(
        JSON.stringify({ status: subscription.status, subscription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CREATE SUBSCRIPTION ==========
    if (action === "create-subscription") {
      const { name, cpfCnpj, email, phone, billingType } = body;

      // Validate inputs
      if (!name || !cpfCnpj || !email || !billingType) {
        return new Response(
          JSON.stringify({ error: "Dados obrigatórios: nome, CPF/CNPJ, email e forma de pagamento" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");
      if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
        return new Response(
          JSON.stringify({ error: "CPF/CNPJ inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validBillingTypes = ["PIX", "CREDIT_CARD", "BOLETO"];
      if (!validBillingTypes.includes(billingType)) {
        return new Response(
          JSON.stringify({ error: "Forma de pagamento inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let asaasCustomerId = existingSub?.asaas_customer_id;

      // Step 1: Create or get Asaas customer
      if (!asaasCustomerId) {
        const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify({
            name,
            cpfCnpj: cleanCpfCnpj,
            email,
            mobilePhone: phone?.replace(/\D/g, "") || undefined,
            externalReference: user.id,
          }),
        });

        const customerData = await customerRes.json();
        if (!customerRes.ok) {
          console.error("Asaas customer creation failed:", customerData);
          return new Response(
            JSON.stringify({ error: customerData.errors?.[0]?.description || "Erro ao criar cliente no Asaas" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        asaasCustomerId = customerData.id;
      }

      // Step 2: Create subscription
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDueDate = tomorrow.toISOString().split("T")[0];

      const subscriptionPayload: Record<string, unknown> = {
        customer: asaasCustomerId,
        billingType,
        value: 1.00, // R$1.00 for testing
        nextDueDate,
        cycle: "MONTHLY",
        description: "Assinatura Grape - Plano Profissional",
      };

      // For credit card, add card info
      if (billingType === "CREDIT_CARD" && body.creditCard) {
        subscriptionPayload.creditCard = {
          holderName: body.creditCard.holderName,
          number: body.creditCard.number,
          expiryMonth: body.creditCard.expiryMonth,
          expiryYear: body.creditCard.expiryYear,
          ccv: body.creditCard.ccv,
        };
        subscriptionPayload.creditCardHolderInfo = {
          name,
          email,
          cpfCnpj: cleanCpfCnpj,
          phone: phone?.replace(/\D/g, "") || undefined,
          postalCode: body.postalCode?.replace(/\D/g, "") || undefined,
          addressNumber: body.addressNumber || undefined,
        };
      }

      const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(subscriptionPayload),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        console.error("Asaas subscription creation failed:", subData);
        return new Response(
          JSON.stringify({ error: subData.errors?.[0]?.description || "Erro ao criar assinatura" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 3: Save subscription locally
      const subscriptionData = {
        user_id: user.id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subData.id,
        status: billingType === "CREDIT_CARD" ? "active" : "pending_payment",
        billing_type: billingType,
        value: 1.00,
        cycle: "MONTHLY",
        next_due_date: nextDueDate,
      };

      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update(subscriptionData)
          .eq("id", existingSub.id);
      } else {
        await supabase
          .from("subscriptions")
          .insert(subscriptionData);
      }

      // Step 4: Get payment info (PIX QR code, boleto URL, etc.)
      let paymentInfo = null;
      try {
        const paymentsRes = await fetch(
          `${ASAAS_API_URL}/subscriptions/${subData.id}/payments?limit=1`,
          { headers: asaasHeaders }
        );
        const paymentsData = await paymentsRes.json();

        if (paymentsData.data && paymentsData.data.length > 0) {
          const paymentId = paymentsData.data[0].id;

          if (billingType === "PIX") {
            const pixRes = await fetch(
              `${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`,
              { headers: asaasHeaders }
            );
            const pixData = await pixRes.json();
            paymentInfo = {
              type: "PIX",
              qrCode: pixData.encodedImage,
              copyPaste: pixData.payload,
              expirationDate: pixData.expirationDate,
            };
          } else if (billingType === "BOLETO") {
            const boletoRes = await fetch(
              `${ASAAS_API_URL}/payments/${paymentId}/identificationField`,
              { headers: asaasHeaders }
            );
            const boletoData = await boletoRes.json();
            paymentInfo = {
              type: "BOLETO",
              identificationField: boletoData.identificationField,
              bankSlipUrl: paymentsData.data[0].bankSlipUrl,
            };
          } else if (billingType === "CREDIT_CARD") {
            paymentInfo = {
              type: "CREDIT_CARD",
              status: paymentsData.data[0].status,
            };
          }
        }
      } catch (e) {
        console.error("Error getting payment info:", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscriptionId: subData.id,
          paymentInfo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Subscription error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar assinatura" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
