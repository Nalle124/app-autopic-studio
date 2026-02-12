

# AI Studio -- Forbattrade guidade floden och nya funktioner

## Oversikt

Omarbeta AI Studions chattfloden for att gora dem mer visuella, guidade och resultatfokuserade. Bilhandlare ska kunna klicka sig fram till proffsiga resultat utan att behova skriva egna prompter. Huvudflodet (ladda upp -> scen -> export) forblir oforandrat.

## Nya menykategorier

Utoka menyval fran 3 till 5:

1. **Skapa bakgrund** (befintlig, forbattrad)
2. **Redigera fritt** (befintlig, oforandrad)
3. **Skapa annons** (befintlig, omarbetad med mallar)
4. **Blurra regskyltar** (NY -- batch-blur funktion)
5. **Bildforslag** (NY -- kreativa forslag baserat pa uppladdade bilder)

## Forbattrade annonsmallar (Skapa annons)

Inspirerat av de uppladdade exemplen, ersatt nuvarande generiska kategorier med specifika mallar:

### Nya annonsmallkategorier:

| Mall | Beskrivning | Format | Referensbild |
|------|-------------|--------|--------------|
| **Inkommande bil** | Landskapsbild med plats-bakgrund, logo, rubrik, kontaktinfo | 3:2 | BilNet-exemplet |
| **Kopannons / personlig** | Portratt med personlig bild, rubrik, bullet points, signatur | 2:3 | Gabriels lapp-exemplet |
| **Kampanjbild** | Stor rubrik, vardebudskap, CTA-knapp, varumärke | Valbart | Kamux/Riddermark-exemplen |
| **Social media** | Instagram/Facebook-optimerad, catchy text, bild + overlay | Valbart | Slipp annonsering-exemplet |
| **Eget** | Fri beskrivning |  |  |

### Guidad mall-flow (exempel "Inkommande bil"):

```text
1. [Valj mall: Inkommande bil]
2. Chatten fragar: "Vilken rubrik?" 
   -> Forslag: "Inkommande bil", "Nyinkommet", "Just nu i lager" + "Skriv eget"
3. "Lagg till undertext?" 
   -> Forslag: "I var bilhall i [stad]", "Tillganglig nu" + Textfalt
4. "Kontaktinfo?"
   -> Textfalt: Telefon, adress
5. "Stil och kansla?"
   -> Visuella referensbilder att klicka pa (3-4 thumbnails fran stock)
6. "Format?"
   -> Liggande / Staende
7. Sammanfattning: "Jag har en bra bild av vad du soker. Skapar din annons..."
   -> [Generera-knapp]
```

### Smartare chattspraak:

Istallet for att visa ratt prompt-lista, visa:
- "Jag har nu en bra bild av vad du soker..." innan generering
- "Skapar din annons..." under laddning (ersatter tekniska fraser)
- Ingen punktlista med engelska promptvarden visas for anvandaren

## Annonsreferensbilder (stock)

Lagg till 4-5 referensbilder i `public/ad-templates/` som visuella stilforslag anvandaren klickar pa:

- `inkommande-bil.png` -- plats-baserad annons
- `kopannons-personlig.png` -- personlig koplapp
- `kampanj-bold.png` -- stor fetstil kampanj
- `social-clean.png` -- ren social media stil
- `minimal-dark.png` -- mork minimalistisk

Dessa genereras med AI (Gemini image) via edge function, eller laggs till manuellt som stock.

## Blurra regskyltar (ny meny)

Ny kategori i AI Studio-menyn:

1. Anvandaren valjer "Blurra regskyltar"
2. Chatten visar uppladdade + genererade bilder fran projektet som ett rutnät
3. Anvandaren valjer en eller flera bilder
4. Klickar "Blurra valda"
5. Anropar `generate-scene-image` i `free-create`-lage med prompt: "Blur/pixelate all license plates in this image, keep everything else exactly the same"
6. Resultatet visas i chatten, en bild i taget

## Tekniska forandringar

### `CreateSceneModal.tsx`

**Nya/andrade konstanter:**

- `AD_TEMPLATES` -- ny array med malltyper (ersatter `AD_CATEGORIES`), varje mall har `label`, `value`, `icon`, `description`, `defaultFormat`, `guidedSteps`
- `AD_TEMPLATE_REFERENCES` -- referensbilder per malltyp (thumbnails anvandaren klickar pa for stil-inspo)
- `BLUR_PLATE_PROMPT` -- fast prompt for reg-blur
- Borttagna emojis fran alla guided flows

**Andrad chattlogik:**

- `assistant-summary` visar "Jag har en bra bild av vad du soker..." istallet for raat promptinnehall
- Dolj engelska prompt-varden fran sammanfattningskortet -- visa bara svenska etiketter
- Ny `role: 'assistant-image-grid'` for att visa batch-bilder (regskyltar)
- Uppdatera `selectMode` for nya menykategorier

**Ny state:**

- `selectedBlurImages: string[]` -- valda bilder for regskylts-blur

### `generate-scene-image/index.ts`

Inga angringar kravs -- befintlig `free-create` och `ad-create` mode hanterar redan allt. Prompt-forbattringarna sker enbart pa klientsidan genom smartare guidning.

### Sammanfattningskort -- UX-forbattring

Nuvarande:
```text
[Typ: Studio]
[x] bright and airy with soft diffused lighting
[x] polished concrete floor
[Generera bakgrund]
```

Nytt:
```text
"Jag har en bra bild av vad du soker."
[Studio | Ljust & luftigt | Polerad betong]
[Generera bakgrund]
```

Visa svenska etiketter istallet for engelska prompt-varden. Lagra mappningen `label -> promptValue` internt.

## Filer som andras

| Fil | Typ av andring |
|-----|----------------|
| `src/components/CreateSceneModal.tsx` | Stor omarbetning av guided flows, nya menykategorier, smartare UI |
| `public/ad-templates/` | Nya referensbilder for annonsmallar (kan behova skapas manuellt eller genereras) |

## Vad som INTE andras

- Huvudflodet (steg 1-4: ladda upp -> valj scen -> generera -> redigera)
- Edge function `generate-scene-image`
- Bakgrundsstudio-flodet (bara smarre UI-polish)
- Redigera fritt-flodet

## Implementationsordning

1. Refaktorera annonsfloden med nya mallar och guidade steg
2. Lagg till "Blurra regskyltar" som ny menykategori  
3. Uppdatera sammanfattningskortet till smartare sprak (dolj engelska prompts)
4. Lagg till referensbilder for annonsmallar
5. Rensa emojis och polska chattmeddelanden

