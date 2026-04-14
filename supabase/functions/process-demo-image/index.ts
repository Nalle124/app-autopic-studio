import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

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
}

// No fixed seed — let PhotoRoom vary each generation for better diversity.

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per hour per IP

// In-memory rate limit store (resets on function cold start, but provides basic protection)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback - this may not be the real IP in production
  return 'unknown';
}

function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);
  
  // Clean up expired entries occasionally
  if (rateLimitStore.size > 1000) {
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetAt < now) {
        rateLimitStore.delete(ip);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    // New window - set up fresh limit
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { 
      allowed: true, 
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetIn: RATE_LIMIT_WINDOW_MS 
    };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      remaining: 0,
      resetIn: record.resetAt - now 
    };
  }
  
  record.count++;
  return { 
    allowed: true, 
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetIn: record.resetAt - now 
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(clientIp);
    
    console.log(`[DEMO] Request from IP: ${clientIp}, Rate limit remaining: ${rateLimit.remaining}`);
    
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil(rateLimit.resetIn / 60000);
      console.log(`[DEMO] Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Rate limit exceeded. Please try again in ${resetMinutes} minutes or create an account for more images.`,
          rateLimited: true,
          resetIn: rateLimit.resetIn
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString()
          } 
        }
      );
    }

    console.log('Demo image processing request received');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundImageUrl = formData.get('backgroundUrl') as string;
    const orientation = formData.get('orientation') as string || 'landscape';
    const relightEnabled = formData.get('relight') === 'true';
    const autoCrop = formData.get('autoCrop') === 'true';
    const autoCropPadding = formData.get('autoCropPadding') as string || '0.03';
    
    // Input validation
    if (!imageFile || !sceneData || !backgroundImageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image file
    // Validate image file — accept any image/* type (PhotoRoom validates further)
    if (imageFile.type && !imageFile.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file type. Only images are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image too large. Maximum 10MB allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate scene data
    let scene: SceneMetadata;
    try {
      scene = JSON.parse(sceneData);
      if (!scene.id || typeof scene.id !== 'string' || scene.id.length > 100) {
        throw new Error('Invalid scene id');
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid scene data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate background URL
    try {
      const bgUrl = new URL(backgroundImageUrl);
      if (!['http:', 'https:'].includes(bgUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid background URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    
    if (!PHOTOROOM_API_KEY) {
      throw new Error('PHOTOROOM_API_KEY not configured');
    }

    console.log(`[DEMO] Processing image for scene: ${scene.name}`);

    // Step 1: Read image into buffer and send directly as imageFile (matches process-car-image)
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    console.log(`[DEMO] Image size: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    // Step 2: Process with Photoroom's AI Background API
    console.log('[DEMO] Processing with Photoroom...');
    
    const photoroomFormData = new FormData();
    // Send car image as imageFile (consistent with process-car-image)
    photoroomFormData.append('imageFile', imageBlob, imageFile.name);

    // Use STATIC background mode — sends the exact reference image as the backdrop.
    // This prevents PhotoRoom's AI from being influenced by reflections on the car.
    const bgFetchResp = await fetch(backgroundImageUrl);
    if (!bgFetchResp.ok) throw new Error(`Failed to fetch background: ${bgFetchResp.status}`);
    const bgBuf = await bgFetchResp.arrayBuffer();
    const bgBlob = new Blob([bgBuf], { type: bgFetchResp.headers.get('content-type') || 'image/jpeg' });
    photoroomFormData.append('background.imageFile', bgBlob, 'background.jpg');
    
    // Determine shadow/reflection mode
    let effectiveShadowMode = scene.shadowMode || 'none';
    const sceneReflectionEnabled = scene.reflectionPreset?.enabled === true;
    if (effectiveShadowMode === 'none' && sceneReflectionEnabled) {
      effectiveShadowMode = 'ai.soft';
    }
    const hasShadowOrReflection = effectiveShadowMode !== 'none' && effectiveShadowMode.startsWith('ai.');
    if (hasShadowOrReflection) {
      photoroomFormData.append('shadow.mode', effectiveShadowMode);
    }
    
    // Padding + vertical alignment
    if (autoCrop) {
      photoroomFormData.append('padding', autoCropPadding);
    } else {
      const padValue = orientation === 'portrait' ? '0.08' : '0.10';
      photoroomFormData.append('padding', padValue);
      photoroomFormData.append('paddingBottom', hasShadowOrReflection ? '0.05' : '0.02');
      photoroomFormData.append('verticalAlignment', 'bottom');
    }
    photoroomFormData.append('scaling', 'fit');
    photoroomFormData.append('referenceBox', autoCrop ? 'subjectBox' : 'originalImage');
    
    if (relightEnabled) {
      photoroomFormData.append('lighting.mode', 'ai.preserve-hue-and-saturation');
    }
    
    // Dynamic output size matching process-car-image logic
    const maxWidth = 2500;
    const maxHeight = 2500;
    let outputWidth: number;
    let outputHeight: number;

    // Demo doesn't get original dimensions from client, use fixed aspect
    if (orientation === 'portrait') {
      outputWidth = 2048;
      outputHeight = 3072;
    } else {
      outputWidth = 3072;
      outputHeight = 2048;
    }
    // Cap to max
    if (outputWidth > maxWidth) { const r = maxWidth / outputWidth; outputWidth = maxWidth; outputHeight = Math.round(outputHeight * r); }
    if (outputHeight > maxHeight) { const r = maxHeight / outputHeight; outputHeight = maxHeight; outputWidth = Math.round(outputWidth * r); }

    const outputSize = `${outputWidth}x${outputHeight}`;
    photoroomFormData.append('outputSize', outputSize);

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
      flow: 'process-demo-image',
      sceneId: scene.id,
      sceneName: scene.name,
      autoCrop,
      autoCropPadding,
      backgroundMode: 'static',
      referenceBox: autoCrop ? 'subjectBox' : 'originalImage',
      effectiveShadowMode,
      relightEnabled,
      orientation,
      outputSize,
      referenceScale: scene.referenceScale,
      params: prParams,
    }));
    
    const editResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
      },
      body: photoroomFormData,
    });

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('[DEMO] Photoroom error:', editResponse.status, errorText);
      throw new Error(`AI background processing failed: ${editResponse.status}`);
    }

    const finalImageBuffer = await editResponse.arrayBuffer();
    console.log('[DEMO] ✅ Photoroom processed successfully!');

    // Step 3: Save final image
    const sanitizedSceneId = scene.id
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalFilename = `demo/${crypto.randomUUID()}-${sanitizedSceneId}.jpg`;
    const { data: finalUploadData, error: finalUploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, finalImageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (finalUploadError) {
      console.error('[DEMO] Final upload error:', finalUploadError);
      throw new Error(`Final upload failed: ${finalUploadError.message}`);
    }

    const { data: finalPublicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(finalFilename);

    console.log('[DEMO] ✅ Final image uploaded:', finalPublicUrlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: finalPublicUrlData.publicUrl,
        rateLimitRemaining: rateLimit.remaining,
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        },
      }
    );
  } catch (error) {
    console.error('[DEMO] Error processing image:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
