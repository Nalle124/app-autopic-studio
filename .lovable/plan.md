

# Landningssida for AutoPic

## Sammanfattning

En komplett, modern landningssida byggs direkt i React-appen. Den ersatter Framer-sidan som primar landningssida och visas for icke-inloggade besokare pa `/`. Inloggade anvandare dirigeras direkt till arbetsytan som vanligt. Sidan matchar appens befintliga designsystem (Host Grotesk, DM Sans, morkt tema, gradient-premium, noise textures) och innehaller alla sektioner fran Framer-sidan plus en ny sektion som lyfter AI-bakgrundsgeneratorn.

---

## Routing-andring

Idag omdirigerar `/` (Index.tsx) icke-inloggade till `/auth`. Istallet:
- **Icke-inloggade pa `/`** -- ser den nya landningssidan
- **Inloggade pa `/`** -- ser arbetsytan (dagens Index-innehall)

Tekniskt losning: skapa en wrapper-komponent i Index.tsx som villkorligt renderar antingen Landing eller arbetsytan beroende pa inloggningsstatus. Alternativt kan vi ha en separat Landing-komponent som importeras i Index och visas i "else"-grenen av auth-checken.

---

## Sektioner pa landningssidan

### 1. Navigation / Header
- AutoPic-logotypen (vanster)
- Nav-lankar: Funktioner, Priser, Kontakt (scrollar ner pa sidan)
- CTA-knappar: "Logga in" (ghost) + "Testa gratis" (primar, lankar till /try)
- Sticky, glasmorfism-bakgrund, matcher befintlig header-stil

### 2. Hero
- Vansterspaltig rubrik: **"Bra annonser oavsett vader"** (Host Grotesk, stor)
- Italic accent-text pa nyckelord (Playfair Display italic pa "oavsett")
- Underrubrik: "Andra bakgrund pa dina bilbilder med AI. Valj bland 80+ miljoeeer."
- CTA: "Testa gratis" (primar knapp) + "Se hur det funkar" (sekundar, scrollar till How It Works)
- Hoeger sida: stor bild av en bil i en snygg studio-bakgrund (anvander befintliga assets)
- Responsivt: Pa mobil staplas text ovanfor bild

### 3. Before/After Slider
- Anvander befintlig `BeforeAfterSlider`-komponent
- Visar ett konkret fore/efter-par (t.ex. ford-before/ford-after eller vw-before/vw-after)
- Subtil rubrik: "Se skillnaden"
- Platshallare for nar anvandaren bifogar battre bilder/video senare

### 4. Bakgrundsgalleri -- preview
- Rubrik: "80+ miljoeeer som funkar i riktiga bilannonser"
- Horisontellt scrollande rad med thumbnails fran befintliga scener (studio, host, utomhus, premium)
- Varje thumbnail har en liten etikett
- Avslutas med en "Se alla" CTA som lankar till /try

### 5. AI-funktionen (NY sektion -- lyfts som USP)
- Rubrik: "Skapa din egen bakgrund med AI"
- Kort beskrivning: "Beskriv din droemmiljoe saa genererar vi den. Unikt for just dina annonser."
- Visuellt: mockup/illustration av chattgranssnittet med ett exempel-prompt och en genererad bild
- CTA: "Testa gratis"
- Gradient-premium bar som accent

### 6. Funktioner -- "Ett showroom i fickan"
- Rubriken: "Allt du behoeever for proffsiga bilbilder"
- Kort-baserad layout med 4-6 kort:
  - **Batch-redigering** -- Redigera alla bilder paa en gang
  - **Ljusfoeerbaettring** -- Relight med AI
  - **Logo Studio** -- Lagg till logotyp och banner
  - **Beskaarning & Export** -- Olika format foer olika plattformar
  - **AI-bakgrunder** -- Skapa egna bakgrunder
  - **Lokalt anpassat** -- Miljoeeer anpassade foer den svenska marknaden
- Varje kort: ikon + rubrik + kort beskrivning

### 7. Hur det funkar (3 steg)
- Numrerade steg med ikoner:
  1. Ladda upp bilder
  2. Vaelj bakgrund (eller skapa med AI)
  3. Ladda ner
- CTA: "Testa gratis"

### 8. Varfoer valja AutoPic (jaemfoerelsetabell)
- Enkel tabell: AutoPic vs "Andra appar"
- Rader: Startavgift (0 kr vs Ofta dyrt), Demo-moete (Koeer direkt vs Kraevs ofta), Teknologi (Snabb utveckling vs Anpassad foer kedjor)

### 9. Priser
- Anvander data fran `src/config/pricing.ts` direkt
- Visar alla planer: Start, Pro (Populaer-badge), Business, Scale + Credit Pack
- Varje plan: pris, credits, features, CTA-knapp
- CTA-knapparna lankar till `/guest-checkout?plan=X` (befintligt floede)
- Pro-plan faar gradient-premium bakgrund och "Populaer"-badge

### 10. FAQ
- Anvander Accordion-komponenten
- Fragor fran Framer-sidan:
  - AEndras bilens skick?
  - Maaste jag vara teknisk?
  - AEr det naagon startavgift?
  - Funkar det med andra fordon?
  - AEr det gratis att testa?
  - Kontaktinformation

### 11. Footer / Final CTA
- Rubrik: "Ta er annonsering till naesta nivaa"
- CTA: "Testa gratis" (lankar till /try)
- Footer-lankar: Om oss, Kontakt, Priser, Logga in
- Copyright-text

---

## Tekniska detaljer

### Filer som skapas

| Fil | Beskrivning |
|-----|-------------|
| `src/pages/Landing.tsx` | Ny landningssida med alla sektioner |

### Filer som aendras

| Fil | AEndring |
|-----|----------|
| `src/pages/Index.tsx` | Ta bort redirect till /auth foer icke-inloggade. Visa Landing istallet. |

### Filer som INTE aendras

Allt annat: SceneSelector, CreateSceneModal, Auth, edge functions, databas, etc.

### Design-anpassning

Sidan anvander exakt samma designsystem som resten av appen:
- **Typografi**: Host Grotesk foer rubriker, DM Sans foer broedtext
- **Faerger**: CSS-variabler (--background, --foreground, --primary, etc.)
- **Gradients**: `var(--gradient-premium)`, `var(--gradient-card)`
- **Shadows**: `var(--shadow-card)`, `var(--shadow-elegant)`
- **Border radius**: 15px (card), 48px (buttons)
- **Noise texture**: Redan global via body::before
- **Moerkt tema som default**: Matchar appens default

### Befintliga assets som anvands

- `src/assets/autopic-logo-dark.png` / `autopic-logo-white.png` (header)
- `src/assets/examples/ford-before.png` + `ford-after.png` (before/after)
- `src/assets/examples/partner-before.jpg` + `partner-after.png` (alternativt par)
- `src/assets/examples/vw-before.png` + `vw-after.png` (alternativt par)
- Scen-thumbnails fran `public/scenes/` (galleri-preview)
- `src/assets/aura-gradient-*.jpg` (dekorativa element)
- Befintlig `BeforeAfterSlider`-komponent

### Responsivitet

- Desktop: tvaakolumns-layout i hero, horisontellt galleri, grid foer funktionskort
- Mobil: enkolumns-layout, staplade sektioner, kompakta priskort
- Samma breakpoints som resten av appen (sm, md, lg)

### SEO och metadata

- Uppdatera `<title>` och meta description i `index.html` foer landing
- Sidan renderas direkt utan auth-check foer snabb laddning

---

## Vad anvandaren kan laegga till senare

- Riktiga foere/efter-videor (ersaetter platshaallar-bilder)
- Kundcitat / testimonials
- Animerade exempel fran AI-bakgrundsgeneratorn
- Interaktiva element som matchar Framer-sidans precision

