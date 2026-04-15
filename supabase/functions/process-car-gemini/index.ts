import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

/**
 * Gemini-based car composite pipeline (production-ready)
 * 
 * Flow:
 * 1. Auth check + credit deduction
 * 2. PhotoRoom → background removal only (transparent PNG)
 * 3. Upload cutout to storage (to avoid base64 memory issues)
 * 4. Gemini → composite car onto chosen background
 * 5. Upload final result + update processing_job
 * 
 * Accepts the same FormData format as process-car-image for drop-in replacement.
 */

interface SceneMetadata {
  id: string;
  name: string;
  horizonY: number;
  baselineY: number;
  defaultScale: number;
  shadowPreset: {
    enabled: boolean;
    strength: number;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  reflectionPreset: {
    enabled: boolean;
    opacity: number;
    fade: number;
  };
  aiPrompt?: string;
  shadowMode?: string;
  referenceScale?: number;
  compositeMode?: boolean;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let jobId: string | null = null;
  let userId: string | null = null;
  let creditDeducted = false;

  try {
    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!PHOTOROOM_API_KEY) throw new Error('PHOTOROOM_API_KEY not configured');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Ej autentiserad');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Ej autentiserad');
    userId = user.id;
    console.log('Authenticated user:', userId);

    // ── Parse FormData ──
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundUrl = formData.get('backgroundUrl') as string;
    const orientation = formData.get('orientation') as string || 'landscape';
    const originalWidth = parseInt(formData.get('originalWidth') as string || '0');
    const originalHeight = parseInt(formData.get('originalHeight') as string || '0');
    jobId = formData.get('jobId') as string || null;
    const projectId = formData.get('projectId') as string || null;

    if (!imageFile || !sceneData || !backgroundUrl) {
      throw new Error('Saknade fält: image, scene, backgroundUrl');
    }

    let scene: SceneMetadata;
    try { scene = JSON.parse(sceneData); } catch { throw new Error('Ogiltigt scendata'); }

    console.log(`[GEMINI] Processing for scene: ${scene.name}, orientation: ${orientation}`);

    // Update job status
    if (jobId) {
      await supabase.from('processing_jobs').update({ status: 'processing' }).eq('id', jobId);
    }

    // ── Credits ──
    const { data: creditData } = await supabase.from('user_credits').select('credits').eq('user_id', userId).single();
    const currentCredits = creditData?.credits || 0;
    console.log('Current credits:', currentCredits);
    if (currentCredits <= 0) throw new Error('Inga credits kvar');
    const { error: creditError } = await supabase.rpc('decrement_credits', { p_user_id: userId });
    if (creditError) throw new Error('Kunde inte dra credit');
    creditDeducted = true;

    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════
    // STEP 1: PhotoRoom — Background removal only
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI] Step 1: Removing background...');
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    console.log(`[GEMINI] Image: ${(imageBuffer.byteLength / 1024).toFixed(0)}KB`);

    const bgRemovalForm = new FormData();
    bgRemovalForm.append('imageFile', imageBlob, imageFile.name);
    bgRemovalForm.append('export.format', 'png');
    bgRemovalForm.append('export.quality', '100');
    bgRemovalForm.append('padding', '0');
    bgRemovalForm.append('scaling', 'fit');
    // Keep output small to save memory — Gemini doesn't need huge resolution
    bgRemovalForm.append('outputSize', '1024x1024');

    const bgRemovalResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: { 'x-api-key': PHOTOROOM_API_KEY },
      body: bgRemovalForm,
    });

    if (!bgRemovalResponse.ok) {
      const errText = await bgRemovalResponse.text();
      console.error('[GEMINI] PhotoRoom bg removal failed:', bgRemovalResponse.status, errText);
      throw new Error(`Bakgrundsborttagning misslyckades (${bgRemovalResponse.status})`);
    }

    const transparentCarBuffer = await bgRemovalResponse.arrayBuffer();
    console.log(`[GEMINI] Step 1 done: ${(transparentCarBuffer.byteLength / 1024).toFixed(0)}KB cutout`);

    // ═══════════════════════════════════════════════════════
    // STEP 2: Upload cutout to get URL (saves memory)
    // ═══════════════════════════════════════════════════════
    const cutoutPath = `gemini-cutouts/${crypto.randomUUID()}.png`;
    const { error: cutoutErr } = await supabase.storage
      .from('processed-cars')
      .upload(cutoutPath, transparentCarBuffer, { contentType: 'image/png', upsert: false });
    if (cutoutErr) throw new Error(`Cutout upload failed: ${cutoutErr.message}`);
    const { data: cutoutUrlData } = supabase.storage.from('processed-cars').getPublicUrl(cutoutPath);
    const cutoutUrl = cutoutUrlData.publicUrl;
    console.log('[GEMINI] Step 2 done: cutout uploaded');

    // ═══════════════════════════════════════════════════════
    // STEP 3: Gemini — Composite car into scene
    // ═══════════════════════════════════════════════════════
    console.log('[GEMINI] Step 3: Compositing with Gemini...');

    // Read image type passed from client
    const imageType = formData.get('imageType') as string || 'exterior';
    const isDetailShot = imageType === 'detail';

    // Shadow/reflection description — keep reflections minimal
    const hasReflection = scene.reflectionPreset?.enabled === true && !isDetailShot;
    const hasShadow = scene.shadowMode && scene.shadowMode !== 'none';
    let shadowDesc = 'a subtle soft contact shadow directly beneath the tires';
    if (hasReflection) {
      shadowDesc = 'a faint, tasteful floor reflection — keep it minimal, NOT a full mirror image';
    } else if (hasShadow) {
      if (scene.shadowMode === 'ai.soft') shadowDesc = 'a soft diffused shadow beneath the car';
      else if (scene.shadowMode === 'ai.hard') shadowDesc = 'a defined crisp shadow beneath the car';
      else shadowDesc = 'a subtle natural shadow beneath the car';
    }

    // Choose prompt based on image type
    let compositePrompt: string;

    if (isDetailShot) {
      compositePrompt = `You are a professional product photo compositor. You have two images:

IMAGE 1: A car detail/close-up photo with transparent background (wheel, headlight, badge, mirror, grille, or similar component — shown as a tight close-up)
IMAGE 2: A professional photography background/scene

YOUR TASK — COMPOSITING ONLY, NOT GENERATION:
1. Place the detail from Image 1 as a product photograph on the background from Image 2
2. Keep it as a CLOSE-UP DETAIL SHOT — do NOT zoom out or show the full car
3. Scale the detail to fill approximately 65-75% of the frame
4. Center it naturally in the frame
5. Add only a very subtle soft shadow beneath the detail

ABSOLUTE RULES:
- COPY the detail image EXACTLY pixel-for-pixel — same colors, same texture, same angle, same lighting
- DO NOT add any car body, chassis, door panels, hood, or surrounding car parts
- DO NOT reconstruct or imagine the full vehicle
- DO NOT modify the background in any way
- Output must be ${orientation === 'portrait' ? 'portrait (2:3 ratio)' : 'landscape (3:2 ratio)'}
- This is a product photography composition — clean, exact, professional`;
    } else {
      compositePrompt = `You are performing a TECHNICAL DIGITAL COMPOSITING operation — not creative generation.

You have two source images:
IMAGE 1: A car with transparent background (PNG cutout — use this car EXACTLY as-is)
IMAGE 2: A professional ${scene.name} automotive photography background (use this EXACTLY as-is)

COMPOSITING TASK:
1. Place the car from Image 1 onto the background from Image 2
2. The car must sit naturally on the ground with correct perspective
3. Scale the car to fill approximately 60-70% of frame width
4. Add ${shadowDesc}

PRESERVATION RULES — HIGHEST PRIORITY:
- The car must appear IDENTICAL to Image 1 — exact same paint color, reflections, body details, dents, dirt, everything
- Do NOT clean, enhance, smooth, or alter the car in any way
- Do NOT flip or mirror the car — maintain exact orientation
- Do NOT add chrome reflections, paint shine, or specular highlights that are not in the original
- The background from Image 2 must appear EXACTLY as-is — do not alter lighting or atmosphere
- No additional objects, people, props, or text

Output format: ${orientation === 'portrait' ? 'portrait (2:3 ratio)' : 'landscape (3:2 ratio)'}
This is professional automotive advertising — preserve the exact real-world appearance of the car.`;
    }

    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: compositePrompt },
            { type: 'image_url', image_url: { url: cutoutUrl } },
            { type: 'image_url', image_url: { url: backgroundUrl } },
          ]
        }],
        modalities: ['image', 'text'],
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('[GEMINI] Gemini error:', geminiResponse.status, errText);
      if (geminiResponse.status === 429) throw new Error('AI-hastighetsgräns nådd. Försök igen om en stund.');
      if (geminiResponse.status === 402) throw new Error('AI-krediter slut.');
      throw new Error(`Gemini compositing misslyckades (${geminiResponse.status})`);
    }

    const geminiData = await geminiResponse.json();
    const generatedImageUrl = geminiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImageUrl) {
      console.error('[GEMINI] No image returned');
      throw new Error('Gemini returnerade ingen bild');
    }
    console.log('[GEMINI] Step 3 done: composite received');

    // ═══════════════════════════════════════════════════════
    // STEP 4: Upload final result
    // ═══════════════════════════════════════════════════════
    const base64Match = generatedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error('Ogiltigt bilddata från Gemini');

    const imgFormat = base64Match[1];
    const imgBase64Data = base64Match[2];
    const binaryStr = atob(imgBase64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const ext = imgFormat === 'jpeg' ? 'jpg' : imgFormat;
    const sanitizedSceneId = scene.id.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const finalFilename = `${userId}/${crypto.randomUUID()}-${sanitizedSceneId}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, bytes.buffer, { contentType: `image/${imgFormat}`, upsert: false });
    if (uploadError) throw new Error(`Upload misslyckades: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from('processed-cars').getPublicUrl(finalFilename);
    const finalUrl = publicUrlData.publicUrl;

    const totalTime = Date.now() - startTime;
    console.log(`[GEMINI] ✅ Complete in ${(totalTime / 1000).toFixed(1)}s — ${finalUrl}`);

    // Update job as completed
    if (jobId) {
      await supabase.from('processing_jobs').update({
        status: 'completed',
        final_url: finalUrl,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }

    // Clean up cutout (fire and forget)
    supabase.storage.from('processed-cars').remove([cutoutPath]).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, finalUrl, jobId, pipeline: 'gemini', processingTimeMs: totalTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GEMINI] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Okänt fel';

    // Refund credit on failure
    if (creditDeducted && userId) {
      try {
        const { data: uc } = await supabase.from('user_credits').select('credits').eq('user_id', userId).single();
        const newBal = (uc?.credits || 0) + 1;
        await supabase.from('user_credits').update({ credits: newBal, updated_at: new Date().toISOString() }).eq('user_id', userId);
        console.log('[GEMINI] Credit refunded');
      } catch (e) { console.error('[GEMINI] Credit refund failed:', e); }
    }

    // Mark job as failed
    if (jobId) {
      await supabase.from('processing_jobs').update({
        status: 'failed',
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
