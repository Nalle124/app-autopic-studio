
# Plan: Stabil rebuild av AI-motor-lagret

Målet är att komma igång igen med stabil generering, ha **flera motorer samlade på ett ställe**, och hålla kostnaderna **rörliga** (pay-per-use, inga fasta abonnemang som tickar utan användning).

---

## 1. Nuläge & diagnos

- **Photoroom**: Abonnemang uppsagt → API-nyckeln returnerar 401/403. Båda edge-funktioner (`process-car-image` + `process-car-gemini`) använder Photoroom i steg 1 för bg-removal → **all generering är trasig just nu**.
- **Gemini-motorer** (Studio Pro + Scene Match) finns redan i koden men kraschar pga Photoroom-steget ovan.
- **UI**: Dropdown för motorval finns redan i `V2GenerateStep.tsx` (Populär/Ny/Exakt). Vi behöver bara utöka den, inte bygga om.
- **Backend**: Lovable Cloud är uppe, alla credits/jobb-tabeller intakta.

---

## 2. Motor-portfölj som byggs

| Motor | Provider | Pris-modell | Roll | Status |
|---|---|---|---|---|
| **Studio Classic** | Photoroom (sandbox → live) | Pay-per-use credits (~$0.10–0.13/bild) — inget abonnemang | Stabil studio-look, rena bakgrunder | Testas fresh i sandbox |
| **Scene Pro** | Gemini 3 Pro Image (Lovable AI) | Per token, debiteras från workspace-krediter | Avancerade scener, exakt referens | Redan i kod |
| **Scene Fast** | Gemini 3.1 Flash Image / Nano Banana 2 (Lovable AI) | Billigare + snabbare än Pro | Ny default för volym | Ny |
| **Flux Kontext** | Replicate (connector) | ~$0.02–0.05/bild (Flux Schnell), $0.04 Kontext Pro | Kreativ kompositioner, "logo-i-scen"-experiment | Ny |
| **Bria / SDXL studio** | Replicate | ~$0.01–0.03/bild | Senare reserv om någon viker sig | Förberedd, ej aktiv v1 |

Alla har **rörlig kostnad** — vi betalar bara per bildgenerering. Inga månadsavgifter utöver Lovable AI Gateway-allowance + ev. Photoroom-credits.

### Prisindikation (för din planering)
- **Gemini via Lovable AI** ingår i workspace-krediterna, ingen separat faktura.
- **Replicate Flux Schnell**: $0.003/bild · **Flux 1.1 Pro**: $0.04/bild · **Flux Kontext Pro** (edit/composite): $0.04/bild. Allt pay-as-you-go.
- **Photoroom**: nya kontot har sandbox gratis. Live-API: prenumeration ELLER pay-as-you-go credits — vi väljer credits så det stannar när vi inte använder det.

---

## 3. Bakgrundsborttagning (cutout)

Det här är pipelinens kritiska första steg. Min rekommendation efter att ha vägt det du beskrev (måste hantera interiör genom rutor, inte bara siluetter):

**Primär**: **Bria RMBG 2.0 via Replicate** (~$0.005/bild). Top-tier på fönsterglas, hår, transparens — bättre än Photoroom på interiörer i många test. Pay-per-use, ingen prenumeration.

**Fallback**: **`@imgly/background-removal`** i browsern. Gratis, ingen API-kostnad, fungerar offline. Aktiveras automatiskt om Replicate misslyckas, eller som "spara credits"-läge.

**Photoroom** behåller vi bara om sandbox-testet visar att den fortfarande är märkbart bättre — och då bara som motor (Studio Classic), inte som bg-removal-leverantör.

---

## 4. Implementations-steg

### Steg 1 — Återställ basen (1 PR)
- Bygg om `process-car-image` så bg-removal **inte längre kräver Photoroom**. Lägg in Bria via Replicate-connector som primär + browser-fallback.
- Detta får default-flödet att fungera igen direkt, utan att vi väntar på Photoroom-beslut.
- Frontend oförändrat — befintliga val fortsätter funka, bara säkrare.

### Steg 2 — Standardisera motor-arkitekturen
- Skapa `supabase/functions/_shared/engines/` med en gemensam interface: `{ removeBackground, composite }`.
- Bryt ut Photoroom, Gemini och Replicate till varsin tunn adapter.
- En central `process-car` edge-funktion router efter `engine`-parametern (vi har redan routing-logiken i V2GenerateStep, den blir snyggare nu).

### Steg 3 — Lägg till Gemini 3.1 Flash som ny default
- Snabbare och billigare än 3 Pro. Bra för volym, Pro stannar som "premium scene".
- Bara en model-string-ändring + ny rad i motor-listan.

### Steg 4 — Lägg till Flux Kontext via Replicate
- Connector: Replicate (du länkar via Connectors-vyn första gången).
- Ny motor "**Flux Creative**" i dropdownen med badge "Experiment".
- Här kan vi testa logo-i-scen och liknande utan att röra de stabila motorerna.

### Steg 5 — Photoroom-sandbox-test (parallellt)
- Du skapar nytt Photoroom-konto, vi testar deras sandbox-API med en handfull olika bilder.
- Om kvalitet OK 2026 → aktivera "Studio Classic" som motor (pay-per-use, inte abonnemang).
- Om fortfarande hallucinerar → vi lämnar den ute och har ändå 3 fungerande motorer.

### Steg 6 — Kostnadsdashboard
- Liten admin-vy som visar antal generates per motor de senaste 30 dagarna × deras kända per-bild-kostnad.
- Hjälper dig sätta rätt pris och fånga om en motor börjar kosta mer än den ger.

---

## 5. UX

Behåll dropdownen som finns idag, utöka till:

```text
┌─ Välj AI-motor ──────────────────┐
│ ⚡ Scene Fast       [Populär]    │  ← Gemini 3.1 Flash, default
│ 🎯 Scene Pro        [Premium]    │  ← Gemini 3 Pro
│ 🎨 Flux Creative    [Experiment] │  ← Replicate
│ 🏛  Studio Classic  [Klassisk]   │  ← Photoroom (aktiveras efter test)
└──────────────────────────────────┘
```

Användaren ser produkter, inte tekniska modellnamn. Internt vet vi vilken adapter som körs.

---

## 6. Vad jag behöver av dig

1. **Godkänn planen** så börjar jag med Steg 1 (få igång default-flödet igen utan Photoroom).
2. **Länka Replicate-connector** när vi når Steg 4 (eller redan nu — det är en knapp i Connectors-vyn).
3. **Skapa nytt Photoroom-konto** + skicka API-nyckel via Inställningar → Secrets när vi når Steg 5. Inget bråttom — appen funkar utan.

Inga andra externa konton krävs. Gemini går via Lovable AI utan extra nyckel.

---

## 7. Vad jag medvetet INTE gör nu

- Bygger inte om V2-wizard-flödet — endast motor-lagret.
- Lägger inte till "logo-på-vägg"-feature som egen funktion — den dyker upp naturligt via Flux Creative om den motorn klarar det.
- Rör inte priser, paywall eller credits-logiken — den fungerar.
- Lägger inte till fler motorer än listan ovan i v1. Bria/SDXL/etc står i kö om någon viker sig.
