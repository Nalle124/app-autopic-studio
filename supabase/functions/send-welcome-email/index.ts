import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[WELCOME-EMAIL] Function started");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, name }: WelcomeEmailRequest = await req.json();
    
    console.log("[WELCOME-EMAIL] Sending to:", email, "Name:", name);

    if (!email) {
      throw new Error("Email is required");
    }

    const displayName = name || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: "AutoPic <onboarding@resend.dev>",
      to: [email],
      subject: "Välkommen till AutoPic! 🚗",
      html: `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Välkommen till AutoPic</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 40px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">AutoPic</h1>
              <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 14px;">Professionella bilbilder på sekunder</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 24px; font-weight: 600;">
                Välkommen, ${displayName}! 👋
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Tack för att du skapade ett konto hos AutoPic. Nu kan du enkelt skapa professionella bilbilder med AI-driven bakgrundsbyte.
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #18181b; font-size: 16px; font-weight: 600;">
                  Kom igång snabbt:
                </h3>
                <ol style="margin: 0; padding-left: 20px; color: #52525b; font-size: 14px; line-height: 1.8;">
                  <li>Ladda upp en bild på din bil</li>
                  <li>Välj en av våra professionella bakgrunder</li>
                  <li>Ladda ner din färdiga bild</li>
                </ol>
              </div>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://app.autopic.studio" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Gå till AutoPic →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 12px 0; color: #71717a; font-size: 14px;">
                Har du frågor? Kontakta oss gärna!
              </p>
              <div style="margin-bottom: 16px;">
                <a href="https://instagram.com/autopic.studio" style="display: inline-block; margin: 0 8px; color: #52525b; text-decoration: none; font-size: 13px;">Instagram</a>
                <span style="color: #d4d4d8;">•</span>
                <a href="https://linkedin.com/company/autopic" style="display: inline-block; margin: 0 8px; color: #52525b; text-decoration: none; font-size: 13px;">LinkedIn</a>
              </div>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
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
      `,
    });

    console.log("[WELCOME-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
