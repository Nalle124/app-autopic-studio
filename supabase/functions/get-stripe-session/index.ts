import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-STRIPE-SESSION] ${step}${detailsStr}`);
};

// Product to credits mapping
const PRODUCT_CREDITS: Record<string, { credits: number; name: string }> = {
  "prod_TYcMOi23KMqOh6": { credits: 100, name: "Start" },
  "prod_TYcNnx01K8TR0F": { credits: 300, name: "Pro" },
  "prod_TYcO3bE3Ec2Amv": { credits: 600, name: "Business" },
  "prod_TYcOcv9ORqRLYH": { credits: 30, name: "Credit Pack" },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    
    // Validate Stripe session ID format
    if (!sessionId.startsWith('cs_') || sessionId.length < 10 || sessionId.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid session ID format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product'],
    });
    
    logStep("Session retrieved", { 
      status: session.payment_status, 
      email: session.customer_details?.email 
    });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        error: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const email = session.customer_details?.email || session.customer_email;
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: "No email found in session" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get product info
    const lineItem = session.line_items?.data[0];
    const productId = (lineItem?.price?.product as Stripe.Product)?.id;
    const productInfo = productId ? PRODUCT_CREDITS[productId] : null;

    return new Response(JSON.stringify({ 
      email,
      creditsToAdd: productInfo?.credits || 0,
      planName: productInfo?.name || 'Okänd plan',
      mode: session.mode,
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
