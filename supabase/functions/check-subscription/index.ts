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

      // Monthly credit RESET mechanism (credits are REPLACED, not accumulated)
      // Uses current_period_end as the period identifier (always exists)
      // This only triggers when the billing period changes (monthly renewal)
      const periodEndTimestamp = subscription.current_period_end;
      const periodKey = `${subscription.id}:${periodEndTimestamp}`;

      if (creditsPerMonth > 0) {
        // Check if we already applied credits for this billing period
        const { data: existingReset } = await supabaseClient
          .from('credit_transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('transaction_type', 'subscription_renewal')
          .eq('description', periodKey)
          .maybeSingle();

        // Also check if this is a NEW subscription (handled by verify-payment)
        // A new subscription will have a 'subscription' transaction from verify-payment
        const { data: recentSubscription } = await supabaseClient
          .from('credit_transactions')
          .select('id, created_at')
          .eq('user_id', user.id)
          .eq('transaction_type', 'subscription')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // If subscription was just created (within 5 minutes), don't reset credits
        // verify-payment already set the credits correctly
        const isNewSubscription = recentSubscription && 
          (Date.now() - new Date(recentSubscription.created_at).getTime() < 5 * 60 * 1000);

        if (!existingReset && !isNewSubscription) {
          // Get current balance to check for recent purchases
          const { data: currentCredits } = await supabaseClient
            .from('user_credits')
            .select('credits')
            .eq('user_id', user.id)
            .single();

          // Check if user bought additional credits recently (within last hour)
          // We don't want to lose those on renewal
          const { data: recentPurchase } = await supabaseClient
            .from('credit_transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'purchase')
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .maybeSingle();

          // Calculate new balance
          // If recent purchase exists, add those credits on top of plan credits
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
              description: periodKey,  // Use periodKey for idempotency
            });

          logStep('Monthly credits reset', { creditsPerMonth, newBalance, periodKey });
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
