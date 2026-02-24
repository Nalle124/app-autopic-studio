

## Plan: Ångra val i guidade flöden + UX-genomgång av AI Studio

### Problem
1. **Klick på redan-besvarad fråga skickar ett nytt (svagt) meddelande** istolat for att uppdatera valet. Om användaren klickar "Sommar" efter att ha valt "Höst", skapas ett nytt user-meddelande med prompt-texten ("Summer season with green trees and vegetation") istället för att byta ut det tidigare valet.
2. **Årstidsprompt-värden är för specifika** (t.ex. "summer season with green trees and vegetation") -- om de skickas som fristående meddelande blir det ett svagt prompt.
3. **Inga visuella indikationer** på vilka val som redan gjorts, och ingen möjlighet att ändra.

### Lösning: "Editable guided selections"

**Kärnidé**: Istället för att varje guided option-klick lägger till ett user-meddelande och gör steget "permanent", ska alla val hållas i `guidedSelections`-arrayen som en ändningsbar state. Options-knapparna förblir interaktiva (inte disabled) ända tills användaren klickar "Skapa bakgrund". Valt alternativ visas med en svag highlight.

#### Tekniska ändringar i `CreateSceneModal.tsx`:

**1. Lägg till `guidedSelectionLabels` state**
- Ny state `guidedSelectionLabels: string[]` som trackar svenska etiketter parallellt med `guidedSelections`.

**2. Refaktorera `handleGuidedOptionSelect`**
- Istället för att pusha user-meddelanden för varje steg, uppdatera bara `guidedSelections[stepIndex]` och `guidedSelectionLabels[stepIndex]`.
- Om användaren klickar ett alternativ i ett *redan besvarat steg* (t.ex. steg 1 "Vilken årstid?" när vi redan är på steg 2), uppdatera `guidedSelections[thatStepIndex]` och trunkera allt efter (om steget ändras, kan efterföljande val bli irrelevanta -- men i de flesta fall behåll dem).
- Flytta fram `guidedStepIndex` bara om steget var det nuvarande.

**3. Ändra rendering av `assistant-options`**
- Varje options-knapp som redan valts (dvs. dess `value` finns i `guidedSelections` för det stegets index) får en svag highlight-stil: `bg-primary/10 border-primary/30 text-primary`.
- Knapparna förblir klickbara (inte disabled) så länge `guidedComplete` är false eller summary-kortet visas men generering inte startats.
- Behöver koppla varje `assistant-options`-meddelande till dess steg-index. Enklast via en ny fält i `ChatMessage`: `stepIndex?: number`.

**4. Uppdatera `assistant-options` ChatMessage-typ**
- Lägg till optional `stepIndex?: number` på `assistant-options`-meddelanden.
- Sätt detta när meddelandet skapas i `handleGuidedOptionSelect` och `handleCategorySelect`.

**5. Uppdatera summary-kortet dynamiskt**
- Summary-kortet ska alltid reflektera den senaste `guidedSelections`/`guidedSelectionLabels`, inte de som sparades vid skapande. Rendera det baserat på current state istället för `msg.selections`.

**6. Ta bort user-meddelanden för guided-steg**
- Guided-val ska inte längre generera `{ role: 'user', text: optionLabel }`-meddelanden. Istället visas valen inline som highlighted chips i options-raderna.
- Sammanfattningskortet visar alla val.

**7. Simplifiering av prompt-värden för årstider**
- Ändra årstidernas `value` till kortare, mer generella prompts:
  - "Sommar" -> `"summer season"` (inte "with green trees and vegetation")
  - "Höst" -> `"autumn season with warm golden tones"`
  - "Vinter" -> `"winter season with snow"`
  - "Vår" -> `"spring season with fresh green"`

### UX-brister identifierade i andra flöden

**A. Ad-create guided flow** -- Samma problem: val kan inte ändras efter klick. Samma lösning appliceras.

**B. Showroom / Premium / Studio flows** -- Samma mönster, samma fix.

**C. "Redigera fritt" -- saknar "ångra" på snabbval.** Om man klickar ett snabbval-kort och det skickas, kan man inte ångra. Men detta är en "send"-action, inte en guided-selection, så det är rimligt att det inte kan ångras.

**D. Blur/Logo flow -- bilder kan inte avmarkeras efter "Nästa".** När man klickat "Nästa" efter bildval kan man inte gå tillbaka och ändra bilderna. Kan förbättras men är sekundärt.

**E. Inspiration-bild kan inte bytas.** Efter att man valt en inspirationsbild och gått vidare till steg 1, kan man inte byta inspiration. Lösningen ovan löser detta indirekt genom att alla steg förblir interaktiva.

**F. Referensbild i "Skapa annons" kan inte bytas.** Om man hoppar över referensbild och sedan ångrar sig, finns inget sätt att gå tillbaka. Sekundär prioritet.

### Implementationsordning

1. Lägg till `stepIndex` i `assistant-options` meddelandetypen
2. Refaktorera `handleGuidedOptionSelect` till att mutera state istället för att pusha meddelanden
3. Uppdatera rendering: highlight valt alternativ, håll knappar klickbara
4. Gör summary-kortet dynamiskt baserat på current `guidedSelections`
5. Simplify årstids-prompts
6. Applicera samma logik i `AD_GUIDED_FLOWS`
7. Testa alla flöden: bakgrund (alla 5 kategorier), annonser (alla 4 typer)

### Påverkan
- Filen `src/components/CreateSceneModal.tsx` -- primär och enda fil som ändras
- Ingen backend-ändring behövs
- Ingen databasändring behövs

