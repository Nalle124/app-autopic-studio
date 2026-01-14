import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "AutoPic <hej@autopic.studio>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  name?: string;
}

// Generate a random 4-digit code
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: VerificationRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 4-digit code
    const code = generateCode();
    
    // Store code in Supabase with expiry (10 minutes)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete any existing codes for this email
    await supabase
      .from("verification_codes")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const { error: insertError } = await supabase
      .from("verification_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    if (insertError) {
      console.error("Error storing verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Could not generate verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with code
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">AutoPic</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 22px; font-weight: 600; text-align: center;">
                      ${name ? `Hej ${name}!` : 'Hej!'}
                    </h2>
                    <p style="margin: 0 0 32px 0; color: #52525b; font-size: 16px; line-height: 1.5; text-align: center;">
                      Här är din verifieringskod för att slutföra registreringen:
                    </p>
                    
                    <!-- Code Box -->
                    <div style="background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                      <span style="font-family: 'SF Mono', SFMono-Regular, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #18181b;">
                        ${code}
                      </span>
                    </div>
                    
                    <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px; text-align: center;">
                      Koden är giltig i <strong>10 minuter</strong>.
                    </p>
                    <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                      Om du inte försökte skapa ett konto kan du ignorera detta mail.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} AutoPic. Alla rättigheter förbehållna.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(email, `Din verifieringskod: ${code}`, emailHtml);

    console.log("Verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
