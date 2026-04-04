import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: userContent }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response (strip markdown fences if present)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Validate and fill defaults
    const validTypes = ["interior", "exterior", "detail"];
    const result: Record<string, string> = {};
    for (const img of images) {
      const val = classifications[img.id];
      result[img.id] = validTypes.includes(val) ? val : "exterior";
    }

    console.log(`Classified ${images.length} images for user ${user.id}`);

    return new Response(
      JSON.stringify({ classifications: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("classify-car-images error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
