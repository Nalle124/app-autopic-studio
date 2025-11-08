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

    // Step 2: Remove background using Photoroom Sandbox API
    console.log('Removing background with Photoroom...');
    
    // Prepare FormData for Photoroom segment endpoint
    const photoroomFormData = new FormData();
    photoroomFormData.append('image_file', new Blob([imageBuffer], { type: imageFile.type }));
    
    const removeResponse = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
      },
      body: photoroomFormData,
    });

    if (!removeResponse.ok) {
      const errorText = await removeResponse.text();
      console.error('Photoroom remove background error:', errorText);
      
      // Handle specific error codes
      if (removeResponse.status === 402) {
        throw new Error(`Photoroom: Out of API credits. Visit https://app.photoroom.com/api-dashboard to upgrade.`);
      }
      if (removeResponse.status === 401) {
        throw new Error(`Photoroom: Invalid API key. Please check your API key.`);
      }
      
      throw new Error(`Background removal failed: ${removeResponse.status} - ${errorText}`);
    }

    const segmentedBuffer = await removeResponse.arrayBuffer();
    console.log('Background removed successfully with Photoroom sandbox API');

    // Step 3: Comprehensive AI analysis of car AND background
    console.log('Analyzing car and background with AI...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.warn('LOVABLE_API_KEY not found, using default positioning');
    }

    let carAnalysis = null;
    if (LOVABLE_API_KEY) {
      try {
        // Convert images to base64 for AI analysis
        const base64Segmented = btoa(
          new Uint8Array(segmentedBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        // Fetch and convert background image
        const bgResponse = await fetch(backgroundImageUrl);
        const bgBuffer = await bgResponse.arrayBuffer();
        const base64Background = btoa(
          new Uint8Array(bgBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analyze these two images for perfect car placement on the background:

IMAGE 1 (car with transparent background): Analyze the car's perspective, angle, and tire position.
IMAGE 2 (background scene): Analyze the ground/floor perspective, horizon line, lighting direction.

Your task is to determine the perfect placement to make it look like a professional photograph. Return ONLY a JSON object:

{
  "tireBottomPercent": [where bottom of tires are in car image, 0-100],
  "carHeightPercent": [car height in original image, 0-100],
  "recommendedScale": [scale factor 0.3-0.9 to match perspective],
  "shadowAngle": [shadow direction in degrees, -45 to 45, 0=straight down],
  "shadowLength": [shadow length multiplier, 0.1-0.3],
  "shadowBlur": [blur amount in pixels, 15-40],
  "shadowOpacity": [shadow strength, 0.2-0.5],
  "lightingMatch": [description of how to match lighting],
  "perspectiveNotes": [any perspective adjustments needed]
}

Be precise - this needs to look like a real photograph.`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/png;base64,${base64Segmented}`
                    }
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Background}`
                    }
                  }
                ]
              }
            ]
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log('AI comprehensive analysis response:', content);
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            carAnalysis = JSON.parse(jsonMatch[0]);
            console.log('Comprehensive car analysis:', carAnalysis);
          }
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }

    // Step 4: Save segmented image
    console.log('Uploading segmented image...');
    
    const finalFilename = `${crypto.randomUUID()}-${scene.id}.png`;
    const { data: finalUploadData, error: finalUploadError } = await supabase.storage
      .from('processed-cars')
      .upload(finalFilename, segmentedBuffer, {
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

    console.log('Image processed successfully:', finalPublicUrlData.publicUrl);

    // Clean up temp file
    await supabase.storage
      .from('processed-cars')
      .remove([uploadFilename]);

    return new Response(
      JSON.stringify({
        success: true,
        segmentedUrl: finalPublicUrlData.publicUrl,
        carAnalysis: carAnalysis,
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
