
# AI-bakgrundsgenerator -- "Skapa din egen scen"

## Sammanfattning

En ny sektion visas ovanfor galleriet i SceneSelector dar inloggade anvandare kan skriva en kort beskrivning och generera en egen bakgrundsbild med AI (Gemini Flash Image). Bilden sparas i deras personliga galleri och fungerar exakt som en vanlig scen i hela det befintliga floedet. Nuvarande scener och funktionalitet paverkas inte.

## Trygg implementation

- **Noll paverkan pa befintliga scener** -- `user_scenes` aer en helt separat tabell. Den globala `scenes`-tabellen roers inte.
- **SceneSelector** far en ny kategori "Mina scener" som bara visas om anvandaren har egna scener (eller alltid med en "Skapa ny"-knapp). All befintlig kategori-logik fungerar som foerut.
- **SceneMetadata-interfacet** andras inte -- user scenes mappas till samma interface med default-vaerden. Det betyder att `process-car-image` edge function fungerar direkt utan aendringar.
- **Inga credit-avdrag foer bakgrundsgenerering** -- kostnaden gaer mot Lovable AI-kvoten (LOVABLE_API_KEY). Credits dras fortfarande normalt naer anvandaren genererar den slutliga bilden med PhotoRoom.

---

## Steg-foer-steg-floedet foer anvandaren

1. I SceneSelector ser anvandaren en ny kategori **"Mina scener"** (visas med en Sparkles-ikon)
2. Foersta kortet i kategorin aer ett **"+ Skapa egen bakgrund"**-kort med gradient och ikon
3. Klick oeppnar en **modal** med:
   - Textfaelt: "Beskriv din bakgrund..." (placeholder: t.ex. "Vit studio med mjukt ljus fran hoeger")
   - Valfritt namnfaelt (auto-genereras annars av AI)
   - "Generera"-knapp
4. Laddningsanimation (~5-10 sek) medan AI genererar bilden
5. Foerhandsvisning visas i modalen
6. Anvandaren kan:
   - **"Anvand denna"** -- sparar till databasen och vaeljer den som aktiv scen
   - **"Generera ny"** -- genererar en ny bild med samma prompt
   - **"Avbryt"** -- staenger utan att spara
7. Sparad scen syns i "Mina scener"-kategorin och fungerar som alla andra scener

---

## Vad som skapas och aendras

### 1. Databastabell: `user_scenes`

Ny tabell foer personliga bakgrunder. Helt separerad fraan den globala `scenes`-tabellen.

Kolumner:
- `id` (uuid, PK, auto)
- `user_id` (uuid, referens till auth.users)
- `name` (text) -- AI-genererat eller anvandarvalt
- `description` (text) -- kort beskrivning
- `prompt` (text) -- prompten anvandaren skrev
- `thumbnail_url` (text) -- sparad bild-URL
- `full_res_url` (text) -- samma som thumbnail (en bild genereras)
- `horizon_y` (numeric, default 50)
- `baseline_y` (numeric, default 65)
- `default_scale` (numeric, default 0.65)
- `shadow_enabled` (boolean, default true)
- `shadow_strength` (numeric, default 0.6)
- `shadow_blur` (numeric, default 15)
- `photoroom_shadow_mode` (text, default 'ai.soft')
- `reflection_enabled` (boolean, default false)
- `reference_scale` (numeric, default 0.85)
- `ai_prompt` (text) -- auto-genererat PhotoRoom-prompt baserat pa bilden
- `created_at` (timestamptz, default now())

RLS-policies (anvandare ser bara sina egna):
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`

### 2. Edge function: `generate-scene-image`

Ny backend-funktion som:
1. Tar emot `{ prompt: string }` + JWT-autentisering
2. Bygger ett systemprompt som saekerstaeller att bilden blir en tom bakgrundsmiljoe (inga bilar, inga maenniskor)
3. Anropar Lovable AI Gateway med `google/gemini-2.5-flash-image` (modalities: ["image", "text"])
4. Tar emot base64-bilden
5. Laddar upp till Storage-bucket `processed-cars` under `user-scenes/{userId}/{uuid}.png`
6. Genererar ett matchande PhotoRoom-prompt baserat pa bildbeskrivningen (t.ex. "Place the vehicle on the ground in a bright minimalist white studio with soft directional lighting from the right")
7. Genererar ett namn om anvandaren inte angivit ett (t.ex. "Ljus Studio" baserat pa prompten)
8. Returnerar: `{ imageUrl, suggestedName, photoroomPrompt }`

Viktigt: Funktionen anvaender LOVABLE_API_KEY som redan aer konfigurerad.

### 3. Ny komponent: `CreateSceneModal.tsx`

En modal med modernt utseende som foeljer appens morkblaa/glasmorfism-stil:
- Glasmorfism-bakgrund och gradient-accenter
- Textfaelt foer prompt med placeholder-exempel
- Valfritt namnfaelt (dollt bakom "Ge den ett namn"-toggle)
- Generera-knapp med Sparkles-ikon
- Laddningstillstand med shimmer/pulse-animation
- Foerhandsvisning av genererad bild
- Knappar: "Anvand denna" (primar), "Generera ny" (sekundar), "Avbryt"

### 4. AEndring: `SceneSelector.tsx`

Minimala aendringar:
- Ny kategori "Mina scener" (order: -1, visas efter favoriter/populaera)
- Haemtar scener fraan `user_scenes`-tabellen foer denna kategori
- Mappar `user_scenes`-rader till `SceneMetadata`-interfacet (samma shape)
- Foersta kortet i "Mina scener" aer ett speciellt "Skapa egen"-kort
- Radera-knapp (papperskorg) pa egna scener
- Kategorin visas bara foer inloggade anvandare

### 5. AEndring: `supabase/config.toml`

Laegga till:
```toml
[functions.generate-scene-image]
verify_jwt = false
```

---

## Tekniska detaljer

### AI-bildgenerering (Edge Function)

Systemprompt (haardkodat pa backend):
```
Generate a high-quality professional automotive photography background scene.
The image MUST be completely EMPTY -- absolutely no vehicles, no people, no text, no objects.
Create a realistic environment suitable as a backdrop for digitally placing a car.
Style: clean, professional, well-lit. High resolution. Landscape orientation 16:9 ratio.
The scene should look like a real photograph, not a 3D render.
```

Anvaendarens prompt laggs till som user-message.

AI:t genererar ocksaa ett matchande PhotoRoom-prompt, t.ex.:
"Place the vehicle centered on the ground in [scene description]. Realistic scale, lighting matching the environment. Professional automotive photography."

### Mappning till SceneMetadata

User scenes mappas till exakt samma interface som vanliga scener:
```typescript
{
  id: `user-${userScene.id}`,
  name: userScene.name,
  description: userScene.description,
  category: 'my-scenes',
  thumbnailUrl: userScene.thumbnail_url,
  fullResUrl: userScene.full_res_url,
  horizonY: userScene.horizon_y,
  baselineY: userScene.baseline_y,
  defaultScale: userScene.default_scale,
  shadowPreset: { enabled: true, strength: 0.6, blur: 15, offsetX: 0, offsetY: 5 },
  reflectionPreset: { enabled: false, opacity: 0, fade: 0 },
  aiPrompt: userScene.ai_prompt,
  photoroomShadowMode: userScene.photoroom_shadow_mode,
  referenceScale: userScene.reference_scale,
  compositeMode: false
}
```

Detta goer att hela det befintliga `process-car-image`-floedet fungerar direkt utan aendringar.

### Filer som behoever skapas

| Fil | Beskrivning |
|-----|-------------|
| `supabase/functions/generate-scene-image/index.ts` | Edge function foer AI-bildgenerering |
| `src/components/CreateSceneModal.tsx` | Modal-komponent foer att skapa egna bakgrunder |

### Filer som behoever aendras

| Fil | AEndring |
|-----|----------|
| `src/components/SceneSelector.tsx` | Laegga till "Mina scener"-kategori, haemta user_scenes, "Skapa egen"-kort, radera-knapp |
| `supabase/config.toml` | Laegga till generate-scene-image function |

### Filer som INTE aendras

| Fil | Anledning |
|-----|-----------|
| `src/types/scene.ts` | SceneMetadata-interfacet aendras inte |
| `supabase/functions/process-car-image/index.ts` | Fungerar direkt med user scenes |
| `src/pages/Index.tsx` | SceneSelector hanterar allt internt |
| `src/integrations/supabase/types.ts` | Auto-genereras |
| `src/integrations/supabase/client.ts` | Auto-genereras |

---

## Risker och begransningar

- **Bildkvalitet**: Nano Banana (Gemini Flash Image) aer snabb men inte toppkvalitet. Bilderna kan ibland se lite AI-genererade ut. Foer baettre kvalitet kan vi senare uppgradera till `google/gemini-3-pro-image-preview`.
- **Rate limits**: Lovable AI har rate limits per workspace. Om manga anvandare genererar samtidigt kan 429-fel uppstaa. Hanteras med felmeddelande i UI:t.
- **Lagringskostnad**: Varje genererad bild sparas i Storage. Kan loepa paa sikt men minimal kostnad.
