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

import { createPrediction, pollPrediction } from "./replicate.ts";

const MODEL = "851-labs/background-remover";

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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!LOVABLE_API_KEY || !REPLICATE_API_KEY) {
    log("[BG-REMOVAL] Replicate connector not configured — skipping cutout");
    return null;
  }

  try {
    const created = await createPrediction(
      MODEL,
      { image: imageUrl, format: "png", background_type: "rgba", threshold: 0 },
      log,
    );
    if (!("id" in created)) {
      log(`[BG-REMOVAL] create failed (${created.status}): ${created.error}`);
      return null;
    }

    const cutoutUrl = await pollPrediction(created.id, { timeoutMs: 90_000, log });
    if (!cutoutUrl) return null;

    const imgRes = await fetch(cutoutUrl);
    if (!imgRes.ok) {
      log(`[BG-REMOVAL] cutout download failed ${imgRes.status}`);
      return null;
    }
    const buffer = await imgRes.arrayBuffer();
    log(`[BG-REMOVAL] ✅ cutout ready (${(buffer.byteLength / 1024).toFixed(0)}KB)`);
    return { cutoutUrl, buffer };
  } catch (err) {
    log(`[BG-REMOVAL] exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

