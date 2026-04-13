
Mål: få tillbaka ett stabilt PhotoRoom-flöde där galleribilden styr bakgrunden tydligt och originalbildens bakgrundsbrus inte påverkar resultatet.

Det jag nu bedömer som trolig rotorsak:
- Scen-datan för NetGrey Light, NetGrey Dark, Anthracite Studio och Vit Kakel ser rimlig ut i databasen:
  - `reference_scale = 0.85`
  - tydliga “inga objekt”-prompts
  - korrekta referens-URL:er
- Problemet verkar i stället uppstå i själva requesten till PhotoRoom.
- Jag kunde se en live-request där appen skickar:
  - `autoCrop=true`
  - `autoCropPadding=0.12`
  - vilket i edge-funktionen blir `referenceBox=subjectBox`
- Samtidigt komprimeras uppladdade bilder i klienten nästan alltid till JPEG och skalas ofta ner till max ca `3500px` innan de skickas.
- För V2 sätts dessutom auto-crop till `standard` som default vid reset/start over.

Min slutsats:
- Ni kör inte längre ett “rent referensflöde” i praktiken.
- Kombinationen av:
  - client-side JPEG-komprimering/nedskalning
  - `autoCrop=true`
  - `referenceBox=subjectBox`
  - relativt generös crop-padding (`0.12`)
  - fast seed
  gör att vissa bilder konsekvent beter sig fel, särskilt de med stökig originalbakgrund.
- Det förklarar också varför vissa bilder alltid blir dåliga medan andra blir perfekta.

Plan för fix:

1. Återställ ett renare PhotoRoom-anrop för exterior
- I `process-car-image` ska studio-/referensflödet inte längre automatiskt växla till `referenceBox=subjectBox` bara för att auto-crop är på.
- Jag vill införa ett tydligt, konservativt standardläge för studios:
  - `referenceBox=originalImage`
  - låg och stabil padding
  - behåll guidance-bilden och enkel prompt
- Auto-crop ska inte få styra bakgrundsgenereringen för dessa scener.

2. Begränsa auto-crop till där det faktiskt hjälper
- För studio-kategorier (`studio-basic`, `studio-light`, `studio-dark`, `studio-colored`) ska vi stänga av eller kraftigt begränsa auto-crop i PhotoRoom-requesten.
- Om auto-crop ska finnas kvar i V2 ska det bara användas för slutkomposition/layout när det verkligen behövs, inte som standard för bakgrundsgenerering.
- Jag kommer särskilt justera V2 där `autoCropMode` idag återställs till `standard` som default.

3. Sluta försämra input-bilden i onödan före PhotoRoom
- I `src/pages/Index.tsx` komprimeras originalbilden nästan alltid till JPEG och ofta ner till max 3500 px.
- Jag kommer ändra detta så exterior-bilder i normalfallet skickas med högre fidelity:
  - mindre aggressiv eller villkorad komprimering
  - behåll originalfil när storleken redan är rimlig
  - undvik onödig JPG-konvertering för bilder som redan är bra
- Målet är att PhotoRoom ska få ett renare subject-underlag.

4. Justera seed-strategin
- Idag används samma fasta `PROCESSING_SEED` för alla körningar.
- Jag kommer verifiera om detta låser fast dåliga utfall för vissa bildtyper och byta till en säkrare strategi:
  - antingen ingen seed alls för studioflödet
  - eller seed per jobb/bild i stället för global konstant
- Det minskar risken att samma “felaktiga tolkning” återkommer på samma typer av bilder.

5. Behåll guidance strikt och enkel
- Jag kommer inte gå över till statisk bakgrund.
- I stället behåller vi:
  - `background.guidance.imageUrl`
  - `background.guidance.scale`
  - enkel scenprompt
  - `background.expandPrompt.mode = 'ai.never'`
- Men jag tar bort andra request-detaljer som stör referensstyrningen.

6. Gör demo- och produktionsflödet identiska
- `process-demo-image` och `process-car-image` ska harmoniseras fullt så att de beter sig lika.
- Samma regler för:
  - reference box
  - padding
  - seed
  - prompt
  - output settings

7. Verifiera mot de faktiska problembilderna
- Efter implementation ska vi testa just de bilder som återkommande fallerar:
  - NetGrey Light
  - NetGrey Dark
  - Anthracite Studio
  - Vit Kakel
- Förväntat resultat:
  - inga nya objekt i bakgrunden
  - ingen “bleed-through” från originalbakgrunden
  - naturlig placering av bilen
  - tydlig likhet med vald gallery-scen

Tekniska ändringar:
- `supabase/functions/process-car-image/index.ts`
- `supabase/functions/process-demo-image/index.ts`
- `src/pages/Index.tsx`
- `src/pages/AutopicV2.tsx`
- `src/components/v2/V2GenerateStep.tsx`
- eventuellt `src/pages/TryV2.tsx` om samma default-beteende finns där

Varför jag tror detta är rätt riktning:
- De rapporterade scenerna i databasen ser inte trasiga ut.
- Live-requesten visar däremot att flödet fortfarande skickar parametrar som gör anropet mer “tolkande” än du vill.
- Det stämmer med din observation: vissa bilder fallerar konsekvent, vilket tyder mer på input-/request-beteende än på scenprompten i sig.
