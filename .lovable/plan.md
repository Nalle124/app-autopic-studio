
Sammanfattning:
Det finns både ett prestandaproblem och ett återhämtningsproblem. Jag ser minst tre konkreta orsaker till att flödet känns onödigt långsamt och att generering “avbryts” när du lämnar sidan.

Vad som faktiskt är fel:
1. Klienten gör fortfarande mycket tungt arbete innan alla jobb ens har skickats
- I `V2GenerateStep.tsx` klassificeras alla bilder först.
- Sedan skapas `processing_jobs` en och en.
- Sedan normaliseras EXIF/orientering per bild innan varje request skickas.
- Dispatchen sker i en vanlig `for`-loop med flera `await` inuti, så “fire-and-forget” är inte riktigt fire-and-forget ännu.
- Resultat: om användaren lämnar sidan tidigt har inte alla bilder hunnit skickas till backend.

2. Återhämtningen efter återbesök pollar bara när `results.length === 0`
- I `AutopicV2.tsx` startar recovery-polling bara om `showResults` är true och `results.length > 0` är false.
- Om en bild redan hunnit sparas i `sessionStorage` och två återstår, då pollas inte längre resterande jobb.
- Det matchar exakt ditt symptom: du kommer tillbaka till rätt vy men ser bara 1 av 3 bilder kvar.

3. Interiörbilder är en verklig flaskhals och kan också fallera server-side
- Edge logs visar `Interior masking failed (429)` och även `Memory limit exceeded`.
- Det betyder att vissa interiörjobb faktiskt misslyckar i backend, inte bara avbryts i UI.
- Just nu skickas interiörmaskning till AI-modellen med relativt tung payload och med bara kort retry.

Varför flödet känns långsamt i onödan:
- All batch-setup görs sekventiellt i browsern.
- Per-bild dimension/exif-arbete sker innan requesten skickas.
- Logo/light-postprocessing görs fortfarande client-side efter att jobb blivit klara.
- Interiörjobb körs parallellt tillsammans med övriga jobb, vilket ökar risken för 429/rate-limit och minnesproblem.

Plan:
1. Gör dispatchen verkligt snabb och robust
- Flytta all förberedelse som går till ett gemensamt prepass.
- Skapa alla job records i ett steg.
- Bygg FormData för alla bilder först och dispatcha dem direkt därefter utan sekventiell väntan mellan bilder.
- Viktigt mål: alla bilder i projektet ska vara registrerade och skickade inom några sekunder innan användaren hinner lämna sidan.

2. Laga recovery-logiken så den fortsätter även vid partiella resultat
- Ändra `AutopicV2.tsx` så polling startar när `showResults` är true och det finns ett `v2-project-id`, oavsett om `results` redan innehåller 1 bild.
- Polling ska merge:a in nya completed/failed jobb i befintliga resultat istället för att bara återställa när listan är tom.
- Polling ska fortsätta tills alla jobb för projektet är `completed` eller `failed`.

3. Visa pending-jobb i slutgalleriet
- Resultatvyn ska kunna visa placeholders för jobb som fortfarande körs.
- Då ser användaren att 3 jobb finns i projektet även om bara 1 är klar ännu.
- Det minskar känslan av att bilder “försvunnit”.

4. Minska onödig väntetid för interiörbilder
- Komprimera/resize interiörinput tydligare innan upload till edge-funktionen.
- Lägg bättre retry/backoff för 429 i `process-car-image`.
- Begränsa samtidigheten för interiörjobb, t.ex. 1 åt gången eller låg concurrency, medan exteriörjobb kan fortsätta parallellt.
- Det här är viktigt eftersom loggarna visar att just interiörmaskningen orsakar både 429 och memory pressure.

5. Flytta sista postprocessing till backend där det är rimligt
- Logo/light bör helst inte vara beroende av att klienten fortfarande är öppen.
- Om det inte flyttas helt nu, bör minst recovery kunna upptäcka jobb som är klara men ännu inte lokalt postprocessade och färdigställa dem när användaren kommer tillbaka.
- Bäst långsiktigt är att spara den slutliga levererade bilden direkt server-side.

Filer att uppdatera:
- `src/components/v2/V2GenerateStep.tsx`
  - Snabbare batch dispatch
  - Mindre sekventiell klientlogik
  - Interiör-concurrency/komprimering
- `src/pages/AutopicV2.tsx`
  - Recovery-polling även vid partial results
  - Merge av nya jobbstatusar
  - Stoppa polling först när hela projektet är klart
- `src/components/v2/V2ResultGallery.tsx`
  - Stöd för pending placeholders i “Färdiga bilder”
- `supabase/functions/process-car-image/index.ts`
  - Bättre retry/backoff för interiörmaskning
  - Ev. lättare input / skydd mot memory spikes
  - Tydligare failed-status när AI rate-limit slår till

Det jag kommer rapportera som rotorsak:
- “Bakgrundsgenerering” var bara delvis implementerad. Jobben skickades inte snabbt nog från klienten, recovery pollade inte vidare när vissa resultat redan fanns, och interiörmaskning kunde fallera i backend på grund av 429/minnesgräns.

Förväntat resultat efter fix:
- Om användaren lämnar mitt i generering ska alla redan-startade bilder fortsätta.
- När användaren återkommer ska samma projekt öppnas i slutvyn och fortsätta fyllas på bild för bild.
- Inga delvis klara batcher ska “fastna” bara för att 1 bild redan hunnit sparas lokalt.
- Interiörbilder ska bli stabilare och snabbare, eller åtminstone tydligt markeras som failed utan att stoppa resten av projektet.

Tekniska detaljer:
- Den viktigaste buggen i återkomstflödet är villkoret i `AutopicV2.tsx` som hindrar polling när `results.length > 0`.
- Den viktigaste prestandabromsen i dispatchflödet är sekventiell batch-setup i `V2GenerateStep.tsx`, trots att nätverksanropen i slutet inte awaitas.
- Loggarna bekräftar backend-problem för interiörbilder: `429 RESOURCE_EXHAUSTED` och `Memory limit exceeded`, så detta är inte bara ett frontendproblem.
