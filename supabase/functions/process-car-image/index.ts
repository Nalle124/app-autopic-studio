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

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Step 1: Remove background using Claid.ai
    console.log('Removing background...');
    const removePayload = {
      input: imageDataUrl,
      operations: {
        resizing: {
          width: 2048,
          height: 2048,
          fit: 'contain'
        },
        removeBackground: {
          clipping: true
        }
      }
    };

    const removeResponse = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLAID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(removePayload),
    });

    if (!removeResponse.ok) {
      const errorText = await removeResponse.text();
      console.error('Claid.ai remove background error:', errorText);
      throw new Error(`Background removal failed: ${removeResponse.status}`);
    }

    const removeResult = await removeResponse.json();
    console.log('Background removed successfully:', removeResult);

    // Step 2: Get the segmented image URL
    const segmentedImageUrl = removeResult.data.output.tmp_url;
    console.log('Segmented image URL:', segmentedImageUrl);

    // Step 3: Composite with background - fetch background as base64
    console.log('Fetching background image:', backgroundImageUrl);
    const bgResponse = await fetch(backgroundImageUrl);
    if (!bgResponse.ok) {
      throw new Error(`Failed to fetch background: ${bgResponse.status}`);
    }
    const bgBuffer = await bgResponse.arrayBuffer();
    const bgBase64 = btoa(String.fromCharCode(...new Uint8Array(bgBuffer)));
    const bgDataUrl = `data:image/jpeg;base64,${bgBase64}`;

    const compositePayload: any = {
      input: segmentedImageUrl,
      operations: {
        resizing: {
          width: 2048,
          height: 2048,
          fit: 'contain'
        },
        background: {
          prompt: 'none',
          image: bgDataUrl
        }
      }
    };

    console.log('Compositing with background...');
    const compositeResponse = await fetch('https://api.claid.ai/v1-beta1/image/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLAID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(compositePayload),
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
