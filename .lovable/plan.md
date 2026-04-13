
## Mål

Återställ bakgrundsgenereringen till ett normalt, stabilt PhotoRoom-flöde där den uppladdade bilbildens bakgrund inte “läcker” in i den nya bakgrunden. Fokus ska vara: referensbilden från galleriet styr utseendet, medan den uppladdade bilden bara bidrar med själva bilen.

## Vad jag har sett

- Den aktiva edge-funktionen använder idag `background.guidance.imageUrl` + `background.guidance.scale`.
- I de live-requester jag kunde läsa skickas t.ex. `netgrey-dark` med `referenceScale: 0.1` och ändå följer natur från originalbilden med.
- PhotoRoom-dokumentationen visar också något viktigt:
  - `background.guidance.scale` fungerar bara med den nya modellen.
  - `background.negativePrompt` är markerad som legacy och påverkar bara den gamla modellen (`pr-ai-background-model-version: 2`).
- Koden skickar just nu en ny modell-header:
  - `pr-ai-background-model-version: background-studio-beta-2025-03-17`
- Det betyder att den nuvarande lösningen sannolikt blandar:
  - ny guidance-modell
  - gammal/ineffektiv negativ prompt
  - en ganska aggressiv egen prompt-suffix-strategi
  vilket gör resultatet mindre förutsägbart.

## Trolig rotorsak

Det verkliga problemet verkar inte vara att reference scale är “för hög” längre. I live-flödet är den redan mycket låg (`0.1`) för NetGrey Dark, men brus från originalbilden följer ändå med.

Det pekar på att problemet snarare är:
1. fel modell-/parametervaliditet i PhotoRoom-anropet
2. överstyrda prompts som inte matchar hur den valda modellen förväntar sig guidance
3. för mycket egen “hackig” logik ovanpå PhotoRooms standardflöde

Kort sagt: vi använder PhotoRoom på ett sätt som inte är tillräckligt rent eller konsekvent.

## Plan för fix

### 1. Förenkla `process-car-image` till ett rent PhotoRoom-flöde
Jag kommer att ta bort all onödig extra styrning i exterior-delen och låsa anropet till ett enkelt mönster:

- originalbild = input subject
- `background.guidance.imageUrl` = vald referensbild från galleriet
- `background.guidance.scale` = scenens styrka
- en kort, tydlig `background.prompt` som beskriver scenen
- vanliga positioneringsparametrar (`padding`, `scaling`, `referenceBox`, `outputSize`)
- shadow/relight bara där det faktiskt behövs

Viktigt:
- jag kommer att sluta förlita mig på den nuvarande långa “cleanSuffix”-texten
- jag kommer att sluta förlita mig på `background.negativePrompt` om vi fortsätter använda den nya modellen, eftersom docs säger att den är legacy där

### 2. Justera modellvalet så att parametrarna faktiskt fungerar som tänkt
Jag kommer att verifiera och sedan välja en av två rena vägar:

```text
Väg A
Ny PhotoRoom-modell
- använd background guidance korrekt
- ingen legacy negativePrompt
- kort scenprompt
- finjustera guidance.scale per scen

Väg B
Gammal modell (version 2)
- om negativePrompt visar sig ge bättre kontroll i praktiken
- då använder vi den medvetet och konsekvent
- inte blandat med beta-flödet
```

Min rekommenderade riktning är Väg A först: använda guidance korrekt och förenkla promptarna. Problemet du beskriver låter som att vi ska låta referensbilden styra mer rent, inte lägga på fler prompt-tricks.

### 3. Kalibrera om `reference_scale` per scentyp
Nuvarande nivåer verkar ha blivit för extrema eller inkonsekventa. Jag kommer därför att normalisera dem med tydliga regler:

- rena studios: låg till medel guidance, så referensbildens studioform styr men utan att modellen börjar “hallucinera”
- showroom / semi-studio: medelnivå
- utomhus / miljöbakgrunder: högre nivå där referensen får styra mer miljömässigt

Jag kommer inte sätta allt till samma värde. I stället gör jag en liten, rimlig matris per kategori och finjusterar de scener som användaren uttryckligen pekat ut:
- Anthracite Studio
- NetGrey Light
- NetGrey Dark

### 4. Rensa scenprompts så de beskriver referensen, inte originalbilden
Jag kommer att gå igenom promptstrategin för gallery-scenerna och göra dem mer konsekventa:

- beskriva vägg, golv, ljus, perspektiv
- hålla prompten kort och konkret
- undvika överdrivna instruktioner som “do not borrow...” i långa kedjor om de inte hjälper modellen
- särskilt stärka promptar för studioscener som ska vara tomma och rena

Målet är att prompten ska beskriva:
- vad referensbakgrunden är
- inte försöka “bråka” med originalbilden med 20 extra regler

### 5. Behåll fungerande delar av flödet oförändrade
Du skrev att interiörmaskning, logo osv fungerar bra. Därför ska jag inte röra de delarna i onödan.

Jag kommer begränsa fixen till:
- exterior-bakgrundsgenerering i `supabase/functions/process-car-image/index.ts`
- scenkonfiguration i databasen för berörda bakgrunder
- eventuellt samma harmonisering i demo-funktionen så att beteendet blir konsekvent där också

### 6. Testplan efter implementation
Efter ändringen ska vi verifiera med bilder som innehåller tydligt brus i originalbakgrunden, eftersom det är just det som är kärnkravet.

Testuppsättning:
- studio-scen med utomhusfoto som input
- studio-scen med mycket bakgrundsbrus
- NetGrey Dark
- NetGrey Light
- Anthracite Studio
- minst en utomhusscen som kontroll så att vi inte förstör övriga flödet

Förväntat resultat:
- bilen bevaras
- bakgrunden följer vald gallery-referens
- ingen natur, skärm, möbler eller andra objekt från originalbilden “läcker” in
- placeringen känns normal, inte droppad eller svävande

## Tekniska ändringar

### Filer / områden
- `supabase/functions/process-car-image/index.ts`
- eventuellt `supabase/functions/process-demo-image/index.ts`
- ny databas-migration för `scenes`

### I edge-funktionen
- förenkla PhotoRoom-requesten
- ta bort eller minimera dagens långa extra prompt-suffix
- sluta använda `background.negativePrompt` om vi stannar på nya modellen
- säkerställa att endast parametrar som stöds av vald modell används
- behålla vanliga positioneringsinställningar men inte compositing-hack

### I databasen
- justera `reference_scale` för berörda scener/kategorier
- uppdatera ett litet antal studio-prompts så de bättre beskriver tomma rena miljöer
- inte införa nya tabeller eller auth-ändringar

## Förväntad effekt

Efter fixen ska PhotoRoom användas “normalt”:
- bilen segmenteras från originalbilden
- vald referensbild styr den nya bakgrunden
- originalbildens bakgrund ska inte fungera som stilkälla för den genererade scenen
- resultaten blir mer konsekventa mellan olika uppladdningar, även när originalbilderna har mycket brus i bakgrunden
