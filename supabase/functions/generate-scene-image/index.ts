import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKGROUND_SYSTEM_PROMPT = `You are an AI that generates professional automotive photography background scenes. You MUST produce a new image with every response. Never respond with only text. NEVER use emojis in your text responses.

PURPOSE: These images are used as BACKGROUNDS for digitally placing car photos onto. The car will be cut out from its original photo and composited onto this background. Therefore the perspective, ground surface, and lighting must be suitable for this purpose.

ABSOLUTE RULES FOR EVERY IMAGE:
1. EMPTY SCENE — No vehicles, no cars, no motorcycles, no people, no animals, no text, no watermarks, no logos. The scene must be COMPLETELY EMPTY. This is critical — the user will place their own car image on top.
2. CAMERA ANGLE — Always a straight-on, eye-level perspective (approximately 1.0-1.2m height). NEVER aerial, bird's-eye, top-down, drone-style, or extreme low angles. The camera should face slightly downward toward the ground plane, as if photographing a car from a natural standing position.
3. GROUND SURFACE — There must be a clear, visible, FLAT ground/floor surface occupying the lower ~40% of the image. This is where the car will be digitally placed. The ground must be level and suitable for a car to stand on.
4. ASPECT RATIO — MUST be wide landscape orientation with EXACT 3:2 aspect ratio (1536x1024).
5. PHOTOGRAPHIC REALISM — The image must look like a real photograph. Natural lighting, realistic textures, proper depth of field. NOT a 3D render, illustration, painting, or CGI.
6. LIGHTING — Professional, well-balanced lighting suitable for showcasing a vehicle. Avoid harsh direct light that creates extreme shadows.
7. COMPOSITION — Center the scene with a natural vanishing point. Leave ample space in the center-bottom area for the car placement.

WHEN USER DESCRIBES A LOCATION (e.g. "Göteborg hamn", "Stockholm gata"):
- ALWAYS interpret this as: "A ground-level view FROM that location, showing what you'd see if standing there about to photograph a car"
- NEVER show an aerial/overview of the location
- Include the location's character (architecture, atmosphere) but always FROM GROUND LEVEL
- The foreground must always be a flat, empty surface where a car could be placed

SCENE TYPES (adapt based on user request):
- Studio: Clean cyclorama walls, controlled lighting, simple floors (concrete, epoxy, tile)
- Outdoor: Streets, parking areas, driveways, parks — always at ground level perspective
- Showroom: Polished floors, architectural elements, premium lighting
- Seasonal: Autumn leaves, winter snow, spring blooms — always with driveable ground surface

When the user asks to modify a previous image (e.g. "make it brighter", "change the floor"), generate a NEW image with those changes while keeping the overall concept.

When a reference image is provided, use it as inspiration for style, mood, colors, and lighting — but always maintain the correct perspective and empty scene rules.

CRITICAL: Always output an image. Never skip image generation.`;

const FREE_CREATE_SYSTEM_PROMPT = `You are a creative AI image generator. You help users create and edit photorealistic images based on their descriptions. You MUST produce a new image with every response. Never respond with only text. NEVER use emojis in your text responses.

RULES:
1. Generate photorealistic, high-quality images based on user descriptions.
2. If a reference image is provided, use it as a base for modifications and edits. Preserve details faithfully unless asked to change them.
3. Always maintain photographic realism — natural lighting, realistic textures, proper depth of field.
4. ASPECT RATIO — MUST be wide landscape orientation with EXACT 3:2 aspect ratio (1536x1024).
5. When asked to modify a previous image, generate a NEW image with those changes while keeping the overall concept and all unchanged details intact.
6. No text, watermarks, or logos in the generated images unless explicitly requested.
7. When asked to change one aspect (like color, angle, or lighting), preserve everything else as faithfully as possible.

When the user provides a reference image, analyze it carefully and apply the requested modifications while maintaining all other aspects of the original.

CRITICAL: Always output an image. Never skip image generation.`;

const AD_CREATE_SYSTEM_PROMPT = `You are an AI that creates professional automotive marketing and advertising images. You MUST produce a new image with every response. Never respond with only text. NEVER use emojis in your text responses.

PURPOSE: Create marketing materials for car dealerships and automotive businesses. These images should include text overlays, headlines, and professional design elements.

ABSOLUTE RULES FOR EVERY IMAGE:
1. ALWAYS include text/headlines prominently and legibly in the image when specified by the user. This is the most important rule.
2. Use professional, bold typography that is easy to read. Prefer clean sans-serif fonts.
3. Images should look like professional marketing materials (ads, social media posts, promotional banners).
4. ASPECT RATIO — Match the requested format. Default is wide landscape 3:2 (1536x1024). If portrait is requested, use 2:3 (1024x1536).
5. PHOTOGRAPHIC REALISM — Real photo quality background with professional lighting. Must look like a real photograph, NOT a 3D render, illustration, or CGI.
6. Text must have strong contrast against the background for maximum readability. Use overlays, shadows, or contrasting backgrounds behind text when needed.
7. Use modern, clean design aesthetics appropriate for automotive marketing.
8. Include design elements like gradients, overlays, or branded layouts when appropriate.
9. If a reference image is provided, use it as a base and add text/design elements on top.
10. Create visual hierarchy: main headline large and bold, subtext smaller.

CRITICAL TEXT ACCURACY RULES:
- Every single letter, number, and symbol in headlines MUST be spelled 100% correctly
- Render text EXACTLY as specified by the user — no paraphrasing, no creative spelling, no translation
- Numbers, percentages, currency symbols must be rendered precisely (e.g., "3.99%" not "3,99%")
- Swedish characters (å, ä, ö, Å, Ä, Ö) must be rendered correctly
- If unsure about spelling, default to the EXACT characters provided by the user
- Double-check all text rendering before finalizing the image

WHEN CREATING MARKETING MATERIALS:
- Prioritize text legibility above all else
- Include call-to-action elements when appropriate
- Match the style to the target audience (premium for luxury, energetic for sporty, etc.)
- Consider the placement of text to avoid covering important visual elements
- Use color psychology: bold reds/oranges for urgency, blues for trust, blacks for luxury

When the user asks to modify a previous image, generate a NEW image with those changes while keeping the overall concept.

CRITICAL: Always output an image. Never skip image generation.`;

// Invisible context injected into user prompts for background mode
const BACKGROUND_PROMPT_SUFFIX = `

[CRITICAL RULES - MUST FOLLOW FOR EVERY IMAGE]:
1. ABSOLUTELY ZERO cars, vehicles, people, or animals — the scene MUST be COMPLETELY EMPTY
2. Camera MUST be at EYE-LEVEL (~1.0-1.2m height) — NEVER aerial, bird's-eye, top-down, or drone perspective
3. Flat, empty ground/floor surface MUST occupy the lower ~40% of the image — this is where a car will be digitally placed later
4. Aspect ratio: 3:2 landscape (1536x1024)
5. Photorealistic photograph — NOT CGI, illustration, painting, or 3D render
This image is a BACKGROUND for automotive photo compositing. A car will be digitally placed on the ground surface.
IMPORTANT: When modifying a previous image, keep ALL unchanged elements (location, mood, architecture) and ONLY change what the user specifically asked to change.`;

// AD_PROMPT_SUFFIX is now dynamically generated based on format (see serve handler)

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

    // Verify user from JWT using direct HTTP request (more reliable in edge functions)
    const token = authHeader.replace("Bearer ", "");
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      },
    });

    if (!userResponse.ok) {
      console.error("Auth validation failed:", userResponse.status);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = await userResponse.json();

    const { conversationHistory, mode, format } = await req.json();

    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: "Conversation history is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract the latest user message text for metadata generation
    const lastUserMsg = [...conversationHistory].reverse().find((m: any) => m.role === "user");
    const latestPromptText = typeof lastUserMsg?.content === "string" 
      ? lastUserMsg.content 
      : lastUserMsg?.content?.find?.((c: any) => c.type === "text")?.text || "bakgrund";

    const isBackgroundMode = !mode || mode === 'background-studio';
    const isAdMode = mode === 'ad-create';
    const isPortrait = format === 'portrait';

    console.log(`Generating scene for user ${user.id}: "${latestPromptText}" (mode: ${mode}, format: ${format || 'landscape'}, ${conversationHistory.length} messages)`);

    // Build dynamic AD prompt suffix based on format
    const adPromptSuffix = `

[RULES FOR THIS IMAGE]:
1. This is a MARKETING/ADVERTISING image for an automotive business
2. Include all specified text/headlines prominently with professional, bold typography
3. Text must be HIGHLY LEGIBLE with strong contrast — use overlays or backgrounds behind text
4. Aspect ratio: ${isPortrait ? '2:3 portrait (1024x1536)' : '3:2 landscape (1536x1024)'}
5. Photorealistic quality with professional design elements
6. Modern, clean automotive marketing aesthetic
7. Create clear visual hierarchy between headline and subtext
8. CRITICAL: All text MUST be spelled correctly — every letter, number, and symbol exactly as specified
IMPORTANT: When modifying a previous image, keep ALL unchanged elements and ONLY change what the user specifically asked to change.`;

    // Determine which prompt suffix to inject
    const modeSuffix = isBackgroundMode ? BACKGROUND_PROMPT_SUFFIX : isAdMode ? adPromptSuffix : null;

    // Process conversation history with mode-specific context
    const processedHistory = conversationHistory.map((msg: any, idx: number) => {
      if (msg.role === "user") {
        let processedContent = msg.content;

        // Append mode-specific suffix to user messages
        if (modeSuffix) {
          if (typeof processedContent === "string") {
            processedContent = processedContent + modeSuffix;
          } else if (Array.isArray(processedContent)) {
            processedContent = processedContent.map((c: any) =>
              c.type === "text" ? { ...c, text: c.text + modeSuffix } : c
            );
          }
        }

        // For the last message, add image generation reminder
        if (idx === conversationHistory.length - 1) {
          const imageReminder = `\n\nIMPORTANT: You MUST generate and return a NEW IMAGE based on this request. Do not respond with only text. Always produce a photo.`;
          if (typeof processedContent === "string") {
            processedContent = processedContent + imageReminder;
          } else if (Array.isArray(processedContent)) {
            processedContent = processedContent.map((c: any) =>
              c.type === "text" ? { ...c, text: c.text + imageReminder } : c
            );
          }
        }

        return { ...msg, content: processedContent };
      }
      return msg;
    });

    // Select system prompt based on mode
    let systemPrompt: string;
    if (isAdMode) {
      systemPrompt = AD_CREATE_SYSTEM_PROMPT;
    } else if (mode === 'free-create') {
      systemPrompt = FREE_CREATE_SYSTEM_PROMPT;
    } else {
      systemPrompt = BACKGROUND_SYSTEM_PROMPT;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...processedHistory,
    ];

    // Step 1: Generate the image with retry
    let base64Image: string | null = null;
    
    for (let attempt = 0; attempt < 2; attempt++) {
      const messagesForAttempt = attempt === 0 
        ? aiMessages 
        : [
            { 
              role: "user", 
              content: isBackgroundMode
                ? `Generate a professional automotive photography background image: ${latestPromptText}. MUST be landscape 3:2 ratio, COMPLETELY EMPTY scene with absolutely no cars, no people, no vehicles. Eye-level camera angle at ~1.2m height. Flat ground surface in lower 40%. Realistic photo style. Generate the image now.`
                : isAdMode
                  ? `Generate a professional automotive marketing advertisement image: ${latestPromptText}. Include any specified text/headlines prominently with bold readable typography. All text must be spelled correctly. MUST be ${isPortrait ? 'portrait 2:3 ratio' : 'landscape 3:2 ratio'}. Photorealistic professional marketing design. Generate the image now.`
                  : `Generate a photorealistic image: ${latestPromptText}. MUST be landscape 3:2 ratio. Realistic photo style. Generate the image now.`
            },
          ];

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
            messages: messagesForAttempt,
            modalities: ["image", "text"],
          }),
        }
      );

      if (!imageResponse.ok) {
        const status = imageResponse.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "AI-tjänsten är överbelastad just nu. Försök igen om en stund." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI-krediter slut. Kontakta support." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await imageResponse.text();
        console.error("AI gateway error:", status, errorText);
        throw new Error(`AI gateway error: ${status}`);
      }

      const imageData = await imageResponse.json();
      base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;

      if (base64Image) {
        console.log(`Image generated on attempt ${attempt + 1}`);
        break;
      }
      
      console.warn(`Attempt ${attempt + 1}: No image in response, AI returned text only: "${JSON.stringify(imageData).slice(0, 300)}"`);
    }

    if (!base64Image) {
      throw new Error("AI kunde inte generera en bild. Försök med en tydligare beskrivning.");
    }

    // Step 2: Upload to Supabase Storage
    const imageId = crypto.randomUUID();
    const storagePath = `user-scenes/${user.id}/${imageId}.png`;

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

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

    const { data: { publicUrl } } = supabase.storage.from("processed-cars").getPublicUrl(storagePath);

    // Step 3: Generate metadata (name, description, PhotoRoom prompt)
    const metaSystemContent = isAdMode
      ? `You are a metadata generator for automotive marketing images. Given a description, generate metadata.

Generate:
1. A clear, descriptive Swedish name for the ad/campaign (2-4 words) that describes what it is, e.g. "Kampanjbild Ränta", "Bilannons Premium", "Social Media Banner"
2. A short Swedish description (1 sentence)
3. A prompt describing the image for future reference

NEVER use emojis. Respond ONLY with valid JSON in this exact format:
{"name": "...", "description": "...", "photoroomPrompt": "..."}`
      : `You are a metadata generator for automotive photography backgrounds. Given a description, generate metadata.

Generate:
1. A creative, modern Swedish name for the scene (2-4 words). AVOID generic names like "Min bakgrund", "Studio", "Bakgrund", "Ny scen". Use sharp, brand-worthy names with attitude or symbolic meaning. Mix Swedish and English freely. Examples: "Carbon Studio", "Frost & Stål", "Asphalt Edge", "Slate Room", "Neon Minimal", "Cement Lounge", "Dimgrå Rak", "Chalk Surface". Think design studio, not poetry.
2. A short Swedish description (1 sentence)
3. A PhotoRoom-compatible AI prompt in English that describes how to place a car in this scene with matching lighting

NEVER use emojis. Respond ONLY with valid JSON in this exact format:
{"name": "...", "description": "...", "photoroomPrompt": "Place the vehicle centered on the ground in ... Professional automotive photography with realistic lighting matching the environment."}`;

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
              content: metaSystemContent,
            },
            {
              role: "user",
              content: `Scene description: ${latestPromptText}\n\nGenerate metadata for this scene.`,
            },
          ],
        }),
      }
    );

    let suggestedName = "Ny skapad scen";
    let description = latestPromptText;
    let photoroomPrompt = `Place the vehicle centered on the ground in a scene matching this description: ${latestPromptText}. Professional automotive photography with realistic lighting.`;

    if (metaResponse.ok) {
      try {
        const metaData = await metaResponse.json();
        const content = metaData.choices?.[0]?.message?.content || "";
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
