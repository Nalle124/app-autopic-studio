
## Stripe-faktura och förenklad onboarding-länk

### Del 1: Stripe-faktura till Finspångs Bilmarknad AB

Jag skapar fakturan via Stripe-verktygen i följande steg:

1. **Produkt och pris** -- "AutoPic Pro - 6 månader (specialavtal)" till 3 931,88 SEK (inkl. 25% moms)
2. **Faktura** kopplad till kunden `fbab@telia.com` (redan skapad i Stripe)
3. **Lägger till fakturaraden** på fakturan
4. **Slutför fakturan** så den skickas automatiskt till kundens e-post

Beräkning:
- 6 x 699 SEK = 4 194 SEK
- 25% rabatt: 4 194 x 0,75 = 3 145,50 SEK (exkl. moms)
- 25% moms: 3 145,50 x 1,25 = **3 931,88 SEK**

**OBS:** Stripe-verktygen kan inte lägga till företagsadress och org.nummer (556318-0396) direkt på kunden. Du behöver gå in i Stripe-dashboarden och uppdatera kundens uppgifter med:
- Företagsnamn: Finspångs Bilmarknad AB
- Adress: Skäggebyvägen 48, 612 44 Finspång
- Org.nummer (Tax ID): 556318-0396

Alternativt kan jag lägga till företagsuppgifterna i fakturabeskrivningen så de syns direkt.

---

### Del 2: Förenklad onboarding-länk (kodändring)

Idag kräver signup en 4-siffrig verifieringskod via e-post. Kunden ska kunna registrera sig enklare.

**Lösning:** Lägga till en `?invite=true`-parameter på `/auth`-sidan som hoppar över e-postverifieringssteget vid registrering.

Kundens resa med den nya länken:

```text
https://app-autopic-studio.lovable.app/auth?invite=true
    |
    v
Skapa konto (namn, e-post, lösenord)
    |
    v  (ingen verifieringskod)
    |
Onboarding-wizard (4 steg)
    |-- Kundtyp (företag/privatperson)
    |-- Företagsuppgifter + telefon
    |-- Hur hittade du oss?
    |-- Logotyp-uppladdning
    |
    v
Klar! Inne i appen med 0 credits
```

**Kodändringar:**

1. **`src/pages/Auth.tsx`** -- I `handleSignUp`-funktionen: om `?invite=true` finns i URL:en, hoppa över verifieringskoden och gå direkt till `signUp()`. All övrig validering (namn, lösenord, e-postformat) behålls.

2. Inga andra filer behöver ändras. Onboarding, ProtectedRoute och AuthContext fungerar redan korrekt.

---

### Del 3: Manuella credits

När du ser betalningen i Stripe:
1. Gå till admin-panelen
2. Hitta kundens konto (den e-post de registrerade sig med)
3. Lägg till 1 800 credits manuellt

---

### Sammanfattning

| Steg | Vad | Hur |
|------|-----|-----|
| 1 | Stripe-faktura | Skapas via Stripe (3 931,88 SEK inkl. moms) |
| 2 | Företagsuppgifter på fakturan | Uppdateras i Stripe-dashboard |
| 3 | Onboarding-länk | `?invite=true` hoppar över verifieringskod |
| 4 | Credits | Manuellt via admin (1 800 st) |

### Tekniska detaljer

- Kodändringen är minimal: en if-sats i `handleSignUp` som kollar `searchParams.get('invite') === 'true'`
- Om `invite=true`: kör `signUp()` direkt utan att skicka verifieringskod
- Om inte: befintligt flöde med verifieringskod bibehålls
- Säkerhetsaspekt: Parametern hoppar bara över e-postverifiering, inte kontoskapandet. Användaren måste fortfarande ange ett giltigt lösenord och gå igenom onboarding
