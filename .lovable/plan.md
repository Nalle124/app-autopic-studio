
Mål: komma till botten med varför vissa bilder fortfarande får hallucinerade objekt i studio-bakgrunder, trots att tjänsten historiskt fungerat bättre.

Det jag nu vet efter att ha jämfört kod, databas och tidigare historik:

1. Den aktiva logiken idag skiljer sig tydligt från den äldre “fungerade bättre”-perioden
- Tidigare fungerande spår i historiken använde PhotoRooms AI-guidance-flöde:
  - `background.guidance.imageUrl`
  - `background.guidance.scale`
  - kort prompt
- Nuvarande kod i både `process-car-image` och `process-demo-image` använder i stället:
  - `background.imageFile`
  - ingen `background.guidance.scale`
  - ingen `background.prompt`
  - ingen `background.guidance.imageUrl`

Det betyder att kommunikationen med PhotoRoom faktiskt har ändrats ganska mycket jämfört med för några veckor sedan.

2. `reference_scale` är just nu i praktiken inte styrande
Jag kontrollerade både koden och databasen:
- Studio-scenerna du nämnt ligger nu på `reference_scale = 0.85`
- Exempel:
  - NetGrey Dark: `0.85`
  - NetGrey Light: `0.85`
  - Anthracite Studio: `0.85`
  - Vit Kakel: `0.85`

Men i nuvarande backend skickas inte `background.guidance.scale` alls i exterior-flödet. Så att ändra `reference_scale` i databasen påverkar just nu inte PhotoRoom-anropet för dessa bilder.

3. Alla bakgrunder är alltså inte “olika kalibrerade” just nu
- De aktuella studio-kategorierna verkar i stort sett ligga på samma nivå: `0.85`
- Men viktigare: den nivån används inte i nuvarande request
- Så problemet är mer sannolikt request-struktur / aktiv kodväg än själva scene-värdena

4. Det finns flera inkonsekventa kodvägar som kan förklara varför vissa bilder blir bra och andra dåliga
Jag hittade flera skillnader:
- `process-car-image` skickar huvudbilden som `imageFile`
- `process-demo-image` skickar huvudbilden som `imageUrl`
- V2 batch-flödet skickar fortfarande `autoCrop` + `autoCropPadding`
- V2 single-image-flödet pre-croppar lokalt först
- classic / demo / v2 använder inte exakt samma väg

Det gör att två bilder kan nå PhotoRoom med olika framing, olika subject box och olika inputtyp, även om användaren upplever “samma scen”.

5. En väldigt konkret möjlig felkälla: `referenceBox`
I `process-car-image` används:
```text
referenceBox = subjectBox när autoCrop = true
referenceBox = originalImage när autoCrop = false
```
PhotoRooms docs säger att `referenceBox` styr om padding/margin räknas runt den croppade subject-boxen eller runt originalbilden. Det kan ge olika framing mellan bilder och bidra till att vissa motiv behandlas annorlunda.

6. En annan konkret möjlig felkälla: PhotoRoom-shadow skiljer sig per scen
De problematiska NetGrey-scenerna använder `photoroom_shadow_mode = ai.soft`, medan t.ex. Anthracite/Vit Kakel ligger på `none`.
Det är inte min huvudmisstanke, men det är en verklig skillnad mellan scenerna som kan påverka hur mycket PhotoRoom “tolkar” bilden.

7. PhotoRoom-dokumentationen bekräftar två viktiga saker
- `background.guidance.scale` fungerar bara för nya guidance-modellen
- `background.negativePrompt` är legacy och gäller bara modellversion `2`
- `background.imageFile` och `background.prompt` får inte kombineras
- `background.imageFile` är tänkt som statisk bakgrund, inte guidance

Detta stärker slutsatsen att problemet sannolikt sitter i att vi har bytt renderingsstrategi, men fortfarande har flera rörliga parametrar runt framing/crop/inputtyp.

Do I know what the issue is?
Ja, tillräckligt för att isolera huvudproblemet:
- Det största felet just nu är inte att `reference_scale` är fel satt.
- Det största felet är att nuvarande exterior-flöde inte längre använder samma PhotoRoom-läge som när det fungerade bättre, samtidigt som flera klientvägar fortfarande skickar olika crop/framing-signaler.
- Med andra ord: PhotoRoom får sannolikt inte “för mycket prompt-data”, men det får inkonsekvent och delvis förändrad strukturell data.

Min plan för nästa implementation:

1. Lås exterior-flödet till en enda sann requeststruktur
Filer:
- `supabase/functions/process-car-image/index.ts`
- `supabase/functions/process-demo-image/index.ts`
- `src/components/v2/V2GenerateStep.tsx`
- `src/pages/Index.tsx`
- `src/pages/Demo.tsx`

Jag kommer att:
- säkerställa att alla exterior-flöden använder samma PhotoRoom-inputmodell
- eliminera skillnader mellan classic / demo / V2 batch / V2 single
- välja antingen konsekvent `imageFile` eller konsekvent `imageUrl` för huvudbilden i alla flöden

2. Instrumentera exakt vad som faktiskt skickas till PhotoRoom
Jag kommer lägga in tydlig loggning per bild för:
- scene id
- resolved background URL
- bakgrundsfilens storlek/content-type
- autoCrop
- referenceBox
- padding
- shadow.mode
- lighting.mode
- outputSize
- vilken klientväg som kallade funktionen

Detta behövs för att jämföra en “bra” och en “dålig” bild svart på vitt.

3. Köra minimal A/B-struktur i exterior-flödet
Jag kommer isolera två requestprofiler:
```text
Profil A: minimal static replacement
- imageFile
- background.imageFile
- removeBackground default
- padding
- scaling
- utan extra relight/shadow där möjligt

Profil B: samma som idag
- med shadow/relight/referenceBox-logik
```
Om A blir stabil men B inte, vet vi exakt vilken parametergrupp som orsakar artefakterna.

4. Återställa närmare det historiskt fungerande läget om testerna pekar dit
Om loggarna visar att static mode inte är roten, går jag tillbaka till ett rent guidance-test som matchar äldre beteende bättre:
- `background.guidance.imageUrl` eller `background.guidance.imageFile`
- `background.guidance.scale`
- kort prompt
- utan legacy-fält
- samma struktur för alla klientvägar

Detta blir då en kontrollerad återgång, inte fler gissningar.

5. Verifiera att rätt bakgrundsasset faktiskt används
Jag kommer även kontrollera att:
- `full_res_url` för scenen verkligen är samma asset som användaren ser i galleriet
- ingen annan background-asset hämtas i vissa vägar
- ingen data-URI / temporär omväg ger annan bild än förväntat

Tekniska detaljer som är viktigast för dig:
- Ja, PhotoRoom-anropet har ändrats jämfört med tidigare fungerande versioner.
- Nej, `reference_scale` styr inte det nuvarande exterior-resultatet trots att det finns i databasen.
- Ja, studio-scenerna du nämner har i princip samma `reference_scale` nu.
- Den mest sannolika rotorsaken är inkonsekvent requeststruktur mellan flera flöden, inte att bara en scenprompt eller en enskild bakgrund är “fel”.

När du godkänner går jag vidare med exakt den här djupfixen: först standardisera requesten, sedan logga bra/dåliga fall, sedan isolera vilken parameter som gör att vissa bilder får objekt i bakgrunden.
