

## Plan: Add "Mina fakturor" (My Invoices) Section to Profile

### Summary
Create a new edge function to fetch Stripe invoices, and add an "Invoices" card/section to the Profile page. No changes to existing contact form, manage subscription button, or cancellation flow.

### 1. New Edge Function: `list-invoices`

**File:** `supabase/functions/list-invoices/index.ts`

- Authenticate user via Authorization header
- Look up Stripe customer by email
- Call `stripe.invoices.list({ customer, limit: 24 })`
- Return array: `{ id, number, date, amount, currency, status, pdf_url }`
- Amount converted from öre to kr (divide by 100)
- Uses existing CORS helper from `_shared/cors.ts`

### 2. Profile Page: Add Invoices Card

**File:** `src/pages/Profile.tsx`

- Add a new `<Card>` section between the Logo card and the Bug Report section
- Title: "Mina fakturor" with a `FileText` icon
- On mount (or on card open), call `supabase.functions.invoke('list-invoices')`
- Show a simple table: Datum | Fakturanr | Belopp | Status | PDF-länk
- Loading state with skeleton/spinner
- Empty state: "Inga fakturor ännu"
- Make it a `Collapsible` to keep the page clean (same pattern as bug report)

### 3. Translations

**Files:** `src/locales/sv.json`, `src/locales/en.json`

Add keys:
- `profile.invoices` / `profile.invoicesDesc`
- `profile.invoiceDate` / `profile.invoiceNumber` / `profile.invoiceAmount` / `profile.invoiceStatus` / `profile.downloadPdf`
- `profile.noInvoices`

### 4. Config

**File:** `supabase/config.toml` — add `[functions.list-invoices]` with `verify_jwt = false`

### What stays unchanged
- Bug report / contact form — untouched
- "Manage subscription" button inside bug report collapsible — untouched
- Buy credits / Get Pro button — untouched
- No cancellation-related changes

