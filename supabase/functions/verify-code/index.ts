import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface VerifyRequest {
  email: string;
  code: string;
}

const MAX_ATTEMPTS = 5;

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required", valid: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the verification code record
    const { data: codeRecord, error: fetchError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (fetchError || !codeRecord) {
      return new Response(
        JSON.stringify({ 
          error: "Ingen verifieringskod hittades. Begär en ny kod.", 
          valid: false 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if too many attempts
    if (codeRecord.attempts >= MAX_ATTEMPTS) {
      // Delete the code
      await supabase
        .from("verification_codes")
        .delete()
        .eq("email", email.toLowerCase());

      return new Response(
        JSON.stringify({ 
          error: "För många försök. Begär en ny kod.", 
          valid: false,
          tooManyAttempts: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    if (new Date(codeRecord.expires_at) < new Date()) {
      // Delete expired code
      await supabase
        .from("verification_codes")
        .delete()
        .eq("email", email.toLowerCase());

      return new Response(
        JSON.stringify({ 
          error: "Koden har gått ut. Begär en ny kod.", 
          valid: false,
          expired: true
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if code matches
    if (codeRecord.code !== code) {
      // Increment attempts
      await supabase
        .from("verification_codes")
        .update({ attempts: codeRecord.attempts + 1 })
        .eq("email", email.toLowerCase());

      const remainingAttempts = MAX_ATTEMPTS - codeRecord.attempts - 1;

      return new Response(
        JSON.stringify({ 
          error: `Fel kod. ${remainingAttempts} försök kvar.`, 
          valid: false,
          remainingAttempts
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code is valid! Delete it so it can't be reused
    await supabase
      .from("verification_codes")
      .delete()
      .eq("email", email.toLowerCase());

    return new Response(
      JSON.stringify({ valid: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code:", error);
    return new Response(
      JSON.stringify({ error: error.message, valid: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
