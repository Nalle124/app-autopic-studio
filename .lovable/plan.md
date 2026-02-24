

# Teknisk Audit — AutoPic Studio

## Sammanfattning

Appen har en solid grundarkitektur med bra RLS-policies, serversidig validering i edge functions, och atomisk kreditavräkning. Men det finns flera kritiska och viktiga brister som bör åtgärdas.

---

## KRITISKT (Fixas omedelbart)

### 1. generate-scene-image saknar kreditavräkning

**Fil:** `supabase/functions/generate-scene-image/index.ts`
**Risk:** Intäktsläckage. Varje anrop till AI Studio-chatten (skapa bakgrund, fri generering, annons) genererar en bild via Lovable AI Gateway men drar INGEN credit. Användare kan generera obegränsat antal bakgrundsbilder utan kostnad.
**Konsekvens:** Reell kostnad per anrop till AI-gateway utan intäkt. Användare kan exploatera detta medvetet.
**Lösning:** Implementera samma atomiska `decrement_credits`-mönster som i `process-car-image/index.ts` — kreditkontroll före, atomisk avräkning efter lyckad generering.

### 2. generate-scene-image saknar rate limiting

**Fil:** `supabase/functions/generate-scene-image/index.ts`
**Risk:** Kostnadsbomb. En enskild autentiserad användare (eller ett stulet JWT) kan köra hundratals AI-genereringar per minut. Eftersom det inte finns kreditavräkning (se punkt 1) finns ingen broms alls.
**Konsekvens:** Okontrollerad kostnad mot Lovable AI Gateway.
**Lösning:** Implementera rate limiting (t.ex. max 10 genereringar/minut/användare) antingen via in-memory store (som i `process-demo-image`) eller via en databas-baserad räknare.

### 3. process-demo-image: Ingen autentisering krävs + temp-filer rensas inte vid fel

**Fil:** `supabase/functions/process-demo-image/index.ts`
**Risk:** Kostnadsbomb. Funktionen kräver ingen JWT — vem som helst kan anropa den. Rate limiting är in-memory och nollställs vid cold start. En angripare kan rotera IP-adresser för att kringgå begränsningen och generera obegränsat antal bilder via PhotoRoom API:t på er bekostnad.
**Konsekvens:** Direkt monetär förlust via PhotoRoom-fakturor.
**Lösning:** (a) Flytta till persistent rate limiting (databas-tabell med IP + timestamp). (b) Överväg CAPTCHA eller signerade tokens. (c) I catch-blocket: rensa temp-filen `uploadFilename` som läcker i storage vid fel.

### 4. Dubbel kreditavräkning — frontend + backend

**Fil:** `src/contexts/DemoContext.tsx` (rad 74-105) + `supabase/functions/process-car-image/index.ts` (rad 463-506)
**Risk:** Race condition. `DemoContext.decrementCredits()` gör en icke-atomisk `update` klientside (RLS-skyddad), och sedan gör edge function `decrement_credits` atomiskt serversides. Om båda körs, dras 2 credits per bild.
**Konsekvens:** Användare förlorar credits dubbelt — ger supportärenden och missnöje.
**Lösning:** Undersök om frontend-decrementet faktiskt anropas vid process-car-image. Om backend redan hanterar det atomiskt, ta bort frontend-decrementet helt och låt backend vara single source of truth. Refetcha credits efter backend-svar.

### 5. Storage bucket "processed-cars" är publikt — alla URL:er är permanenta

**Fil:** Storage-konfiguration
**Risk:** Dataläckage. Alla genererade bilder är publikt tillgängliga via URL:er som aldrig expirerar. Om en URL läcker kan vem som helst se bilden. Demo-bilder (`demo/`-prefix) och temp-filer (`demo-temp/`) hamnar i samma publika bucket.
**Konsekvens:** Kunders bilannonser kan indexeras av sökmotorer eller delas utan kontroll.
**Lösning:** (a) Kort sikt: implementera `cleanup-old-images` för demo/temp-filer med kort TTL. (b) Lång sikt: överväg privat bucket med signed URLs (kort expiry) för känsligare användares bilder.

---

## VIKTIGT (Fixas inom 2 veckor)

### 6. CreateSceneModal.tsx: 3312 rader — underhållsmardröm

**Fil:** `src/components/CreateSceneModal.tsx`
**Risk:** Teknisk skuld. Filen är 3312 rader och hanterar minst 5 olika "modes" (background-studio, free-create, ad-create, blur-plates, logo-studio) med all logik i en enda komponent. Extremt svår att debugga, testa och underhålla.
**Konsekvens:** Varje ändring riskerar att bryta andra modes. Utvecklingshastigheten minskar exponentiellt.
**Lösning:** Bryt ut varje mode till en egen komponent. Skapa en gemensam hook (`useChatSession`) för delad chattlogik.

### 7. Index.tsx: 2165 rader med samma problem

**Fil:** `src/pages/Index.tsx`
**Risk:** Teknisk skuld. Huvudsidan med all bildhantering, galleri, export, nedladdning, redigering i en fil.
**Lösning:** Extrahera till moduler: `useImageProcessing`, `useDownload`, `GallerySection`, `ExportSection`.

### 8. check-subscription: Kreditreset-logik med 28-dagars fönster är fragil

**Fil:** `supabase/functions/check-subscription/index.ts`
**Risk:** Edge case vid planbyten. 28-dagars time-window för idempotency kan missa en riktig renewal om användaren byter plan mitt i cykeln, eller kan resetta credits dubbelt om intervallet är kortare (t.ex. testläge).
**Konsekvens:** Användare kan få för många eller för få credits vid planbyten.
**Lösning:** Byt till `periodKey`-baserad idempotency (Stripe `current_period_end` + subscription ID) istället för tidsbaserad. Perioden är unik per billing cycle.

### 9. Ingen Stripe webhook-verifiering

**Risk:** Ingen webhook-listener finns. Hela betalningsflödet förlitar sig på att klienten anropar `verify-payment` med `session_id` efter redirect. Om användaren stänger fliken innan redirecten sker, registreras aldrig betalningen och credits tilldelas aldrig.
**Konsekvens:** Betalande kunder som inte får sina credits — supportbelastning och intäktsförlust.
**Lösning:** Implementera en Stripe webhook-endpoint (`checkout.session.completed`) som backup. Den behöver inte ersätta verify-payment men ska fånga upp missade sessioner.

### 10. process-demo-image: Demo-bilder rensas aldrig

**Fil:** `supabase/functions/process-demo-image/index.ts` + `supabase/functions/cleanup-old-images/index.ts`
**Risk:** Kostnadstillväxt. Demo-bilder under `demo/`-prefixet i storage ackumuleras utan rensning. Varje demo-generering skapar en permanent fil.
**Konsekvens:** Storage-kostnader växer kontinuerligt utan intäkt.
**Lösning:** Schemalägg `cleanup-old-images` att rensa `demo/` och `demo-temp/`-prefix äldre än 24h.

### 11. CORS: Access-Control-Allow-Origin: * på alla edge functions

**Fil:** Alla edge functions
**Risk:** Säkerhetssvaghet. Alla edge functions accepterar requests från vilken origin som helst. En angripare kan skapa en webbsida som gör autentiserade anrop till era edge functions om en användare besöker sidan medan de är inloggade.
**Konsekvens:** CSRF-liknande attacker mot autentiserade endpoints.
**Lösning:** Begränsa till kända origins: `app-autopic-studio.lovable.app` och preview-domänen.

---

## REKOMMENDATION (Backlog)

### 12. Sentry är integrerat men utan breadcrumbs

**Fil:** `src/contexts/AuthContext.tsx`, `src/main.tsx`
**Risk:** Sentry fångar errors men utan kontext om vilken edge function eller vilken generering som triggas.
**Lösning:** Lägg till Sentry breadcrumbs före varje API-anrop och edge function-invokation.

### 13. Ingen övervaknings-alert för tredjepartskostnader

**Risk:** Om PhotoRoom eller Lovable AI Gateway-kostnader spårar ur, märks det först på fakturan.
**Lösning:** Implementera en enkel daglig edge function som räknar `credit_transactions` med `transaction_type = 'generation'` och skickar en alert (via Resend) om volymen överstiger ett tröskelvärde.

### 14. localStorage-persistens av bilddata

**Fil:** `src/pages/Index.tsx` (rad 72-93, 241-267)
**Risk:** localStorage har 5-10MB gräns. Vid många bilder kan quota exceeded-fel uppstå (hanteras med catch men ger tyst förlust).
**Lösning:** Flytta persistens helt till `draft_images`-tabellen i databasen. localStorage kan användas som cache men inte som primär lagring.

### 15. Memoization saknas i tunga komponenter

**Fil:** `src/pages/Index.tsx`, `src/components/CreateSceneModal.tsx`
**Risk:** Onödiga re-renders vid varje state-ändring i 2000+ raders komponenter.
**Lösning:** Bryt ut sub-komponenter med `React.memo`, använd `useMemo` för tunga beräkningar och `useCallback` konsekvent.

### 16. Demo-temp filer läcker vid fel

**Fil:** `supabase/functions/process-demo-image/index.ts`
**Risk:** Om PhotoRoom-anropet misslyckas (rad 293-296) kastas ett fel innan cleanup (rad 329-332) körs. Temp-filen `uploadFilename` blir kvar permanent i storage.
**Lösning:** Flytta cleanup till en `finally`-block.

