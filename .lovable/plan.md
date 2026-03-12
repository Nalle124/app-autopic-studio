

## Plan: V2 Flow Fixes — Plate Blur, Logo, Crop, UI Polish

### Issues to Fix

**1. License Plate Blur — Wrong placement (on tires/bumper)**
The AI prompt in `blur-license-plates/index.ts` is too vague. The model places inlays on wrong areas. Fix: rewrite prompts to be extremely specific — target only the rectangular license plate with registration text, not bumpers or wheels. Add explicit negative instructions.

**2. Logo padding & sizing**
In `V2GenerateStep.tsx` `applyLogoToImage()`: padding is `img.naturalWidth * 0.02` (2%) — too tight. Increase to 4%. Logo max width is 12% — add a `logoSize` config option (`small`=8%, `medium`=12%, `large`=16%) to `V2LogoConfig`. Users choose size in the logo step.

**3. AutoPic navbar logo — 20% larger**
In `AutopicV2.tsx`: change `h-[22px] sm:h-7` to `h-[26px] sm:h-8`.

**4. Auto-crop producing skewed results**
The `auto-crop-image` edge function returns bounding box coordinates, then `applyCropRegion()` in `V2GenerateStep.tsx` applies them client-side. The issue: the AI may return inaccurate bounds. Fix: improve the prompt to be more explicit about including the full car with wheels and mirrors, and add validation that the crop region is reasonable (min 30% of image).

**5. Progress bar — clickable navigation + more top padding**
Already clickable for backward steps. Add `pt-6` gap between header and progress bar in `AutopicV2.tsx`. Ensure `scrollTo(0,0)` when navigating to step 3→generate.

**6. Logo presets — modal instead of inline grid**
Replace the inline 6-grid mockup in `V2LogoPresets.tsx` with a "Välj placering" button that opens a `Dialog` with larger preset mockups. Clicking a preset selects it and auto-closes the modal.

**7. Plate styles — add 4th "upload custom logo" option**
Add `'custom-logo'` to `V2PlateConfig.style`. Show a file upload button when selected. Store the uploaded logo as base64 and pass it to the blur function.

**8. Remove cost info from generate summary**
Remove the "Kostnad" row from the summary card in `V2GenerateStep.tsx`.

**9. News badge — match photo tips border radius**
Change the badge wrapper to use `rounded-[10px]` matching the tips dropdown.

**10. Upload box height**
Increase padding from `p-8 sm:p-10` to `p-10 sm:p-14` in `V2ImageUploader.tsx`.

**11. Scroll to top when entering generate step**
In `AutopicV2.tsx`, when `setCurrentStep` moves forward, call `window.scrollTo({ top: 0, behavior: 'smooth' })`.

---

### Files to Change

| File | Changes |
|------|---------|
| `supabase/functions/blur-license-plates/index.ts` | Rewrite prompts for precise plate-only targeting |
| `src/components/v2/V2GenerateStep.tsx` | Increase logo padding to 4%, add logo size support, remove cost row, improve crop validation |
| `src/components/v2/V2LogoPresets.tsx` | Add logo size selector (S/M/L), modal for placement presets, 4th plate option for custom logo upload |
| `src/pages/AutopicV2.tsx` | Larger navbar logo, more progress bar padding, scroll-to-top on step change |
| `src/components/v2/V2ImageUploader.tsx` | Taller upload box, match news badge radius to tips |
| `supabase/functions/auto-crop-image/index.ts` | Improve prompt specificity, add bounds validation |

### Type Changes
```typescript
// V2LogoConfig — add logoSize
export interface V2LogoConfig {
  preset: string;
  applyTo: 'all' | 'first' | 'first-3-last' | 'first-last' | 'none';
  logoSize: 'small' | 'medium' | 'large';
}

// V2PlateConfig — add custom-logo style + customLogoBase64
export interface V2PlateConfig {
  enabled: boolean;
  style: 'blur-dark' | 'blur-light' | 'logo' | 'custom-logo';
  customLogoBase64?: string;
}
```

