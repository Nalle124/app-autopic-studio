import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfirmationRequest {
  email: string;
  name: string;
  amount: number;
  credits: number;
  transactionId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[PAYMENT-CONFIRMATION] Function started");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, credits, transactionId }: PaymentConfirmationRequest = await req.json();
    
    console.log("[PAYMENT-CONFIRMATION] Sending to:", email, "Amount:", amount, "Credits:", credits);

    if (!email) {
      throw new Error("Email is required");
    }

    const displayName = name || email.split('@')[0];
    const formattedAmount = new Intl.NumberFormat('sv-SE', { 
      style: 'currency', 
      currency: 'SEK' 
    }).format(amount / 100);
    const date = new Date().toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailResponse = await resend.emails.send({
      from: "AutoPic <hej@autopic.studio>",
      to: [email],
      subject: `Betalningsbekräftelse - ${formattedAmount}`,
      html: `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betalningsbekräftelse</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1615;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #231f1e; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(139, 75, 75, 0.15);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #231f1e 0%, #2d2524 50%, #1e1a19 100%); padding: 40px 40px; text-align: center;">
              <img src="https://autopic.studio/logo-white.png" alt="AutoPic" style="height: 48px; margin-bottom: 12px;" onerror="this.style.display='none'"/>
              <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Betalningsbekräftelse</p>
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center;">
              <div style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; width: 64px; height: 64px; line-height: 64px;">
                <span style="color: #ffffff; font-size: 32px;">✓</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; font-weight: 600; text-align: center;">
                Tack för din betalning!
              </h2>
              
              <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; text-align: center;">
                Hej ${displayName}, din betalning har genomförts.
              </p>
              
              <!-- Receipt Box -->
              <div style="background-color: rgba(139, 75, 75, 0.1); border: 1px solid rgba(139, 75, 75, 0.25); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 14px;">Datum</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 500;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 14px;">Produkt</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 14px; text-align: right; font-weight: 500;">${credits} credits</td>
                  </tr>
                  ${transactionId ? `
                  <tr>
                    <td style="padding: 8px 0; color: rgba(255,255,255,0.5); font-size: 14px;">Referens</td>
                    <td style="padding: 8px 0; color: rgba(255,255,255,0.7); font-size: 12px; text-align: right; font-family: monospace;">${transactionId.slice(0, 16)}...</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0; border-top: 1px solid rgba(139, 75, 75, 0.25);"></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Totalt</td>
                    <td style="padding: 8px 0; color: #ffffff; font-size: 16px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 24px 0; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6; text-align: center;">
                Dina credits är nu tillgängliga på ditt konto och redo att användas.
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="https://autopic.studio" style="display: inline-block; background: linear-gradient(135deg, #8B4A4A 0%, #a05555 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Börja skapa bilder →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: rgba(0,0,0,0.3); padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 12px 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                Spara detta mail som kvitto.
              </p>
              <div style="margin-bottom: 16px;">
                <a href="https://instagram.com/autopic.studio" style="display: inline-block; margin: 0 8px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px;">Instagram</a>
                <span style="color: rgba(255,255,255,0.3);">•</span>
                <a href="https://linkedin.com/company/autopic" style="display: inline-block; margin: 0 8px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 13px;">LinkedIn</a>
              </div>
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px;">
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

    console.log("[PAYMENT-CONFIRMATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[PAYMENT-CONFIRMATION] Error:", error);
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
