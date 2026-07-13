/**
 * Background removal helper — runs an image through Replicate's
 * 851-labs/background-remover (BRIA-class model). Returns a public URL
 * to a PNG cutout, or null if removal fails (caller should fall back to original).
 *
 * Used by Gemini and Flux engines so the AI never sees the original
 * surroundings of the car — it only sees a clean cutout + the reference
 * background. This dramatically reduces re-rendering / color drift / cropping
 * of the car by the generative models.
 */

const GATEWAY = "https://api.replicate.com/v1";
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 60; // ~90s ceiling (model usually completes in 3-8s)

export interface BgRemovalResult {
  /** Public URL hosted on Replicate's CDN (short-lived, ~1h). Use immediately. */
  cutoutUrl: string;
  /** PNG buffer fetched from the cutoutUrl. Upload to your own storage if persisting. */
  buffer: ArrayBuffer;
}

/**
 * Send a publicly-reachable image URL to Replicate's background remover.
 * Returns null on any failure so the caller can fall back to the original.
 */
export async function removeBackground(
  imageUrl: string,
  log: (msg: string) => void = console.log,
): Promise<BgRemovalResult | null> {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) {
    log("[BG-REMOVAL] REPLICATE_API_KEY not configured — skipping cutout");
    return null;
  }

  try {
    const createRes = await fetch(
      `${GATEWAY}/models/851-labs/background-remover/predictions`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            image: imageUrl,
            format: "png",
            background_type: "rgba",
            threshold: 0,
          },
        }),
      },
    );

    if (!createRes.ok) {
      const errTxt = await createRes.text();
      log(`[BG-REMOVAL] create failed ${createRes.status}: ${errTxt.slice(0, 300)}`);
      return null;
    }

    const created = await createRes.json();
    const predictionId = created.id;
    if (!predictionId) {
      log("[BG-REMOVAL] no prediction id returned");
      return null;
    }

    // Poll
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(`${GATEWAY}/predictions/${predictionId}`, {
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_KEY}`,
        },
      });
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        const output = pollData.output;
        const cutoutUrl: string | null = Array.isArray(output) ? output[0] : output;
        if (!cutoutUrl || typeof cutoutUrl !== "string") {
          log("[BG-REMOVAL] no output url in succeeded prediction");
          return null;
        }
        const imgRes = await fetch(cutoutUrl);
        if (!imgRes.ok) {
          log(`[BG-REMOVAL] cutout download failed ${imgRes.status}`);
          return null;
        }
        const buffer = await imgRes.arrayBuffer();
        log(`[BG-REMOVAL] ✅ cutout ready (${(buffer.byteLength / 1024).toFixed(0)}KB)`);
        return { cutoutUrl, buffer };
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        log(`[BG-REMOVAL] ${pollData.status}: ${pollData.error || "unknown"}`);
        return null;
      }
    }

    log("[BG-REMOVAL] poll timeout");
    return null;
  } catch (err) {
    log(`[BG-REMOVAL] exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
