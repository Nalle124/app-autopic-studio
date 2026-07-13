/**
 * AI chat helper — calls Google Gemini directly with your own GEMINI_API_KEY
 * (no Lovable credits consumed). If GEMINI_API_KEY is not set, falls back to
 * the Lovable AI Gateway with LOVABLE_API_KEY so nothing breaks during the
 * transition.
 *
 * Accepts an OpenAI-style chat.completions request body (the format all the
 * edge functions already use) and returns a `Response` whose JSON body is
 * OpenAI-shaped, so existing parsing code (`choices[0].message.content`,
 * `.images[0].image_url.url`, `.tool_calls`) keeps working unchanged.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Lovable model id → native Google model id */
const MODEL_MAP: Record<string, string> = {
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image": "gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image-preview": "gemini-3.1-flash-image-preview",
  "google/gemini-3.1-flash-image": "gemini-3.1-flash-image-preview",
  "google/gemini-3-pro-image": "gemini-3-pro-image-preview",
};

export function hasAiKey(): boolean {
  return !!(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY"));
}

interface AiChatOptions {
  signal?: AbortSignal;
}

// deno-lint-ignore no-explicit-any
type Json = any;

/** Fetch a remote image and return { mimeType, data(base64) } for inlineData. */
async function urlToInlineData(url: string): Promise<{ mimeType: string; data: string }> {
  const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrlMatch) {
    return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2].replace(/\s/g, "") };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for AI input (${res.status}): ${url.slice(0, 120)}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  // Chunked base64 encode to avoid call-stack limits on large images
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return { mimeType, data: btoa(binary) };
}

/** Convert OpenAI-style message content (string or parts array) to Gemini parts. */
async function toGeminiParts(content: Json): Promise<Json[]> {
  if (typeof content === "string") return [{ text: content }];
  const parts: Json[] = [];
  for (const part of content ?? []) {
    if (part.type === "text") {
      parts.push({ text: part.text });
    } else if (part.type === "image_url") {
      parts.push({ inlineData: await urlToInlineData(part.image_url?.url) });
    }
  }
  return parts;
}

async function callGeminiDirect(body: Json, apiKey: string, opts?: AiChatOptions): Promise<Response> {
  const model = MODEL_MAP[body.model] ?? String(body.model).replace(/^google\//, "");

  const systemParts: Json[] = [];
  const contents: Json[] = [];
  for (const msg of body.messages ?? []) {
    if (msg.role === "system") {
      systemParts.push({ text: typeof msg.content === "string" ? msg.content : (msg.content ?? []).map((p: Json) => p.text ?? "").join("\n") });
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: await toGeminiParts(msg.content),
      });
    }
  }

  const generationConfig: Json = {};
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  if (typeof body.top_p === "number") generationConfig.topP = body.top_p;
  if (Array.isArray(body.modalities)) {
    generationConfig.responseModalities = body.modalities.map((m: string) => m.toUpperCase());
  }

  const geminiBody: Json = { contents };
  if (systemParts.length) geminiBody.systemInstruction = { parts: systemParts };
  if (Object.keys(generationConfig).length) geminiBody.generationConfig = generationConfig;

  if (Array.isArray(body.tools) && body.tools.length) {
    geminiBody.tools = [{
      functionDeclarations: body.tools
        .filter((t: Json) => t.type === "function")
        .map((t: Json) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
    }];
    const forced = body.tool_choice?.function?.name;
    if (forced) {
      geminiBody.toolConfig = { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [forced] } };
    }
  }

  const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
    signal: opts?.signal,
  });

  if (!res.ok) {
    // Pass through the error with the original status so existing
    // retry/refund logic (429/5xx handling) keeps working.
    const errText = await res.text();
    return new Response(errText, { status: res.status, headers: { "Content-Type": "application/json" } });
  }

  const data = await res.json();
  const parts: Json[] = data.candidates?.[0]?.content?.parts ?? [];

  let text = "";
  const images: Json[] = [];
  const toolCalls: Json[] = [];
  for (const p of parts) {
    if (typeof p.text === "string") text += p.text;
    if (p.inlineData?.data) {
      images.push({
        type: "image_url",
        image_url: { url: `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}` },
      });
    }
    if (p.functionCall) {
      toolCalls.push({
        id: `call_${toolCalls.length}`,
        type: "function",
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
      });
    }
  }

  const message: Json = { role: "assistant", content: text || null };
  if (images.length) message.images = images;
  if (toolCalls.length) message.tool_calls = toolCalls;

  const openAiShaped = {
    id: data.responseId ?? "gemini-direct",
    object: "chat.completion",
    model,
    choices: [{ index: 0, message, finish_reason: "stop" }],
    usage: data.usageMetadata,
  };

  return new Response(JSON.stringify(openAiShaped), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Drop-in replacement for `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)`.
 * Pass the request body as an object (not stringified).
 */
export async function aiChat(body: Json, opts?: AiChatOptions): Promise<Response> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (GEMINI_API_KEY) {
    try {
      return await callGeminiDirect(body, GEMINI_API_KEY, opts);
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") throw err;
      console.error("[AI-CHAT] direct Gemini call failed:", err);
      // fall through to Lovable gateway if configured
      if (!Deno.env.get("LOVABLE_API_KEY")) throw err;
    }
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured");
  }
  return fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
}
