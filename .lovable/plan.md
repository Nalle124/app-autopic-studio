

# AI Studio-flik + mobil dropdown + enkel ikon i steg 4

## Oversikt

Tre andringar baserat pa feedback:

1. **Desktop**: Tredje flik "AI Studio" i befintlig TabsList (Projekt | AI Studio | Galleri)
2. **Mobil**: Byt ut TabsList mot en kompakt dropdown (Select) sa flikarna inte brakar om plats
3. **Steg 4**: Behalj AI-knappen som en enkel ikon-knapp (samma stil som ovriga verktyg) -- bara byt favicon mot Sparkles-ikonen for tydlighet

## Vad som andras

### 1. Ny flik "AI Studio" (desktop)

TabsList utvidgas fran tva till tre flikar. Pa desktop visas de som vanligt:

```text
[ Projekt ]  [ AI Studio ]  [ Galleri ]
```

Nar "AI Studio" klickas oppnas CreateSceneModal direkt, och fliken aterstalls till "Projekt" nar modalen stangs.

### 2. Dropdown pa mobil istallet for tabs

Pa skarmar under 768px (sm-breakpoint) doljs TabsList och en Select-dropdown visas istallet:

```text
+---------------------+
| Projekt           v |
+---------------------+
```

Dropdown-alternativen: Projekt, AI Studio, Galleri. Samma beteende som tabs men tar minimal plats. Anvander befintliga Select-komponenten fran `src/components/ui/select.tsx`.

### 3. Enkel ikon i steg 4

Den befintliga knappen (rad 967-975) behaljs som ikon-knapp med `size="icon"` och samma styling som ovriga verktyg (Sliders, Scissors, Download). Enda andringen ar att byta ut `<img src="/favicon.png" ...>` mot `<Sparkles className="w-4 h-4" />` for en renare, mer konsekvent ikon.

## Teknisk plan

### Fil: `src/pages/Index.tsx`

**A) Imports (rad 1-30)**
- Lagg till import av `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` fran `@/components/ui/select`
- Lagg till import av `useIsMobile` fran `@/hooks/use-mobile`

**B) State (runt rad 60-80)**
- Andra activeTab-typen fran `'new' | 'history'` till `'new' | 'ai-studio' | 'history'`

**C) Tab-hantering for AI Studio**
- Lagg till en `useEffect` eller inline-hantering: nar `activeTab` satts till `'ai-studio'`, oppna `showAiModal(true)` och aterstall till `'new'`
- Alternativt hantera det i `onValueChange` direkt: om valt varde ar `'ai-studio'`, oppna modalen och behall foregaende flik

**D) Header-navigering (rad 728-739)**
- Wrappa TabsList i `hidden sm:inline-flex` sa den doljs pa mobil
- Lagg till en Select-komponent med `sm:hidden` sa den bara visas pa mobil:

```text
Desktop:  [ Tabs: Projekt | AI Studio | Galleri ]
Mobil:    [ Select: Projekt v ]
```

Select-komponenten:
- Varde mappat till samma `activeTab` state
- `onValueChange` med samma logik: om `ai-studio` valjs -> oppna modal, annars byt flik
- Kompakt styling som matchar headern

**E) Steg 4 AI-knapp (rad 967-975)**
- Byt `<img src="/favicon.png" ...>` mot `<Sparkles className="w-4 h-4" />`
- Behalj allt annat: `variant="outline"`, `size="icon"`, samma klasser, titel "Redigera med AI"
- Lagg till logik for att skicka med aktuell bild som `initialImage` (prop pa CreateSceneModal)

**F) CreateSceneModal prop**
- Ny valfri prop: `initialImage?: string`
- Nar satt: oppna chatten direkt i "free-create"-lage med bilden som referens
- Ny state i Index.tsx: `aiModalInitialImage` som satts nar man klickar AI-ikonen i steg 4

### Fil: `src/components/CreateSceneModal.tsx`

- Ny prop `initialImage?: string`
- I `useEffect` vid oppning: om `initialImage` finns, konvertera till base64 (befintlig logik), satt som referensbild, och hoppa direkt till "free-create"-laget
- Visa informationsmeddelande i chatten: "1 bild vald for redigering. Beskriv vad du vill andra."

## Vad som INTE andras

- Hela Projekt-fliken (upload, bakgrundsgalleri, placera, redigera, logo) -- helt oforandrat
- Galleri-fliken -- helt oforandrat
- Befintliga CreateSceneModal-funktionalitet -- bara ny prop
- Designsprak, farger, typografi
- Steg 4 toolbar-layout (ikon-knappen behaljer exakt samma storlek och stil)

## Andringssammanfattning

| Komponent | Andring |
|---|---|
| Header tabs (desktop) | Ny tredje flik "AI Studio" med Sparkles-ikon |
| Header tabs (mobil) | Tabs doljs, ersatts av Select-dropdown |
| Steg 4 AI-knapp | Favicon-bild byts mot Sparkles-ikon, behaljs som icon-knapp |
| CreateSceneModal | Ny `initialImage` prop for kontextuell oppning |
| Index.tsx state | `activeTab` utvidgad + `aiModalInitialImage` tillagd |

