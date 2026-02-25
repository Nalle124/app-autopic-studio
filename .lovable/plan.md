

## Plan: AI Studio "Kommer snart"-lås + Lås upp bakgrundsgalleriet

### Vad görs

**1. AI Studio "Kommer snart"-overlay (Index.tsx + Demo.tsx)**

När `activeTab === 'ai-studio'` och användaren INTE är admin, renderas en overlay ovanpå AI Studio-chatten (som fortfarande syns i bakgrunden). Overlayn innehåller:
- Halvtransparent bakgrund med blur
- "Kommer snart"-rubrik
- Beskrivning: "Här kommer du kunna skapa egna bakgrundsmiljöer, blurra regplåtar, skapa annonsmaterial och redigera fritt med AI."
- Admin-användare (`isAdmin`) ser chatten som vanligt utan overlay

**2. Ändra "Nyhet"-texten till "Kommer snart" (Index.tsx + Demo.tsx)**

Byter ut `<span>Nyhet:</span>` mot `<span>Kommer snart:</span>` i AI-notice-bandet. Texten uppdateras till att beskriva vad som är på gång istället för att presentera det som redan tillgängligt.

**3. Lås upp hela bakgrundsgalleriet (SceneSelector.tsx)**

Ändrar `hasFullAccess` från `isSubscribed` till `true` (eller tar bort lås-logiken tillfälligt). Detta gör att alla kategorier (Enkla Studios, Mörka Studios, Premium, etc.) är tillgängliga för alla användare. Lås-ikonerna försvinner från kategorinamnen.

**4. Demo-sidan: AI Studio-val triggar "Kommer snart" istället för signup-modal (Demo.tsx)**

I demo-navets `onValueChange`, när `v === 'ai-studio'`, visas ett liknande "Kommer snart"-meddelande/toast istället för att bara öppna signup-modalen.

### Tekniska detaljer

**Index.tsx** (rad ~884):
- Wrappa `CreateSceneModal`-sektionen med en conditional: om `!isAdmin`, rendera en absolut-positionerad overlay `div` ovanpå med `z-20`, `bg-background/80 backdrop-blur-sm`, centrerad text.
- Chatten renderas fortfarande undertill (synlig men inte interaktiv).

**Index.tsx** (rad ~972-979):
- Ändra "Nyhet:" → "Kommer snart:" och uppdatera beskrivningstexten.

**Demo.tsx** (rad ~624, ~860-869):
- Samma "Kommer snart"-hantering för AI Studio-valet.
- Uppdatera notice-texten.

**SceneSelector.tsx** (rad 173):
- Ändra `const hasFullAccess = isSubscribed;` till `const hasFullAccess = true;`
- Detta är en enkel one-liner att ändra tillbaka när låsningen ska återställas.

### Enkel att ta bort

Alla ändringar är isolerade:
- Ta bort overlay-diven i Index.tsx/Demo.tsx
- Ändra tillbaka `hasFullAccess = true` → `hasFullAccess = isSubscribed` i SceneSelector.tsx
- Byt "Kommer snart" → tillbaka till "Nyhet" eller ta bort helt

### Filer som ändras
- `src/pages/Index.tsx` — overlay + text
- `src/pages/Demo.tsx` — overlay + text
- `src/components/SceneSelector.tsx` — lås upp galleriet

