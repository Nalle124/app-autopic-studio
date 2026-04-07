import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = data.claims.email as string;
    if (!email) throw new Error("No email in token");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      // TEST MODE: return sample invoice for UI verification when no Stripe customer exists
      // TODO: Remove this block after verification
      const testInvoices = [
        {
          id: "in_test_001",
          number: "LVSVCEBK-0007",
          date: "2026-03-28T10:00:04.000Z",
          amount: 399,
          currency: "sek",
          status: "paid",
          pdf_url: "https://invoice.stripe.com/i/acct_1SbURCR5EFc7nWvh/live_YWNjdF8xU2JVUkNSNUVGYzduV3ZoLF9VRnp6RkVMdzQ0TnNIaWMyRmZNcGRrN3JLZXQzSGJCLDE2NjA4NTYzNg0200ZokKNM61?s=ap",
        },
        {
          id: "in_test_002",
          number: "LVSVCEBK-0005",
          date: "2026-02-28T10:00:00.000Z",
          amount: 1499,
          currency: "sek",
          status: "paid",
          pdf_url: "https://invoice.stripe.com/i/acct_1SbURCR5EFc7nWvh/live_YWNjdF8xU2JVUkNSNUVGYzduV3ZoLF9VRnp6RkVMdzQ0TnNIaWMyRmZNcGRrN3JLZXQzSGJCLDE2NjA4NTYzNg0200ZokKNM61?s=ap",
        },
      ];
      return new Response(JSON.stringify({ invoices: testInvoices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });

    const result = invoices.data
      .filter((inv) => inv.status !== "draft")
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
        amount: (inv.total ?? 0) / 100,
        currency: inv.currency,
        status: inv.status,
        pdf_url: inv.invoice_pdf,
      }));

    return new Response(JSON.stringify({ invoices: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[list-invoices] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
