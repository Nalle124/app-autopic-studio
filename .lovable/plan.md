

# V2 Completeness Audit, E-post-limit & Stripe-länkar

## Stripe Guest Checkout URLs (redo att kopiera)

**Prenumerationer:**
- Start (399 kr/mån): `https://app-autopic-studio.lovable.app/guest-checkout?plan=start`
- Pro (699 kr/mån): `https://app-autopic-studio.lovable.app/guest-checkout?plan=pro`
- Business (1 499 kr/mån): `https://app-autopic-studio.lovable.app/guest-checkout?plan=business`
- Scale (1 999 kr/mån): `https://app-autopic-studio.lovable.app/guest-checkout?plan=scale`

**Engångsköp:**
- 30 credits (129 kr): `https://app-autopic-studio.lovable.app/guest-checkout?plan=creditPack30`
- 100 credits (399 kr): `https://app-autopic-studio.lovable.app/guest-checkout?plan=creditPack100`
- 300 credits (899 kr): `https://app-autopic-studio.lovable.app/guest-checkout?plan=creditPack300`

---

## BUG: Start v2 & Pro v2 saknas i guest checkout

De nya pris-ID:na (`price_1TFWjtR5EFc7nWvhylmuUUsb` och `price_1TFWkRR5EFc7nWvhPgMasQKT`) saknas i `VALID_PRICE_IDS` i `supabase/functions/create-guest-checkout/index.ts`. Det betyder att **guest checkout för Start och Pro planerna inte fungerar just nu**. Fix: lägga till de två nya pris-ID:na i whitelisten.

---

## E-post: hur många bilder kan skickas?

`send-images-email` edge function har **ingen explicit gräns** — den loopar genom alla `imageUrls` och laddar upp dem en i taget till storage. Praktiska begränsningar:
- **Edge function timeout** (~60s) begränsar hur många stora bilder som kan laddas ner + laddas upp
- Realistiskt: **~15-25 bilder** innan timeout
- Resend har gräns på e-poststorlek men funktionen skickar bara länkar, inte bilagor, så det är ok

**Rekommendation**: lägg till en soft cap på t.ex. 50 bilder, med tydlig feedback om batchen är för stor.

---

## Vad som saknas för komplett V2

### Redan gjort ✓
- `/` pekar på V2 (ProtectedRoute)
- `/classic` finns kvar för V1
- `/try` använder TryV2
- Navigation med dropdown (Projekt, Classic, AI Studio, Galleri)
- "Try another background"-funktion
- Bild-duplikat-fix
- Auto-crop toggle
- Logo-upload i flödet
- Scroll-to-top vid stegbyte
- Uppercase bilnamn
- Stripe v2 products skapade

### Kvarvarande issues att fixa

1. **Guest checkout whitelist** — Start v2 och Pro v2 pris-ID:n saknas (se ovan)

2. **AI Studio saknar V2-ingång** — AI Studio (redigera fritt, logotyp, blur-skyltar, fix interiör) nås bara via `/classic?tab=ai-studio`. Det fungerar men kräver att V1-sidan laddas. Okej kortsiktigt, men kan integreras direkt i V2 framöver.

3. **Galleri/historik** — Historiken nås via `/classic?tab=history`. Samma som ovan — fungerar men V1-beroende. Bilderna som genereras i V2 sparas i processed-cars storage men visas inte i en V2-native gallerivy.

4. **Onboarding-flöde** — Onboarding-sidan (`/onboarding`) existerar men kontrollera att den leder tillbaka till `/` (V2) och inte `/classic`.

5. **Guide-sida** — `/guide` kan ha V1-centrerade instruktioner som behöver uppdateras.

### Plan för implementation (2 steg)

**Steg 1 — Kritisk fix (gör nu)**
- Lägg till `price_1TFWjtR5EFc7nWvhylmuUUsb` (start) och `price_1TFWkRR5EFc7nWvhPgMasQKT` (pro) i `VALID_PRICE_IDS` i `create-guest-checkout/index.ts`
- Deploy edge function

**Steg 2 — Verifiera flöden**
- Kontrollera att onboarding redirectar till `/` 
- Kontrollera att payment-success redirectar till `/`
- Kontrollera att signup-after-payment redirectar till `/`

### Framtida förbättringar (inte blockers)
- Native V2 galleri-vy (ersätt `/classic?tab=history`)
- Native V2 AI Studio
- Smart car positioning (AI normaliserar avstånd)

---

## Teknisk sammanfattning

| Fil | Ändring |
|-----|---------|
| `supabase/functions/create-guest-checkout/index.ts` | Lägg till 2 nya pris-ID:n i VALID_PRICE_IDS |
| Verifiera redirect-URLs i onboarding/payment flows | Säkerställ att alla pekar på `/` |

