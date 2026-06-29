import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { removeBackground } from "../_shared/bg-removal.ts";

/**
 * Flux Creative pipeline via Replicate (Flux Kontext Pro).
 * Cutout-first composite: dedicated bg-removal → clean car cutout →
 *   Flux Kontext Pro composites onto the background reference.
 *
 * FormData (compatible with process-car-gemini):
 *   image, scene (json), backgroundUrl, orientation?, jobId?, imageType?
 */

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const POLL_MAX_SECONDS = 180;

interface SceneMetadata {
  id: string;
  name: string;
  aiPrompt?: string;
  shadowMode?: string;
  reflectionPreset?: { enabled: boolean };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let jobId: string | null = null;
  let userId: string | null = null;
  let creditDeducted = false;
  const tempPaths: string[] = [];

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!LOVABLE_API_KEY || !REPLICATE_API_KEY) {
      throw new Error("Replicate connector inte konfigurerad");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ej autentiserad");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Ej autentiserad");
    userId = user.id;
    console.log("[FLUX] user:", userId);

    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const sceneData = formData.get("scene") as string;
    const backgroundUrl = formData.get("backgroundUrl") as string;
    const orientation = (formData.get("orientation") as string) || "landscape";
    jobId = (formData.get("jobId") as string) || null;
    const imageType = (formData.get("imageType") as string) || "exterior";

    if (!imageFile || !sceneData || !backgroundUrl) {
      throw new Error("Saknade fält: image, scene, backgroundUrl");
    }
    const scene: SceneMetadata = JSON.parse(sceneData);
    console.log(`[FLUX] scene=${scene.name} orientation=${orientation}`);

    if (jobId) {
      await supabase.from("processing_jobs").update({ status: "processing" }).eq("id", jobId);
    }

    // Credits
    const { data: cd } = await supabase.from("user_credits").select("credits").eq("user_id", userId).single();
    if ((cd?.credits || 0) <= 0) throw new Error("Inga credits kvar");
    const { error: cErr } = await supabase.rpc("decrement_credits", { p_user_id: userId });
    if (cErr) throw new Error("Kunde inte dra credit");
    creditDeducted = true;

    const startTime = Date.now();

    // Upload original car so Replicate can fetch it
    const imageBuffer = await imageFile.arrayBuffer();
    const srcExt = (imageFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const sourcePath = `flux-source/${crypto.randomUUID()}.${srcExt}`;
    tempPaths.push(sourcePath);
    const { error: upErr } = await supabase.storage
      .from("processed-cars")
      .upload(sourcePath, imageBuffer, { contentType: imageFile.type || "image/jpeg", upsert: false });
    if (upErr) throw new Error(`Upload misslyckades: ${upErr.message}`);
    const { data: srcUrlData } = supabase.storage.from("processed-cars").getPublicUrl(sourcePath);
    const sourceImageUrl = srcUrlData.publicUrl;

    // Cutout-first (skip for detail shots — they're already isolated subjects)
    const isDetail = imageType === "detail";
    let carImageUrl = sourceImageUrl;
    if (!isDetail) {
      console.log("[FLUX] removing background via Replicate...");
      const cutout = await removeBackground(sourceImageUrl);
      if (cutout) {
        const cutoutPath = `flux-cutout/${crypto.randomUUID()}.png`;
        tempPaths.push(cutoutPath);
        const { error: cutUpErr } = await supabase.storage
          .from("processed-cars")
          .upload(cutoutPath, cutout.buffer, { contentType: "image/png", upsert: false });
        if (!cutUpErr) {
          const { data: cutUrl } = supabase.storage.from("processed-cars").getPublicUrl(cutoutPath);
          carImageUrl = cutUrl.publicUrl;
        } else {
          console.warn("[FLUX] cutout upload failed, using original:", cutUpErr.message);
        }
      } else {
        console.warn("[FLUX] cutout failed, falling back to original");
      }
    }

    const aspect = orientation === "portrait" ? "2:3" : "3:2";

    // Simplified prompt — focuses ONLY on composite behaviour.
    // We deliberately drop scene.aiPrompt: the background reference already
    // carries the look, and scene prompts (originally written for PhotoRoom)
    // tend to make Flux re-render the car or invent extra props.
    const shadowKind = scene.reflectionPreset?.enabled
      ? "a soft natural floor reflection"
      : "a natural ground shadow";

    const prompt = isDetail
      ? `Place this product detail photograph centered on the provided background. Keep the detail pixel-perfect — do not crop, recolor, or alter it. Add a subtle natural shadow. No text, no logos, no watermarks, no extra props.`
      : `Composite the car from the first image onto the second image (the background). The car must be photographically identical to the input — same color, same angle, same details, full extent, no cropping, no recoloring, no restyling. Position the car naturally on the ground plane. Add ${shadowKind} beneath the car. Keep the background clean and unchanged. No text, no logos, no watermarks, no extra props.`;

    console.log("[FLUX] creating prediction (Kontext Pro)...");
    const createRes = await fetch(`${GATEWAY}/models/black-forest-labs/flux-kontext-pro/predictions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": REPLICATE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          input_image: carImageUrl,
          input_image_2: backgroundUrl,
          aspect_ratio: aspect,
          output_format: "jpg",
          output_quality: 95,
          safety_tolerance: 2,
          // Tighter params: trognare mot input-bilderna, mindre kreativ tolkning.
          guidance: 3.5,
          num_inference_steps: 30,
          prompt_upsampling: false,
        },
      }),
    });

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      console.error("[FLUX] create failed", createRes.status, errTxt);
      throw new Error(`Flux create misslyckades (${createRes.status})`);
    }
    const created = await createRes.json();
    const predictionId = created.id;

    // Poll
    let outputUrl: string | null = null;
    for (let i = 0; i < POLL_MAX_SECONDS / 2; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(`${GATEWAY}/predictions/${predictionId}`, {
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": REPLICATE_API_KEY,
        },
      });
      const pollData = await pollRes.json();
      if (pollData.status === "succeeded") {
        outputUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
        break;
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`Flux ${pollData.status}: ${pollData.error || "okänt fel"}`);
      }
    }
    if (!outputUrl) throw new Error("Flux tidsgräns nådd");

    // Download + upload final
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) throw new Error("Kunde inte hämta Flux-resultat");
    const imgBuf = await imgRes.arrayBuffer();
    const sanitizedSceneId = scene.id
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const finalFilename = `${userId}/${crypto.randomUUID()}-${sanitizedSceneId}.jpg`;
    const { error: finalUpErr } = await supabase.storage
      .from("processed-cars")
      .upload(finalFilename, imgBuf, { contentType: "image/jpeg", upsert: false });
    if (finalUpErr) throw new Error(`Upload misslyckades: ${finalUpErr.message}`);
    const { data: pub } = supabase.storage.from("processed-cars").getPublicUrl(finalFilename);
    const finalUrl = pub.publicUrl;

    const totalTime = Date.now() - startTime;
    console.log(`[FLUX] done in ${(totalTime / 1000).toFixed(1)}s → ${finalUrl}`);

    if (jobId) {
      await supabase.from("processing_jobs").update({
        status: "completed",
        engine: "flux",
        final_url: finalUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    if (tempPaths.length) supabase.storage.from("processed-cars").remove(tempPaths).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, finalUrl, jobId, pipeline: "flux", processingTimeMs: totalTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[FLUX] error:", error);
    const errMsg = error instanceof Error ? error.message : "Okänt fel";

    if (creditDeducted && userId) {
      try {
        const { data: uc } = await supabase.from("user_credits").select("credits").eq("user_id", userId).single();
        const newBal = (uc?.credits || 0) + 1;
        await supabase.from("user_credits").update({ credits: newBal, updated_at: new Date().toISOString() }).eq("user_id", userId);
      } catch (e) { console.error("[FLUX] refund failed", e); }
    }
    if (tempPaths.length) supabase.storage.from("processed-cars").remove(tempPaths).catch(() => {});
    if (jobId) {
      await supabase.from("processing_jobs").update({
        status: "failed",
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
