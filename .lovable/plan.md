

# Redesign av mode-select-korten i AI-chatten

## Vad som andras

De tre lagesknapparna i chattens startmeny ("Skapa bakgrund", "Fri bild", "Skapa annons") far en ny, mer grafisk layout som matchar din Figma-design. Varje kort far en forhandsvisningsbild pa hoger sida som visar vad man kan gora i det laget.

## Design

Varje kort far:
- **Bredare layout** med flexbox (text till vanster, bild(er) till hoger)
- **Forhandsvisningsbilder** som ar latt roterade/overlappande for dynamisk kansla, precis som i din Figma
- **Storre klickyta** med tydligare visuell hierarki
- Max-bredd okas fran `max-w-xs sm:max-w-sm` till `max-w-md sm:max-w-lg` for att ge plats at bilderna

## Bilder som anvands

Istallet for att lagga till nya bilder anvands befintliga assets fran projektet:

- **Skapa bakgrund**: Tva scene-thumbnails fran `/public/scenes/` (t.ex. `garageuppfart-grus.png` och `nordisk-dagsljus.jpg`) — visar studiomiljoer
- **Fri bild**: Tva before/after-bilder fran `/src/assets/examples/` (t.ex. `caddy-relight-after.png` och `ford-after.png`) — visar bildredigering
- **Skapa annons**: Tva annonsliknande bilder — anvander befintliga assets eller scener som representerar marknadsforingsmaterial

## Tekniska detaljer

### Fil som andras

**`src/components/CreateSceneModal.tsx`** — Raderna 1131-1202 (mode-select-renderingen)

Andringar:
- Utoka containerbredden fran `max-w-xs sm:max-w-sm` till `max-w-md sm:max-w-lg`
- Andra kortens layout fran `flex items-start gap-3` till en tvadelad layout med text vanster och bilder hoger
- Lagg till en bildsektion pa hoger sida av varje kort med 2 overlappande bilder, roterade med CSS `transform: rotate()` for den dynamiska effekten fran Figma-designen
- Bilderna refereras fran `/public/scenes/` med vanliga `<img>`-taggar (lazy loading)
- Okar padding och gor korten nagot hogre for att rymma bilderna
- Bilderna doljs pa mycket smala skarmar (`hidden xs:block`) om det behövs for att behalla responsivitet, men visas som standard

### Kortstruktur (per kort)

```text
+--------------------------------------------------+
|  [ikon]  Skapa bakgrund          [bild1] [bild2]  |
|          - Designa egen miljo       (roterade,    |
|          - Ladda upp referensbild    overlappande) |
+--------------------------------------------------+
```

CSS for bilderna:
- Container: `relative w-24 h-16 sm:w-28 sm:h-20 flex-shrink-0`
- Bild 1: `absolute`, latt roterad (`-rotate-3`), rundade horn, skugga
- Bild 2: `absolute`, roterad at andra hallet (`rotate-6`), overlappande

