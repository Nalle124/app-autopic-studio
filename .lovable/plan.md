

## Plan: PhotoRoom Native Auto-Crop for Exterior Images Only

### Problem
Currently auto-crop applies to all images equally via a separate Gemini AI call, which is slow and inconsistent. Interior/detail images should not be cropped at all — only exterior (whole car) images need tight centering.

### Reference
The uploaded image shows ideal padding: car centered with approximately 3-5% even padding on all sides, no wasted space.

### Solution

**1. `supabase/functions/process-car-image/index.ts`** (lines 346-350)
- Accept new `autoCrop` form field from client
- When `autoCrop=true`: change `referenceBox` from `originalImage` to `subjectBox` and set `padding` to `0.03` (tight, matching reference image)
- When `autoCrop=false`: keep current behavior (`referenceBox=originalImage`, `padding=0.10/0.08`)

```typescript
// Current:
const paddingValue = orientation === 'portrait' ? '0.08' : '0.10';
photoroomFormData.append('padding', paddingValue);
photoroomFormData.append('scaling', 'fit');
photoroomFormData.append('referenceBox', 'originalImage');

// New:
const autoCrop = formData.get('autoCrop') === 'true';
const paddingValue = autoCrop ? '0.03' : (orientation === 'portrait' ? '0.08' : '0.10');
photoroomFormData.append('padding', paddingValue);
photoroomFormData.append('scaling', 'fit');
photoroomFormData.append('referenceBox', autoCrop ? 'subjectBox' : 'originalImage');
```

**2. `src/components/v2/V2GenerateStep.tsx`**
- In `processExteriorImage()`: pass `autoCrop` flag in the FormData sent to the edge function
- In the generation loop: only pass `autoCrop=true` for exterior images (classification already identifies these)
- Remove the separate `autoCropImage()` Gemini call entirely for exterior images when `autoCropEnabled` — PhotoRoom handles it natively now
- Keep the `autoCropImage()` function as dead-code fallback (or remove it)

The key change in the generation loop:
```typescript
// Before:
processedUrl = await processExteriorImage(img, scene, token, outputFormat);
if (autoCropEnabled) processedUrl = await autoCropImage(processedUrl, targetAspect);

// After:
processedUrl = await processExteriorImage(img, scene, token, outputFormat, autoCropEnabled);
// No separate autoCrop step needed — PhotoRoom already centered + padded
```

Interior and detail images: `autoCrop` is never passed, so they keep their original framing untouched.

### Files to edit
| File | Change |
|------|--------|
| `supabase/functions/process-car-image/index.ts` | Read `autoCrop` from formData, conditionally set `referenceBox=subjectBox` and `padding=0.03` |
| `src/components/v2/V2GenerateStep.tsx` | Pass `autoCrop` flag to edge function for exteriors only; remove Gemini `autoCropImage()` call |

### What stays the same
- Interior images: no crop, no padding change — processed as-is
- Detail images: no crop — processed as-is
- The `autoCropEnabled` toggle in the UI works exactly as before
- The `auto-crop-image` edge function remains available but is no longer called in the V2 flow

