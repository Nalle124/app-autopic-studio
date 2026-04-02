

# V2 Komplett Optimeringsplan

## Översikt
15 issues att åtgärda för att göra V2 produktionsklar. Grupperat efter prioritet.

---

## Kritiska buggar

### 1. `blur-license-plates` kraschar med `.catch is not a function`
**Orsak:** Supabase JS v2 `.rpc()` returnerar en `PostgrestFilterBuilder`, inte ett native Promise. `.catch()` finns inte på den. Rad 132 och 151 i `blur-license-plates/index.ts`.

**Fix:** Ersätt `.catch(() => {})` med `try/catch`-block:
```typescript
try { await supabase.rpc("admin_add_credits", {...}); } catch {}
```

### 2. Bilder blir fyrkantiga — fel format (issue 6 + 9)
**Orsak:** `processExteriorImage()` i `V2GenerateStep.tsx` skickar INTE `originalWidth`/`originalHeight` i FormData. Edge function faller tillbaka till `4000x4000` (fyrkant).

**Fix:** I `processExteriorImage()`, läs originalbildens dimensioner och skicka som FormData:
```typescript
const dims = await new Promise<{w:number,h:number}>((resolve) => {
  const image = new Image();
  image.onload = () => resolve({w: image.naturalWidth, h: image.naturalHeight});
  image.src = URL.createObjectURL(img.file);
});
formData.append('originalWidth', dims.w.toString());
formData.append('originalHeight', dims.h.toString());
```

För stående format: edge function har redan logik för `orientation === 'portrait'` men den behöver korrekta originalmått för att beräkna rätt aspect ratio. Orientering skickas redan korrekt.

### 3. Regskyltar med logo fungerar inte (issue 2)
**Orsak:** Troligtvis att logotypen är i SVG-format, och edge function faller tillbaka till `blur-dark`. Alternativt att logotyp-URL:en inte laddas korrekt.

**Fix:** Förbättra loggning och fallback-meddelande. Konvertera SVG till PNG på klientsidan innan man skickar till edge function. Lägg till tydlig feedback till användaren om att SVG-logotyper konverteras.

---

## UX-förbättringar

### 4. Skelett-gap vid bilduppladdning (issue 1)
**Orsak:** Bilder visas först efter `ensureApiCompatibleFormat` (HEIC-konvertering). Under tiden syns inget.

**Fix:** Visa skelett-placeholders omedelbart vid drop med antal filer som förväntas, innan konvertering är klar. Uppdatera till riktiga bilder progressivt.

### 5. Redigera/beskära bild under generering (issue 3)
**Orsak:** Live-galleriet under generering har inga redigerings-/beskärningsverktyg. Bilder är bara klickbara för lightbox.

**Fix:** Lägg till crop/adjust-knappar på varje färdig bild i live-galleriet (hover-overlay), precis som i V2ResultGallery.

### 6. Generering tar för lång tid (issue 4)
**Analys:** Flödet kör sekventiellt: klassificering → exteriör-bearbetning → auto-crop → skyltdöljning → ljusboost → logo. Auto-crop kräver ett AI-anrop (Gemini) per bild.

**Optimeringar:**
- Skippa auto-crop om användaren inte aktiverat det (sparar ~3-5s/bild)
- Använd PhotoRooms egen padding/scaling istället för separat auto-crop-anrop
- Parallellisera oberoende steg där möjligt

### 7. Genererings-UI: smidigare övergång (issue 8)
**Orsak:** Två separata vyer: vit progressbar → grå "färdiga bilder". Abrupt skifte.

**Fix:** Visa allt i en enda sektion med grå bakgrund från start. Skelett-placeholders i samma grid som färdiga bilder. Progress visas ovanför. När alla klara → transition till resultat-läge med action-knappar.

### 8. Ikoner för ljusboost/redigering → svarta (issue 10)
**Fix:** Ändra `text-amber-500` → `text-foreground` på Sun-ikonen, `text-blue-500` → `text-foreground` på Palette-ikonen i `V2GenerateStep.tsx`.

---

## Navigation & routing

### 9. Ta bort V1-länk från navbar dropdown (issue 7)
**Fix:** Ta bort `<SelectItem value="classic">` från dropdown i `AutopicV2.tsx` rad 148.

### 10. Navbar-stil: samma dropdown överallt (issue 7)
**Orsak:** `Header.tsx` (används av V1/galleri/AI studio) har annan design (avatar, ingen dropdown).

**Fix:** Uppdatera `Header.tsx` att använda samma dropdown-meny som V2 (Projekt, AI Studio, Galleri). Logo → `/`. Ingen V1-länk.

### 11. Knappar tillbaka → V2 (issue 7)
**Fix:** Ändra alla `navigate('/classic?tab=history')` till `navigate('/')` eller en framtida V2-gallerivy. Specifika ställen:
- `V2GenerateStep.tsx` rad 424
- `V2ResultGallery.tsx` rad 298, 361

### 12. "Skapa egen" i V2 galleri → AI Studio (issue 11)
**Fix:** Korrekt navigering till `/classic?tab=ai-studio`.

---

## Auto-crop & bakgrunder

### 13. Auto-crop fungerar dåligt (issue 12)
**Nuvarande:** Gemini AI identifierar bilens position → klientsidan crop:ar. Opålitligt.

**Bättre alternativ:** Använd PhotoRooms egna `padding` och `scaling` parametrar direkt — de hanterar redan centrering. Parametrarna `padding: 0.08` och `scaling: fit` finns redan i edge function. Ta bort separat auto-crop-steg och låt PhotoRoom sköta det.

**Fix:** Om auto-crop är aktiverat, låt PhotoRoom göra jobbet via sina API-parametrar istället för separat AI-anrop. Ta bort `autoCropImage()`-anropet i genereringsloopen.

### 14. Bakgrunder som hallucinerar (issue 13)
**Kräver manuell granskning.** Scener utan `ai_prompt` (null) förlitar sig på default-prompt som kan ge inkonsistenta resultat. Behöver uppdatera `ai_prompt` för alla scener som saknar det. Undersöka vilka scener som hallucinerar kräver testning — jag listar de som saknar prompt.

---

## Galleri & lagring

### 15. "Visa fler projekt" gör inget + galleri-rensning (issue 15)
**Analys:** `PROJECTS_PER_PAGE = 9` med pagination. Om det finns 50+ namnlösa projekt blir det tungt.

**Fix:**
- Fixa pagination-knappen (trolig bugg i laddningslogik)
- Lägg till tydligt meddelande "Visar X av Y projekt"
- Diskutera med dig: alternativ för automatisk rensning (t.ex. bilder utan namn raderas efter 30 dagar, eller max 100 projekt sparas)

### 16. AI Studio-åtkomst från galleri-preview (issue 14)
**Fix:** Lägg till AI Studio-knapp i galleriets bild-preview, liknande den i V2ResultGallery.

---

## Filer som ändras

| Fil | Ändringar |
|-----|-----------|
| `supabase/functions/blur-license-plates/index.ts` | Fix `.catch()` bugg, deploy |
| `src/components/v2/V2GenerateStep.tsx` | Skicka originalWidth/Height, svarta ikoner, ta bort onödig auto-crop, smidigare genererings-UI |
| `src/pages/AutopicV2.tsx` | Ta bort V1 från dropdown, fixa navigering |
| `src/components/Header.tsx` | Dropdown-meny som matchar V2 |
| `src/components/v2/V2ImageUploader.tsx` | Skelett-placeholders under konvertering |
| `src/components/v2/V2ResultGallery.tsx` | Navigering → V2 |
| `src/components/ProjectGallery.tsx` | AI Studio-knapp, pagination-fix |
| DB: `scenes`-tabellen | Uppdatera saknade ai_prompts |

---

## Prioriteringsordning
1. Fix `.catch()` bugg i blur-license-plates (kraschar nu)
2. Fix bildformat (fyrkant → original ratio)
3. Svarta ikoner + ta bort V1 från navbar
4. Navbar-enhetlighet + navigering
5. Smidigare genererings-UI
6. Skelett vid uppladdning
7. Auto-crop via PhotoRoom istället
8. Redigera under generering
9. Galleri-förbättringar
10. Bakgrundsprompt-granskning

