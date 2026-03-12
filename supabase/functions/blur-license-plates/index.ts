import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const BLUR_PROMPTS: Record<string, string> = {
  'blur-dark': 'Find ALL license plates in this image (front and rear) and cover them with a solid dark/black rectangle that completely hides the ENTIRE plate — including all text, borders, and frame. The cover must extend over the full rectangular plate surface. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT add any logos, watermarks, or text anywhere else on the image. Only cover the license plate area(s). The cover should look clean, using dark grey/black. Keep everything else pixel-perfect identical.',
  'blur-light': 'Find ALL license plates in this image (front and rear) and cover them with a solid light/white rectangle that completely hides the ENTIRE plate — including all text, borders, and frame. The cover must extend over the full rectangular plate surface. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT add any logos, watermarks, or text anywhere else on the image. Only cover the license plate area(s). The cover should look clean, using light grey/white. Keep everything else pixel-perfect identical.',
  'logo': 'Find ALL license plates in this image (front and rear) and cover them with the provided logo, centered and scaled to fit the ENTIRE plate surface including borders and frame. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT place the logo anywhere else on the image - ONLY on the license plate(s). Keep everything else pixel-perfect identical.',
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, style, logoBase64, width, height } = await req.json();

    if (!imageBase64) throw new Error("imageBase64 is required");
    if (!style) throw new Error("style is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization");
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Deduct credit
    const { data: newBalance, error: creditError } = await supabase.rpc("decrement_credits", { p_user_id: user.id });
    if (creditError) {
      console.error("Credit error:", creditError);
      return new Response(JSON.stringify({ error: "Otillräckliga krediter" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`Credit deducted for plate blur. New balance: ${newBalance}`);

    const prompt = BLUR_PROMPTS[style] || BLUR_PROMPTS['blur-dark'];
    const dimNote = width && height
      ? ` CRITICAL DIMENSION RULE: The input image is ${width}x${height} pixels. Output MUST be EXACTLY ${width}x${height} pixels.`
      : '';

    // If logo style but logo is SVG, fall back to blur-dark since AI can't process SVGs
    let effectiveStyle = style;
    let effectiveLogoBase64 = logoBase64;
    if (style === 'logo' && logoBase64 && logoBase64.includes('image/svg')) {
      console.log("Logo is SVG format, falling back to blur-dark style (AI cannot process SVG)");
      effectiveStyle = 'blur-dark';
      effectiveLogoBase64 = null;
    }

    const effectivePrompt = BLUR_PROMPTS[effectiveStyle] || BLUR_PROMPTS['blur-dark'];

    const userContent: any[] = [
      { type: "text", text: effectivePrompt + dimNote },
      { type: "image_url", image_url: { url: imageBase64 } },
    ];

    // Only add logo if it's a raster image (PNG/JPEG), not SVG
    if (effectiveStyle === 'logo' && effectiveLogoBase64 && !effectiveLogoBase64.includes('image/svg')) {
      userContent.push({ type: "image_url", image_url: { url: effectiveLogoBase64 } });
    }

    const messages = [
      {
        role: "system",
        content: `You are an image editing assistant. You MUST preserve the exact input image dimensions. Never change resolution, aspect ratio, or crop.`,
      },
      { role: "user", content: userContent },
    ];

    console.log(`Blur plates: style=${effectiveStyle} (original: ${style}), sending to AI gateway`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    let imageUrl: string | null = null;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image_url") {
          imageUrl = part.image_url?.url;
          break;
        }
      }
    } else if (typeof content === "string" && content.startsWith("data:image")) {
      imageUrl = content;
    }

    if (!imageUrl) {
      console.error("No image in AI response");
      throw new Error("AI did not return an image");
    }

    console.log("Plate blur successful");

    return new Response(
      JSON.stringify({ success: true, imageUrl, newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Blur plates error:", error);
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
