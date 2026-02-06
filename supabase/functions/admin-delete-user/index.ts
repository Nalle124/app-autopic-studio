import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-DELETE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("No auth header");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Validate JWT by calling the auth endpoint directly
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      logStep("Auth validation failed", { status: authResponse.status, error: errText });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const callerUser = await authResponse.json();
    if (!callerUser?.id) {
      logStep("No user ID in auth response");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: callerUser.id, email: callerUser.email });

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: callerUser.id });
    if (!isAdmin) {
      logStep("Not admin", { userId: callerUser.id });
      return new Response(JSON.stringify({ error: "Not authorized - admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin verified", { adminId: callerUser.id });

    // Get target user ID from request body
    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Missing targetUserId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Prevent admin from deleting themselves
    if (targetUserId === callerUser.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get target user's email for Stripe lookup
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetError || !targetUser.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const targetEmail = targetUser.user.email;
    logStep("Target user found", { targetUserId, email: targetEmail });

    // Cancel Stripe subscriptions and delete customer
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && targetEmail) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        
        const customers = await stripe.customers.list({ email: targetEmail, limit: 100 });
        
        for (const customer of customers.data) {
          logStep("Processing Stripe customer", { customerId: customer.id });
          
          const subscriptions = await stripe.subscriptions.list({ customer: customer.id });
          
          for (const sub of subscriptions.data) {
            if (sub.status !== 'canceled') {
              try {
                await stripe.subscriptions.cancel(sub.id);
                logStep("Cancelled subscription", { subscriptionId: sub.id });
              } catch (e) {
                // Ignore errors for already canceled subs
              }
            }
          }
          
          await stripe.customers.del(customer.id);
          logStep("Deleted Stripe customer", { customerId: customer.id });
        }
        
        logStep("Stripe cleanup complete", { customersProcessed: customers.data.length });
      } catch (stripeError) {
        logStep("Stripe error (non-fatal)", { error: stripeError instanceof Error ? stripeError.message : stripeError });
      }
    }

    // Delete the user from Supabase (cascades to profiles, credits, etc.)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw deleteError;

    logStep("User deleted successfully", { targetUserId });

    return new Response(JSON.stringify({ success: true }), {
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
