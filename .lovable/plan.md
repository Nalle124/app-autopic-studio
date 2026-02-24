

# Teknisk Audit — AutoPic Studio

## Sammanfattning

Appen har en solid grundarkitektur med bra RLS-policies, serversidig validering i edge functions, och atomisk kreditavräkning. Flera kritiska brister har nu åtgärdats.

---

## ✅ ÅTGÄRDAT

### 1. generate-scene-image: kreditavräkning + rate limiting ✅
Implementerat atomisk `decrement_credits` före AI-generering samt per-user rate limiting (max 10/minut). Credit transactions loggas med `ai_studio_generation` typ.

### 2. CORS begränsat på ALLA edge functions ✅
Skapade `supabase/functions/_shared/cors.ts` med dynamisk origin-validering. Alla 17 edge functions uppdaterade från `*` till tillåtna origins (`app-autopic-studio.lovable.app` + preview).

### 3. process-demo-image: temp-filer rensas i finally-block ✅
Flyttat cleanup av `uploadFilename` till `finally`-block så temp-filer alltid rensas, även vid PhotoRoom-fel.

### 4. Dubbel kreditavräkning — INTE en bugg ✅
Undersökt: `DemoContext.decrementCredits()` anropas ENBART i `Demo.tsx` (demo-flödet via `process-demo-image`), inte i `Index.tsx` (huvudflödet via `process-car-image`). Backend-deduction i `process-car-image` och frontend-deduction i demo-flödet är separata kodstigar — ingen dubbel avräkning sker.

---

## VIKTIGT (Fixas inom 2 veckor)

### 5. Storage bucket "processed-cars" är publikt — alla URL:er är permanenta
**Lösning:** Schemalägg `cleanup-old-images` att rensa `demo/` och `demo-temp/`-prefix äldre än 24h.

### 6. CreateSceneModal.tsx: 3312 rader — underhållsmardröm
**Lösning:** Bryt ut varje mode till en egen komponent.

### 7. Index.tsx: 2165 rader med samma problem
**Lösning:** Extrahera till moduler.

### 8. check-subscription: 28-dagars fönster är fragilt
**Lösning:** Byt till `periodKey`-baserad idempotency.

### 9. Ingen Stripe webhook-verifiering
**Lösning:** Implementera webhook-endpoint som backup.

---

## REKOMMENDATION (Backlog)

### 10. Sentry breadcrumbs
### 11. Övervaknings-alert för tredjepartskostnader
### 12. localStorage → draft_images-tabell
### 13. Memoization i tunga komponenter
