import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from JWT
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Prompt must be at least 3 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating scene image for user ${user.id}: "${prompt}"`);

    // Step 1: Generate the background image with Nano Banana
    const imageResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `Generate a high-quality professional automotive photography background scene based on this description: "${prompt}"

CRITICAL RULES:
- The image MUST be completely EMPTY — absolutely no vehicles, no cars, no people, no text, no watermarks, no objects in focus
- Create a realistic environment suitable as a backdrop for digitally placing a car
- Style: clean, professional, well-lit photography backdrop
- MUST be wide landscape orientation with EXACT 3:2 aspect ratio (like 1536x1024 or 3072x2048)
- The scene should look like a real photograph, NOT a 3D render or illustration
- Focus on creating natural lighting, realistic textures and depth
- Include a clear ground surface where a vehicle could be placed
- The image must be WIDE, not tall — think cinematic widescreen photography`,
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!imageResponse.ok) {
      const status = imageResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI-tjänsten är överbelastad just nu. Försök igen om en stund.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI-krediter slut. Kontakta support.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await imageResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const imageData = await imageResponse.json();
    const base64Image =
      imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!base64Image) {
      console.error("No image in response:", JSON.stringify(imageData).slice(0, 500));
      throw new Error("No image generated from AI");
    }

    // Step 2: Upload to Supabase Storage
    const imageId = crypto.randomUUID();
    const storagePath = `user-scenes/${user.id}/${imageId}.png`;

    // Convert base64 to binary
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) =>
      c.charCodeAt(0)
    );

    const { error: uploadError } = await supabase.storage
      .from("processed-cars")
      .upload(storagePath, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to save generated image");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("processed-cars").getPublicUrl(storagePath);

    // Step 3: Generate a matching PhotoRoom prompt and scene name using text AI
    const metaResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a metadata generator for automotive photography backgrounds. Given a user's scene description, generate:
1. A short Swedish name for the scene (2-4 words, like "Ljus Studio" or "Höstpark")
2. A short Swedish description (1 sentence)
3. A PhotoRoom-compatible AI prompt in English that describes how to place a car in this scene with matching lighting

Respond ONLY with valid JSON in this exact format:
{"name": "...", "description": "...", "photoroomPrompt": "Place the vehicle centered on the ground in ... Professional automotive photography with realistic lighting matching the environment."}`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    let suggestedName = "Min bakgrund";
    let description = prompt;
    let photoroomPrompt = `Place the vehicle centered on the ground in a scene matching this description: ${prompt}. Professional automotive photography with realistic lighting.`;

    if (metaResponse.ok) {
      try {
        const metaData = await metaResponse.json();
        const content = metaData.choices?.[0]?.message?.content || "";
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.name) suggestedName = parsed.name;
          if (parsed.description) description = parsed.description;
          if (parsed.photoroomPrompt) photoroomPrompt = parsed.photoroomPrompt;
        }
      } catch (e) {
        console.warn("Failed to parse meta response, using defaults:", e);
      }
    }

    console.log(`Scene generated: "${suggestedName}" -> ${publicUrl}`);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl,
        suggestedName,
        description,
        photoroomPrompt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-scene-image error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
