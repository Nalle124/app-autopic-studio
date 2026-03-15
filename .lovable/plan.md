

# Plan: Session 1 — Fix Recommended Plan Auto-Expand, Live Preview Click, and i18n Infrastructure

## Part A: Bug Fixes (this session)

### 1. Recommended plan auto-expanded after quiz
**File:** `src/components/DemoPaywall.tsx`
- In `handleCalculate` (line 157), change `setExpandedPlan(null)` to `setExpandedPlan(best)` so the recommended tier is pre-opened when the user lands on the plans step.
- No layout/size changes — just the `expandedPlan` state matches `recommendedPlan`.

### 2. Live gallery: clickable images during generation
**File:** `src/components/v2/V2GenerateStep.tsx`
- Add a `previewUrl` state for a lightbox overlay.
- In the live gallery grid (line 434-438), wrap completed images with an `onClick` that sets `previewUrl`.
- Render a simple fullscreen overlay (dark backdrop + centered image + close button) when `previewUrl` is set. Generation continues in the background.

## Part B: i18n Infrastructure (this session)

### Approach
- Add `react-i18next` + `i18next` + `i18next-browser-languagedetector` as dependencies.
- Create `src/i18n.ts` configuration file with language detection (browser → localStorage fallback).
- Create locale files: `src/locales/sv.json`, `en.json`, `de.json`, `pl.json`.
- Import i18n config in `main.tsx`.
- Add a `language` column to the `profiles` table (migration) to persist user preference.
- Add language selector to Profile page.

### Scope for this session
- Set up the infrastructure (i18n config, locale files with empty/stub structure).
- Translate the **shared components** that appear across flows:
  - `DemoPaywall.tsx` — all paywall strings
  - `Header` navigation labels
  - Auth page (`Auth.tsx`) — login/signup strings
  - Profile page labels
- Create the 4 locale JSON files with these initial translations.

### What is NOT translated (by design)
- V1 standard flow (`Index.tsx`, `Demo.tsx`) — will be replaced by V2
- V1 try page — replaced by TryV2
- Edge function error messages (later session)

### Translation file structure
```text
src/locales/
  sv.json    — Swedish (extract current hardcoded strings)
  en.json    — English
  de.json    — German
  pl.json    — Polish
```

Each file organized by namespace:
```json
{
  "nav": { "project": "...", "aiStudio": "...", "gallery": "...", "profile": "..." },
  "auth": { "login": "...", "signup": "...", ... },
  "paywall": { "findPlan": "...", "continue": "...", ... },
  "v2": { "upload": "...", "background": "...", "generate": "...", ... },
  "profile": { "settings": "...", "language": "...", ... },
  "common": { "next": "...", "back": "...", "save": "...", ... }
}
```

### Database migration
```sql
ALTER TABLE public.profiles ADD COLUMN language text DEFAULT 'sv';
```

## Files changed
- `src/components/DemoPaywall.tsx` — auto-expand fix + i18n strings
- `src/components/v2/V2GenerateStep.tsx` — clickable live preview
- `src/i18n.ts` — new, i18n configuration
- `src/locales/sv.json`, `en.json`, `de.json`, `pl.json` — new translation files
- `src/main.tsx` — import i18n
- `src/pages/Profile.tsx` — language selector
- `src/pages/Auth.tsx` — i18n strings
- `src/pages/AutopicV2.tsx` — i18n nav labels
- `src/pages/TryV2.tsx` — i18n nav labels
- Database migration for `profiles.language`
- `package.json` — new deps

## Next sessions to complete the full plan
1. **Session 2:** Translate V2 flow components (`V2ImageUploader`, `V2SceneSelector`, `V2LogoPresets`, `V2GenerateStep`, `V2ResultGallery`)
2. **Session 3:** Translate remaining pages (Onboarding, Guide, Profile details, Payments, error states)
3. **Session 4:** Edge function response localization (pass locale param, translate server-side messages)
4. **Session 5:** QA pass — verify all languages render correctly, test RTL-safe, review German/Polish translations

