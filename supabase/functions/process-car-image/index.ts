import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  photoroomShadowMode?: string;
  referenceScale?: number;
  compositeMode?: boolean;
}

// Fixed seed for consistent results across generations (PhotoRoom recommended)
const PHOTOROOM_SEED = 117879368;

// Helper function to compress image if too large
async function compressImageIfNeeded(
  imageBuffer: ArrayBuffer,
  maxSizeBytes: number = 50 * 1024 * 1024 // 50MB threshold
): Promise<{ buffer: ArrayBuffer; contentType: string; wasCompressed: boolean }> {
  if (imageBuffer.byteLength <= maxSizeBytes) {
    return { buffer: imageBuffer, contentType: 'image/png', wasCompressed: false };
  }

  console.log(`Image too large (${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB), compressing to JPEG...`);
  
  // Use PhotoRoom's API to convert to JPEG with compression
  // This is a simple conversion - we re-encode as JPEG
  const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
  
  if (!PHOTOROOM_API_KEY) {
    // If no API key, just return the original
    console.warn('No PhotoRoom API key for compression, using original');
    return { buffer: imageBuffer, contentType: 'image/png', wasCompressed: false };
  }

  try {
    // Create a blob from the buffer
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    
    const formData = new FormData();
    formData.append('image_file', blob, 'image.png');
    formData.append('format', 'jpg');
    formData.append('quality', '85');

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
      },
      body: formData,
    });

    if (response.ok) {
      const compressedBuffer = await response.arrayBuffer();
      console.log(`Compressed to ${(compressedBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
      return { buffer: compressedBuffer, contentType: 'image/jpeg', wasCompressed: true };
    }
  } catch (err) {
    console.error('Compression failed:', err);
  }

  // Fallback: return original
  return { buffer: imageBuffer, contentType: 'image/png', wasCompressed: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Track if we've deducted credits so we know if we need to refund
  let creditDeducted = false;
  let userId: string | null = null;
  let originalCredits = 0;
  let supabase: any = null;

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user ID - never trust client-supplied userId
    userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundImageUrl = formData.get('backgroundUrl') as string;
    const projectId = formData.get('projectId') as string | null;
    const orientation = formData.get('orientation') as string || 'landscape';
    const relightEnabled = formData.get('relight') === 'true';
    
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

    // Validate file size (max 20MB for higher quality images)
    const maxFileSize = 20 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image too large. Maximum 20MB allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate backgroundUrl format
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

    // Validate projectId format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (projectId && !uuidRegex.test(projectId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid project ID format' }),
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
      if (scene.aiPrompt && (typeof scene.aiPrompt !== 'string' || scene.aiPrompt.length > 2000)) {
        throw new Error('Invalid AI prompt');
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid scene data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    
    if (!PHOTOROOM_API_KEY) {
      throw new Error('PHOTOROOM_API_KEY not configured');
    }

    console.log(`Processing image for scene: ${scene.name}`);
    console.log(`Shadow mode: ${scene.photoroomShadowMode || 'none'}`);
    console.log(`AI Prompt: ${scene.aiPrompt || 'default'}`);
    console.log(`Orientation: ${orientation}`);
    console.log(`Relight enabled: ${relightEnabled}`);

    // Check credits BEFORE doing any work (but don't deduct yet)
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

    originalCredits = creditsData?.credits || 0;
    console.log(`Current credits: ${originalCredits}`);

    if (originalCredits < 1) {
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

    // Step 1: Read image into buffer for direct upload to PhotoRoom
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    console.log(`Image size: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    // Step 2: Process with Photoroom's AI Background API
    console.log('Processing with Photoroom Studio model...');
    
    const photoroomFormData = new FormData();
    
    // Send image directly as file (avoids race condition with storage URL)
    photoroomFormData.append('imageFile', imageBlob, imageFile.name);
    console.log('Sending image directly as file to PhotoRoom');
    
    // Check if this scene uses composite mode (exact background, no AI generation)
    const useCompositeMode = scene.compositeMode === true;
    console.log('Composite mode:', useCompositeMode);

    if (useCompositeMode) {
      // Composite mode - use exact background image (no AI generation)
      // Hybrid approach: Step 1 - Use transparent background to get AI-positioned car with shadows
      // We'll composite onto exact background in step 2
      photoroomFormData.append('background.color', 'transparent');
      console.log('Using TRANSPARENT background for hybrid composite (step 1)');
    } else {
      // AI-generated background mode - use guidance
      photoroomFormData.append('background.guidance.imageUrl', backgroundImageUrl);
      const referenceScale = scene.referenceScale ?? 0.7;
      photoroomFormData.append('background.guidance.scale', referenceScale.toString());
      console.log('Reference scale:', referenceScale);
      
      photoroomFormData.append('background.seed', PHOTOROOM_SEED.toString());
      
      const basePrompt = scene.aiPrompt ||
        `Place the vehicle horizontally centered and resting on the ground with tires touching the floor. ` +
        `Realistic scale, perspective and lighting for professional automotive photography.`;

      const orientationHint = orientation === 'portrait'
        ? 'Vertical image: keep the entire vehicle visible with extra headroom; place the vehicle in the lower half of the frame.'
        : 'Horizontal image: keep the entire vehicle visible; place it centered and grounded.';

      const prompt = `${basePrompt} ${orientationHint}`;

      photoroomFormData.append('background.prompt', prompt);
      console.log('Using prompt:', prompt);
    }
    
    const shadowMode = scene.photoroomShadowMode || 'none';
    if (shadowMode !== 'none' && shadowMode.startsWith('ai.')) {
      photoroomFormData.append('shadow.mode', shadowMode);
      console.log('Adding PhotoRoom shadow:', shadowMode);
    }
    
    const paddingValue = orientation === 'portrait' ? '0.08' : '0.10';
    photoroomFormData.append('padding', paddingValue);
    
    photoroomFormData.append('scaling', 'fit');
    photoroomFormData.append('referenceBox', 'originalImage');
    
    if (relightEnabled) {
      photoroomFormData.append('lighting.mode', 'ai.preserve-hue-and-saturation');
      console.log('AI Relight enabled with preserve-hue-and-saturation');
    }
    
    const originalWidth = parseInt(formData.get('originalWidth') as string || '0');
    const originalHeight = parseInt(formData.get('originalHeight') as string || '0');
    console.log('Original dimensions:', originalWidth, 'x', originalHeight);
    
    // Max dimensions - reduced to 4000 to help with file size
    const maxWidth = 4000;
    const maxHeight = 4000;
    
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
    console.log('Calculated output size:', outputSize, '(original:', originalWidth, 'x', originalHeight, ')');
    
    // Request PNG output for lossless quality
    photoroomFormData.append('export.format', 'png');
    
    console.log('Photoroom request prepared:');
    console.log('- Reference URL:', backgroundImageUrl);
    console.log('- Seed:', PHOTOROOM_SEED);
    console.log('- Shadow mode:', shadowMode);
    console.log('- Padding:', paddingValue);
    console.log('- Orientation:', orientation);
    console.log('- Relight:', relightEnabled);
    console.log('- Composite mode:', useCompositeMode);
    console.log('- Output format: PNG');
    
    const editResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
        ...(useCompositeMode ? {} : { 'pr-ai-background-model-version': 'background-studio-beta-2025-03-17' }),
      },
      body: photoroomFormData,
    });

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('Photoroom error:', editResponse.status, errorText);
      
      // No temp file to clean up (image sent directly)
      
      if (editResponse.status === 402) {
        throw new Error(`Photoroom: Out of API credits. Visit https://app.photoroom.com/api-dashboard to upgrade.`);
      }
      if (editResponse.status === 401) {
        throw new Error(`Photoroom: Invalid API key. Please check your API key.`);
      }
      
      // PhotoRoom failed = no charge from them = no credit deduction from user
      throw new Error(`Bildbearbetning misslyckades. Ingen credit drogs. (${editResponse.status})`);
    }

    let finalImageBuffer = await editResponse.arrayBuffer();
    console.log('✅ Photoroom processed successfully!');
    console.log(`Result size: ${(finalImageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    // Step 2: If composite mode, composite the transparent car onto exact background
    if (useCompositeMode) {
      console.log('Starting step 2: Compositing onto exact background...');
      
      // Upload step 1 result (transparent car) to get a URL
      const step1Filename = `temp/${crypto.randomUUID()}-step1.png`;
      const { error: step1UploadError } = await supabase.storage
        .from('processed-cars')
        .upload(step1Filename, finalImageBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (step1UploadError) {
        console.error('Step 1 upload error:', step1UploadError);
        throw new Error(`Failed to upload step 1 result: ${step1UploadError.message}`);
      }

      const { data: step1UrlData } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(step1Filename);

      const transparentCarUrl = step1UrlData.publicUrl;
      console.log('Transparent car uploaded:', transparentCarUrl);

      // Step 2: Composite transparent car onto exact background
      const step2FormData = new FormData();
      step2FormData.append('imageUrl', transparentCarUrl);
      step2FormData.append('background.imageUrl', backgroundImageUrl);
      step2FormData.append('padding', '0'); // No additional padding - car is already positioned
      step2FormData.append('scaling', 'fill'); // Fill to preserve positioning from step 1
      step2FormData.append('outputSize', outputSize);
      step2FormData.append('export.format', 'png');

      console.log('Step 2 request: Compositing transparent car onto exact background');

      const step2Response = await fetch('https://image-api.photoroom.com/v2/edit', {
        method: 'POST',
        headers: {
          'x-api-key': PHOTOROOM_API_KEY,
        },
        body: step2FormData,
      });

      // Clean up step 1 temp file
      await supabase.storage.from('processed-cars').remove([step1Filename]);

      if (!step2Response.ok) {
        const errorText = await step2Response.text();
        console.error('Photoroom step 2 error:', step2Response.status, errorText);
        throw new Error(`Composite step 2 failed. (${step2Response.status})`);
      }

      finalImageBuffer = await step2Response.arrayBuffer();
      console.log('✅ Photoroom step 2 (composite) completed!');
      console.log(`Final result size: ${(finalImageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    }

    // *** CRITICAL: Deduct credit NOW - PhotoRoom has successfully processed and charged us ***
    const newBalance = originalCredits - 1;
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ credits: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error deducting credit:', updateError);
      // This is a serious issue - PhotoRoom charged us but we couldn't deduct
      // Log it but continue - we'll need to handle this manually
      console.error('CRITICAL: PhotoRoom processed image but credit deduction failed!');
    } else {
      creditDeducted = true;
      console.log(`Credit deducted. New balance: ${newBalance}`);
      
      // Log the transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -1,
        balance_after: newBalance,
        transaction_type: 'generation',
        description: `Bildgenerering: ${scene.name}`,
      });
    }

    // Step 3: Compress if needed and save final image
    console.log('Preparing final image for upload...');
    
    const { buffer: uploadBuffer, contentType, wasCompressed } = await compressImageIfNeeded(finalImageBuffer);
    const fileExtension = wasCompressed ? 'jpg' : 'png';
    
    // Sanitize scene ID for filename
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
      
      // Don't retry on size errors - they won't succeed
      if (error.message?.includes('exceeded') || error.statusCode === '413') {
        console.error('File size error - not retrying');
        break;
      }
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!uploadSuccess) {
      console.error('All upload attempts failed:', finalUploadError);
      // Credit was already deducted (PhotoRoom charged us), so we can't refund
      throw new Error(`Bilden bearbetades men kunde inte sparas. Din credit användes. Kontakta support om problemet kvarstår.`);
    }

    const { data: finalPublicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(finalFilename);

    console.log('✅ Final image uploaded:', finalPublicUrlData.publicUrl);

    // Step 4: Generate thumbnail
    console.log('Generating thumbnail...');
    let thumbnailUrl: string | null = null;
    
    try {
      const transformedUrl = `${finalPublicUrlData.publicUrl}?width=400&quality=70`;
      thumbnailUrl = transformedUrl;
      console.log('✅ Thumbnail URL generated:', thumbnailUrl);
    } catch (thumbError) {
      console.error('Thumbnail generation failed, using full URL:', thumbError);
      thumbnailUrl = finalPublicUrlData.publicUrl;
    }

    // No temp file to clean up (image sent directly to PhotoRoom)

    // Save to processing_jobs
    let jobId: string | null = null;
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
      jobId = jobData.id;
      console.log('✅ Job saved:', jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: finalPublicUrlData.publicUrl,
        thumbnailUrl: thumbnailUrl,
        jobId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing image:', error);
    
    // Note: We do NOT refund credits here because if we reached the credit deduction point,
    // it means PhotoRoom successfully processed and charged us.
    // The error would be in storage upload, which doesn't warrant a refund.
    
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
