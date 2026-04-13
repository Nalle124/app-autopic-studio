

## Analys: Vad har ändrats

Jag jämförde den nuvarande koden med den version som fungerade bra (`2266e0a` — "Background flow finalized"). Här är de faktiska skillnaderna:

### Skillnad 1 — Output-storlek sänkt från 4000 → 2500
Den gamla versionen skickade `maxWidth = 4000, maxHeight = 4000` till PhotoRoom. Den nuvarande skickar `maxWidth = 2500, maxHeight = 2500`. Lägre upplösning ger PhotoRoom mindre kontext att arbeta med, vilket kan leda till sämre bakgrundsresultat.

### Skillnad 2 — Export-format ändrat från PNG → JPG
Den gamla versionen använde `export.format = png`. Nu används `export.format = jpg` med `quality = 90`. JPG-komprimering kan påverka modellens förmåga att generera rena bakgrunder.

### Skillnad 3 — reference_scale satt till 1.0 för alla scener
Scenerna hade tidigare specifika värden (t.ex. 0.65–0.95). Nu har alla studios 1.0, vilket kan göra att modellen beter sig annorlunda — 1.0 kan tvinga modellen att försöka kopiera referensen exakt, vilket paradoxalt kan ge sämre resultat om modellen inte är designad för det.

### Skillnad 4 — Prompterna förkortades
Den gamla versionen hade längre positioneringsinstruktioner. Den nuvarande har kortare varianter.

## Plan: Återställ till den fungerande konfigurationen

### 1. Återställ output-storlek till 4000×4000
Byt tillbaka `maxWidth` och `maxHeight` till 4000 i edge-funktionen. Detta var troligen den mest påverkande förändringen.

### 2. Återställ export-format till PNG
Byt tillbaka till `export.format = png` och ta bort `export.quality`. Komprimeringen till JPG sker redan i eftersteget via `compressToJpeg`.

### 3. Återställ reference_scale till tidigare nivåer
Uppdatera databasen:
- Studios (studio-dark, studio-light, studio-basic, studio-colored): **0.85**
- Outdoor: **0.70** (redan rätt)
- Autumn: **0.70** (redan rätt)
- Premium: **0.75**

### 4. Återställ de längre positioneringspromptarna
Byt tillbaka till de gamla, mer detaljerade orienterings-hinten som användes i den fungerande versionen.

### 5. Samma ändringar i demo-funktionen
Harmonisera `process-demo-image` med samma inställningar.

### Filer som ändras
- `supabase/functions/process-car-image/index.ts`
- `supabase/functions/process-demo-image/index.ts`
- Databasmigration för `scenes` (reference_scale)

### Förväntad effekt
Koden återgår till det mönster som fungerade bra, utan nya "tricks". Samma API-anrop, samma storlekar, samma format.

