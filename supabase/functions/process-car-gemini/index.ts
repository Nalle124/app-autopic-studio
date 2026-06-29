import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Gemini-based car composite pipeline (production v2 — no PhotoRoom dependency)
 *
 * Flow:
 * 1. Auth + credit deduction
 * 2. Upload original car photo to storage (so Gemini can fetch it as URL)
 * 3. Send original car + background reference to Gemini Pro Image — it handles
 *    BOTH cutout (isolate car from its original background) AND composite onto the scene
 * 4. Upload final result + update processing_job
 *
 * Accepts the same FormData format as process-car-image for drop-in compatibility.
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
  let tempCarPath: string | null = null;

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Ej autentiserad');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Ej autentiserad');
    userId = user.id;
    console.log('[GEMINI] Authenticated user:', userId);

    // ── Parse FormData ──
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundUrl = formData.get('backgroundUrl') as string;
    const orientation = formData.get('orientation') as string || 'landscape';
    jobId = formData.get('jobId') as string || null;

    if (!imageFile || !sceneData || !backgroundUrl) {
      throw new Error('Saknade fält: image, scene, backgroundUrl');
    }

    let scene: SceneMetadata;
    try { scene = JSON.parse(sceneData); } catch { throw new Error('Ogiltigt scendata'); }

    console.log(`[GEMINI] Scene: ${scene.name}, orientation: ${orientation}`);

    if (jobId) {
      await supabase.from('processing_jobs').update({ status: 'processing' }).eq('id', jobId);
    }

    // ── Credits ──
    const { data: creditData } = await supabase.from('user_credits').select('credits').eq('user_id', userId).single();
    const currentCredits = creditData?.credits || 0;
    if (currentCredits <= 0) throw new Error('Inga credits kvar');
    const { error: creditError } = await supabase.rpc('decrement_credits', { p_user_id: userId });
    if (creditError) throw new Error('Kunde inte dra credit');
    creditDeducted = true;

    const startTime = Date.now();

    // ═══════════════════════════════════════════════════════
    // STEP 1: Upload original car photo so Gemini can fetch it as a URL
    // (avoids huge base64 payloads inside the Gemini request)
    // ═══════════════════════════════════════════════════════
    const imageBuffer = await imageFile.arrayBuffer();
    console.log(`[GEMINI] Source image: ${(imageBuffer.byteLength / 1024).toFixed(0)}KB`);

    const srcExt = (imageFile.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    tempCarPath = `gemini-source/${crypto.randomUUID()}.${srcExt}`;
    const { error: srcUploadErr } = await supabase.storage
      .from('processed-cars')
      .upload(tempCarPath, imageBuffer, { contentType: imageFile.type || 'image/jpeg', upsert: false });
    if (srcUploadErr) throw new Error(`Source upload failed: ${srcUploadErr.message}`);
    const { data: srcUrlData } = supabase.storage.from('processed-cars').getPublicUrl(tempCarPath);
    const carImageUrl = srcUrlData.publicUrl;
    console.log('[GEMINI] Step 1 done: source uploaded');

    // ═══════════════════════════════════════════════════════
    // STEP 2: Gemini handles cutout + composite in a single call
    // ═══════════════════════════════════════════════════════
    const imageType = formData.get('imageType') as string || 'exterior';
    const engineMode = (formData.get('engineMode') as string) || 'match';
    const isDetailShot = imageType === 'detail';

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

    const aspect = orientation === 'portrait' ? 'portrait (2:3 ratio)' : 'landscape (3:2 ratio)';

    let compositePrompt: string;

    if (engineMode === 'studio') {
      compositePrompt = `You are a professional automotive photographer creating a polished car advertisement.

You have two source images:
IMAGE 1: A photograph of a real car (with its original surroundings visible — ignore that original background entirely)
IMAGE 2: A reference background showing the desired ${scene.name} environment — use this for STYLE, LIGHTING, MOOD, COLOR PALETTE and ENVIRONMENT TYPE

YOUR JOB: Extract the EXACT car from Image 1 (ignore everything else in that photo — sky, road, people, other cars, etc.) and place it into a newly generated environment inspired by Image 2.

PLACEMENT & PERSPECTIVE:
- The car's perspective in the output must match its angle in Image 1
- Position the car naturally, fill approximately 60-72% of frame width
- Add ${shadowDesc} matching the new lighting
- Add subtle ambient light wrap consistent with the new scene

ENVIRONMENT (newly generated, inspired by Image 2):
- Match the materials, lighting style, time of day and color palette from Image 2
- Clean, professional, free of clutter, text, logos, watermarks
- Generate ground plane, walls/floor/sky/surroundings whose perspective matches the car

CAR PRESERVATION (CRITICAL):
- Same model, color, trim, wheels, orientation, facing direction as Image 1
- Do NOT alter bodywork, paint color, badges, license plate, mirrors, wheel style
- Do NOT flip, mirror or rotate the car
- You MAY subtly relight the car so its highlights match the new environment

OUTPUT: ${aspect}, photorealistic, magazine-grade automotive advertisement. No text, no logos, no watermarks, no UI.`;
    } else if (isDetailShot) {
      compositePrompt = `You are a professional product photo compositor.

IMAGE 1: A car detail/close-up photo (wheel, headlight, badge, mirror, grille, etc.). Its original background is visible — ignore everything except the detail itself.
IMAGE 2: A professional photography background/scene.

TASK:
1. Cleanly extract the detail subject from Image 1
2. Place it as a product photograph on the background from Image 2
3. Preserve the ENTIRE detail subject — do NOT crop, mask, or trim any portion
4. Scale the detail to fill 65-75% of the frame, centered
5. Add a subtle soft shadow beneath the detail

ABSOLUTE RULES:
- COPY the detail pixel-for-pixel — same colors, texture, angle, lighting, full extent
- Do NOT modify the background in any way
- Output must be ${aspect}
- Clean, exact, professional product composition`;
    } else {
      compositePrompt = `You are a PHOTO EDITOR performing a cut-and-paste compositing job.

IMAGE 1: A photograph of a real car (with its original surroundings — sky, road, other objects, etc.). Ignore EVERYTHING in this image except the car itself.
IMAGE 2: A ${scene.name} background photograph.

YOUR ONLY JOB: Cleanly extract the car from Image 1 (treat everything that is not the car as removable background) and paste it onto Image 2. Like a Photoshop layer.

PLACEMENT:
- Position the car naturally on the ground plane of the background
- Scale the car to fill approximately 60-70% of frame width
- Add ${shadowDesc}

CRITICAL — THE CAR MUST BE AN EXACT COPY:
- Transfer every pixel of the car unchanged — paint, scratches, dirt, reflections, wheels, badges, mirrors, license plate area
- Preserve the FULL extent of the car — do not crop, mask, or remove any visible part (front bumper, rear, wheels, mirrors all stay)
- Photographically identical to the car in Image 1
- Do NOT re-render, re-imagine, or artistically interpret the car
- Do NOT change color temperature, exposure, contrast, or saturation of the car
- Do NOT flip, mirror, or rotate
- Do NOT add reflections or effects not already present
- The background must remain EXACTLY as Image 2 — no color grading, no atmosphere changes

This is a Photoshop paste operation with shadow integration — nothing more.

Output: ${aspect}`;
    }

    console.log('[GEMINI] Step 2: calling Gemini Pro Image...');
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: compositePrompt },
            { type: 'image_url', image_url: { url: carImageUrl } },
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
      console.error('[GEMINI] No image returned:', JSON.stringify(geminiData).slice(0, 500));
      throw new Error('Gemini returnerade ingen bild');
    }
    console.log('[GEMINI] Step 2 done: composite received');

    // ═══════════════════════════════════════════════════════
    // STEP 3: Upload final result
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

    if (jobId) {
      await supabase.from('processing_jobs').update({
        status: 'completed',
        final_url: finalUrl,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }

    // Clean up temp source (fire and forget)
    if (tempCarPath) supabase.storage.from('processed-cars').remove([tempCarPath]).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, finalUrl, jobId, pipeline: 'gemini', processingTimeMs: totalTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GEMINI] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Okänt fel';

    if (creditDeducted && userId) {
      try {
        const { data: uc } = await supabase.from('user_credits').select('credits').eq('user_id', userId).single();
        const newBal = (uc?.credits || 0) + 1;
        await supabase.from('user_credits').update({ credits: newBal, updated_at: new Date().toISOString() }).eq('user_id', userId);
        console.log('[GEMINI] Credit refunded');
      } catch (e) { console.error('[GEMINI] Credit refund failed:', e); }
    }

    if (tempCarPath) supabase.storage.from('processed-cars').remove([tempCarPath]).catch(() => {});

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
