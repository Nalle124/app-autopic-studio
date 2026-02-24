
# AI Studio -- Optimering av floden, meny och annonsverktyg

## Oversikt

Tre sammanlankade forbattringsomraden for AI Studio:

1. **Menydesign** -- Fran enkel lista till visuellt kort-grid med tydlig hierarki
2. **Annonsflode med text-overlay** -- AI skapar bakgrund/layout, text laggs pa som redigerbart UI-overlay
3. **Forbattrade guidade floden** -- Smartare prompter, battre mockup-bibliotek, tydligare UX

---

## Del 1: Ny menydesign

### Nuvarande problem
- Menyn kanns som en enkel lista med knappar
- Alla fem alternativ har samma visuella vikt
- Saknar den "magiska" kanslan som en bildverktygs-app bor ha

### Ny design

**Layout: Kort-grid med hierarki**

```text
+------------------------------------------+
|  AutoChat AI (beta)        [<-] [Meny]   |
+------------------------------------------+
|                                          |
|  Vad vill du skapa?                      |
|                                          |
|  +----------------+  +----------------+ |
|  | [thumbnail]    |  | [thumbnail]    | |
|  | Skapa          |  | Redigera       | |
|  | bakgrund       |  | fritt          | |
|  | Designa miljö  |  | AI redigerar   | |
|  +----------------+  +----------------+ |
|                                          |
|  +------------------------------------+ |
|  | [thumbnails]     Skapa annons      | |
|  |                  Marknadsföring &  | |
|  |                  kreativt material | |
|  +------------------------------------+ |
|                                          |
|  --- Verktyg ---                         |
|  [Blurra regskyltar]  [Applicera logo]  |
|                                          |
+------------------------------------------+
```

**Forandringar:**
- De tre huvudfunktionerna visas som stora kort i ett 2+1 grid (bakgrund + redigera fritt pa rad 1, annons som full bredd pa rad 2)
- "Blurra regskyltar" och "Applicera logo" grupperas under en separator med rubriken "Verktyg" som mindre, kompakta knappar
- Varje kort har en thumbnail-forhandsvisning, titel och kort beskrivning
- Hover-effekt med subtil skala och border-farg

---

## Del 2: Annonsflode med text-overlay-system

### Problemet idag
- AI genererar text direkt i bilden -- resulterar i stavfel, felaktiga tecken
- Nar anvandaren valjer "Personlig & autentisk" som stil, skriver AI bokstavligt "personlig" och "autentisk" pa bilden
- Ingen kontroll over typografi, placering eller redigering

### Ny approach: Hybrid med text-overlay

**Flode:**

```text
1. Anvandaren valjer mockup-mall (t.ex. "Inkommande bil -- Ljus & clean")
2. Guidad chatt fragar efter text-innehall:
   - "Vilken rubrik?" -> "Inkommande bil" / "Nyinkommet" / Eget
   - "Undertext?" -> "I var bilhall i Skara" / Eget
   - "Kontaktinfo?" -> Telefon, e-post
3. AI genererar BAKGRUNDSBILDEN utan text (med stil, layout-komposition)
4. Text laggs pa som HTML/Canvas overlay i appen
5. Anvandaren kan redigera text, flytta element, andra storlek
```

### Teknisk implementation

**Ny komponent: `AdTextOverlayEditor.tsx`**

En Canvas/HTML-baserad editor som:
- Visar den AI-genererade bakgrundsbilden
- Lagger pa textelement (rubrik, undertext, CTA) som draggbara/redigerbara lager
- Stoder fontinstellningar (storlek, farg, font-familj)
- Exporterar slutresultatet som en sammanfogad PNG/JPG
- Varje mockup-mall definierar default-positioner for text-elementen

**Datastruktur for text-overlay:**

```text
AdOverlayConfig {
  backgroundImageUrl: string
  elements: [
    { type: "headline", text: "Inkommande bil", x, y, fontSize, color, fontFamily }
    { type: "subtitle", text: "I var bilhall", x, y, fontSize, color, fontFamily }
    { type: "cta", text: "Ring 0500-123456", x, y, fontSize, color, fontFamily }
    { type: "logo", imageUrl: "...", x, y, width, height }
  ]
  format: "landscape" | "portrait"
}
```

**Andrad edge function-logik for annonser:**

AD_CREATE_SYSTEM_PROMPT uppdateras med en ny instruktion:
- "Skapa en professionell bakgrundsbild for en bilannons. Inkludera INTE nagon text i bilden. Lat omraden dar text ska placeras vara tomma eller ha diskret negativ yta. Fokuera pa komposition, farger och stamnning."
- Prompten byggs fran mallinformation (stil, fargschema, layout-typ) men utan textkrav

### Mockup-mallbibliotek (forbattrat)

Varje mall definierar:

| Egenskap | Beskrivning |
|----------|-------------|
| `backgroundPrompt` | Master-prompt for AI-bakgrunden (utan text) |
| `textSlots` | Vilka textelement som behovs (rubrik, undertext, CTA, kontakt) |
| `defaultPositions` | Var textelementen placeras default (x%, y%) |
| `colorScheme` | Foreslagna farger for text (ljus/mork/accent) |
| `fontPreset` | Default font-familj och storlekar |
| `format` | Landskaps eller portratt |

**Exempel -- "Inkommande bil, Ljus & clean":**

```text
backgroundPrompt: "Professional automotive dealership marketing background.
  Clean, bright, modern composition with soft gradient from light grey to white.
  Large negative space in upper portion for headline placement.
  Lower section has subtle road/asphalt texture. Premium lighting with soft shadows.
  Color palette: cool whites, light blues, subtle silver tones."

textSlots: [
  { id: "headline", label: "Rubrik", default: "Inkommande bil", position: top-center }
  { id: "subtitle", label: "Undertext", default: "I var bilhall", position: below-headline }
  { id: "contact", label: "Kontakt", default: "", position: bottom-right }
]

colorScheme: { text: "#1a1a1a", accent: "#3b82f6", background: "rgba(255,255,255,0.85)" }
fontPreset: { headline: "Inter Bold 48px", subtitle: "Inter Regular 24px" }
```

### Nar anvandaren valjer en mockup:

1. Mockup-bilden visas som referens i chatten
2. Guidade fragor samlar text-innehall (rubrik, undertext, CTA)
3. En "bakgrundsprompt" (utan text) skickas till AI
4. AI returnerar en ren bakgrundsbild
5. `AdTextOverlayEditor` oppnas med bakgrundsbilden + textelementen fran guiden
6. Anvandaren kan dra, redigera och styla texten
7. "Exportera" sammanfogar allt till en slutbild

---

## Del 3: Forbattrade guidade floden

### Skapa bakgrund -- forenkling

**Andring:** Nar anvandaren valjer en kategori (t.ex. Utomhus) och far inspirationsbilder + forval:
- Ta bort den separata raden "Anvands som inspiration (valfritt)" -- slå ihop med inspirationsbilderna
- Gor tydligare att man MASTE valja ett av forvalen for att ga vidare
- Lagg till en tunn separator och text "Valj ett alternativ for att fortsatta:" ovanfor knapparna

### Redigera fritt -- battre referensbildshantering

**Nuvarande:** Uppladdningssektionen fungerar men ar inte tillrackligt framtradande.

**Forbattring:**
- Om anvandaren har uppladdade projektbilder, visa de 4 senaste som standard (utan att behova klicka "Valj bild fran enhet" forst)
- Nar en bild ar vald, visa tydlig "vald"-markering (bla kant + bock)
- Snabbvalen (Andra vinkel, Ta bort bakgrund etc.) ska tydligt kommunicera att de appliceras PA den valda bilden

---

## Filer som andras

| Fil | Andring |
|-----|---------|
| `src/components/CreateSceneModal.tsx` | Ny menydesign (kort-grid), forbattrade guidade floden, text-overlay integration |
| `src/components/AdTextOverlayEditor.tsx` | **NY** -- Canvas/HTML editor for text pa annonser |
| `supabase/functions/generate-scene-image/index.ts` | Ny `ad-create-background` sub-mode som genererar bakgrund utan text |
| `public/ad-templates/` | Eventuellt nya/uppdaterade mockup-bilder |

## Vad som INTE andras

- Huvudflodet (ladda upp -> valj scen -> generera -> redigera)
- Bakgrundsstudio-funktionaliteten (bara UX-forbattringar)
- Redigera fritt-karnlogiken
- Betalningsfloden, auth eller profilsidor

## Implementationsordning

1. **Menydesign** -- Ny kort-grid layout med hierarki och separator for verktyg
2. **Ad text-overlay editor** -- Ny komponent `AdTextOverlayEditor.tsx` med draggbara textelement
3. **Mockup-mallbibliotek** -- Definiera `backgroundPrompt`, `textSlots`, positioner for varje mall
4. **Edge function uppdatering** -- Ny sub-mode for textfri annons-bakgrund
5. **Integration** -- Koppla ihop guidad chatt -> AI bakgrund -> text-overlay editor -> export
6. **UX-polish** -- Forbattra guidade floden, tydligare instruktioner, battre bilder

