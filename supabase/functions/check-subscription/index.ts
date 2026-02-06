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

// Product to credits mapping - REAL product IDs
const PRODUCT_CREDITS: Record<string, number> = {
  "prod_TYcMOi23KMqOh6": 100, // Start (399 kr)
  "prod_TYcNnx01K8TR0F": 300, // Pro (699 kr)
  "prod_TYcO3bE3Ec2Amv": 600, // Business (1299 kr)
  "prod_TvOxn4SrvfgY12": 800, // Scale (1499 kr)
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use anon key for JWT validation (service role can cause session_id issues)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Service role client for database operations (bypasses RLS)
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

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
    
    // Validate JWT via direct HTTP call (avoids service role session_id issues)
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!authResponse.ok) {
      logStep("Invalid token - returning unsubscribed", { status: authResponse.status });
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

    const user = await authResponse.json();
    if (!user?.email) {
      logStep("No email found - returning unsubscribed");
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
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has manual access (for invoiced customers)
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('manual_access')
      .eq('id', user.id)
      .single();

    if (profileData?.manual_access) {
      logStep("User has manual access - granting full access");
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: 'manual_access',
        subscription_end: null,
        plan_name: 'Specialavtal',
        credits_per_month: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
      // In Stripe Basil API, current_period_end is on the item level, not subscription level
      const subscriptionItem = subscription.items.data[0];
      const periodEnd = (subscriptionItem as any).current_period_end ?? (subscription as any).current_period_end;
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

      productId = subscriptionItem.price.product as string;
      creditsPerMonth = PRODUCT_CREDITS[productId] || 0;

      // Get plan name from product
      const product = await stripe.products.retrieve(productId);
      planName = product.name;

      // Monthly credit RESET mechanism (credits are REPLACED, not accumulated)
      // Uses time-based idempotency: only one renewal per subscription per 28 days
      const periodKey = `${subscription.id}:${periodEnd || 'current'}`;

      if (creditsPerMonth > 0) {
        // Time-based idempotency: check if ANY renewal exists for this subscription
        // within the last 28 days (subscriptions are monthly, so this is safe)
        const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: existingResetRows } = await supabaseClient
          .from('credit_transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('transaction_type', 'subscription_renewal')
          .gte('created_at', twentyEightDaysAgo)
          .limit(1);

        const existingReset = existingResetRows && existingResetRows.length > 0 ? existingResetRows[0] : null;

        // Also check if this is a NEW subscription (handled by verify-payment)
        const { data: recentSubscriptionRows } = await supabaseClient
          .from('credit_transactions')
          .select('id, created_at')
          .eq('user_id', user.id)
          .eq('transaction_type', 'subscription')
          .order('created_at', { ascending: false })
          .limit(1);

        const recentSubscription = recentSubscriptionRows && recentSubscriptionRows.length > 0 ? recentSubscriptionRows[0] : null;

        // If subscription was just created (within 5 minutes), don't reset credits
        const isNewSubscription = recentSubscription && 
          (Date.now() - new Date(recentSubscription.created_at).getTime() < 5 * 60 * 1000);

        if (!existingReset && !isNewSubscription) {
          // Check if user bought additional credits recently (within last hour)
          const { data: recentPurchaseRows } = await supabaseClient
            .from('credit_transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'purchase')
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .limit(1);

          const recentPurchase = recentPurchaseRows && recentPurchaseRows.length > 0 ? recentPurchaseRows[0] : null;

          let newBalance = creditsPerMonth;
          if (recentPurchase) {
            newBalance = creditsPerMonth + recentPurchase.amount;
            logStep('Preserving recent purchase on renewal', { purchaseAmount: recentPurchase.amount });
          }

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
              transaction_type: 'subscription_renewal',
              description: periodKey,  // Still logged for debugging, but NOT used for idempotency
            });

          logStep('Monthly credits reset', { creditsPerMonth, newBalance, periodKey });
        } else if (existingReset) {
          logStep('Skipping reset - renewal already exists within last 28 days');
        } else if (isNewSubscription) {
          logStep('Skipping reset - new subscription just created by verify-payment');
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
