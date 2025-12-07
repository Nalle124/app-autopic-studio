import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { imageUrl, paddingLevel, targetAspectRatio } = await req.json();
    
    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Padding percentages based on level
    const paddingMap = {
      tight: 0.05,    // 5% padding
      medium: 0.10,   // 10% padding
      airy: 0.20      // 20% padding
    };

    const paddingPercent = paddingMap[paddingLevel as keyof typeof paddingMap] || 0.10;

    console.log('Analyzing image for auto-crop:', { imageUrl, paddingLevel, targetAspectRatio });

    // Use AI to detect the car's bounding box in the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this car image and detect the bounding box of the car. Return ONLY a JSON object with this exact structure:
{
  "carBounds": {
    "left": <percentage from left edge 0-1>,
    "top": <percentage from top edge 0-1>,
    "right": <percentage from left edge 0-1>,
    "bottom": <percentage from top edge 0-1>
  }
}

The car should be the main subject. Include the entire car but exclude unnecessary empty space.`
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_car_bounds",
              description: "Detect the bounding box of the car in the image",
              parameters: {
                type: "object",
                properties: {
                  carBounds: {
                    type: "object",
                    properties: {
                      left: { type: "number", description: "Left edge as percentage 0-1" },
                      top: { type: "number", description: "Top edge as percentage 0-1" },
                      right: { type: "number", description: "Right edge as percentage 0-1" },
                      bottom: { type: "number", description: "Bottom edge as percentage 0-1" }
                    },
                    required: ["left", "top", "right", "bottom"]
                  }
                },
                required: ["carBounds"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "detect_car_bounds" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));

    // Extract car bounds from tool call
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let carBounds = null;
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      carBounds = args.carBounds;
    }

    if (!carBounds) {
      console.error('No car bounds detected in AI response');
      throw new Error("Could not detect car in image");
    }

    console.log('Detected car bounds:', carBounds);

    // Calculate car dimensions
    const carWidth = carBounds.right - carBounds.left;
    const carHeight = carBounds.bottom - carBounds.top;
    const carCenterX = (carBounds.left + carBounds.right) / 2;
    const carCenterY = (carBounds.top + carBounds.bottom) / 2;

    // Add padding
    const paddedWidth = carWidth * (1 + paddingPercent * 2);
    const paddedHeight = carHeight * (1 + paddingPercent * 2);

    // Calculate target aspect ratio
    const targetRatio = targetAspectRatio === 'landscape' ? 16 / 9 : 9 / 16;

    // Determine which dimension should drive the crop
    const currentRatio = paddedWidth / paddedHeight;
    let finalWidth, finalHeight;

    if (currentRatio > targetRatio) {
      // Image is too wide, height drives
      finalHeight = paddedHeight;
      finalWidth = finalHeight * targetRatio;
    } else {
      // Image is too tall, width drives
      finalWidth = paddedWidth;
      finalHeight = finalWidth / targetRatio;
    }

    // Center the crop on the car with slight bias toward more space at top
    // (cars look better with more space above than below)
    const topBias = 0.55; // 55% of extra space goes to top
    const cropLeft = carCenterX - finalWidth / 2;
    const cropTop = carCenterY - finalHeight * topBias;

    // Ensure crop stays within image bounds (0-1)
    const adjustedLeft = Math.max(0, Math.min(1 - finalWidth, cropLeft));
    const adjustedTop = Math.max(0, Math.min(1 - finalHeight, cropTop));

    // Calculate zoom needed for react-easy-crop
    // Zoom represents how much the image needs to be scaled
    const zoom = 1 / Math.max(finalWidth, finalHeight);

    // Calculate position for react-easy-crop (percentage of visible area)
    const x = -(adjustedLeft / finalWidth) * 100;
    const y = -(adjustedTop / finalHeight) * 100;

    const cropData = {
      zoom: Math.max(1, Math.min(3, zoom)), // Clamp between 1-3
      x: Math.max(-50, Math.min(50, x)),    // Clamp to reasonable range
      y: Math.max(-50, Math.min(50, y)),
    };

    console.log('Calculated crop:', cropData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        crop: cropData,
        debug: { carBounds, paddingLevel, targetAspectRatio }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auto-crop error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Auto-crop failed",
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
