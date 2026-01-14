import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadData {
  email: string;
  name?: string;
  phone?: string;
  company_name?: string;
  customer_type?: string;
  referral_source?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  organization_number?: string;
  stage: 'signup' | 'onboarding_complete';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: LeadData = await req.json();
    const { email, name, phone, company_name, customer_type, referral_source, address, city, postal_code, organization_number, stage } = data;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
    const isOnboardingComplete = stage === 'onboarding_complete';
    
    const subject = isOnboardingComplete 
      ? `✅ Onboarding klar: ${email}`
      : `🆕 Ny registrering: ${email}`;

    // Build HTML content based on stage
    let htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4a5568 0%, #1a1a1a 50%, #c2703a 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            ${isOnboardingComplete ? '✅ Onboarding slutförd' : '🆕 Ny registrering'}
          </h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 140px;">Email:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${email}</td>
            </tr>
            ${name ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Namn:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${name}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Tid:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Status:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                <span style="background: ${isOnboardingComplete ? '#22c55e' : '#3b82f6'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;">
                  ${isOnboardingComplete ? 'Onboarding klar' : 'Ny signup'}
                </span>
              </td>
            </tr>
    `;

    // Add additional fields for onboarding complete
    if (isOnboardingComplete) {
      if (phone) {
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Telefon:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${phone}</td>
            </tr>
        `;
      }
      if (company_name) {
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Företag:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${company_name}</td>
            </tr>
        `;
      }
      if (organization_number) {
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Org.nr:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${organization_number}</td>
            </tr>
        `;
      }
      if (customer_type) {
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Kundtyp:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${customer_type}</td>
            </tr>
        `;
      }
      if (referral_source) {
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Källa:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${referral_source}</td>
            </tr>
        `;
      }
      if (address || city || postal_code) {
        const fullAddress = [address, postal_code, city].filter(Boolean).join(', ');
        htmlContent += `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600;">Adress:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">${fullAddress}</td>
            </tr>
        `;
      }
    }

    htmlContent += `
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
          AutoPic Lead Notification
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "AutoPic <hej@autopic.studio>",
      to: ["jacob@autopic.studio"],
      subject: subject,
      html: htmlContent,
    });

    console.log("Lead notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-new-lead function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
