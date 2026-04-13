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

// Restored historical seed used in the previously stable PhotoRoom flow.
const PROCESSING_SEED = 117879368;

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

  // Track temp file for cleanup in finally block
  let uploadFilename: string | null = null;
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
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid image type. Allowed: JPEG, PNG, WebP' }),
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

    // Step 1: Upload original image to storage to get a URL
    const imageBuffer = await imageFile.arrayBuffer();
    uploadFilename = `demo-temp/${crypto.randomUUID()}-original.${imageFile.name.split('.').pop()}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('processed-cars')
      .upload(uploadFilename, imageBuffer, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(uploadFilename);

    const originalImageUrl = publicUrlData.publicUrl;
    console.log('[DEMO] Original image uploaded:', originalImageUrl);

    // Step 2: Process with Photoroom's AI Background API
    console.log('[DEMO] Processing with Photoroom...');
    
    const photoroomFormData = new FormData();
    photoroomFormData.append('imageUrl', originalImageUrl);
    photoroomFormData.append('background.guidance.imageUrl', backgroundImageUrl);
    
    const referenceScale = scene.referenceScale ?? 0.7;
    photoroomFormData.append('background.guidance.scale', referenceScale.toString());
    photoroomFormData.append('background.seed', PROCESSING_SEED.toString());
    
    const basePrompt = scene.aiPrompt ||
      `Place the vehicle horizontally centered and resting on the ground with tires touching the floor. ` +
      `Realistic scale, perspective and lighting for professional automotive photography.`;

    const orientationHint = orientation === 'portrait'
      ? 'Vertical image: keep the entire vehicle visible with extra headroom; place the vehicle in the lower half of the frame.'
      : 'Horizontal image: keep the entire vehicle visible; place it centered and grounded.';

    const prompt = `${basePrompt} ${orientationHint}`;
    photoroomFormData.append('background.prompt', prompt);
    
    photoroomFormData.append(
      'background.negativePrompt',
      'floating car, flying car, distorted, blurry'
    );
    
    const shadowMode = scene.shadowMode || 'none';
    if (shadowMode !== 'none' && shadowMode.startsWith('ai.')) {
      photoroomFormData.append('shadow.mode', shadowMode);
    }
    
    const paddingValue = autoCrop ? autoCropPadding : (orientation === 'portrait' ? '0.08' : '0.10');
    photoroomFormData.append('padding', paddingValue);
    photoroomFormData.append('scaling', 'fit');
    photoroomFormData.append('referenceBox', 'originalImage');
    
    if (relightEnabled) {
      photoroomFormData.append('lighting.mode', 'ai.preserve-hue-and-saturation');
    }
    
    const outputSize = orientation === 'portrait' ? '2048x3072' : '3072x2048';
    photoroomFormData.append('outputSize', outputSize);

    photoroomFormData.append('export.format', 'jpg');
    photoroomFormData.append('export.quality', '90');
    
    const editResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
        'pr-ai-background-model-version': 'background-studio-beta-2025-03-17',
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
    
    const finalFilename = `demo/${crypto.randomUUID()}-${sanitizedSceneId}.png`;
    const { data: finalUploadData, error: finalUploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, finalImageBuffer, {
        contentType: 'image/png',
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
  } finally {
    // Always clean up temp file, even on error
    if (uploadFilename && supabase) {
      try {
        await supabase.storage.from('processed-cars').remove([uploadFilename]);
        console.log(`[DEMO] Cleaned up temp file: ${uploadFilename}`);
      } catch (cleanupErr) {
        console.warn(`[DEMO] Failed to clean up temp file ${uploadFilename}:`, cleanupErr);
      }
    }
  }
});
