import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKGROUND_SYSTEM_PROMPT = `You are an AI that generates professional automotive photography background scenes. You MUST produce a new image with every response. Never respond with only text.

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

const FREE_CREATE_SYSTEM_PROMPT = `You are a creative AI image generator. You help users create and edit photorealistic images based on their descriptions. You MUST produce a new image with every response. Never respond with only text.

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

// Invisible context injected into user prompts for background mode
const BACKGROUND_PROMPT_SUFFIX = `

IMPORTANT CONTEXT (invisible to user, for the AI only):
- This MUST be an EMPTY scene — absolutely NO cars, vehicles, people, or animals
- Camera angle MUST be straight-on at eye-level (~1.0-1.2m height), as if standing to photograph a car
- NEVER use aerial, bird's-eye, or drone perspectives
- The lower ~40% must be a flat, empty ground surface suitable for placing a car on
- This is a BACKGROUND for automotive photography compositing
- Aspect ratio must be 3:2 landscape (1536x1024)
- Must look like a real photograph, not CGI or illustration`;

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

    const { conversationHistory, mode } = await req.json();

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

    console.log(`Generating scene for user ${user.id}: "${latestPromptText}" (mode: ${mode}, ${conversationHistory.length} messages)`);

    const isBackgroundMode = mode !== 'free-create';

    // For background mode, inject context into every user message to reinforce rules
    const processedHistory = conversationHistory.map((msg: any, idx: number) => {
      if (msg.role === "user") {
        const textContent = typeof msg.content === "string" ? msg.content : msg.content?.find?.((c: any) => c.type === "text")?.text || "";
        
        if (isBackgroundMode) {
          // Append invisible background context to ALL user messages
          const enhancedText = textContent + BACKGROUND_PROMPT_SUFFIX;
          
          if (typeof msg.content === "string") {
            return { ...msg, content: enhancedText };
          } else if (Array.isArray(msg.content)) {
            return {
              ...msg,
              content: msg.content.map((c: any) =>
                c.type === "text" ? { ...c, text: c.text + BACKGROUND_PROMPT_SUFFIX } : c
              ),
            };
          }
        }
        
        // For the last message, add image generation reminder
        if (idx === conversationHistory.length - 1) {
          const imageReminder = `\n\nIMPORTANT: You MUST generate and return a NEW IMAGE based on this request. Do not respond with only text. Always produce a photo.`;
          if (typeof msg.content === "string") {
            return { ...msg, content: msg.content + imageReminder };
          } else if (Array.isArray(msg.content)) {
            return {
              ...msg,
              content: msg.content.map((c: any) =>
                c.type === "text" ? { ...c, text: c.text + imageReminder } : c
              ),
            };
          }
        }
      }
      return msg;
    });

    // Build message array with appropriate system prompt
    const systemPrompt = isBackgroundMode ? BACKGROUND_SYSTEM_PROMPT : FREE_CREATE_SYSTEM_PROMPT;
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
              content: `You are a metadata generator for automotive photography backgrounds. Given a description, generate metadata for the scene.

Generate:
1. A creative, evocative Swedish name for the scene (2-4 words). AVOID generic names like "Min bakgrund", "Studio", "Bakgrund", "Ny scen". Instead use atmospheric, poetic names like "Midvinterskog", "Guldljus Studio", "Stadens Tystnad", "Betongkatedralen", "Höstens Allé", "Solnedgång vid bryggan", "Göteborgs Hamn", "Midnattens Garage".
2. A short Swedish description (1 sentence)
3. A PhotoRoom-compatible AI prompt in English that describes how to place a car in this scene with matching lighting

Respond ONLY with valid JSON in this exact format:
{"name": "...", "description": "...", "photoroomPrompt": "Place the vehicle centered on the ground in ... Professional automotive photography with realistic lighting matching the environment."}`,
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
