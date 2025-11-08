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
                role: 'system',
                content: 'You are a computer vision expert. Analyze images precisely and return ONLY valid JSON, no markdown formatting or extra text.'
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are analyzing two images to create a realistic car composite. IMAGE 1 is a car with transparent background. IMAGE 2 is the background scene where the car will be placed.

CRITICAL ANALYSIS STEPS:

1. CAR TIRE POSITION (IMAGE 1):
   - Identify the BOTTOM edge of the car's tires/wheels
   - Measure from the TOP of the image (0%) to where the tire bottoms touch the ground
   - This MUST be accurate - typically between 70-85% for most car angles
   - If you see the car from a low angle, tires might be at 65-75%
   - If you see the car from above, tires might be at 75-85%

2. BACKGROUND PERSPECTIVE (IMAGE 2):
   - Find the horizon line and ground plane
   - Determine if it's: ground-level view, slightly elevated, or high angle
   - Note the perspective vanishing point
   - The baseline is at ${scene.baselineY}% from top - this is where tires will land

3. SCALE CALCULATION:
   - Match car size to background perspective
   - Ground-level backgrounds: use 0.5-0.7 scale
   - Elevated backgrounds: use 0.4-0.6 scale
   - The car should look naturally sized for the scene depth

4. SHADOW ANALYSIS (IMAGE 2):
   - Identify primary light direction (analyze highlights/shadows in the scene)
   - shadowAngle: -45 to +45 degrees (negative=left, positive=right, 0=center)
   - shadowLength: 0.1-0.4 (shorter for overhead sun, longer for low sun)
   - shadowBlur: 15-35px (sharper for direct sun, softer for overcast)
   - shadowOpacity: 0.2-0.5 (lighter for bright scenes, darker for dim scenes)

Return ONLY valid JSON with these exact keys (no markdown, no backticks, no explanation):
{"tireBottomPercent":78,"carHeightPercent":55,"recommendedScale":0.55,"shadowAngle":-15,"shadowLength":0.25,"shadowBlur":22,"shadowOpacity":0.32}`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${base64Segmented}` }
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64Background}` }
                  }
                ]
              }
            ]
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log('=== AI ANALYSIS RESPONSE ===');
          console.log('Raw content:', content);
          
          // Clean and extract JSON - handle markdown code blocks
          let jsonStr = content.trim();
          jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          jsonStr = jsonStr.trim();
          
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            carAnalysis = JSON.parse(jsonMatch[0]);
            console.log('Parsed AI analysis:', carAnalysis);
            
            // Validate and set defaults for any missing fields
            carAnalysis = {
              tireBottomPercent: carAnalysis.tireBottomPercent || 78,
              carHeightPercent: carAnalysis.carHeightPercent || 50,
              recommendedScale: carAnalysis.recommendedScale || 0.55,
              shadowAngle: carAnalysis.shadowAngle ?? 0,
              shadowLength: carAnalysis.shadowLength ?? 0.2,
              shadowBlur: carAnalysis.shadowBlur || 25,
              shadowOpacity: carAnalysis.shadowOpacity || 0.35,
            };
            
            console.log('=== FINAL VALIDATED ANALYSIS ===');
            console.log('Tire position:', carAnalysis.tireBottomPercent + '%');
            console.log('Scale:', carAnalysis.recommendedScale);
            console.log('Shadow angle:', carAnalysis.shadowAngle + '°');
            console.log('Shadow length:', carAnalysis.shadowLength);
            console.log('================================');
          } else {
            console.error('Failed to extract JSON from AI response');
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('AI API error:', aiResponse.status, errorText);
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
