

## Plan: AI Studio Lansering

### Status: Lanserad (Annonsmaterial undantaget)

**Vad har gjorts:**

1. **AI Studio lanserad** – "Kommer snart"-overlayen borttagen för inloggade användare. Alla kan nu använda AI Studio.

2. **Annonsmaterial blockerat** – Visas som "Kommer snart" i menyn men kan inte klickas. Ska lanseras separat.

3. **Blurra regskyltar & Applicera logo** – Uppladdning av egna bilder fungerar nu direkt i första meddelandet (upload-knapp i bildgridet), oavsett om det finns projektbilder eller ej.

4. **Fixa insidebilder (Redigera fritt)** – Nytt snabbval som maskar det som syns genom fönster/öppna dörrar till neutral bakgrund. Användaren väljer ljus eller mörk bakgrund innan generering.

5. **Förbättrade blur-prompter** – Master-prompterna för regskyltsblurring uppdaterade för att täcka HELA plåten (inkl. ram) och säkerställa identiskt resultat i batch.

6. **Notice-text uppdaterad** – "Kommer snart:" → "Nyhet:" med uppdaterad beskrivning.

### Nästa steg

- Testa alla flöden end-to-end (bakgrund, redigera fritt, blur, logo)
- Finjustera design och UX baserat på feedback
- Färdigställ Annonsmaterial-flödet
- Verifiera att credits dras korrekt vid varje generering

### Filer som ändrats
- `src/pages/Index.tsx` – overlay borttagen, notice uppdaterad
- `src/pages/Demo.tsx` – notice uppdaterad
- `src/components/CreateSceneModal.tsx` – annonsmaterial blockerat, upload i blur/logo, fixa insidebilder, förbättrade prompter
