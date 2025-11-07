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
    const CLAID_API_KEY = Deno.env.get('CLAID_API_KEY');
    
    if (!CLAID_API_KEY) {
      throw new Error('CLAID_API_KEY not configured');
    }

    console.log(`Processing image for scene: ${scene.name}`);

    // Step 1: Remove background using Claid.ai
    const removeFormData = new FormData();
    removeFormData.append('file', imageFile);
    removeFormData.append('operations', JSON.stringify({
      resizing: {
        width: 2048,
        height: 2048,
        fit: 'contain'
      },
      removeBackground: {
        mode: 'car'
      }
    }));

    console.log('Removing background...');
    const removeResponse = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLAID_API_KEY}`,
      },
      body: removeFormData,
    });

    if (!removeResponse.ok) {
      const errorText = await removeResponse.text();
      console.error('Claid.ai remove background error:', errorText);
      throw new Error(`Background removal failed: ${removeResponse.status}`);
    }

    const removeResult = await removeResponse.json();
    console.log('Background removed successfully');

    // Step 2: Fetch the segmented image
    const segmentedImageUrl = removeResult.data.output.tmp_url;
    const segmentedImageResponse = await fetch(segmentedImageUrl);
    const segmentedImageBlob = await segmentedImageResponse.blob();

    // Step 3: Composite with background using Claid.ai
    const compositeFormData = new FormData();
    compositeFormData.append('file', segmentedImageBlob, 'segmented.png');
    
    const operations: any = {
      resizing: {
        width: 2048,
        height: 2048,
        fit: 'contain'
      },
      background: {
        image_url: backgroundImageUrl,
        mode: 'fit'
      }
    };

    // Add shadow if enabled
    if (scene.shadowPreset.enabled) {
      operations.adjustments = {
        shadow: {
          opacity: scene.shadowPreset.strength,
          blur: scene.shadowPreset.blur,
          offset_x: scene.shadowPreset.offsetX,
          offset_y: scene.shadowPreset.offsetY
        }
      };
    }

    compositeFormData.append('operations', JSON.stringify(operations));

    console.log('Compositing with background...');
    const compositeResponse = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLAID_API_KEY}`,
      },
      body: compositeFormData,
    });

    if (!compositeResponse.ok) {
      const errorText = await compositeResponse.text();
      console.error('Claid.ai composite error:', errorText);
      throw new Error(`Compositing failed: ${compositeResponse.status}`);
    }

    const compositeResult = await compositeResponse.json();
    console.log('Compositing completed successfully');

    // Step 4: Upload result to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const finalImageUrl = compositeResult.data.output.tmp_url;
    const finalImageResponse = await fetch(finalImageUrl);
    const finalImageBlob = await finalImageResponse.blob();
    const finalImageBuffer = await finalImageBlob.arrayBuffer();

    const filename = `${crypto.randomUUID()}-${scene.id}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('processed-cars')
      .upload(filename, finalImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(filename);

    console.log('Image uploaded successfully:', publicUrlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrlData.publicUrl,
        segmentedUrl: segmentedImageUrl,
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
