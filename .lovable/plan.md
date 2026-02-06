

# Cross-device bildpersistens: Ta bilder med telefonen, fortsatt arbeta pa datorn

## Sammanfattning
Idag sparas uppladdade (ej genererade) bilder bara temporart i webblasarens minne (`blob:`-URL:er). De forsvinner vid stangning och finns inte pa andra enheter. For att losa kundens onskemal behover vi lagra originalbilderna i molnet direkt vid uppladdning, kopplat till anvandaren, sa att de kan hamtas fran vilken enhet som helst.

## Nuvarande flode

```text
Telefon: Ta bild --> blob: URL (temporar) --> localStorage (sparar EJ blob-URLs)
                                                    |
                                               Stanger appen
                                                    |
                                               Bilderna forsvinner
```

## Nytt flode

```text
Telefon: Ta bild --> Uppladdning till molnlagring --> URL sparas i databasen
                                                           |
Dator:   Logga in --> Hamta "pagaende projekt" fran databasen --> Visa bilder
```

## Vad som behovs

### 1. Ny databastabell: `draft_images`
En tabell som lagrar metadata om uppladdade originalbilder som annu inte genererats:

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | uuid | Primarnykel |
| user_id | uuid | Agaren |
| storage_path | text | Sokväg i molnlagring |
| public_url | text | Publik URL till bilden |
| original_filename | text | Ursprungligt filnamn |
| original_width | integer | Bildbredd |
| original_height | integer | Bildhojd |
| registration_number | text | Kopplat regnummer (valfritt) |
| car_adjustments | jsonb | Sparade bildjusteringar |
| crop_data | jsonb | Sparad beskärningsdata |
| sort_order | integer | Ordning i listan |
| created_at | timestamptz | Skapandetid |

RLS-policies: Anvandare kan bara se, skapa, uppdatera och ta bort sina egna draft-bilder.

### 2. Lagringskatalog i befintlig bucket
Anvander den befintliga `processed-cars`-bucketen med en ny mapp: `drafts/{user_id}/{filnamn}`.

Ingen ny bucket behövs -- detta haller det enkelt och anvander befintlig infrastruktur.

### 3. Andringar i `ImageUploader.tsx`
Efter att en bild droppas/valjs:
1. Ladda upp bildfilen till `processed-cars/drafts/{user_id}/{timestamp}-{filnamn}`
2. Spara metadata i `draft_images`-tabellen
3. Anvand den publika URL:en som `preview` istallet for `blob:`

Detta ersatter `blob:`-URL:er med permanenta URL:er som fungerar pa alla enheter.

### 4. Andringar i `Index.tsx`
- Vid sidladdning: hamta alla `draft_images` for anvandaren fran databasen istallet for localStorage
- Nar bilder tas bort: ta bort fran bade databasen och lagringen
- Nar bilder genereras (processar): ta bort motsvarande draft-bild
- Behall localStorage som snabb-cache men med molnet som "source of truth"

### 5. Paverkan pa befintlig funktionalitet
- **Noll andringar** i genereringslogiken (`process-car-image`)
- **Noll andringar** i exportlogiken
- **Noll andringar** i galleriet / projekthanteringen
- Befintliga localStorage-flödet kan finnas kvar som fallback

---

## Tekniska detaljer

### Databasmigrering (SQL)
```sql
CREATE TABLE public.draft_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  original_filename text NOT NULL,
  original_width integer,
  original_height integer,
  registration_number text,
  car_adjustments jsonb,
  crop_data jsonb,
  cropped_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.draft_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
  ON public.draft_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON public.draft_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON public.draft_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON public.draft_images FOR DELETE
  USING (auth.uid() = user_id);
```

### Uppladdningslogik (i `ImageUploader.tsx` eller `Index.tsx`)
```text
onDrop:
  1. Skapa blob: preview for omedelbar visning (som idag)
  2. I bakgrunden: ladda upp till processed-cars/drafts/{user_id}/
  3. Spara rad i draft_images med public_url
  4. Uppdatera bildens preview-URL fran blob: till public_url
```

### Hamtning vid sidladdning (i `Index.tsx`)
```text
useEffect (vid mount):
  1. Hamta draft_images fran databasen for inloggad anvandare
  2. Aterskapa UploadedImage-objekt med public_url som preview
  3. Visa direkt -- bilderna ar redan i molnet
```

### Upprensning
- Nar en bild genereras framgangsrikt: ta bort motsvarande `draft_images`-rad och lagringsfil
- Nar anvandaren klickar "Rensa allt": ta bort alla drafts for anvandaren
- Nar en enskild bild tas bort: ta bort fran bade tabell och lagring

### Viktigt: Ingen paverkan pa befintlig kod
- `process-car-image` edge function: anropas med samma FormData som idag -- den far bildfilen fran frontend oavsett
- Galleri/projekt: skapas forst vid generering, inte vid uppladdning
- Crop/adjust-redigerare: fungerar med URL:er redan idag, ingen skillnad
- ExportPanel: inga andringar

### Filer som andras
1. **Ny migrering** -- skapar `draft_images`-tabellen
2. **`src/pages/Index.tsx`** -- byt fran localStorage till databas-hamtning for initialt state, spara drafts vid uppladdning
3. **`src/components/ImageUploader.tsx`** -- ladda upp till molnlagring i bakgrunden vid drop, minor andringar

Inga andra filer paverkas. Genereringsflödet, galleriet och allt annat forblir identiskt.
