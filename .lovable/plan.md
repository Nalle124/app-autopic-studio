

## Paywall Cleanup & Unification Plan

Based on the wireframe, there are two main flows that need to be polished and unified:

### Flow 1: Demo/Try User (Cold Flow)
**Step 1 — Hero screen** (current: OK structure, needs visual polish)
- Before/after BMW X4 split image stays
- Two CTAs: "Hitta rätt paket" (→ quiz) and "Se alla paket direkt" (→ plans)
- Light background, clean typography

**Step 2 — "Hur vill du välja?" fork screen** (NEW — replace current quiz entry)
- Two large tappable cards: "Se alla paket direkt" and "Beräkna min plan"
- Add a subtle gradient visual element (like the generate step gradient) behind the cards
- This replaces the current direct "Fortsätt" button on the hero

**Step 3a — Quiz** (current: sliders are good, minor cleanup)
- Remove title/subtitle — just show sliders + total + "Beräkna" button
- Keep "Se alla paket direkt" link below

**Step 3b — Plans view** (needs significant cleanup)
- **Recommended plan** shown first and expanded when coming from quiz
- **Toggle** between "Engångspriser" and "Abonnemang" tabs (currently only in subscriber flow — bring to cold flow too)
- Plan cards: use consistent gradient styling matching app brand (blue-to-warm), not varied per card
- Remove "Stäng" button, keep only X and "Tillbaka"
- Contact link always at bottom

### Flow 2: Existing Customer (Subscriber Flow)
**When credits run out or from profile "Köp credits":**
- Toggle: "Fyll på" (one-time packs) | "Uppgradera" (next tier)
- **If NOT on Scale**: Show recommended next tier card prominently, with other tiers in dropdown
- **If ON Scale**: Show only credit packs + "Kontakta oss" for custom
- Remove "Stäng" button at bottom, keep only X close button
- Same gradient styling as cold flow

### Gradient Styling (Unified)
- All plan cards use the same gradient direction/style (matching generate step: blue-to-warm-orange)
- Differentiate cards by subtle opacity/hue shifts, not completely different palettes
- Buttons get white glow effect consistently

### Implementation Changes

**File: `src/components/DemoPaywall.tsx`**
1. Add a new `'choose'` step between hero and quiz/plans for the fork ("Se alla paket" vs "Beräkna min plan")
2. Add gradient visual to the choose step (subtle, not heavy)
3. Remove title/subtitle from quiz step — just sliders + calculate
4. Add toggle (Engångsköp | Abonnemang) to the cold flow plans view, reusing the same `renderCreditPacks` and plan cards
5. Unify gradient palette across all plan cards — single brand gradient with subtle per-tier variation
6. Remove "Stäng" buttons at bottom of both flows — rely on X button only
7. Clean up subscriber flow to match same card styling

**File: `src/pages/TryV2.tsx`** — no changes needed, it already triggers DemoPaywall correctly.

**File: `src/pages/Profile.tsx`** — no changes needed, already triggers `subscriber-limit` paywall.

### Summary of screens in order:
```text
DEMO USER:
Hero (before/after) → Choose (quiz or all) → Quiz (sliders only) → Plans (toggle: sub/one-time)
                                            └→ Plans directly

EXISTING CUSTOMER:
Modal → Toggle (Fyll på | Uppgradera) → Credit packs or next tier recommendation
```

