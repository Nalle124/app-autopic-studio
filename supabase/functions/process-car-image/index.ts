import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  photoroomShadowMode?: string; // 'none', 'ai.soft', 'ai.hard', 'ai.floating'
  referenceScale?: number; // How closely to match the reference image (0.0-1.0, default 1.0)
}

// Fixed seed for consistent results across generations (PhotoRoom recommended)
const PHOTOROOM_SEED = 117879368;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundImageUrl = formData.get('backgroundUrl') as string;
    const projectId = formData.get('projectId') as string | null;
    const userId = formData.get('userId') as string | null;
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

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024;
    if (imageFile.size > maxFileSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image too large. Maximum 10MB allowed' }),
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

    // Validate userId format if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate projectId format if provided
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check and deduct credits if user is logged in
    if (userId) {
      console.log(`Checking credits for user: ${userId}`);
      
      // Get current credits
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

      // Deduct 1 credit
      const newBalance = currentCredits - 1;
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error deducting credit:', updateError);
        throw new Error('Kunde inte dra credit. Försök igen.');
      }

      // Log the transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -1,
        balance_after: newBalance,
        transaction_type: 'generation',
        description: `Bildgenerering: ${scene.name}`,
      });

      console.log(`Credit deducted. New balance: ${newBalance}`);
    }

    // Step 1: Upload original image to storage to get a URL
    const imageBuffer = await imageFile.arrayBuffer();
    const uploadFilename = `temp/${crypto.randomUUID()}-original.${imageFile.name.split('.').pop()}`;
    
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
    console.log('Original image uploaded:', originalImageUrl);

    // Step 2: Process with Photoroom's AI Background API
    console.log('Processing with Photoroom Studio model...');
    
    const photoroomFormData = new FormData();
    
    // Use imageUrl instead of imageFile - more reliable with Deno
    // We already uploaded the image to storage, so use that public URL
    photoroomFormData.append('imageUrl', originalImageUrl);
    console.log('Using imageUrl:', originalImageUrl);
    
    // Use reference/guidance image for background
    photoroomFormData.append('background.guidance.imageUrl', backgroundImageUrl);
    const referenceScale = scene.referenceScale ?? 1.0;
    photoroomFormData.append('background.guidance.scale', referenceScale.toString());
    console.log('Reference scale:', referenceScale);
    
    // Fixed seed for consistent results
    photoroomFormData.append('background.seed', PHOTOROOM_SEED.toString());
    
    // Scene-specific AI prompt (or default if not provided)
    const prompt = scene.aiPrompt ||
      `Place this vehicle naturally in the scene. The car should be positioned on the ground level, ` +
      `centered in the frame, with proper perspective matching the environment. ` +
      `Maintain realistic lighting and scale.`;
    
    photoroomFormData.append('background.prompt', prompt);
    console.log('Using prompt:', prompt);
    
    // Negative prompt to prevent common issues
    photoroomFormData.append('background.negativePrompt', 
      'floating car, flying car, car on roof, car in sky, distorted, blurry, unrealistic scale, ' +
      'wrong perspective, car too small, car too large, multiple cars'
    );
    
    // Add PhotoRoom AI shadow if specified
    const shadowMode = scene.photoroomShadowMode || 'none';
    if (shadowMode !== 'none' && shadowMode.startsWith('ai.')) {
      photoroomFormData.append('shadow.mode', shadowMode);
      console.log('Adding PhotoRoom shadow:', shadowMode);
    }
    
    // Fixed padding based on orientation - 5% for portrait, 10% for landscape
    const paddingValue = orientation === 'portrait' ? '0.05' : '0.1';
    photoroomFormData.append('padding', paddingValue);
    
    // Set positioning to fit the vehicle naturally within the frame
    photoroomFormData.append('scaling', 'fit');
    photoroomFormData.append('referenceBox', 'originalImage');
    
    // Add AI relight if enabled (preserve hue and saturation for accurate car colors)
    if (relightEnabled) {
      photoroomFormData.append('lighting.mode', 'ai.preserve-hue-and-saturation');
      console.log('AI Relight enabled with preserve-hue-and-saturation');
    }
    
    // Output size based on orientation
    const outputSize = orientation === 'portrait' ? '2048x3072' : '3072x2048';
    photoroomFormData.append('outputSize', outputSize);
    console.log('Output size:', outputSize);
    
    console.log('Photoroom request prepared:');
    console.log('- Reference URL:', backgroundImageUrl);
    console.log('- Seed:', PHOTOROOM_SEED);
    console.log('- Shadow mode:', shadowMode);
    console.log('- Padding:', paddingValue);
    console.log('- Orientation:', orientation);
    console.log('- Relight:', relightEnabled);
    
    const editResponse = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
        // Use the Studio model for best photorealistic results
        'pr-ai-background-model-version': 'background-studio-beta-2025-03-17',
      },
      body: photoroomFormData,
    });

    if (!editResponse.ok) {
      const errorText = await editResponse.text();
      console.error('Photoroom error:', editResponse.status, errorText);
      
      if (editResponse.status === 402) {
        throw new Error(`Photoroom: Out of API credits. Visit https://app.photoroom.com/api-dashboard to upgrade.`);
      }
      if (editResponse.status === 401) {
        throw new Error(`Photoroom: Invalid API key. Please check your API key.`);
      }
      
      throw new Error(`AI background processing failed: ${editResponse.status} - ${errorText}`);
    }

    const finalImageBuffer = await editResponse.arrayBuffer();
    console.log('✅ Photoroom processed successfully!');

    // Step 3: Save final image
    console.log('Uploading final image...');
    
    // Sanitize scene ID for filename
    const sanitizedSceneId = scene.id
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalFilename = `${crypto.randomUUID()}-${sanitizedSceneId}.png`;
    const { data: finalUploadData, error: finalUploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, finalImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (finalUploadError) {
      console.error('Final upload error:', finalUploadError);
      throw new Error(`Final upload failed: ${finalUploadError.message}`);
    }

    const { data: finalPublicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(finalFilename);

    console.log('✅ Final image uploaded:', finalPublicUrlData.publicUrl);

    // Clean up temp file
    await supabase.storage
      .from('processed-cars')
      .remove([uploadFilename]);

    // Save to processing_jobs if user is logged in
    let jobId: string | null = null;
    if (userId) {
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: userId,
          project_id: projectId || null,
          original_filename: imageFile.name,
          scene_id: scene.id,
          status: 'completed',
          final_url: finalPublicUrlData.publicUrl,
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: finalPublicUrlData.publicUrl,
        jobId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing image:', error);
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
