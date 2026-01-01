import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-DELETE-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: userData.user.id });
    if (!isAdmin) throw new Error("Not authorized - admin only");

    logStep("Admin verified", { adminId: userData.user.id });

    // Get target user ID from request body
    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error("Missing targetUserId");

    // Prevent admin from deleting themselves
    if (targetUserId === userData.user.id) {
      throw new Error("Cannot delete your own account");
    }

    // Get target user's email for Stripe lookup
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetError || !targetUser.user) throw new Error("User not found");

    const targetEmail = targetUser.user.email;
    logStep("Target user found", { targetUserId, email: targetEmail });

    // Cancel Stripe subscriptions and delete customer
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && targetEmail) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        
        // Find all Stripe customers with this email
        const customers = await stripe.customers.list({ email: targetEmail, limit: 100 });
        
        for (const customer of customers.data) {
          logStep("Processing Stripe customer", { customerId: customer.id });
          
          // Cancel all active subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
          });
          
          for (const sub of subscriptions.data) {
            await stripe.subscriptions.cancel(sub.id);
            logStep("Cancelled subscription", { subscriptionId: sub.id });
          }
          
          // Also cancel any trialing/past_due subscriptions
          const otherSubs = await stripe.subscriptions.list({
            customer: customer.id,
          });
          
          for (const sub of otherSubs.data) {
            if (sub.status !== 'canceled') {
              try {
                await stripe.subscriptions.cancel(sub.id);
                logStep("Cancelled subscription", { subscriptionId: sub.id, status: sub.status });
              } catch (e) {
                // Ignore errors for already canceled subs
              }
            }
          }
          
          // Delete the Stripe customer entirely
          await stripe.customers.del(customer.id);
          logStep("Deleted Stripe customer", { customerId: customer.id });
        }
        
        logStep("Stripe cleanup complete", { customersProcessed: customers.data.length });
      } catch (stripeError) {
        // Log but don't fail the whole operation
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
      status: 400,
    });
  }
});
