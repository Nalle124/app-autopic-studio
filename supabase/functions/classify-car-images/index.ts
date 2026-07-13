import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiChat, hasAiKey } from "../_shared/ai-chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { images } = await req.json();
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (images.length > 50) {
      return new Response(JSON.stringify({ error: "Max 50 images" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Classification only routes images; it must never fail the batch. If the
    // AI gateway is unavailable, we return an all-exterior fallback with 200.
    const validTypes = ["interior", "exterior", "detail"];
    const allExterior = () => {
      const r: Record<string, string> = {};
      for (const img of images) r[img.id] = "exterior";
      return r;
    };
    const degradedResponse = (reason: string) => {
      console.warn(`classify-car-images degraded (${reason}); defaulting to exterior`);
      return new Response(
        JSON.stringify({ classifications: allExterior(), degraded: true, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    };

    if (!hasAiKey()) {
      return degradedResponse("no_api_key");
    }

    // Build content array with all images for Gemini
    const userContent: any[] = [
      {
        type: "text",
        text: `You are a car photography classifier. For each image, classify it as exactly one of:
- "exterior": Shows the outside of a car (front, side, rear, full body)
- "interior": Shows the inside of a car (dashboard, seats, steering wheel, center console)
- "detail": Close-up of a specific part (wheels, headlights, badges, engine bay)

Return a JSON object with the image IDs as keys and classification as values.
The image IDs are: ${images.map((img: any) => img.id).join(", ")}

Return ONLY valid JSON, no markdown or explanation. Example:
{"id1": "exterior", "id2": "interior", "id3": "detail"}`,
      },
    ];

    // Add each image - validate and clean base64 data URLs
    for (const img of images) {
      let dataUrl = img.base64;
      
      // Ensure it's a valid data URL
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.warn(`Skipping image ${img.id}: no base64 data`);
        continue;
      }
      
      // Must start with data: prefix
      if (!dataUrl.startsWith('data:')) {
        // Try to wrap raw base64 as JPEG data URL
        dataUrl = `data:image/jpeg;base64,${dataUrl}`;
      }
      
      // Validate the data URL has proper structure: data:mime;base64,actualdata
      const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
      if (!match || match[2].trim().length < 100) {
        console.warn(`Skipping image ${img.id}: invalid or too-short data URL`);
        continue;
      }
      
      // Clean whitespace/newlines from base64 portion
      const cleanedBase64 = match[2].replace(/\s/g, '');
      dataUrl = `data:${match[1]};base64,${cleanedBase64}`;
      
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    const response = await aiChat({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: userContent }],
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // 402 (credits exhausted), 429 (rate limit) or anything else: never block
      // the batch — routing to exterior is a safe default for car photos.
      return degradedResponse(`gateway_${response.status}`);
    }

    let classifications: Record<string, unknown> = {};
    try {
      const aiData = await response.json();
      const rawText = aiData.choices?.[0]?.message?.content || "{}";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (parseErr) {
      return degradedResponse("parse_error");
    }

    // Validate and fill defaults
    const result: Record<string, string> = {};
    for (const img of images) {
      const val = classifications[img.id];
      result[img.id] = typeof val === "string" && validTypes.includes(val) ? val : "exterior";
    }

    console.log(`Classified ${images.length} images for user ${user.id}`);

    return new Response(
      JSON.stringify({ classifications: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Last-resort guard: still return a usable (all-exterior) result rather than
    // a 500 that blanks the generation screen. We can't see `images` here if the
    // body failed to parse, so return an empty map — the client defaults to exterior.
    console.error("classify-car-images error:", error);
    return new Response(
      JSON.stringify({ classifications: {}, degraded: true, reason: "exception" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
