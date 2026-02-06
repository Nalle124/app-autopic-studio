
# Fixa duplicerade subscription_renewal-transaktioner

## Problemet
Funktionen `check-subscription` anvander `.maybeSingle()` for att kontrollera om en renewal-transaktion redan finns for aktuell period. Men `.maybeSingle()` kastar ett fel nar det finns **mer an en** matchande rad -- och det felet fangas tyst, sa `existingReset` blir `null`. Resultatet: varje anrop skapar en ny renewal-transaktion och aterstaller saldot till 800.

Svenska Bilnet har **249 duplicerade** renewal-transaktioner och deras saldo aterstalls till 800 vid varje anrop, trots att de genererat 41 bilder. Korrekt saldo: 800 - 41 = 759.

```text
Nuvarande bugg-loop:

check-subscription anropas
  --> maybeSingle() hittar 2+ rader --> KASTAR FEL (tyst)
  --> existingReset = null
  --> "Ingen renewal finns" --> skapar NY renewal
  --> Saldo aterställs till 800
  --> Nästa generering: -1 credit --> 799
  --> check-subscription anropas igen --> loop upprepar sig
```

## Losning

### 1. Fixa idempotency-checken i `check-subscription`
Byt `.maybeSingle()` till `.limit(1)` sa att fragan aldrig felar, oavsett antal matchande rader:

```text
Före (buggigt):
  .eq('description', periodKey)
  .maybeSingle()   <-- felar vid >1 rad

Efter (korrekt):
  .eq('description', periodKey)
  .limit(1)        <-- returnerar max 1 rad, felar aldrig
```

Samma fix gors aven for `recentPurchase`-fragan (rad 219-225) som ocksa anvander `.maybeSingle()` och kan drabbas av samma problem.

### 2. Rensa upp duplicerade transaktioner i databasen
Ta bort 248 av 249 duplicerade renewal-transaktioner for Svenska Bilnet (behall den forsta).

### 3. Korrigera Svenska Bilnets saldo
Satt saldot till det korrekta vardet: 800 - 41 = **759 credits**.

## Filer som andras

| Fil | Andring |
|-----|---------|
| `supabase/functions/check-subscription/index.ts` | Byt 2x `.maybeSingle()` till `.limit(1)` i renewal-logiken |

## Databasandringar
- Ta bort 248 duplicerade `subscription_renewal`-transaktioner
- Korrigera `user_credits` for Svenska Bilnet till 759

## Ingen paverkan pa ovrig funktionalitet
- Samma returnerade data till frontend
- Samma renewal-logik, bara saker idempotency-check
- Inga andringar i verify-payment, process-car-image eller nagot annat
