import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

// Product to credits mapping
const PRODUCT_CREDITS: Record<string, number> = {
  "prod_TYctfRKGdxjyIo": 100, // Starter subscription
  "prod_TYcu2RNAGGthF9": 300, // Professional subscription
  "prod_TYcuc2xBrRbgIR": 600, // Business subscription
  "prod_TYcuBp46lGYZDL": 30,  // One-time credit pack
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

    const { sessionId } = await req.json();
    
    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: "Session ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate Stripe session ID format (starts with cs_)
    if (!sessionId.startsWith('cs_') || sessionId.length < 10 || sessionId.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid session ID format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Session ID received", { sessionId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product', 'subscription'],
    });
    logStep("Session retrieved", { status: session.payment_status, mode: session.mode });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get product ID to determine credits
    const lineItem = session.line_items?.data[0];
    const productId = (lineItem?.price?.product as Stripe.Product)?.id;
    const creditsToAdd = productId ? PRODUCT_CREDITS[productId] || 0 : 0;
    logStep("Credits to add", { productId, creditsToAdd });

    if (creditsToAdd > 0) {
      // Get current credits
      const { data: currentCredits, error: creditsError } = await supabaseClient
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        throw new Error(`Error fetching credits: ${creditsError.message}`);
      }

      const currentBalance = currentCredits?.credits || 0;
      const newBalance = currentBalance + creditsToAdd;

      // Update credits
      const { error: updateError } = await supabaseClient
        .from('user_credits')
        .upsert({
          user_id: user.id,
          credits: newBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) {
        throw new Error(`Error updating credits: ${updateError.message}`);
      }

      // Log transaction
      const { error: transactionError } = await supabaseClient
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: creditsToAdd,
          balance_after: newBalance,
          transaction_type: session.mode === 'subscription' ? 'subscription' : 'purchase',
          description: session.mode === 'subscription' 
            ? `Prenumeration: ${creditsToAdd} credits` 
            : `Engångsköp: ${creditsToAdd} credits`
        });

      if (transactionError) {
        logStep("Transaction log error", { error: transactionError.message });
      }

      logStep("Credits updated", { previousBalance: currentBalance, newBalance, creditsAdded: creditsToAdd });

      // Send payment confirmation email
      try {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile?.email) {
          const emailPayload = {
            email: profile.email,
            name: profile.full_name || profile.email.split('@')[0],
            amount: session.amount_total || 0,
            credits: creditsToAdd,
            transactionId: session.id
          };

          // Call the send-payment-confirmation function
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
          
          await fetch(`${supabaseUrl}/functions/v1/send-payment-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify(emailPayload)
          });
          
          logStep("Payment confirmation email sent", { email: profile.email });
        }
      } catch (emailError) {
        logStep("Email sending error (non-blocking)", { error: String(emailError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      credits_added: creditsToAdd,
      mode: session.mode
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
