

# Guide-sida for AutoPic

## Oversikt

Skapar en ny offentlig sida (`/guide`) som fungerar som en komplett anvandarguide. Sidan ar tillganglig utan inloggning sa att den kan lankas fran bade appen och landningssidan (autopic.studio). Dessutom uppdateras info-ikonen vid "Valj bakgrund" i huvudappen sa att popovern pekar anvandaren mot guiden.

## Ny sida: `/guide`

En langscrollande sida med tydliga sektioner, samma stil som resten av appen (Host Grotesk, DM Sans, gradient-bakgrunder, kort med noise-textur, 10px border-radius). Sidan anvander `Header`-komponenten for konsekvent navigation.

### Sektioner pa sidan

**1. Hero / Introduktion**
- Rubrik: "Fa basta resultat med AutoPic"
- Kort text om att guiden hjalper dig att forsta hur du far mest ut av plattformen
- Trust badge: "Uppdateras var 4:e timme baserat pa kundfeedback"

**2. Fotograferingstips**
- Liggande bilder ger oftast bast resultat (med visuell ikon/illustration)
- Fotografera fran lagre vinkel (knanaiva, inte standhoijd) -- illustreras med en animerad diagram/ikon som visar kameravinkel
- Centrera bilen i bilden
- Undvik att klippa delar av bilen

**3. Hur AI-bakgrunder fungerar**
- Forklaring att AI:n anvander bakgrundsbilden som referens och tolkar element (ljus, skuggor, perspektiv) for att matcha scenen
- Visuell "before/after"-slider med befintliga exempelbilder (ford-before/ford-after, vw-before/vw-after)
- Forklaring att resultaten varierar beroende pa bilvinkel och bakgrundsval

**4. Beskaring och format**
- Forklara att man ibland behover beskara for basta resultat
- Visa att liggande format ar standard
- Tips om att anvanda crop-verktyget for att justera positionering

**5. Logotyp och branding**
- Forklara att man kan valja vilken bild man applicerar logo pa
- Kort om hur brand kit fungerar

**6. Forvantat resultat**
- Realistiska forvantiningar: AI ger professionella men ibland varierade resultat
- Tips: testa ett par bakgrunder for att hitta den som passar bast
- Att man kan generera om med samma eller annan bakgrund

**7. FAQ-sektion**
- Accordion-baserad FAQ med vanliga fragor
- T.ex. "Varfor ser bakgrunden lite annorlunda ut fran referensbilden?", "Kan jag anvanda mina egna bakgrunder?", "Vad ar skillnaden mellan Studio och Utomhus?", "Hur manga bilder kan jag generera?"

**8. Trust-sektion**
- Badge: "Uppdaterad var 4:e timme"
- Badge: "Baserad pa feedback fran vara kunder"
- Badge: "Svensk support"
- CTA-knapp tillbaka till appen

### Visuella/rorliga element

- **Before/After-slider**: En interaktiv komponent dar man drar en slider over bilden for att se fore/efter. Anvander befintliga bilder i `src/assets/examples/`.
- **Animerade ikoner**: CSS-animerade pilar/ikoner som visar kameravinkel (ned-pil for lag vinkel) och centrering
- **Staggerd reveal**: Sektioner fades in med `animate-fade-in` nar man scrollar ner (Intersection Observer)

## Andringar i befintlig kod

### Info-ikon i "Valj bakgrund" (Index.tsx rad 852-854)

Nuvarande popover sager: "Kom ihag att olika bakgrunder passar for olika bilar och vinklar."

Andras till att aven innehalla en lank till guide-sidan:
- Texten behalls men lanken andras fran `https://autoshot.se/guide` till `/guide` (intern lank) med `target="_blank"`.

### Routing (App.tsx)

Lagg till en ny publik route: `<Route path="/guide" element={<Guide />} />`

## Filer som skapas/andras

| Fil | Andring |
|-----|---------|
| `src/pages/Guide.tsx` | **NY** -- Hela guide-sidan |
| `src/App.tsx` | Lagg till `/guide`-route |
| `src/pages/Index.tsx` | Uppdatera info-popover-lanken till `/guide` |

## Tekniska detaljer

- Sidan anvander bara befintliga UI-komponenter: `Card`, `Accordion`, `Button`, `Header`
- Before/After-slidern byggs som en latt komponent med `useState` + `onMouseMove`/`onTouchMove` for drag
- Scroll-reveal gors med `IntersectionObserver` i en enkel `useEffect`
- Inga nya beroenden behoves
- Sidan ar fullt responsiv (mobile-first)
- Befintliga exempelbilder ateranvands fran `src/assets/examples/`

