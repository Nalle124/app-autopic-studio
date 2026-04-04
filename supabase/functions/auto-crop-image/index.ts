import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, paddingPercent } = await req.json();
    
    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const padding = typeof paddingPercent === 'number' ? paddingPercent : 0.03;

    console.log('Auto-crop: analyzing image for car bounds');

    const aiBody = JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this car photograph. Find the TIGHT bounding box that contains the ENTIRE vehicle including ALL wheels (where tires touch ground), ALL side mirrors, roof, and any protruding parts. The bounding box should be as TIGHT as possible while still including the complete car. Add only about 2-3% padding on each side — just enough so nothing is cut off, but keep it tight and close to the car. The car should be roughly centered. Return ONLY a JSON object with normalized values (0 to 1): {"left": <number>, "top": <number>, "right": <number>, "bottom": <number>}`
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
            name: "report_car_bounds",
            description: "Report the bounding box of the entire car including wheels, mirrors, and roof",
            parameters: {
              type: "object",
              properties: {
                left: { type: "number", description: "Left edge of car as fraction of image width (0-1)" },
                top: { type: "number", description: "Top edge of car as fraction of image height (0-1)" },
                right: { type: "number", description: "Right edge of car as fraction of image width (0-1)" },
                bottom: { type: "number", description: "Bottom edge of car as fraction of image height (0-1)" }
              },
              required: ["left", "top", "right", "bottom"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "report_car_bounds" } }
    });

    let response: Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`AI request attempt ${attempt}/3`);
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: aiBody,
      });

      if (response.ok) break;

      const errorText = await response.text();
      console.error(`AI API error (attempt ${attempt}):`, response.status, errorText);

      if (attempt < 3 && (response.status === 503 || response.status === 429 || response.status >= 500)) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.warn('AI analysis failed after retries, returning default center crop');
      return new Response(
        JSON.stringify({ 
          success: true, 
          crop: { left: 0.05, top: 0.05, width: 0.9, height: 0.9 } 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Could not detect car in image");
    }

    const bounds = JSON.parse(toolCall.function.arguments);
    console.log('Detected car bounds:', bounds);

    // Validate bounds
    const left = Math.max(0, Math.min(1, bounds.left));
    const top = Math.max(0, Math.min(1, bounds.top));
    const right = Math.max(left + 0.1, Math.min(1, bounds.right));
    const bottom = Math.max(top + 0.1, Math.min(1, bounds.bottom));

    const carW = right - left;
    const carH = bottom - top;

    // Validate: car should occupy at least 20% of image in both dimensions
    if (carW < 0.2 || carH < 0.15) {
      console.warn('Detected car bounds too small, likely inaccurate. Returning safe default.');
      return new Response(
        JSON.stringify({ 
          success: true, 
          crop: { left: 0.03, top: 0.03, width: 0.94, height: 0.94 } 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const carCenterX = (left + right) / 2;
    const carCenterY = (top + bottom) / 2;

    // Add padding relative to car size
    const padX = carW * padding;
    const padY = carH * padding;

    let cropLeft = carCenterX - (carW / 2) - padX;
    let cropTop = carCenterY - (carH / 2) - padY;
    let cropW = carW + padX * 2;
    let cropH = carH + padY * 2;

    // Clamp to image bounds
    if (cropLeft < 0) { cropLeft = 0; }
    if (cropTop < 0) { cropTop = 0; }
    if (cropLeft + cropW > 1) { cropW = 1 - cropLeft; }
    if (cropTop + cropH > 1) { cropH = 1 - cropTop; }

    // Final validation: crop must be at least 30% of image
    if (cropW < 0.3 || cropH < 0.3) {
      console.warn('Crop region too small after calculation, expanding to safe minimum.');
      cropLeft = Math.max(0, carCenterX - 0.45);
      cropTop = Math.max(0, carCenterY - 0.45);
      cropW = Math.min(0.9, 1 - cropLeft);
      cropH = Math.min(0.9, 1 - cropTop);
    }

    const cropData = {
      left: cropLeft,
      top: cropTop,
      width: cropW,
      height: cropH,
    };

    console.log('Calculated crop region:', cropData);

    return new Response(
      JSON.stringify({ success: true, crop: cropData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auto-crop error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Auto-crop failed",
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
