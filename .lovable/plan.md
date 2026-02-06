
# Fixa credit-saldo: Race conditions och felaktig renewal-logik

## Status per kund

**Finspangs Bilmarknad**: Saldo 1795 ar KORREKT. De fick 1800 credits via admin-justering, har genererat 5 bilder sedan dess. 1800 - 5 = 1795.

**Svenska Bilnet**: Saldo 800 ar FEL. De har genererat 41 bilder. Korrekt saldo: 800 - 41 = 759. Renewal-buggen lever kvar.

## Tva grundproblem

### Problem 1: Renewal-idempotency matchar pa fel nyckel

Renewal-checken i `check-subscription` matchar pa exakt description (t.ex. `sub_xxx:1772790824`). Men den forsta renewalen skapades med period-nyckel `sub_xxx:undefined` (because `periodEnd` var undefined). Nar korrekt nyckel sedan anvands hittas ingen match -- ny renewal skapas -- saldo aterstaells till 800.

```text
Transaktion 1: description = "sub_xxx:undefined"     <-- tidig bugg
Transaktion 2: description = "sub_xxx:1772790824"     <-- ny nyckel, ingen match

Idempotency-check soker pa "sub_xxx:1772790824" --> hittar INGET --> skapar NY renewal
```

**Fix**: Sluta matcha pa exakt period-nyckel. Kolla istallet om NAGON renewal skapats for denna prenumeration inom de senaste 28 dagarna. Eftersom prenumerationer ar manatliga raecker detta for att forhindra dubbletter.

### Problem 2: Race condition vid credit-avdrag

`process-car-image` laser saldot (t.ex. 800), bearbetar bilden (tar tid), och skriver sedan `800 - 1 = 799`. Om `check-subscription` aterstaeller saldot till 800 mitt emellan, skrivs 799 tillbaka -- och nasta generering laser 800 igen.

```text
Tid 0:  process-car-image laser credits = 762
Tid 1:  check-subscription satter credits = 800 (renewal)
Tid 2:  process-car-image skriver credits = 762 - 1 = 761  <-- OVERSKRIVER renewal
         (eller tvarsom: renewal overskriver korrekt avdrag)
```

**Fix**: Anvand en atomisk SQL-funktion som gor `credits = credits - 1` i en enda operation. Inget mellansteg dar saldot kan overskridas.

## Losning

### 1. Ny SQL-funktion: `decrement_credits`

En databasfunktion som atomiskt:
- Drar 1 credit
- Returnerar det nya saldot
- Misslyckas om saldot ar 0

```sql
CREATE OR REPLACE FUNCTION public.decrement_credits(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.user_credits
  SET credits = credits - 1, updated_at = now()
  WHERE user_id = p_user_id AND credits > 0
  RETURNING credits INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Uppdatera `process-car-image` edge function

Byt fran lasa-sedan-skriva till ett enda atomiskt anrop:

```text
FORE (buggigt):
  1. SELECT credits FROM user_credits     --> 800
  2. ... bearbeta bild (30 sek) ...
  3. UPDATE credits = 800 - 1 = 799       --> kan overskriva annan operation

EFTER (korrekt):
  1. SELECT credits (for att kontrollera > 0, snabb check)
  2. ... bearbeta bild ...
  3. SELECT decrement_credits(user_id)     --> atomiskt credits = credits - 1
```

### 3. Fixa renewal-idempotency i `check-subscription`

Byt fran exakt description-match till en tidsbaserad check:

```text
FORE:
  .eq('transaction_type', 'subscription_renewal')
  .eq('description', 'sub_xxx:1772790824')   <-- missar "sub_xxx:undefined"

EFTER:
  .eq('transaction_type', 'subscription_renewal')
  .gte('created_at', 28 dagar sedan)         <-- hittar ALLA nyliga renewals
  .limit(1)
```

Beskrivningen sparas fortfarande for loggning, men anvands inte for idempotency-checken.

### 4. Databaskorrigering for Svenska Bilnet

- Ta bort alla felaktiga renewal-transaktioner (bade `undefined` och duplicerade)
- Satt saldot till korrekt varde: 800 - 41 = **759**

## Filer som andras

| Fil | Andring |
|-----|---------|
| Ny SQL-migrering | Skapa `decrement_credits`-funktion |
| `supabase/functions/process-car-image/index.ts` | Anvand `decrement_credits` istallet for manuell read-write |
| `supabase/functions/check-subscription/index.ts` | Tidsbaserad idempotency istallet for description-match |

## Ingen paverkan pa ovrig funktionalitet

- Frontend anropar samma edge functions som tidigare
- Svar-formatet ar identiskt
- Inga andringar i UI, galleri eller export
