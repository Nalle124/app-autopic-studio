

# AI-chatt med dubbla laeGen + UI-fixar

## Sammanfattning

Tva stora omraden: (1) AI-bakgrundsgeneratorn behoever ett "Bakgrundsstudio"-laege med guidat floede och ett "Fritt skapande"-laege, samt ett baettre systemprompt. (2) Flera UI- och designfixar i chatten, galleriet, scenvaeeljaren och stegnamn.

---

## Del 1: Dubbla laegen i AI-chatten

### Koncept

Naer chatten oeppnas faar anvaendaren vaelja mellan tva laegen via tva tydliga knappar:

```text
+----------------------------------+
|  AutoPic AI  [Beta]              |
|                                  |
|  Vad vill du goera?              |
|                                  |
|  [Skapa bakgrund]  [Fri bild]   |
|  Skapa en bakgrund   Redigera    |
|  foer bilannons      valfri bild |
+----------------------------------+
```

### Laege 1: Bakgrundsstudio (default / primaer)

Guidat floede i chatten:

1. Anvaendaren vaeljer laege -> AI svarar med: "Laet oss skapa en ny bakgrund! Vilken typ passar baest?"
2. Visar klickbara alternativ (chips):
   - Studio (ren studio, cykloramabaeckvagg)
   - Studio med hoern (betongvaeggar, arkitektoniska detaljer)
   - Utomhus (gata, parkering, natur)
   - Showroom (premiummiljoe)
   - Eget (fritext)
3. Efter val -> AI fragar om detaljer:
   - Studio: "Ljust eller moerkt? Vilket golv foeredrar du?"
   - Utomhus: "Vilken arstid? Stad eller natur?"
   - Etc.
4. Anvaendaren kan aeven skriva fritt naer som helst -- systemet haanterar det.
5. Bilden genereras med det strikta bakgrundsprompt (3:2, oegonhoejd, tom scen, etc.)

Inspo-chips visas laengst ner under foersta meddelandet:
- "Vit studio med mjukt ljus"
- "Hoestgata med loev paa marken"
- "Moerk betong med dramatiska skuggor"
- "Snoeig skogvaeg i vinterlandskap"
- "Lyxig uppfart med grus och groenska"
- "Som min referens men utan bilen"

### Laege 2: Fritt skapande

Oeppen chatt utan det strikta bakgrundsprompt. Anvaendaren kan:
- Ladda upp en bild och be AI aendra den
- Beskriv fritt vad de vill ha
- Iterera paa resultat

Systempromptet foer detta laege aer mer oeppen -- fotorealistiskt, men utan de strikta bilbakgrundsreglerna (perspektiv, tom scen, etc.). Bilderna fran fritt laege sparas INTE som bakgrunder i galleriet -- de laddas ner direkt eller visas bara i chatten.

### Implementation

**CreateSceneModal.tsx** -- Ny state:

```typescript
type ChatMode = 'select' | 'background-studio' | 'free-create';
const [chatMode, setChatMode] = useState<ChatMode>('select');
```

- Laegvael-skraerm renderas naer `chatMode === 'select'`
- `chatMode` skickas till edge function saa att ratt systemprompt anvaends
- I bakgrundsstudio-laege: assistant-meddelanden med klickbara kategori-chips (som interactive buttons)
- I fritt laege: enkel chatt utan guidat floede

**generate-scene-image edge function** -- Ny parameter `mode`:

```typescript
const { conversationHistory, mode } = await req.json();
// mode: 'background-studio' | 'free-create'
```

- `background-studio`: anvaender nuvarande strikta SYSTEM_PROMPT
- `free-create`: anvaender en oeppnare prompt utan bil-specifika regler

### Namngivning av bakgrunder

Uppdatera meta-prompten (steg 3 i edge function) foer att generera mer kreativa namn:
- Istaellet foer "Min bakgrund" -> "Midvinter i skogen", "Guldljus Studio", "Koepenhamnsgata"
- Lagg till instruktion: "Ge scenen ett kreativt, staeamningsfullt svenskt namn. Undvik generiska namn som 'Min bakgrund' eller 'Studio'. Anvaend poetiska eller beskrivande namn som 'Midvinterskog', 'Guldljus Studio', 'Stadens Tystnad'."

---

## Del 2: UI- och designfixar

### A. Chatt-modal: Mobil keyboard-fix

Problem: Naer tangentbordet oeppnas paa mobil roeers chatten uppaat istallet foer att vara sticky.

Fix i `CreateSceneModal.tsx`:
- Anvand `fixed inset-0` istallet foer centered dialog paa mobil
- Input-omraadet faar `sticky bottom-0`
- Chattytan faar `flex-1 overflow-y-auto` med padding-bottom foer input
- Lagg till CSS: mobil-specifik hoejd med `dvh` (dynamic viewport height)

### B. Chatt-modal: Border radius paa mobil

DialogContent saknar radius paa mobil. Fix:
- Lagg till `rounded-2xl` aeven paa mobil (inte bara `sm:rounded-lg`)
- Lagg till liten marginal runt modalen paa mobil: `m-3`

### C. Spara-knappen: Transparent istallet foer blaa

AEndra "Spara & anvaend"-knappen fran `Button` (default primaerfarg) till `variant="outline"`:

```tsx
<Button variant="outline" size="sm" className="rounded-full flex-1">
  <Check className="w-3.5 h-3.5 mr-1.5" />
  Spara & anvaend
</Button>
```

### D. Galleriet (ProjectGallery): Centrerade action-knappar

Problem: Knapparna (eye, download, delete) hamnar utanfoer bildens ram.

Fix: Flytta hover-overlay saa att det bara taecker bild-arean (`aspect-[4/3]`), inte hela kortet:
- Overlay-div ska vara `absolute inset-0` INUTI bildomraadet (redan aer, men behoeever kontrolleras)
- Lagg till `items-center justify-center` -- redan finns, troligen storleksproblem
- Saett `gap-2` och justera knappstorlekar foer att vara inuti bildens ram

### E. "Skapa med AI"-kortet: Meeer kontrast

AEndra bakgrundsfaergen foer kortet:
- Ljust tema: laett moerkare aen card (`bg-muted/30` overlay)
- Moerkt tema: laett ljusare aen card (`bg-white/[0.03]` overlay)

### F. Step 3-rubrik: "Generera" -> "Placera paa bakgrund"

I `Index.tsx` rad 858, aendra:

```tsx
<h2>Placera paa bakgrund</h2>
```

Samma i `ExportPanel.tsx` knapptext:

```tsx
{isProcessing ? 'Placerar...' : 'Starta komposition'}
```

---

## Filer som aendras

| Fil | AEndring |
|-----|----------|
| `src/components/CreateSceneModal.tsx` | Dubbla laegen, UI-fixar (radius, sticky, spara-knapp) |
| `supabase/functions/generate-scene-image/index.ts` | Mode-parameter, tva system prompts, baettre namngivning |
| `src/components/SceneSelector.tsx` | Kontrast paa AI-kortet |
| `src/components/ProjectGallery.tsx` | Centrering av action-knappar |
| `src/pages/Index.tsx` | Step 3-rubrik: "Placera paa bakgrund" |
| `src/components/ExportPanel.tsx` | Knapptext: "Starta komposition" |
| `src/components/ui/dialog.tsx` | Mobil border radius + marginal |

### Filer som INTE aendras

Edge functions utoevar generate-scene-image, databas, routing, auth, Landing.tsx.

---

## Tekniska detaljer

### ChatMode-tillstand

```typescript
type ChatMode = 'select' | 'background-studio' | 'free-create';
```

- `select`: Visar tva stora knappar foer att vaelja laege
- `background-studio`: Guidat floede med bakgrundsregler
- `free-create`: Oeppen bildgenerering

### Ny ChatMessage-typ foer interaktiva val

```typescript
type ChatMessage =
  | ...befintliga...
  | { role: 'assistant-options'; text: string; options: Array<{ label: string; value: string }> }
```

Renderas som klickbara chips i chatten. Naer anvaendaren klickar skickas vaerdet som ett vanligt user-meddelande.

### Edge function: Mode-hantering

```typescript
const BACKGROUND_SYSTEM_PROMPT = `...nuvarande strikta prompt...`;
const FREE_CREATE_SYSTEM_PROMPT = `You are a creative AI image generator...`;
// Vaelj prompt baserat paa mode
const systemPrompt = mode === 'free-create' ? FREE_CREATE_SYSTEM_PROMPT : BACKGROUND_SYSTEM_PROMPT;
```

### Spara-logik per laege

- Bakgrundsstudio: "Spara & anvaend"-knapp -> sparar till user_scenes
- Fritt skapande: Ingen spara-knapp foer galleriet, istallet en "Ladda ner"-knapp

