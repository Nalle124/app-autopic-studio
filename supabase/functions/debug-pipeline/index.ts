import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { removeBackground } from "../_shared/bg-removal.ts";

/** Temporary diagnostics: verifies Replicate cutout + Lovable AI gateway reachability. */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const out: Record<string, unknown> = {};
  const testImage = "https://cfsyxrokdemwkklqflnb.supabase.co/storage/v1/object/public/processed-cars/scenes/netgrey-light.png";

  out.hasLovableKey = !!Deno.env.get("LOVABLE_API_KEY");
  out.hasReplicateKey = !!Deno.env.get("REPLICATE_API_KEY");

  // 1. AI gateway probe (cheap text call)
  try {
    const t0 = Date.now();
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    out.gateway = { status: r.status, ms: Date.now() - t0, body: (await r.text()).slice(0, 300) };
  } catch (e) {
    out.gateway = { error: String(e) };
  }

  // 2. Replicate connector probe
  try {
    const t0 = Date.now();
    const logs: string[] = [];
    const res = await removeBackground(testImage, (m) => logs.push(m));
    out.replicate = { ok: !!res, ms: Date.now() - t0, bytes: res?.buffer.byteLength ?? 0, logs };
  } catch (e) {
    out.replicate = { error: String(e) };
  }

  // 3. Probe connector gateway paths
  const GW = "https://connector-gateway.lovable.dev/replicate/v1";
  const probes: Record<string, unknown> = {};
  for (const p of [
    "/account",
    "/models/851-labs/background-remover",
    "/models/bria/remove-background",
    "/predictions",
  ]) {
    try {
      const r = await fetch(`${GW}${p}`, {
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Connection-Api-Key": Deno.env.get("REPLICATE_API_KEY") ?? "",
        },
      });
      probes[p] = { status: r.status, body: (await r.text()).slice(0, 200) };
    } catch (e) {
      probes[p] = { error: String(e) };
    }
  }
  out.probes = probes;

  // 4. Try creating a prediction via version id (POST /predictions)
  try {
    const h = {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("REPLICATE_API_KEY") ?? "",
      "Content-Type": "application/json",
    };
    const m = await (await fetch(`${GW}/models/851-labs/background-remover`, { headers: h })).json();
    const version = m?.latest_version?.id;
    const cr = await fetch(`${GW}/predictions`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ version, input: { image: testImage, format: "png" } }),
    });
    out.versionCreate = { version, status: cr.status, body: (await cr.text()).slice(0, 300) };
  } catch (e) {
    out.versionCreate = { error: String(e) };
  }


  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
