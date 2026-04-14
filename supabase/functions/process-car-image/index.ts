import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

// No fixed seed — let PhotoRoom vary each generation for better diversity.

// Compress image to JPEG for storage efficiency
async function compressToJpeg(
  imageBuffer: ArrayBuffer
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
  
  if (!PHOTOROOM_API_KEY) {
    console.warn('No PhotoRoom API key for compression, using original PNG');
    return { buffer: imageBuffer, contentType: 'image/png' };
  }

  try {
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('image_file', blob, 'image.png');
    formData.append('format', 'jpg');
    formData.append('quality', '85');

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: { 'x-api-key': PHOTOROOM_API_KEY },
      body: formData,
    });

    if (response.ok) {
      const compressedBuffer = await response.arrayBuffer();
      const origMB = (imageBuffer.byteLength / 1024 / 1024).toFixed(2);
      const newMB = (compressedBuffer.byteLength / 1024 / 1024).toFixed(2);
      console.log(`Compressed ${origMB}MB PNG → ${newMB}MB JPEG`);
      return { buffer: compressedBuffer, contentType: 'image/jpeg' };
    }
    console.warn('PhotoRoom compression failed, status:', response.status);
  } catch (err) {
    console.error('Compression failed:', err);
  }

  return { buffer: imageBuffer, contentType: 'image/png' };
}

/** Extract image data URL from AI gateway response message */
function extractImageFromAiMessage(message: any): string | null {
  if (message?.images?.length > 0) {
    return message.images[0].image_url?.url;
  }
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === "image_url") return part.image_url?.url;
    }
  }
  if (typeof message?.content === "string" && message.content.startsWith("data:image")) {
    return message.content;
  }
  return null;
}

/** Convert a data URL to an ArrayBuffer */
function dataUrlToBuffer(dataUrl: string): ArrayBuffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Track if we've deducted credits so we know if we need to refund
  let creditDeducted = false;
  let userId: string | null = null;
  let supabase: any = null;
  let jobId: string = '';

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Service role client for database operations (bypasses RLS)
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token via direct HTTP call (avoids service role session_id issues)
    const token = authHeader.replace('Bearer ', '');
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!authResponse.ok) {
      console.error('Auth validation failed:', authResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = await authResponse.json();
    if (!authUser?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user ID - never trust client-supplied userId
    userId = authUser.id;
    console.log(`Authenticated user: ${userId}`);

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundImageUrl = formData.get('backgroundUrl') as string;
    const projectId = formData.get('projectId') as string | null;
    const orientation = formData.get('orientation') as string || 'landscape';
    const relightEnabled = formData.get('relight') === 'true';
    const autoCrop = formData.get('autoCrop') === 'true';
    const autoCropPadding = formData.get('autoCropPadding') as string || '0.03';

    // New fields for parallel dispatch + server-side post-processing
    const interiorMode = formData.get('interiorMode') === 'true';
    const interiorBgType = formData.get('interiorBgType') as string || 'clean white';
    const plateStyle = formData.get('plateStyle') as string || '';
    const plateLogoBase64Str = formData.get('plateLogoBase64') as string || '';
    jobId = formData.get('jobId') as string || '';
    
    // Input validation
    if (!imageFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!interiorMode && (!sceneData || !backgroundImageUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image file — accept any image/* type (PhotoRoom validates further)
    // Also accept empty type since some browsers/canvas blobs may not set it
    if (imageFile.type && !imageFile.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file type. Only images are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 20MB for higher quality images)
    const maxFileSize = 20 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image too large. Maximum 20MB allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate backgroundUrl format (only for exterior mode)
    const isDataUri = !interiorMode && backgroundImageUrl?.startsWith('data:image/');
    if (!interiorMode && backgroundImageUrl && !isDataUri) {
      try {
        const bgUrl = new URL(backgroundImageUrl);
        if (!['http:', 'https:'].includes(bgUrl.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid background URL format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate projectId format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (projectId && !uuidRegex.test(projectId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid project ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (jobId && !uuidRegex.test(jobId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid job ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate scene data (only for exterior mode)
    let scene: SceneMetadata;
    if (interiorMode) {
      scene = {
        id: 'interior', name: 'Interior', horizonY: 50, baselineY: 65, defaultScale: 0.65,
        shadowPreset: { enabled: false, strength: 0, blur: 0, offsetX: 0, offsetY: 0 },
        reflectionPreset: { enabled: false, opacity: 0, fade: 0 },
      };
    } else {
      try {
        scene = JSON.parse(sceneData);
        if (!scene.id || typeof scene.id !== 'string' || scene.id.length > 100) {
          throw new Error('Invalid scene id');
        }
        if (scene.aiPrompt && (typeof scene.aiPrompt !== 'string' || scene.aiPrompt.length > 2000)) {
          throw new Error('Invalid AI prompt');
        }
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid scene data format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!interiorMode) {
      const { data: canonicalScene, error: canonicalSceneError } = await supabase
        .from('scenes')
        .select('ai_prompt, reference_scale, photoroom_shadow_mode, composite_mode, category, reflection_enabled')
        .eq('id', scene.id)
        .maybeSingle();

      if (canonicalSceneError) {
        console.warn('Could not load canonical scene config:', canonicalSceneError);
      } else if (canonicalScene) {
        scene = {
          ...scene,
          aiPrompt: canonicalScene.ai_prompt ?? scene.aiPrompt,
          referenceScale: canonicalScene.reference_scale != null
            ? Number(canonicalScene.reference_scale)
            : scene.referenceScale,
          shadowMode: canonicalScene.photoroom_shadow_mode ?? scene.shadowMode,
          compositeMode: canonicalScene.composite_mode ?? scene.compositeMode,
          reflectionPreset: {
            ...scene.reflectionPreset,
            enabled: canonicalScene.reflection_enabled ?? scene.reflectionPreset?.enabled ?? false,
          },
        };
        console.log('Using canonical scene config:', {
          sceneId: scene.id,
          category: canonicalScene.category,
          shadowMode: scene.shadowMode,
          reflectionEnabled: scene.reflectionPreset?.enabled,
        });
      }
    }

    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    if (!interiorMode && !PHOTOROOM_API_KEY) {
      throw new Error('PHOTOROOM_API_KEY not configured');
    }

    console.log(`Processing image: interior=${interiorMode}, scene=${scene.name}, plates=${plateStyle || 'none'}`);
    console.log(`Orientation: ${orientation}, Relight: ${relightEnabled}`);

    // Quick credit check BEFORE doing any work (actual deduction is atomic later)
    console.log(`Checking credits for user: ${userId}`);
    
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching credits:', creditsError);
      throw new Error('Kunde inte hämta credits. Försök igen.');
    }

    const currentCredits = creditsData?.credits || 0;
    console.log(`Current credits: ${currentCredits}`);

    if (currentCredits < 1) {
      // Update job status if pre-created
      if (jobId) {
        await supabase.from('processing_jobs').update({ status: 'failed', error_message: 'Inga credits kvar' }).eq('id', jobId);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: 'insufficient_credits',
          message: 'Du har inga credits kvar. Köp fler credits för att fortsätta.',
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update pre-created job status to 'processing'
    if (jobId) {
      await supabase.from('processing_jobs').update({ status: 'processing' }).eq('id', jobId);
    }

    // Step 1: Read image into buffer
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    console.log(`Image size: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    let finalImageBuffer: ArrayBuffer;
    let resolvedBackgroundUrl = backgroundImageUrl;
    let tempBgPath: string | null = null;

    if (interiorMode) {
      // ===== INTERIOR PROCESSING via AI Gateway =====
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const uint8 = new Uint8Array(imageBuffer);
      const b64 = base64Encode(uint8);
      const dataUrl = `data:${imageFile.type};base64,${b64}`;

      const origW = parseInt(formData.get('originalWidth') as string || '0');
      const origH = parseInt(formData.get('originalHeight') as string || '0');
      const dimNote = origW && origH ? ` The output MUST have the EXACT same dimensions (${origW}x${origH}).` : '';

      const prompt = `Look at this car image carefully. This is a photo of a car where the background is visible — either through windows, open doors, open trunk/boot, or because the car is only partially in frame. YOUR TASK: Replace ALL visible background (everything that is NOT the car itself or its interior) with a clean, ${interiorBgType} background. KEEP THE CAR AND ITS INTERIOR EXACTLY AS THEY ARE. Do NOT alter any part of the vehicle itself. Do NOT move, resize, crop, or reframe the image.${dimNote}`;

      console.log('Calling AI gateway for interior masking...');
      
      let aiResponse: Response | null = null;
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [
              { role: "system", content: "You are an image editing assistant. Preserve exact input image dimensions. Never crop, resize, or reframe." },
              { role: "user", content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ] },
            ],
            modalities: ["image", "text"],
          }),
        });
        
        if (aiResponse.ok) break;
        
        const errText = await aiResponse.text();
        console.error(`AI gateway error (attempt ${attempt}/${maxRetries}):`, aiResponse.status, errText);
        
        if ((aiResponse.status === 429 || aiResponse.status === 502 || aiResponse.status === 503) && attempt < maxRetries) {
          const backoffMs = Math.min(3000 * Math.pow(2, attempt - 1), 15000);
          console.log(`Retrying in ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        throw new Error(`Interior masking failed (${aiResponse.status})`);
      }

      if (!aiResponse || !aiResponse.ok) throw new Error("Interior masking failed after retries");

      const aiResult = await aiResponse.json();
      const resultUrl = extractImageFromAiMessage(aiResult.choices?.[0]?.message);

      if (!resultUrl) {
        console.error("No image in AI response:", JSON.stringify(aiResult).slice(0, 500));
        throw new Error("AI did not return an image for interior masking");
      }

      finalImageBuffer = dataUrlToBuffer(resultUrl);
      console.log('✅ Interior masking completed');

    } else {
      // ===== EXTERIOR PROCESSING via PhotoRoom =====
      console.log('Processing with Photoroom Studio model...');
    
      const photoroomFormData = new FormData();
      photoroomFormData.append('imageFile', imageBlob, imageFile.name);
      console.log('Sending image directly as file to PhotoRoom');
    
      console.log('Using standard reference-guided PhotoRoom flow for scene:', scene.id);

      if (isDataUri) {
        console.log('Background is a data URI, uploading to storage...');
        const matches = backgroundImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          tempBgPath = `temp/${crypto.randomUUID()}-bg.${ext}`;
          const { error: bgUploadError } = await supabase.storage
            .from('processed-cars')
            .upload(tempBgPath, bytes.buffer, {
              contentType: `image/${matches[1]}`,
              upsert: false,
            });
          if (bgUploadError) {
            console.error('Failed to upload data URI background:', bgUploadError);
            throw new Error('Failed to process background image');
          }
          const { data: bgUrlData } = supabase.storage
            .from('processed-cars')
            .getPublicUrl(tempBgPath);
          resolvedBackgroundUrl = bgUrlData.publicUrl;
          console.log('Background uploaded to:', resolvedBackgroundUrl);
        } else {
          throw new Error('Invalid data URI format for background');
        }
      }

      // Fetch the background image and send it as guidance reference for AI scene generation.
      // guidance mode lets PhotoRoom naturally integrate the car into the scene with correct
      // perspective, grounding, shadows and reflections — unlike static background.imageFile.
      console.log('[BG] Fetching background image for guidance mode...');
      const bgFetchResponse = await fetch(resolvedBackgroundUrl);
      if (!bgFetchResponse.ok) {
        throw new Error(`Failed to fetch background image: ${bgFetchResponse.status}`);
      }
      const bgBuffer = await bgFetchResponse.arrayBuffer();
      const bgContentType = bgFetchResponse.headers.get('content-type') || 'image/jpeg';
      const bgBlob = new Blob([bgBuffer], { type: bgContentType });
      photoroomFormData.append('background.guidance.imageFile', bgBlob, 'background.jpg');
      const guidanceScale = (scene.referenceScale || 0.95).toString();
      photoroomFormData.append('background.guidance.scale', guidanceScale);
      // IMPORTANT: Keep prompt minimal to prevent PhotoRoom from adding objects.
      // The guidance image already shows what we want — the prompt just sets the mood.
      const bgPrompt = 'empty car photography studio, no objects, no props';
      photoroomFormData.append('background.prompt', bgPrompt);
      console.log('[BG] Guidance mode — scale:', guidanceScale, ', prompt:', bgPrompt, ', size:', (bgBuffer.byteLength / 1024).toFixed(0) + 'KB');
      // Determine shadow/reflection mode
      // If scene has photoroom_shadow_mode set, use it directly.
      // If scene has reflection_enabled but no shadow mode, use ai.soft for reflections.
      let effectiveShadowMode = scene.shadowMode || 'none';
      const sceneReflectionEnabled = scene.reflectionPreset?.enabled === true;
      if (effectiveShadowMode === 'none' && sceneReflectionEnabled) {
        effectiveShadowMode = 'ai.soft';
        console.log('Scene has reflection enabled, adding ai.soft shadow for ground reflection');
      }
      const hasShadowOrReflection = effectiveShadowMode !== 'none' && effectiveShadowMode.startsWith('ai.');
      if (hasShadowOrReflection) {
        photoroomFormData.append('shadow.mode', effectiveShadowMode);
        console.log('Adding PhotoRoom shadow/reflection:', effectiveShadowMode);
      }
    
      // Padding + vertical alignment
      // Give more bottom padding when shadow/reflection is active so PhotoRoom has room
      if (autoCrop) {
        photoroomFormData.append('padding', autoCropPadding);
      } else {
        const padValue = orientation === 'portrait' ? '0.08' : '0.10';
        photoroomFormData.append('padding', padValue);
        if (hasShadowOrReflection) {
          // Let PhotoRoom handle vertical placement naturally for shadow/reflection
          photoroomFormData.append('paddingBottom', '0.05');
        } else {
          photoroomFormData.append('paddingBottom', '0.02');
        }
        photoroomFormData.append('verticalAlignment', 'bottom');
      }

      photoroomFormData.append('scaling', 'fit');
      photoroomFormData.append('referenceBox', autoCrop ? 'subjectBox' : 'originalImage');
      console.log(`Auto-crop: ${autoCrop}, shadow: ${effectiveShadowMode}, reflection: ${sceneReflectionEnabled}`);
    
      if (relightEnabled) {
        photoroomFormData.append('lighting.mode', 'ai.preserve-hue-and-saturation');
        console.log('AI Relight enabled with preserve-hue-and-saturation');
      }
    
      const originalWidth = parseInt(formData.get('originalWidth') as string || '0');
      const originalHeight = parseInt(formData.get('originalHeight') as string || '0');
      console.log('Original dimensions:', originalWidth, 'x', originalHeight);
    
      const maxWidth = 2500;
      const maxHeight = 2500;
    
      let outputWidth: number;
      let outputHeight: number;
    
      if (originalWidth > 0 && originalHeight > 0) {
        const aspectRatio = originalWidth / originalHeight;
        
        if (orientation === 'portrait') {
          outputHeight = Math.min(originalHeight, maxHeight);
          outputWidth = Math.round(outputHeight * aspectRatio);
          if (outputWidth > maxWidth) {
            outputWidth = maxWidth;
            outputHeight = Math.round(outputWidth / aspectRatio);
          }
        } else {
          outputWidth = Math.min(originalWidth, maxWidth);
          outputHeight = Math.round(outputWidth / aspectRatio);
          if (outputHeight > maxHeight) {
            outputHeight = maxHeight;
            outputWidth = Math.round(outputHeight * aspectRatio);
          }
        }
      } else {
        outputWidth = maxWidth;
        outputHeight = maxHeight;
      }
    
      const outputSize = `${outputWidth}x${outputHeight}`;
      photoroomFormData.append('outputSize', outputSize);
      console.log('Calculated output size:', outputSize);

      photoroomFormData.append('export.format', 'jpg');
      photoroomFormData.append('export.quality', '90');

      // === DETAILED PHOTOROOM REQUEST LOG ===
      const prParams: Record<string, string> = {};
      for (const [key, value] of photoroomFormData.entries()) {
        if (value instanceof Blob) {
          prParams[key] = `[Blob ${(value.size / 1024).toFixed(0)}KB ${value.type}]`;
        } else {
          prParams[key] = String(value);
        }
      }
      console.log('[PHOTOROOM-REQUEST]', JSON.stringify({
        flow: 'process-car-image',
        sceneId: scene.id,
        sceneName: scene.name,
        autoCrop,
        autoCropPadding,
        referenceBox: autoCrop ? 'subjectBox' : 'originalImage',
        shadowMode: scene.shadowMode || 'none',
        relightEnabled,
        orientation,
        outputSize,
        referenceScale: scene.referenceScale,
        params: prParams,
      }));
    
      const editResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
        method: 'POST',
        headers: {
          'x-api-key': PHOTOROOM_API_KEY!,
        },
        body: photoroomFormData,
      });

      if (!editResponse.ok) {
        const errorText = await editResponse.text();
        console.error('Photoroom error:', editResponse.status, errorText);
        
        if (editResponse.status === 402) {
          throw new Error(`Photoroom: Out of API credits.`);
        }
        if (editResponse.status === 401) {
          throw new Error(`Photoroom: Invalid API key.`);
        }
        
        throw new Error(`Bildbearbetning misslyckades. Ingen credit drogs. (${editResponse.status})`);
      }

      finalImageBuffer = await editResponse.arrayBuffer();
      console.log('✅ Photoroom processed successfully!');
      console.log(`Result size: ${(finalImageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    }

    // ===== SERVER-SIDE PLATE BLURRING =====
    if (plateStyle && !interiorMode) {
      console.log(`Applying server-side plate blur: style=${plateStyle}`);
      try {
        // Upload the image to storage temporarily to avoid base64-encoding large buffers in memory
        const tempPlatePath = `temp/${crypto.randomUUID()}-plate-input.jpg`;
        const { error: plateUploadErr } = await supabase.storage
          .from('processed-cars')
          .upload(tempPlatePath, finalImageBuffer, { contentType: 'image/jpeg', upsert: false });

        if (plateUploadErr) {
          console.warn('Failed to upload for plate blur, skipping:', plateUploadErr.message);
        } else {
          const { data: plateUrlData } = supabase.storage.from('processed-cars').getPublicUrl(tempPlatePath);
          const plateImageUrl = plateUrlData.publicUrl;

          const blurResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/blur-license-plates`, {
            method: 'POST',
            headers: {
              Authorization: authHeader!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: plateImageUrl,
              style: plateStyle,
              logoBase64: plateLogoBase64Str || null,
            }),
          });

          if (blurResp.ok) {
            const blurResult = await blurResp.json();
            if (blurResult.success && blurResult.imageUrl) {
              finalImageBuffer = dataUrlToBuffer(blurResult.imageUrl);
              console.log('✅ Plate blur applied server-side');
            } else {
              console.warn('Plate blur returned no image:', blurResult.error);
            }
          } else {
            console.warn('Plate blur function failed:', blurResp.status);
            await blurResp.text(); // consume body
          }

          // Clean up temp file
          await supabase.storage.from('processed-cars').remove([tempPlatePath]);
        }
      } catch (plateErr) {
        console.error('Plate blur error (non-fatal):', plateErr);
      }
    }

    // *** CRITICAL: Deduct credit NOW using atomic SQL function ***
    let newBalance: number;
    try {
      const { data: decrementResult, error: decrementError } = await supabase
        .rpc('decrement_credits', { p_user_id: userId });

      if (decrementError) {
        if (decrementError.message?.includes('insufficient_credits')) {
          // Update job if pre-created
          if (jobId) {
            await supabase.from('processing_jobs').update({ status: 'failed', error_message: 'Inga credits kvar' }).eq('id', jobId);
          }
          return new Response(
            JSON.stringify({
              success: false,
              error: 'insufficient_credits',
              message: 'Du har inga credits kvar.',
            }),
            {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        console.error('Error deducting credit:', decrementError);
        newBalance = -1;
      } else {
        newBalance = decrementResult;
        creditDeducted = true;
        console.log(`Credit deducted atomically. New balance: ${newBalance}`);
      }
      
      if (creditDeducted) {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -1,
          balance_after: newBalance!,
          transaction_type: 'generation',
          description: `Bildgenerering: ${scene.name}`,
        });
      }
    } catch (rpcError) {
      console.error('RPC decrement_credits failed:', rpcError);
    }

    // For interior images (AI gateway returns PNG), compress to JPEG.
    // Exterior images stay in the PhotoRoom export format to avoid metadata/format mismatches.
    let uploadBuffer: ArrayBuffer;
    let contentType: string;
    let fileExtension: string;
    if (interiorMode) {
      console.log('Compressing interior image to JPEG for storage...');
      const compressed = await compressToJpeg(finalImageBuffer);
      uploadBuffer = compressed.buffer;
      contentType = compressed.contentType;
      fileExtension = contentType === 'image/png' ? 'png' : 'jpg';
    } else {
      uploadBuffer = finalImageBuffer;
      contentType = 'image/jpeg';
      fileExtension = 'jpg';
    }
    
    const sanitizedSceneId = scene.id
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalFilename = `${crypto.randomUUID()}-${sanitizedSceneId}.${fileExtension}`;
    
    // Retry logic for upload
    let uploadSuccess = false;
    let finalUploadError: any = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Upload attempt ${attempt}...`);
      
      const { data: finalUploadData, error } = await supabase.storage
        .from('processed-cars')
        .upload(finalFilename, uploadBuffer, {
          contentType,
          upsert: false,
        });

      if (!error) {
        uploadSuccess = true;
        break;
      }
      
      finalUploadError = error;
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (error.message?.includes('exceeded') || error.statusCode === '413') {
        break;
      }
      
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!uploadSuccess) {
      console.error('All upload attempts failed:', finalUploadError);
      if (jobId) {
        await supabase.from('processing_jobs').update({ status: 'failed', error_message: 'Upload failed' }).eq('id', jobId);
      }
      throw new Error(`Bilden bearbetades men kunde inte sparas.`);
    }

    const { data: finalPublicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(finalFilename);

    console.log('✅ Final image uploaded:', finalPublicUrlData.publicUrl);

    // Generate thumbnail
    let thumbnailUrl: string | null = null;
    try {
      thumbnailUrl = `${finalPublicUrlData.publicUrl}?width=400&quality=70`;
    } catch (thumbError) {
      thumbnailUrl = finalPublicUrlData.publicUrl;
    }

    // Clean up temp background file if we uploaded one
    if (tempBgPath) {
      await supabase.storage.from('processed-cars').remove([tempBgPath]);
    }

    // Save or update processing_jobs
    let finalJobId: string | null = jobId || null;
    if (jobId) {
      // Update pre-created job
      const { error: updateError } = await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          final_url: finalPublicUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          completed_at: new Date().toISOString(),
          scene_id: scene.id,
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error updating job:', updateError);
      } else {
        console.log('✅ Job updated:', jobId);
      }
    } else {
      // Create new job record
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: userId,
          project_id: projectId || null,
          original_filename: imageFile.name,
          scene_id: scene.id,
          status: 'completed',
          final_url: finalPublicUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Error saving job:', jobError);
      } else {
        finalJobId = jobData.id;
        console.log('✅ Job saved:', finalJobId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: finalPublicUrlData.publicUrl,
        thumbnailUrl: thumbnailUrl,
        jobId: finalJobId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing image:', error);

    // Update job status if pre-created (jobId was captured earlier in the try block)
    if (supabase && jobId) {
      try {
        await supabase.from('processing_jobs').update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        }).eq('id', jobId);
      } catch {}
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});
