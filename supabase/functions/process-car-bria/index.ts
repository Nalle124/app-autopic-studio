import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
// imagescript: pure-JS Deno-compatible image processing (decode/encode/composite/blur).
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

/**
 * Bria Studio — 100% non-generative background swap.
 *
 * Pipeline:
 *  1. Auth + credit
 *  2. Upload source
 *  3. Bria RMBG-2.0 (via Replicate connector) → clean PNG cutout with alpha
 *  4. Fetch scene reference background
 *  5. Canvas composite:
 *       - scale cutout so car width ≈ 62% of bg width
 *       - detect bottom-most opaque pixel of cutout (real tire baseline)
 *       - position horizontally centered, baseline at 82% of bg height
 *       - render soft drop-shadow under wheels
 *       - flatten to JPEG
 *  6. Upload final + update processing_job
 *
 * The car pixels are copied 1:1 from the source — no re-rendering, no
 * geometric distortion, no color drift. Only the environment changes.
 *
 * FormData is compatible with process-car-gemini / process-car-flux.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const TOTAL_BUDGET_MS = 135_000;

interface SceneMetadata {
  id: string;
  name: string;
  aiPrompt?: string;
}

/**
 * Bria RMBG-2.0 via Replicate. Returns a PNG cutout with a proper alpha
 * channel. Best-in-class subject segmentation for cars — noticeably cleaner
 * edges than 851-labs/background-remover on chrome, glass and wheel arches.
 */
async function briaCutout(
  imageUrl: string,
  log: (m: string) => void,
): Promise<ArrayBuffer | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!LOVABLE_API_KEY || !REPLICATE_API_KEY) {
    log("[BRIA] Replicate connector not configured");
    return null;
  }

  const create = await fetch(
    `${GATEWAY}/models/bria/remove-background/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": REPLICATE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: { image: imageUrl } }),
    },
  );
  if (!create.ok) {
    log(`[BRIA] create failed ${create.status}: ${(await create.text()).slice(0, 300)}`);
    return null;
  }
  const created = await create.json();
  const predictionId = created.id as string;
  if (!predictionId) return null;

  // Poll ~90s ceiling
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(`${GATEWAY}/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": REPLICATE_API_KEY,
      },
    });
    if (!poll.ok) continue;
    const d = await poll.json();
    if (d.status === "succeeded") {
      const outputUrl: string | null = Array.isArray(d.output) ? d.output[0] : d.output;
      if (!outputUrl) return null;
      const dl = await fetch(outputUrl);
      if (!dl.ok) return null;
      const buf = await dl.arrayBuffer();
      log(`[BRIA] ✅ cutout ready (${(buf.byteLength / 1024).toFixed(0)}KB)`);
      return buf;
    }
    if (d.status === "failed" || d.status === "canceled") {
      log(`[BRIA] ${d.status}: ${d.error || "unknown"}`);
      return null;
    }
  }
  log("[BRIA] poll timeout");
  return null;
}

/**
 * Find the y coordinate (0..h-1) of the bottom-most row that contains at
 * least one opaque pixel above the given alpha threshold. Used to align the
 * car's real tire baseline to the scene's ground plane.
 */
function findAlphaBaseline(img: Image, alphaThreshold = 32): number {
  const w = img.width;
  const h = img.height;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const px = img.getPixelAt(x + 1, y + 1); // imagescript is 1-indexed
      const a = px & 0xff;
      if (a > alphaThreshold) return y;
    }
  }
  return h - 1;
}

/**
 * Render a soft drop shadow under the car. Takes the cutout's alpha channel,
 * flattens it to opaque black at reduced opacity, applies a gaussian blur,
 * then squashes it vertically to lie flat on the ground.
 */
function buildShadow(cutout: Image, opacity = 0.35, blurRadius = 18): Image {
  const w = cutout.width;
  const h = cutout.height;
  const shadow = new Image(w, h);
  // Fill each pixel with black at (alpha * opacity)
  for (let y = 1; y <= h; y++) {
    for (let x = 1; x <= w; x++) {
      const px = cutout.getPixelAt(x, y);
      const a = px & 0xff;
      if (a > 0) {
        const sa = Math.min(255, Math.round(a * opacity));
        // rgba packed into 32-bit uint
        shadow.setPixelAt(x, y, (0 << 24) | (0 << 16) | (0 << 8) | sa);
      }
    }
  }
  shadow.gaussianBlur(blurRadius);
  // Squash vertically to 25% — makes it lie flat on the ground plane
  const squashed = shadow.resize(w, Math.max(1, Math.round(h * 0.25)));
  return squashed;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ej autentiserad");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) throw new Error("Ej autentiserad");
    userId = user.id;

    const formData = await req.formData();
    const imageFile = formData.get("image") as File;
    const sceneData = formData.get("scene") as string;
    const backgroundUrl = formData.get("backgroundUrl") as string;
    const orientation = (formData.get("orientation") as string) || "landscape";
    jobId = (formData.get("jobId") as string) || null;

    if (!imageFile || !sceneData || !backgroundUrl) {
      throw new Error("Saknade fält: image, scene, backgroundUrl");
    }
    const scene: SceneMetadata = JSON.parse(sceneData);
    console.log(`[BRIA] scene=${scene.name} orientation=${orientation}`);

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

    // 1. Upload source so Replicate can fetch it
    const imageBuffer = await imageFile.arrayBuffer();
    const srcExt = (imageFile.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const sourcePath = `bria-source/${crypto.randomUUID()}.${srcExt}`;
    tempPaths.push(sourcePath);
    const { error: upErr } = await supabase.storage
      .from("processed-cars")
      .upload(sourcePath, imageBuffer, {
        contentType: imageFile.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) throw new Error(`Upload misslyckades: ${upErr.message}`);
    const { data: srcUrlData } = supabase.storage.from("processed-cars").getPublicUrl(sourcePath);

    // 2. Bria cutout
    const cutoutBuf = await briaCutout(srcUrlData.publicUrl, console.log);
    if (!cutoutBuf) throw new Error("Bakgrundsborttagning misslyckades");

    // 3. Fetch reference background
    const bgRes = await fetch(backgroundUrl);
    if (!bgRes.ok) throw new Error("Kunde inte hämta bakgrund");
    const bgBuf = await bgRes.arrayBuffer();

    // 4. Decode both
    console.log("[BRIA] decoding images...");
    const cutoutImg = await decode(new Uint8Array(cutoutBuf));
    const bgImg = await decode(new Uint8Array(bgBuf));
    if (!(cutoutImg instanceof Image) || !(bgImg instanceof Image)) {
      throw new Error("Kunde inte avkoda bilderna");
    }

    // 5. Target output size — respect orientation, cap at 2000px on long edge
    const MAX = 2000;
    let outW: number;
    let outH: number;
    const bgAspect = bgImg.width / bgImg.height;
    if (orientation === "portrait") {
      outH = Math.min(MAX, bgImg.height);
      outW = Math.round(outH * bgAspect);
    } else {
      outW = Math.min(MAX, bgImg.width);
      outH = Math.round(outW / bgAspect);
    }

    // 6. Resize background to output canvas size
    const canvas = bgImg.resize(outW, outH);

    // 7. Scale cutout so car width ≈ 62% of canvas (tuned for showroom look)
    const targetCarW = Math.round(outW * 0.62);
    const carScale = targetCarW / cutoutImg.width;
    const targetCarH = Math.round(cutoutImg.height * carScale);
    const carScaled = cutoutImg.resize(targetCarW, targetCarH);

    // 8. Find real bottom-most opaque pixel (tire baseline) in scaled cutout
    const baselineInCar = findAlphaBaseline(carScaled);
    // Ground plane at 82% of canvas height feels natural for most scenes
    const groundY = Math.round(outH * 0.82);

    // Car placement: horizontally centered
    const carX = Math.round((outW - targetCarW) / 2);
    // Position so the cutout's alpha baseline lands on groundY
    const carY = groundY - baselineInCar;

    // 9. Build shadow from cutout alpha, place under wheels
    console.log("[BRIA] building shadow...");
    const shadow = buildShadow(carScaled, 0.4, 22);
    const shadowY = groundY - Math.round(shadow.height * 0.4); // half-under, half-behind
    // shadow horizontally centered on the car
    const shadowX = carX + Math.round((targetCarW - shadow.width) / 2);

    // 10. Composite: bg → shadow → car
    console.log("[BRIA] compositing...");
    canvas.composite(shadow, shadowX, shadowY);
    canvas.composite(carScaled, carX, carY);

    // 11. Encode as JPEG (quality 90)
    const finalBuf = await canvas.encodeJPEG(90);
    console.log(`[BRIA] final image ${(finalBuf.byteLength / 1024).toFixed(0)}KB`);

    // 12. Upload
    const sanitizedSceneId = scene.id
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const finalFilename = `${userId}/${crypto.randomUUID()}-${sanitizedSceneId}.jpg`;
    const { error: finalUpErr } = await supabase.storage
      .from("processed-cars")
      .upload(finalFilename, finalBuf, { contentType: "image/jpeg", upsert: false });
    if (finalUpErr) throw new Error(`Upload misslyckades: ${finalUpErr.message}`);
    const { data: pub } = supabase.storage.from("processed-cars").getPublicUrl(finalFilename);
    const finalUrl = pub.publicUrl;

    const totalTime = Date.now() - startTime;
    console.log(`[BRIA] done in ${(totalTime / 1000).toFixed(1)}s → ${finalUrl}`);
    if (totalTime > TOTAL_BUDGET_MS) console.warn("[BRIA] exceeded budget");

    if (jobId) {
      await supabase.from("processing_jobs").update({
        status: "completed",
        engine: "bria",
        final_url: finalUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    if (tempPaths.length) supabase.storage.from("processed-cars").remove(tempPaths).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, finalUrl, jobId, pipeline: "bria", processingTimeMs: totalTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[BRIA] error:", error);
    const errMsg = error instanceof Error ? error.message : "Okänt fel";

    if (creditDeducted && userId) {
      try {
        const { data: uc } = await supabase.from("user_credits").select("credits").eq("user_id", userId).single();
        const newBal = (uc?.credits || 0) + 1;
        await supabase.from("user_credits").update({
          credits: newBal,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      } catch (e) { console.error("[BRIA] refund failed", e); }
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
