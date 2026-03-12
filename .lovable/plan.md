

## Phase 1: Pricing Update & Paywall Redesign

### Summary
Update pricing for Business (1499kr) and Scale (1999kr), add 3 credit pack tiers (30/129kr, 100/399kr, 300/899kr), and redesign paywalls into a wizard-style multi-screen flow. Existing subscribers on old prices are unaffected -- old Stripe prices remain active. New purchases use new price IDs.

### Stripe Products Created
| Product | Price ID | Amount |
|---------|----------|--------|
| Business v2 (1499kr/mo) | `price_1TAGStR5EFc7nWvhW1YYQZQe` | 149900 SEK |
| Scale v2 (1999kr/mo) | `price_1TAGTYR5EFc7nWvhppU1NUin` | 199900 SEK |
| Credit Pack 30 (129kr) | `price_1TAGUMR5EFc7nWvh3TjjWNlH` | 12900 SEK |
| Credit Pack 100 (399kr) | `price_1TAGUyR5EFc7nWvhqvjU2wrV` | 39900 SEK |
| Credit Pack 300 (899kr) | `price_1TAGWRR5EFc7nWvhkemhzZsB` | 89900 SEK |

Old prices for Business (1299kr) and Scale (1499kr) stay active in Stripe for existing subscribers. The 69kr credit pack also stays for existing purchases.

---

### Changes

#### 1. Update `src/config/pricing.ts`
- Business: price 1499, priceId `price_1TAGStR5EFc7nWvhW1YYQZQe`, productId `prod_U8XXaqL2BD1ieM`
- Scale: price 1999, priceId `price_1TAGTYR5EFc7nWvhppU1NUin`, productId `prod_U8XYydmVeSHax8`
- Replace single `creditPack` with 3 packs: `creditPack30` (30/129kr), `creditPack100` (100/399kr), `creditPack300` (300/899kr)

#### 2. Update edge functions with new product mappings
- **`check-subscription/index.ts`**: Add new product IDs to `PRODUCT_CREDITS` map (both old and new for Business/Scale so existing subs still work)
- **`verify-payment/index.ts`**: Add all new product IDs (credit packs + new subscription products)
- **`create-guest-checkout/index.ts`**: Add new price IDs to `VALID_PRICE_IDS`

#### 3. Redesign `DemoPaywall.tsx` -- wizard multi-screen flow

**Cold user flow (demo/try, no subscription):**
- Screen 1: Hero with before/after result image (copy before/after assets to `src/assets/`), "Hitta rätt plan" headline with Playfair Display Italic accent, "Fortsätt" button
- Screen 2: "Hitta rätt plan" quiz -- 2 number inputs (bilar/mån, bilder/bil), "Beräkna" and "Se alla planer direkt" buttons
- Screen 3: Recommended plan card + all plans below in clean bordered cards. Each shows: name, credits, "ca X-Y annonser/mån", price kr/mån, features list. No per-image price. No icons. Playfair accent on plan names. Clean gradient/blur backgrounds on cards.

**Subscriber out-of-credits flow:**
- Screen 1: "Dina credits är slut" badge + "Fyll på och fortsätt" headline. Two toggle buttons: "Fyll på credits" / "Uppgradera plan"
- "Uppgradera plan" tab: Shows current plan → next tier with arrow, price, extra images. "Uppgradera till [tier]" CTA. For Scale users: credit packs + link to `www.autopic.studio/kontakt`
- "Fyll på credits" tab: 3 credit pack cards (30/129kr "2-4 annonser", 100/399kr "8-14 annonser", 300/899kr "20-37 annonser") with "Credits förfaller inte" note

**Profile buy flow:** Same as subscriber "Fyll på credits" tab

**Design principles:**
- Playfair Display Italic for key headlines (import via Google Fonts in index.html)
- No icons in plan cards, just text
- Subtle gradient blur backgrounds, grain noise where appropriate
- Clean bordered cards (border-border rounded-xl)
- Minimal info per screen, large tap targets
- Show "antal annonser" estimate instead of per-image price
- No visible moms -- Stripe handles that

#### 4. Update `DemoPaywall` plan data structure
- New `PRICING_PLANS` with updated prices and new credit pack entries
- Update `PRODUCT_TO_PLAN` map with both old and new product IDs (backward compat)
- Add annons estimate helper: `credits / 8` to `credits / 15` range per plan
- Scale highest tier: show "Kontakta oss" link to `https://www.autopic.studio/kontakt`

#### 5. Copy before/after assets
- Copy the user-uploaded BMW images (x4_efter_studio.jpg, bmw_interiör_före.jpg, front_efter.jpg) to `src/assets/paywall/` for use in paywall hero screen

---

### What is NOT changed
- V1 flow (Demo.tsx) -- completely untouched
- Existing subscribers' Stripe subscriptions -- old prices remain active
- No moms display in the app
- No per-image pricing shown to users

### Estimated scope
~3 files modified (pricing.ts, DemoPaywall.tsx, edge functions), 1 new font added, 3 images copied. The DemoPaywall rewrite is the bulk of work.

