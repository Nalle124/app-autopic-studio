
# Mål
Göra resultaten träffsäkra: **bilen ska transfereras pixel-exakt** (form, färg, vinkel, hjul, dekaler, hela utbredningen), medan AI:n bara hanterar bakgrund + skugga/reflektion. Idag varierar prompt-kvaliteten mellan motorerna och vissa parametrar är inte optimalt satta.

---

## Så här fungerar bakgrundsutskärningen idag

| Motor | Hur bilen "skärs ut" |
|---|---|
| **PhotoRoom (Studio Classic)** | Riktig segmentering — PhotoRoom kör sin egen bilmodell, maskar ut bilen pixel-perfekt och lägger den på sin Studio-genererade bakgrund. `imageFile` + `background.guidance.imageUrl` (din scene-referens) + `referenceScale`. Här ändras bilen aldrig. |
| **Gemini Scene Fast/Pro/Studio** | Ingen riktig utskärning. Vi skickar **hela original­bilden + referensbakgrund** och ber Gemini "låtsas-paste:a" bilen. Gemini re-renderar oftast bilen → små färg-/form-/vinkel­drifter, ibland croppad bumper. |
| **Flux Creative (Kontext Pro)** | Samma sak — ren composite-prompt med två bilder. Re-renderar bilen. |

Det är därför PhotoRoom alltid ger "exakt samma bil", medan Gemini/Flux ibland förvränger den. **Det går inte att helt eliminera** på de generativa motorerna — men vi kan minimera driften kraftigt med rätt prompt/parametrar, och vi kan lägga till ett **hybrid­läge** som ger bästa av båda världar.

---

## Det här optimerar vi

### 1. Hybrid-läge "Exakt utskärning + AI-bakgrund" (största vinsten)
Kör bilen genom **dedikerad bg-removal först** (Replicate Bria RMBG 2.0, ~$0.005/bild) → få en ren PNG-cutout av exakt bil → skicka den cutouten + bakgrundsreferens till Gemini/Flux. Gemini ser då en bil utan original­miljö och fokuserar bara på bakgrund + skuggintegration, vilket dramatiskt minskar re-rendering av bilen.

Detta blir nytt default-flöde för **Scene Fast** och **Scene Pro**.

### 2. System prompts (separera roll från instruktion)
Idag har vi bara `user` role. Lägger till en strikt `system`-prompt per motor som låser rollen:
> "Du är en photo compositor. Du får ALDRIG re-rendera, omtolka eller modifiera bilen i Image 1. Din enda uppgift är bakgrund + skugga."

Det styr modellen starkare än instruktioner i user-content och minskar kreativa friheter.

### 3. Prompt-städning per motor
- **Gemini**: dagens prompts är för långa och blandar instruktioner. Strukturera om till `ROLE → INPUTS → DO → DO NOT → OUTPUT`-block. Tydligare negative constraints ("MUST NOT change paint hue by even 1%", "MUST NOT shift wheel angle"). Lägg till explicit "the car cutout is final art — treat it as a sticker".
- **Flux Kontext**: ta bort scen-`aiPrompt` ur composite-prompten (den beskriver bakgrund och förvirrar Flux när bakgrunden redan är en referensbild). Specificera bara cutout-bevarande + skugga.
- **PhotoRoom**: minimal text-prompt redan rätt, men vi normaliserar `referenceScale` per kategori (studio = 0.95, miljö/bilhall = 0.85, kreativa scener = 0.75) i stället för 0.95 över hela linjen — det ger PhotoRoom rätt nivå av "lyssna på referensen vs improvisera".

### 4. Parametrar att skruva på

**Gemini (`/v1/chat/completions`)**
- `temperature: 0.2` (idag default ~0.7 → variation). Lågt = trognare mot input.
- `top_p: 0.8`
- Kör `gemini-3-pro-image` även för "Fast"-läget när användaren explicit valt "exakt" — Flash hallucinerar mer.

**Flux Kontext Pro**
- `prompt_upsampling: false` (skippa Replicates auto-expansion som annars lägger på extra styling).
- `safety_tolerance: 2` (har redan).
- `guidance: 3.5` (lägre = trognare mot input-bilderna; default är ofta 4.5).
- `num_inference_steps: 30` (höj från default 25 för skarpare cutout-integration).
- `output_quality: 95`.

**PhotoRoom**
- Sätt `pr-ai-background-model-version: background-studio-beta-2025-03-17` (redan på) + per-scen `referenceScale` enligt punkt 3.
- Behåll `background.expandPrompt.mode = ai.never` så den inte uppfinner objekt.

### 5. Konsekvent orientering + dimensioner
Skicka alltid `originalWidth/originalHeight` till Gemini/Flux i prompten (PhotoRoom använder dem redan). Vi har det för interior-flödet men inte exterior — lägger till så aspekten aldrig driftar.

### 6. Validerings­steg efter generering (opt-in, billigt)
Lägg till en snabb visuell check: kör en liten Gemini-Flash-call på resultatet och original­bilen som frågar "is this the same car (yes/no)?". Vid `no` → automatisk retry en gång. Kostar ~$0.001/check, fångar de få fall där bilen ändå driftat.

---

## Implementations­steg

1. **Ny shared helper** `supabase/functions/_shared/bg-removal.ts` — Replicate Bria RMBG 2.0 cutout, returnerar PNG-buffer. Fallback till input-bild om Bria failar.
2. **Refaktor `process-car-gemini`**:
   - Lägg till strikt `system` message.
   - Sätt `temperature: 0.2`, `top_p: 0.8`.
   - Steg: cutout (Bria) → upload cutout → skicka cutout + bg-referens till Gemini.
   - Strama upp prompts (ROLE/DO/DO NOT-format).
   - Skicka original dimensioner.
3. **Refaktor `process-car-flux`**:
   - Använd Bria-cutout som `input_image`.
   - Lägg till `guidance: 3.5`, `num_inference_steps: 30`, `prompt_upsampling: false`.
   - Förenkla prompt — bort med scene `aiPrompt`.
4. **Per-kategori `referenceScale`** för PhotoRoom-scener via migration (studio/bilhall/creative).
5. **Validerings­steg** bakom feature-flag `engineMode === 'pro'` så det bara körs på premium-läget först (kostnad­kontroll).
6. **UI**: Lägg liten info-tooltip på dropdown-motorn som förklarar "Exakt cutout används automatiskt på Scene Fast/Pro" — så användaren förstår skillnaden.

Inga frontend-flöden ändras utöver tooltip. Inga DB-schemaändringar utöver `referenceScale`-värden.

---

## Förväntat resultat

- **Gemini Scene Fast/Pro**: bilen blir ~visuellt identisk i 90%+ av fall (idag uppskattningsvis 60-70%). Croppade bumper-fall försvinner i princip.
- **Flux Creative**: tydligare separation bil/bakgrund, mindre färgdrift.
- **PhotoRoom**: bättre balans per scen-typ — mindre "stel studio-look" på bilhall, fortsatt strikt på rena studios.
- **Validering**: fångar resterande utliggare automatiskt.

Vill du att jag kör hela paketet, eller börjar med bara steg 1-3 (cutout + prompt-fix) och sparar parameter­tweaks + validering till en andra runda?
