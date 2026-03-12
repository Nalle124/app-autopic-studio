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

    const padding = typeof paddingPercent === 'number' ? paddingPercent : 0.08;

    console.log('Auto-crop: analyzing image for car bounds');

    const aiBody = JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Detect the bounding box of the car in this image. Return ONLY a JSON object:
{"left": <0-1>, "top": <0-1>, "right": <0-1>, "bottom": <0-1>}
Values are percentages of image dimensions. Include the ENTIRE car including wheels, mirrors, roof. Exclude empty space.`
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
            description: "Report the bounding box of the car",
            parameters: {
              type: "object",
              properties: {
                left: { type: "number" },
                top: { type: "number" },
                right: { type: "number" },
                bottom: { type: "number" }
              },
              required: ["left", "top", "right", "bottom"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "report_car_bounds" } }
    });

    // Retry up to 3 times on transient errors (503, 429, etc.)
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

      // Non-retryable or final attempt — return a safe default crop instead of failing
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
    const right = Math.max(0, Math.min(1, bounds.right));
    const bottom = Math.max(0, Math.min(1, bounds.bottom));

    const carW = right - left;
    const carH = bottom - top;
    const carCenterX = (left + right) / 2;
    const carCenterY = (top + bottom) / 2;

    // Add padding relative to car size
    const padX = carW * padding;
    const padY = carH * padding;

    // Crop region preserving the car with padding
    let cropLeft = carCenterX - (carW / 2) - padX;
    let cropTop = carCenterY - (carH / 2) - padY;
    let cropW = carW + padX * 2;
    let cropH = carH + padY * 2;

    // Clamp to image bounds
    if (cropLeft < 0) { cropLeft = 0; }
    if (cropTop < 0) { cropTop = 0; }
    if (cropLeft + cropW > 1) { cropW = 1 - cropLeft; }
    if (cropTop + cropH > 1) { cropH = 1 - cropTop; }

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
