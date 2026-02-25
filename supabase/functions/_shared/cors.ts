const ALLOWED_ORIGINS = [
  "https://app.autopic.studio",
  "https://app-autopic-studio.lovable.app",
  "https://id-preview--e871a48d-694c-4769-86d6-0283b75b182f.lovable.app",
  "https://e871a48d-694c-4769-86d6-0283b75b182f.lovableproject.com",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  
  // Log origin for debugging live vs preview issues
  console.log(`[CORS] Request origin: "${origin}"`);
  
  // Check exact match first
  if (ALLOWED_ORIGINS.includes(origin)) {
    console.log(`[CORS] Exact match: ${origin}`);
    return buildHeaders(origin);
  }
  
  // Allow any *.lovable.app or *.lovableproject.com subdomain (covers custom subdomains, PWA origins)
  if (origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com")) {
    console.log(`[CORS] Wildcard match: ${origin}`);
    return buildHeaders(origin);
  }
  
  // Fallback for unknown origins - log warning
  console.warn(`[CORS] Unknown origin blocked: "${origin}", falling back to ${ALLOWED_ORIGINS[0]}`);
  return buildHeaders(ALLOWED_ORIGINS[0]);
}

function buildHeaders(allowedOrigin: string) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Max-Age": "86400",
  };
}
