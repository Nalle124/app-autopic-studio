import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { removeBackground } from "../_shared/bg-removal.ts";

/**
 * Gemini-based car composite pipeline (v3 — cutout-first).
 *
 * Flow:
 * 1. Auth + credit deduction
 * 2. Upload original car photo to storage
 * 3. Run dedicated background removal (Replicate / BRIA-class) to get
 *    a clean PNG cutout of just the car. This is the key change vs v2:
 *    the generative model never sees the original surroundings, so it has
 *    nothing to "carry over" and minimal incentive to re-render the car.
 * 4. Send cutout + background reference to Gemini with a strict system
 *    prompt + low temperature → composite onto the scene with shadow.
 * 5. Upload final result + update processing_job.
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
  const tempPaths: string[] = [];

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
    const imageType = formData.get('imageType') as string || 'exterior';
    const engineMode = (formData.get('engineMode') as string) || 'match'; // 'fast' | 'match' | 'studio'
    const origW = parseInt(formData.get('originalWidth') as string || '0');
    const origH = parseInt(formData.get('originalHeight') as string || '0');

    if (!imageFile || !sceneData || !backgroundUrl) {
      throw new Error('Saknade fält: image, scene, backgroundUrl');
    }

    let scene: SceneMetadata;
    try { scene = JSON.parse(sceneData); } catch { throw new Error('Ogiltigt scendata'); }

    console.log(`[GEMINI] Scene: ${scene.name}, mode: ${engineMode}, orientation: ${orientation}`);

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
    // STEP 1: Upload original car so Replicate + Gemini can fetch it
    // ═══════════════════════════════════════════════════════
    const imageBuffer = await imageFile.arrayBuffer();
    console.log(`[GEMINI] Source image: ${(imageBuffer.byteLength / 1024).toFixed(0)}KB`);

    const srcExt = (imageFile.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const sourcePath = `gemini-source/${crypto.randomUUID()}.${srcExt}`;
    tempPaths.push(sourcePath);
    const { error: srcUploadErr } = await supabase.storage
      .from('processed-cars')
      .upload(sourcePath, imageBuffer, { contentType: imageFile.type || 'image/jpeg', upsert: false });
    if (srcUploadErr) throw new Error(`Source upload failed: ${srcUploadErr.message}`);
    const { data: srcUrlData } = supabase.storage.from('processed-cars').getPublicUrl(sourcePath);
    const sourceImageUrl = srcUrlData.publicUrl;

    // ═══════════════════════════════════════════════════════
    // STEP 2: Cutout-first — strip original background so Gemini sees ONLY the car.
    // This is the biggest win for "bilen ska vara exakt samma".
    // Skipped automatically for detail shots and for 'studio' generative mode
    // (which intentionally re-renders environment around the original framing).
    // ═══════════════════════════════════════════════════════
    const useCutout = imageType !== 'detail' && engineMode !== 'studio';
    let carImageUrl = sourceImageUrl;
    if (useCutout) {
      console.log('[GEMINI] Step 2: removing background via Replicate...');
      const cutoutT0 = Date.now();
      const cutout = await removeBackground(sourceImageUrl);
      if (cutout) {
        // Persist cutout to our own storage (Replicate CDN expires).
        const cutoutPath = `gemini-cutout/${crypto.randomUUID()}.png`;
        tempPaths.push(cutoutPath);
        const { error: cutUpErr } = await supabase.storage
          .from('processed-cars')
          .upload(cutoutPath, cutout.buffer, { contentType: 'image/png', upsert: false });
        if (!cutUpErr) {
          const { data: cutUrl } = supabase.storage.from('processed-cars').getPublicUrl(cutoutPath);
          carImageUrl = cutUrl.publicUrl;
          console.log(`[GEMINI] cutout ready in ${((Date.now() - cutoutT0) / 1000).toFixed(1)}s`);
        } else {
          console.warn('[GEMINI] cutout upload failed, using original:', cutUpErr.message);
        }
      } else {
        console.warn('[GEMINI] cutout failed, falling back to original image');
      }
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3: Compose via Gemini Image
    // ═══════════════════════════════════════════════════════
    const isDetailShot = imageType === 'detail';

    // Model selection: fast → 3.1 Flash Image; match/studio → 3 Pro Image
    const geminiModel = engineMode === 'fast'
      ? 'google/gemini-3.1-flash-image'
      : 'google/gemini-3-pro-image';

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
    const dimNote = origW && origH ? ` Output dimensions: ${origW}x${origH}.` : '';
    const inputDescription = useCutout
      ? 'a transparent PNG cutout of the EXACT car (no background — only the car itself)'
      : 'a photograph of the EXACT car (ignore anything in its original background)';

    // Strict system prompt — locks the model's role before any user content arrives.
    const systemPrompt = `You are a precision photo compositor for a car-dealership advertising tool.

ABSOLUTE LAW: The car in IMAGE 1 is FINAL ART. Treat it like a sticker.
- You MUST NOT re-render, redraw, restyle, or "improve" the car.
- You MUST NOT change paint color, hue, saturation, exposure, contrast, sharpness, or texture of the car.
- You MUST NOT alter wheels, rims, badges, mirrors, lights, license plate, body lines, or angle.
- You MUST NOT flip, mirror, rotate, scale non-uniformly, or crop any part of the car.
- You MUST preserve the FULL extent of the car (front bumper, rear, mirrors, wheels — all visible).

Your ONLY creative freedom is: (a) the background environment, (b) a single ground shadow or floor reflection, and (c) subtle ambient light wrap on the car's edges so it does not look pasted. Nothing else.

If you cannot satisfy this, return the car unchanged on the requested background. Never invent details on the car.`;

    let compositePrompt: string;

    if (engineMode === 'studio') {
      compositePrompt = `INPUTS:
- IMAGE 1: ${inputDescription}.
- IMAGE 2: A reference background showing the desired ${scene.name} environment — use for STYLE, LIGHTING, MOOD, COLOR PALETTE and ENVIRONMENT TYPE.

DO:
- Generate a new photorealistic ${scene.name} environment inspired by Image 2 (materials, light, time of day, palette).
- Place the car naturally on the ground plane, fill 60-72% of frame width.
- Add ${shadowDesc} matching the new lighting direction.
- Add subtle ambient light wrap on the car's edges so it blends with the scene.

DO NOT:
- Change the car in any way (see system rules).
- Add text, logos, watermarks, UI, or people.
- Add props, clutter, pipes, plants, lamps that are not in Image 2.

OUTPUT: ${aspect}, photorealistic, magazine-grade automotive advertisement.${dimNote}`;
    } else if (isDetailShot) {
      compositePrompt = `INPUTS:
- IMAGE 1: A car detail/close-up (wheel, headlight, badge, mirror, grille). Original background is irrelevant — ignore it.
- IMAGE 2: A professional photography background.

DO:
- Place the EXACT detail subject on the background from Image 2, centered, filling 65-75% of frame.
- Add a subtle soft shadow beneath the detail.

DO NOT:
- Crop, mask, trim, or alter any pixel of the detail subject (color, texture, angle, lighting all stay).
- Modify the background.
- Add text, logos, watermarks.

OUTPUT: ${aspect}, clean, exact, professional product composition.${dimNote}`;
    } else {
      compositePrompt = `INPUTS:
- IMAGE 1: ${inputDescription}.
- IMAGE 2: A ${scene.name} background photograph — keep it as-is.

DO:
- Paste the car from Image 1 onto Image 2 as if Photoshop-composited.
- Position naturally on the ground plane, scale to fill ~60-70% of frame width.
- Add ${shadowDesc} so the car is grounded.
- Add gentle edge light-wrap matching the background's lighting direction.

DO NOT:
- Re-render, redraw, recolor, or restyle the car in any way (system rules apply).
- Crop or hide any part of the car (full bumper, full rear, all wheels visible).
- Color-grade the background, change atmosphere, or add weather/effects.
- Add text, logos, watermarks, UI, or extra props.

OUTPUT: ${aspect}, photorealistic composite. The car must be photographically identical to IMAGE 1.${dimNote}`;
    }

    console.log(`[GEMINI] Step 3: calling ${geminiModel} (cutout=${useCutout})...`);
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: geminiModel,
        // Low temperature → trognare mot input, mindre kreativ drift.
        temperature: 0.2,
        top_p: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: compositePrompt },
              { type: 'image_url', image_url: { url: carImageUrl } },
              { type: 'image_url', image_url: { url: backgroundUrl } },
            ],
          },
        ],
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

    if (jobId) {
      await supabase.from('processing_jobs').update({
        status: 'completed',
        engine: `gemini-${engineMode}`,
        final_url: finalUrl,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }

    // Clean up temp files (fire and forget)
    if (tempPaths.length) supabase.storage.from('processed-cars').remove(tempPaths).catch(() => {});

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

    if (tempPaths.length) supabase.storage.from('processed-cars').remove(tempPaths).catch(() => {});

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
