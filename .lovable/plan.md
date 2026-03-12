

# Plan: AutoPic Standardflöde V2 — Experimentell sida

## Bakgrund
Ny isolerad sida (`/autopic-v2`) som bygger ett förbättrat upload-till-leverans-flöde. Befintliga sidor och komponenter rörs inte. Återanvänder auth, API-nycklar, edge functions och databastabeller.

## Arkitektur

```text
/autopic-v2  (ny route, ny page-komponent)
│
├─ Steg 0: Kameraguide (overlay med vinkel-tips)
├─ Steg 1: Upload (dropzone, återanvänd heicConverter etc)
├─ Steg 2: Automatisk klassificering (interiör vs exteriör)
│          → Interiörbilder → Gemini-maskering (befintlig prompt)
│          → Exteriörbilder → PhotoRoom (befintlig edge function)
├─ Steg 3: Auto-beskärning av exteriörbilder
├─ Steg 4: Logo-placering (preset-mockups, profil-logotyp)
├─ Steg 5: Förhandsgranskning + generera
│          → Val: Direkt / Få på email
└─ Resultat: Samlad leverans (alla bilder i ett galleri/ZIP)
```

## Vad som byggs (fas 1 — MVP)

### 1. Ny sida + route
- `src/pages/AutopicV2.tsx` — helt ny fil
- Route i `App.tsx`: `<Route path="/autopic-v2" element={<ProtectedRoute><AutopicV2 /></ProtectedRoute>} />`
- Inget i menyn/navigation pekar hit ännu (nås via URL)

### 2. Steg-baserat UI (wizard)
En stepper-komponent inuti sidan med steg 0–5. Varje steg är en sektion i samma komponent. Användaren navigerar framåt/bakåt.

### 3. Steg 0 — Kameraguide
Visuell overlay med tips: "Fotografera rakt framifrån/snett", "Undvik motljus", "Parkera på jämn yta". Enkla ikoner/illustrationer. Knapp: "Jag förstår, gå vidare".

### 4. Steg 1 — Upload
Återanvänd `react-dropzone` logik och `heicConverter`. Ny enklare upload-zon utan alla edit-knappar. Max 50 bilder.

### 5. Steg 2 — Automatisk klassificering
Ny edge function `classify-car-images` som tar en batch bilder och returnerar `{imageId, type: 'interior'|'exterior'|'detail'}` via Gemini (google/gemini-2.5-flash — billigt, snabbt).

- Interiörbilder körs genom befintlig Gemini-prompt (samma som `fix-interior` i AI Studio)
- Exteriörbilder fortsätter till steg 3

### 6. Steg 3 — Auto-beskärning
Beräkna bounding box på bilen (Gemini kan returnera koordinater) och applicera en tight men inte för aggressiv crop. Gäller bara exteriörbilder där hela bilen syns. Visar preview före/efter med möjlighet att justera.

### 7. Steg 4 — Logo-placering
- Hämta logotyp från profil (`profiles.logo_light` / `logo_dark`)
- Visa 4–6 preset-mockups (som i BrandKitDesigner): "Logo uppe vänster", "Logo + banner", "Logo första bilden", "Logo första 3 + sista"
- Användaren klickar på en mockup = val gjort
- Tips-badge: "Beskär för bästa resultat" vid sidan av

### 8. Steg 5 — Generera + leverans
- Knapp: "Generera nu" / "Skicka på email när klart"
- Email-val: sparar jobb i `processing_jobs` med status `queued`, backend bearbetar asynkront, skickar email via Resend när klart
- Direkt: sekventiell bearbetning med progress (som idag)
- Credit-check före start, paywall om 0

### 9. Resultatvy
Galleri med alla bilder (interiör + exteriör + detalj) i ordning. ZIP-nedladdning. Kopiera-länk.

## Edge functions

| Funktion | Ny/Befintlig | Syfte |
|---|---|---|
| `process-car-image` | Befintlig | PhotoRoom-bearbetning av exteriörbilder |
| `classify-car-images` | **Ny** | Gemini-klassificering: interiör/exteriör/detalj |
| `auto-crop-image` | Befintlig | Beskärning (utökas med smart bounding box) |

## Filer som skapas (rör inget befintligt)

| Fil | Syfte |
|---|---|
| `src/pages/AutopicV2.tsx` | Huvudsida med wizard-stepper |
| `src/components/v2/V2CameraGuide.tsx` | Steg 0 — kameratips |
| `src/components/v2/V2ImageUploader.tsx` | Steg 1 — förenklad upload |
| `src/components/v2/V2ClassificationStep.tsx` | Steg 2 — visa klassificering |
| `src/components/v2/V2CropPreview.tsx` | Steg 3 — auto-crop preview |
| `src/components/v2/V2LogoPresets.tsx` | Steg 4 — logo-mockup-väljare |
| `src/components/v2/V2GenerateStep.tsx` | Steg 5 — generera/email-val |
| `src/components/v2/V2ResultGallery.tsx` | Resultatvy |
| `supabase/functions/classify-car-images/index.ts` | Ny edge function |

## Framtida faser (inte i denna implementation)

- **Blocket-integration** (API-koppling, annonstexter)
- **Video-generering** (Veo 3, reels med musik)
- **DMS-integration** (extern API)
- **Fordonsdata** (Transportstyrelsen/CarInfo)
- **Annonstext-generator** (separat flik)

Dessa kräver separata planerings- och implementeringscykler.

## Tekniska beslut

- Gemini `2.5-flash` för klassificering (snabbt, billigt, ~$0.01/batch)
- Ingen extra DB-tabell behövs — `processing_jobs` återanvänds
- Email-leverans via befintlig Resend-secret
- Allt bakom `ProtectedRoute` + credit-check

