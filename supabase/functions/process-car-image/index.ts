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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const sceneData = formData.get('scene') as string;
    const backgroundImageUrl = formData.get('backgroundUrl') as string;
    
    if (!imageFile || !sceneData || !backgroundImageUrl) {
      throw new Error('Missing required fields');
    }

    const scene: SceneMetadata = JSON.parse(sceneData);
    const PHOTOROOM_API_KEY = Deno.env.get('PHOTOROOM_API_KEY');
    
    if (!PHOTOROOM_API_KEY) {
      throw new Error('PHOTOROOM_API_KEY not configured');
    }

    console.log(`Processing image for scene: ${scene.name}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Step 2: Process with Photoroom's AI Background API using reference image
    console.log('Processing with Photoroom AI Background with reference URL...');
    
    // Use background.guidance.imageUrl instead of uploading the file
    // This avoids any content-type issues
    const photoroomFormData = new FormData();
    photoroomFormData.append('imageFile', new Blob([imageBuffer], { type: imageFile.type }));
    
    // Use AI background with reference/guidance image URL
    photoroomFormData.append('background.guidance.imageUrl', backgroundImageUrl);
    // Set guidance to MAXIMUM strength - AI must follow reference exactly
    photoroomFormData.append('background.guidance.scale', '1.0');
    photoroomFormData.append('background.guidance.strength', '1.0');
    
    // Scene-specific prompts - detailed for problematic scenes, simple for working ones
    let scenePrompt = '';
    
    if (scene.id === 'outdoor-park' || scene.id === 'dark-studio') {
      // These work well - keep simple
      scenePrompt = 'Place the car naturally on the floor surface shown in the reference image. Match the reference exactly.';
    } else if (scene.id === 'ljus-marmor') {
      // Marble floor - needs very specific description
      scenePrompt = 'CRITICAL: The reference image shows a DARK MARBLE FLOOR with white veining patterns. The car MUST be placed on this EXACT dark marble surface. The marble floor texture with its natural stone veining MUST be visible under and around the car. Create a clear MIRROR REFLECTION of the car on the polished marble surface. DO NOT replace the marble with plain white, gray, or any other surface. Copy the exact dark marble texture, veining pattern, and reflective quality from the reference image.';
    } else if (scene.id === 'contrast') {
      // Wood floor with curtain - needs specific description
      scenePrompt = 'CRITICAL: The reference image shows a WOODEN PARQUET FLOOR with dark curtains in the background. The car MUST be placed on this EXACT wooden floor surface. The wood grain texture and parquet pattern MUST be visible. Create a clear MIRROR REFLECTION of the car on the glossy wood floor. The dark curtains MUST remain in the background. DO NOT replace with beach, gravel road, outdoor scene, or any other environment. This is an INDOOR STUDIO with wood flooring. Copy the exact wood texture, parquet pattern, curtain backdrop, and reflective floor from the reference image.';
    } else if (scene.id === 'vit-kakel') {
      // White tile - needs specific description  
      scenePrompt = 'CRITICAL: The reference image shows a WHITE TILE FLOOR with subtle tile joints/grout lines. The car MUST be placed on this EXACT white tile surface. The tile pattern and grout lines MUST be visible. Create a clear MIRROR REFLECTION of the car on the polished tile floor. DO NOT replace the tiles with plain white, matte surface, or any other material. This is a GLOSSY REFLECTIVE tile floor. Copy the exact tile texture, grout pattern, and mirror-like reflective quality from the reference image.';
    } else {
      // Fallback for any other scenes
      scenePrompt = 'Place the car naturally on the floor surface shown in the reference image. Match the reference exactly.';
    }
    
    photoroomFormData.append('background.prompt', scenePrompt);
    
    // Add padding to create natural spacing around the vehicle (10% on all sides)
    photoroomFormData.append('padding', '0.1');
    
    // Set positioning to fit the vehicle naturally within the frame
    photoroomFormData.append('scaling', 'fit');
    photoroomFormData.append('referenceBox', 'originalImage');
    
    // Request high quality output in landscape format (3:2 ratio)
    photoroomFormData.append('outputSize', '3072x2048');
    
    console.log('Photoroom request prepared with guidance URL:', backgroundImageUrl);
    
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
      console.error('Photoroom AI background error:', errorText);
      
      // Handle specific error codes
      if (editResponse.status === 402) {
        throw new Error(`Photoroom: Out of API credits. Visit https://app.photoroom.com/api-dashboard to upgrade.`);
      }
      if (editResponse.status === 401) {
        throw new Error(`Photoroom: Invalid API key. Please check your API key.`);
      }
      
      throw new Error(`AI background processing failed: ${editResponse.status} - ${errorText}`);
    }

    const finalImageBuffer = await editResponse.arrayBuffer();
    console.log('✅ Photoroom AI processed successfully with reference background!');

    // Step 3: Save final image (no AI analysis needed - Photoroom does it all!)
    console.log('Uploading final AI-processed image...');
    
    const finalFilename = `${crypto.randomUUID()}-${scene.id}.png`;
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

    return new Response(
      JSON.stringify({
        success: true,
        finalUrl: finalPublicUrlData.publicUrl,
        // No carAnalysis needed - Photoroom AI handles everything
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
