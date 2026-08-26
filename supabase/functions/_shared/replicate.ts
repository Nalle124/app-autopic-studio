/**
 * Shared Replicate helper (via the Lovable connector gateway).
 *
 * IMPORTANT: the connector gateway does NOT proxy Replicate's
 * `POST /models/{owner}/{name}/predictions` route — it returns 404.
 * The working route is `POST /predictions` with a resolved `version` id,
 * so we look up the model's `latest_version` first and cache it.
 */

export const REPLICATE_GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";

const versionCache = new Map<string, string>();

function headers() {
  return {
    Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`,
    "X-Connection-Api-Key": Deno.env.get("REPLICATE_API_KEY") ?? "",
    "Content-Type": "application/json",
  };
}

export async function resolveVersion(model: string): Promise<string | null> {
  const cached = versionCache.get(model);
  if (cached) return cached;
  const res = await fetch(`${REPLICATE_GATEWAY}/models/${model}`, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  const version = data?.latest_version?.id as string | undefined;
  if (version) versionCache.set(model, version);
  return version ?? null;
}

/**
 * Creates a prediction and returns its id.
 * Retries once on 429 (Replicate throttles hard when the account has no
 * payment method configured).
 */
export async function createPrediction(
  model: string,
  input: Record<string, unknown>,
  log: (m: string) => void = console.log,
): Promise<{ id: string } | { error: string; status: number }> {
  const version = await resolveVersion(model);
  if (!version) return { error: `Kunde inte hitta modellen ${model}`, status: 404 };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${REPLICATE_GATEWAY}/predictions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ version, input }),
    });
    if (res.ok) {
      const created = await res.json();
      if (created?.id) return { id: created.id as string };
      return { error: "Replicate returnerade inget prediction-id", status: 502 };
    }
    const text = await res.text();
    if (res.status === 429) {
      let waitSec = 10;
      try { waitSec = JSON.parse(text)?.retry_after ?? 10; } catch { /* ignore */ }
      log(`[REPLICATE] throttled, retry in ${waitSec}s`);
      await new Promise((r) => setTimeout(r, Math.min(waitSec, 20) * 1000));
      continue;
    }
    log(`[REPLICATE] create failed ${res.status}: ${text.slice(0, 300)}`);
    return { error: text.slice(0, 200), status: res.status };
  }
  return { error: "Replicate rate limit (lägg till betalmetod på Replicate-kontot)", status: 429 };
}

export async function pollPrediction(
  id: string,
  opts: { timeoutMs?: number; intervalMs?: number; log?: (m: string) => void } = {},
): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 1500;
  const log = opts.log ?? console.log;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(`${REPLICATE_GATEWAY}/predictions/${id}`, { headers: headers() });
    if (!res.ok) continue;
    const d = await res.json();
    if (d.status === "succeeded") {
      const out = Array.isArray(d.output) ? d.output[0] : d.output;
      return typeof out === "string" ? out : null;
    }
    if (d.status === "failed" || d.status === "canceled") {
      log(`[REPLICATE] ${d.status}: ${d.error || "okänt fel"}`);
      return null;
    }
  }
  log("[REPLICATE] poll timeout");
  return null;
}
