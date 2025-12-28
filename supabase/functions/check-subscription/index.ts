import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  "prod_TYctfRKGdxjyIo": 100, // Starter
  "prod_TYcu2RNAGGthF9": 300, // Professional
  "prod_TYcuc2xBrRbgIR": 600, // Business
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header - returning unsubscribed");
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        plan_name: null,
        credits_per_month: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle invalid/expired tokens gracefully
    if (userError || !userData.user?.email) {
      logStep("Invalid token or no user - returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        plan_name: null,
        credits_per_month: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        product_id: null,
        subscription_end: null,
        plan_name: null,
        credits_per_month: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let planName = null;
    let creditsPerMonth = 0;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];

      // Safely parse subscription end date
      const periodEnd = subscription.current_period_end;
      if (periodEnd) {
        try {
          if (typeof periodEnd === 'number') {
            subscriptionEnd = new Date(periodEnd * 1000).toISOString();
          } else if (typeof periodEnd === 'string') {
            subscriptionEnd = new Date(periodEnd).toISOString();
          }
        } catch (e) {
          logStep("Warning: Could not parse subscription end date", { periodEnd });
        }
      }

      productId = subscription.items.data[0].price.product as string;
      creditsPerMonth = PRODUCT_CREDITS[productId] || 0;

      // Get plan name from product
      const product = await stripe.products.retrieve(productId);
      planName = product.name;

      // Monthly top-up WITHOUT webhooks:
      // On each check, ensure we only top up once per Stripe billing period.
      // We use credit_transactions as the idempotency store.
      const periodKey = `${subscription.id}:${subscription.current_period_start}`;
      const topupMarker = `sub_period:${periodKey}`;

      if (creditsPerMonth > 0) {
        const { data: existingTopup } = await supabaseClient
          .from('credit_transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('transaction_type', 'subscription_topup')
          .like('description', `%${topupMarker}%`)
          .limit(1);

        if (!existingTopup || existingTopup.length === 0) {
          const { data: currentCredits } = await supabaseClient
            .from('user_credits')
            .select('credits')
            .eq('user_id', user.id)
            .single();

          const currentBalance = currentCredits?.credits || 0;
          const newBalance = currentBalance + creditsPerMonth;

          await supabaseClient
            .from('user_credits')
            .upsert({
              user_id: user.id,
              credits: newBalance,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          await supabaseClient
            .from('credit_transactions')
            .insert({
              user_id: user.id,
              amount: creditsPerMonth,
              balance_after: newBalance,
              transaction_type: 'subscription_topup',
              description: `Månadspåfyllning: ${planName} (+${creditsPerMonth}) (${topupMarker})`,
            });

          logStep('Monthly top-up applied', { creditsPerMonth, newBalance, periodKey });
        }
      }

      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        productId,
        planName,
        creditsPerMonth,
        subscriptionEnd,
      });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      plan_name: planName,
      credits_per_month: creditsPerMonth
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
