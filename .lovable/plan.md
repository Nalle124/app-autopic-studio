

# Plan: V2 Flow Improvements — Retain Images, Skip Unnecessary Steps, Fix Translations, Add "Try Another Background"

## Issues Identified

### 1. Auto-crop runs on EVERY exterior image — adds significant time
The pipeline at line 340 always calls `autoCropImage()` which invokes an AI edge function (Gemini analysis). This adds ~3-5s per image even when cropping isn't needed. The user wants this to be **optional**.

### 2. Plate blur runs even when disabled — FALSE
Looking at line 341: `if (plateConfig.enabled)` — this is correctly gated. The plate blur only runs when enabled. The slowness is from the **auto-crop** step (always runs) and the **classification** step (always runs, calls another edge function).

### 3. Pipeline breakdown (per exterior image):
1. **Classification** (~2-3s for batch) — AI call to classify all images
2. **PhotoRoom background swap** (~5-8s) — core processing
3. **Auto-crop** (~3-5s) — AI call to detect car bounds ← **always runs, should be optional**
4. **Plate blur** (~3-5s) — only if enabled ✓
5. **Logo/light boost** — client-side, fast

So if user just wants background swap: steps 1+2 = ~8-11s per image. Currently it's 1+2+3 = ~11-16s. Making auto-crop optional saves ~3-5s per image.

### 4. Untranslated strings found:
- `LOGO_APPLY_LABELS` and `PLATE_STYLE_LABELS` in V2GenerateStep.tsx — hardcoded Swedish
- `title="Redigera fritt"` in V2ResultGallery.tsx — hardcoded Swedish
- `'Spara till Bilder'` in share calls
- `bild-` prefix in download filenames
- Various strings in `DemoPaywall.tsx` that may still be hardcoded

### 5. "Start over" clears images — user wants to keep them
### 6. No "try another background" option in results

## Implementation Plan

### A. Make Auto-Crop Optional (speed fix)
**File:** `src/pages/AutopicV2.tsx`
- Add `autoCropEnabled` state (default: `true`)
- Pass to V2GenerateStep

**File:** `src/components/v2/V2LogoPresets.tsx`
- Add an "Auto-crop" toggle in the logo/plates step (or add a new section)

**File:** `src/components/v2/V2GenerateStep.tsx`
- Skip `autoCropImage()` call when `autoCropEnabled` is false (line 340)
- Still show it in summary card

### B. "Start Over" Retains Images + "Try Another Background" Button
**File:** `src/pages/AutopicV2.tsx`
- Add `handleTryAnotherBackground` callback that:
  - Keeps `images` state intact
  - Resets `selectedSceneId`, `results`, `showResults`
  - Sets `currentStep` to 1 (background selector)
  - Keeps `logoConfig`, `plateConfig`, `projectName`

**File:** `src/components/v2/V2ResultGallery.tsx`
- Add prop `onTryAnotherBackground`
- Add button "Try another background" next to "Start over" in action buttons section

### C. Fix All Untranslated Strings
**File:** `src/components/v2/V2GenerateStep.tsx`
- Replace `LOGO_APPLY_LABELS` with `t()` calls using existing keys
- Replace `PLATE_STYLE_LABELS` with `t()` calls using existing keys

**File:** `src/components/v2/V2ResultGallery.tsx`
- Replace `title="Redigera fritt"` → `title={t('v2.editFreely')}` (add key)
- Replace `'Spara till Bilder'` → `t('v2.saveToPhotos')` (add key)
- Replace `bild-` → `t('v2.imagePrefix')` or use `image-` universally

**Files:** `src/locales/sv.json`, `en.json`, `de.json`, `pl.json`
- Add missing keys: `v2.editFreely`, `v2.saveToPhotos`, `v2.tryAnotherBackground`, `v2.autoCrop`, `v2.autoCropDesc`, `v2.none` (for logo label)

### D. V1→V2 Transition Discussion
This is a strategic discussion, not implementation. Key considerations:
- V2 is nearly feature-complete; main gaps are scene creation (handled via AI Studio redirect) and any V1-specific edge cases
- Migration path: change default route from V1 to V2, keep V1 accessible via dropdown
- Existing users: no breaking changes since both flows use the same backend
- Recommended approach: swap the default in the nav dropdown (V2 becomes "Project", V1 becomes "Project (Classic)") and monitor

## Files Changed
- `src/pages/AutopicV2.tsx` — add autoCrop state, tryAnotherBackground handler
- `src/components/v2/V2GenerateStep.tsx` — conditional auto-crop, fix hardcoded labels
- `src/components/v2/V2ResultGallery.tsx` — add tryAnotherBackground button, fix strings
- `src/components/v2/V2LogoPresets.tsx` — add auto-crop toggle
- `src/locales/sv.json`, `en.json`, `de.json`, `pl.json` — add missing keys

## Next Steps After This
1. **Session 2b**: Translate remaining hardcoded strings in CreateSceneModal and Index (if keeping)
2. **V1→V2 swap**: Change default route, rename nav labels
3. **Smart positioning**: AI detects car position and normalizes spacing across batch (future enhancement — requires modifying the auto-crop algorithm to enforce consistent margins)

