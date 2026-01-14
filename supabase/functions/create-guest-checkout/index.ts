import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GUEST-CHECKOUT] ${step}${detailsStr}`);
};

// Valid price IDs mapped to plan names for validation
const VALID_PRICE_IDS: Record<string, string> = {
  "price_1SbV8AR5EFc7nWvhDcyFNiMe": "start",
  "price_1SbV94R5EFc7nWvhHlWgPKsp": "pro",
  "price_1SbV9KR5EFc7nWvhAvP0jDbX": "business",
  "price_1SbV9dR5EFc7nWvhOwgnPGX0": "creditPack",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { priceId, mode } = await req.json();
    
    // Validate priceId
    if (!priceId || typeof priceId !== 'string') {
      return new Response(JSON.stringify({ error: "Price ID is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate against known price IDs
    if (!VALID_PRICE_IDS[priceId]) {
      return new Response(JSON.stringify({ error: "Invalid price ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate mode if provided
    const validModes = ['subscription', 'payment'];
    if (mode && !validModes.includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode. Must be 'subscription' or 'payment'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Request params", { priceId, mode, plan: VALID_PRICE_IDS[priceId] });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://app-autopic-studio.lovable.app";

    // Create checkout session for guest (no customer_email - Stripe will collect it)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode || "subscription",
      success_url: `${origin}/signup-after-payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      // Guest checkout - Stripe will collect email
      customer_creation: mode === 'payment' ? 'always' : undefined,
      metadata: {
        guest_checkout: 'true',
        plan: VALID_PRICE_IDS[priceId],
      },
    });

    logStep("Guest checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
