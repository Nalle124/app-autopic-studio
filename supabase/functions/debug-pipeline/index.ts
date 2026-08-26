import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { removeBackground } from "../_shared/bg-removal.ts";

/** Temporary diagnostics: verifies Replicate cutout + Lovable AI gateway reachability. */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const out: Record<string, unknown> = {};
  const testImage = "https://replicate.delivery/pbxt/KWjHqjrMDvhqYQ8N5oPjfnnCPKGXvhnhLZDsHOSRvBpXPZmO/car.jpg";

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
    const res = await removeBackground(testImage);
    out.replicate = { ok: !!res, ms: Date.now() - t0, bytes: res?.buffer.byteLength ?? 0 };
  } catch (e) {
    out.replicate = { error: String(e) };
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
