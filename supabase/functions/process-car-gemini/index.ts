import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

/**
 * POC: Gemini-based car composite pipeline
 * 
 * Flow:
 * 1. PhotoRoom → remove background only (transparent PNG)
 * 2. Gemini → composite car onto chosen background with realistic placement
 * 
 * This avoids PhotoRoom's guidance mode contamination from car reflections
 * while getting intelligent AI-driven placement from Gemini.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!PHOTOROOM_API_KEY) throw new Error('PHOTOROOM_API_KEY not configured');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const backgroundUrl = formData.get('backgroundUrl') as string;
    const sceneName = formData.get('sceneName') as string || 'studio scene';
    const shadowType = formData.get('shadowType') as string || 'soft shadow';
    const orientation = formData.get('orientation') as string || 'landscape';

    if (!imageFile || !backgroundUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image or backgroundUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GEMINI-POC] Starting pipeline for scene: ${sceneName}`);
    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════
    // STEP 1: PhotoRoom — Background removal only
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI-POC] Step 1: Removing background with PhotoRoom...');
    
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    
    const bgRemovalForm = new FormData();
    bgRemovalForm.append('imageFile', imageBlob, imageFile.name);
    // No background params = transparent output
    bgRemovalForm.append('export.format', 'png');
    bgRemovalForm.append('export.quality', '100');
    // Keep original aspect ratio and don't add padding
    bgRemovalForm.append('padding', '0');
    bgRemovalForm.append('scaling', 'fit');
    
    const bgRemovalResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: { 'x-api-key': PHOTOROOM_API_KEY },
      body: bgRemovalForm,
    });

    if (!bgRemovalResponse.ok) {
      const errorText = await bgRemovalResponse.text();
      console.error('[GEMINI-POC] PhotoRoom bg removal failed:', bgRemovalResponse.status, errorText);
      throw new Error(`Background removal failed: ${bgRemovalResponse.status}`);
    }

    const transparentCarBuffer = await bgRemovalResponse.arrayBuffer();
    const transparentCarBase64 = base64Encode(new Uint8Array(transparentCarBuffer));
    console.log(`[GEMINI-POC] Step 1 done: transparent car ${(transparentCarBuffer.byteLength / 1024).toFixed(0)}KB`);

    // ═══════════════════════════════════════════════════════
    // STEP 2: Fetch background image
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI-POC] Step 2: Fetching background image...');
    const bgResponse = await fetch(backgroundUrl);
    if (!bgResponse.ok) throw new Error(`Failed to fetch background: ${bgResponse.status}`);
    const bgBuffer = await bgResponse.arrayBuffer();
    const bgBase64 = base64Encode(new Uint8Array(bgBuffer));
    const bgContentType = bgResponse.headers.get('content-type') || 'image/jpeg';
    console.log(`[GEMINI-POC] Step 2 done: background ${(bgBuffer.byteLength / 1024).toFixed(0)}KB`);

    // ═══════════════════════════════════════════════════════
    // STEP 3: Gemini — Composite car into scene
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI-POC] Step 3: Compositing with Gemini...');

    const compositePrompt = `You are a professional automotive photo compositor. You have two images:

IMAGE 1: A car with transparent background (PNG cutout)
IMAGE 2: A ${sceneName} background/scene

YOUR TASK:
1. Place the car from Image 1 realistically into the scene from Image 2
2. The car must be placed on the ground/floor of the scene with correct perspective
3. Match the car's angle and size to look natural in the scene
4. Add a realistic ${shadowType} underneath the car that matches the scene lighting
5. The car should look like it was actually photographed in this location

CRITICAL RULES:
- Do NOT alter the car's appearance, color, shape, or any details whatsoever
- Do NOT add any objects, props, people, or decorations to the scene
- Do NOT change the background scene — use it exactly as provided
- The final image should look like a professional car photography shot
- Keep the scene clean and minimal — this is for automotive advertising
- The output should be ${orientation === 'portrait' ? 'portrait orientation' : 'landscape orientation'}`;

    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: compositePrompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${transparentCarBase64}` }
              },
              {
                type: 'image_url',
                image_url: { url: `data:${bgContentType};base64,${bgBase64}` }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[GEMINI-POC] Gemini error:', geminiResponse.status, errText);
      if (geminiResponse.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again in a moment.');
      }
      if (geminiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add funds.');
      }
      throw new Error(`Gemini compositing failed: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const generatedImageUrl = geminiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error('[GEMINI-POC] No image in Gemini response:', JSON.stringify(geminiData).slice(0, 500));
      throw new Error('Gemini did not return an image');
    }

    console.log('[GEMINI-POC] Step 3 done: Gemini returned composite image');

    // ═══════════════════════════════════════════════════════
    // STEP 4: Upload final result
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI-POC] Step 4: Uploading final image...');

    // Extract base64 data from data URL
    const base64Match = generatedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image data from Gemini');
    }

    const imgFormat = base64Match[1]; // png, jpeg, etc.
    const imgBase64Data = base64Match[2];
    
    // Decode base64 to binary
    const binaryStr = atob(imgBase64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const finalFilename = `gemini-poc/${crypto.randomUUID()}.${imgFormat === 'jpeg' ? 'jpg' : imgFormat}`;
    const { error: uploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, bytes.buffer, {
        contentType: `image/${imgFormat}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('[GEMINI-POC] Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(finalFilename);

    const totalTime = Date.now() - startTime;
    console.log(`[GEMINI-POC] ✅ Complete in ${(totalTime / 1000).toFixed(1)}s — ${publicUrlData.publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: publicUrlData.publicUrl,
        pipeline: 'gemini-composite',
        processingTimeMs: totalTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GEMINI-POC] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
