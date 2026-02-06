

# Analys och fixar: Credits + Losenordsaterstallning

## 1. Credit-avdrag vid bildgenerering -- FUNGERAR KORREKT

Den atomiska `decrement_credits`-funktionen fungerar som den ska. Verifierat med Jacobs (jacob.kuba69) transaktionshistorik: varje generation drar exakt 1 credit, saldot minskar med 1 varje gang utan nagra avvikelser (25 -> 24 -> 23 -> ... -> 6). Inga anderingar behövs har.

## 2. Finspangs Bilmarknad -- SALDOT AR KORREKT

Finspangs har genererat 17 bilder totalt, men inte alla anvande samma krediter:
- 2 bilder anvande gratis-credits (startade med 2)
- 10 bilder anvande ett admin-testtillagg pa 10 credits
- 5 bilder anvande det senaste admin-tillägget pa 1800 credits

Nuvarande saldo: 1800 - 5 = **1795** -- stammer perfekt. Inga anderingar behövs.

## 3. Svenska Bilnet -- SALDO BEHOVER KORRIGERAS

Problemet: Vi rensade ALLA gamla renewal-transaktioner som en del av den forra fixen. Nar `check-subscription` sedan korde fann den inga renewals inom 28 dagar, sa den skapade en ny -- och aterstallde saldot till 800.

Kodfixen fungerar nu korrekt (den nya renewal-transaktionen fran 18:39 hindrar framtida dubbletter). Men saldot ar fel:
- Prenumeration gav 800 credits
- 39 genereringar har anvant credits sedan prenumerationen
- Korrekt saldo: 800 - 39 = **761**

**Atgard**: Korrigera saldot till 761 via databasuppdatering.

## 4. Losenordsaterstallning -- BUGG IDENTIFIERAD

### Problemet (steg for steg)

```text
1. Anvandaren klickar "Glomt losenord?" pa auth-sidan
2. Supabase skickar ett mail med en aterstallningslank
3. Anvandaren klickar lanken --> landar pa /auth?reset=true
4. MEN: Supabase vaxlar recovery-token till en session automatiskt
5. onAuthStateChange i AuthContext far event PASSWORD_RECOVERY
   --> Satter user och session (anvandaren ar "inloggad")
6. Auth.tsx useEffect ser att user ar satt
   --> Navigerar direkt till / (startsidan)
7. Anvandaren far aldrig se formularet for att valja nytt losenord
```

### Losning

Tva anderingar kravs:

**A. AuthContext.tsx** -- Fanga PASSWORD_RECOVERY-event

Nar `onAuthStateChange` far event `PASSWORD_RECOVERY`, navigera till `/auth?reset=true` istallet for att lata den vanliga redirect-logiken ta over. Detta sakerställer att anvandaren hamnar pa ratt sida.

**B. Auth.tsx** -- Hoppa over auto-redirect vid reset-lage

Nar URL:en innehaller `?reset=true`, ska `useEffect` INTE omdirigera anvandaren aven om `user` ar satt. Istallet visas `ResetPasswordForm` som vantat.

Flödet efter fix:

```text
1. Anvandaren klickar aterstallningslanken
2. Supabase skapar session (PASSWORD_RECOVERY event)
3. AuthContext fangar eventet --> navigerar till /auth?reset=true
4. Auth.tsx ser isResetMode=true --> hoppar over auto-redirect
5. ResetPasswordForm visas --> anvandaren valjer nytt losenord
6. updateUser() sparar det nya losenordet
7. Redirect till /auth (vanlig inloggning)
```

## Filer som andras

| Fil | Andring |
|-----|---------|
| `src/contexts/AuthContext.tsx` | Lagg till PASSWORD_RECOVERY-hantering i onAuthStateChange |
| `src/pages/Auth.tsx` | Lagg till undantag i useEffect: hoppa over redirect nar isResetMode ar true |

## Databasandring

- Korrigera Svenska Bilnets saldo fran 800 till **761**

## Ingen paverkan pa ovrig funktionalitet

- Vanlig inloggning och registrering fungerar som tidigare
- Credit-systemet behover inga kodfixar (fungerar korrekt)
- Inga andringar i edge functions

