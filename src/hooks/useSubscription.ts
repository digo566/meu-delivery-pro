import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  status: string;
  billing_type: string | null;
  value: number;
  next_due_date: string | null;
  asaas_subscription_id: string | null;
}

interface SubscriptionState {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  checkSubscription: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const checkSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("asaas-subscription", {
        body: { action: "check-status" },
      });

      if (error) throw error;

      setSubscription(data?.subscription || null);
      setHasActiveSubscription(data?.status === "active");
    } catch (err) {
      console.error("Error checking subscription:", err);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  return { loading, hasActiveSubscription, subscription, checkSubscription };
}
