import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface EmailDeliveryRequest {
  imageUrls: string[];
  projectName: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { imageUrls, projectName, email }: EmailDeliveryRequest = await req.json();

    if (!imageUrls?.length || !email) {
      throw new Error("imageUrls and email are required");
    }

    console.log(`[EMAIL-DELIVERY] Processing ${imageUrls.length} images for ${email}`);

    // Download all images and store them in Supabase storage
    const storedUrls: string[] = [];
    const timestamp = Date.now();
    const folderPath = `email-delivery/${user.id}/${timestamp}`;

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const response = await fetch(imageUrls[i]);
        if (!response.ok) continue;
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const ext = blob.type.includes("png") ? "png" : "jpg";
        const fileName = `${folderPath}/${projectName || "bild"}-${i + 1}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("processed-cars")
          .upload(fileName, uint8Array, {
            contentType: blob.type,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for image ${i}:`, uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("processed-cars")
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          storedUrls.push(urlData.publicUrl);
        }
      } catch (err) {
        console.error(`Failed to process image ${i}:`, err);
      }
    }

    if (storedUrls.length === 0) {
      throw new Error("No images could be processed");
    }

    // Generate download links HTML
    const imageListHtml = storedUrls
      .map((url, i) => `<li style="margin-bottom: 8px;"><a href="${url}" style="color: #4B6CB7; text-decoration: underline;">Bild ${i + 1}</a></li>`)
      .join("");

    // Send email with download links
    const { error: emailError } = await resend.emails.send({
      from: "AutoPic <hej@autopic.studio>",
      to: [email],
      subject: `Dina bilder är klara${projectName ? ` — ${projectName}` : ""}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">Dina bilder är klara!</h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
            ${storedUrls.length} bild${storedUrls.length !== 1 ? "er" : ""} har bearbetats${projectName ? ` för projektet <strong>${projectName}</strong>` : ""}.
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; font-weight: 500; color: #333; margin-bottom: 12px;">Ladda ner dina bilder:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${imageListHtml}
            </ul>
          </div>
          
          <p style="color: #999; font-size: 11px;">Länkarna är tillgängliga i 7 dagar. Logga in på <a href="https://app-autopic-studio.lovable.app" style="color: #4B6CB7;">AutoPic</a> för att se alla dina bilder.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("[EMAIL-DELIVERY] Resend error:", emailError);
      throw new Error("Could not send email");
    }

    console.log(`[EMAIL-DELIVERY] Email sent to ${email} with ${storedUrls.length} images`);

    return new Response(
      JSON.stringify({ success: true, imageCount: storedUrls.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[EMAIL-DELIVERY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
