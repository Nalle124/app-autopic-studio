

## Plan: Stabilize V2 Generation for Large Batches (19+ images)

### What Happened
The generation of 19 images crashed the browser before any images were dispatched to the server. Evidence:
- Database shows all 19 jobs stuck as `pending` — zero `process-car-image` calls in edge function logs
- The crash happened during the **preparation phase** (line 630): `Promise.all` normalizes all 19 images simultaneously through canvas operations, each creating a full-resolution canvas + JPEG blob conversion. With 19 large car photos (~5-10MB each), this exhausts browser memory
- After the crash/recovery, `v2-show-results` was already set to `true` (line 511, set before dispatching), so the user landed on the results page with 19 empty placeholders that will never complete
- The "v2 processimages" text visible in the progress bar is a missing/wrong translation key

### Root Causes
1. **Memory explosion**: `normalizeImageOrientation` runs on ALL images in parallel via `Promise.all` — each allocates a full-res canvas
2. **Premature state transition**: `v2-show-results` is set before any dispatching happens, so a crash mid-preparation leaves the user on a dead results page
3. **`useLiveGallery` disabled for >10 images** (line 365): batches over 10 fall back to a single spinner bar instead of per-image skeletons
4. **No dispatch verification**: if the preparation phase crashes, jobs stay `pending` forever with no recovery
5. **Visual glitch between states**: the component switches between 3 render modes (summary card → processing view → results gallery) causing visible flashes

### Changes

#### 1. Sequential Image Preparation (V2GenerateStep.tsx)
Replace `Promise.all` for `normalizeImageOrientation` + dimension extraction with a sequential loop (or batches of 2). This prevents allocating 19 canvases simultaneously.

```
// Before (crashes with 19 images):
const preparedImages = await Promise.all(classifiedImages.map(...))

// After (sequential, memory-safe):
const preparedImages = [];
for (const img of classifiedImages) {
  // normalize one at a time, release canvas memory between each
  const prepared = await prepareOneImage(img);
  preparedImages.push(prepared);
}
```

#### 2. Fix State Transition Timing (V2GenerateStep.tsx)
- Move `sessionStorage.setItem('v2-show-results', 'true')` to AFTER at least the first batch of dispatches succeeds, not before
- Don't set it during the preparation/classification phase where crashes can happen

#### 3. Remove the `useLiveGallery` Limit (V2GenerateStep.tsx)
- Remove the `totalImages <= 10` check on line 365 — always show per-image skeletons for the processing view regardless of batch size
- This gives consistent UX whether generating 3 or 50 images

#### 4. Smooth Transition: Single Processing View (V2GenerateStep.tsx)
- When `processing` is true, render the live gallery immediately (no intermediate "progress screen" that flashes)
- The processing view already shows skeletons + completed images — just ensure it renders cleanly from the start without a separate "analyzing" screen that causes the visual glitch

#### 5. Add Dispatch Failure Recovery (V2GenerateStep.tsx)
- Wrap the entire preparation + dispatch in a try/catch that cleans up pending jobs if the client crashes
- If preparation fails, mark all pre-created jobs as `failed` so they don't show as "processing" in the gallery indefinitely

#### 6. Fix Translation Key (locales)
- Ensure the status text uses proper translation keys during the preparation phase, not raw keys like "v2 processimages"

#### 7. Cleanup Stuck Jobs from Current Session
- Add logic in the polling recovery (AutopicV2.tsx useEffect) to detect jobs that have been `pending` for >10 minutes with no corresponding edge function activity and mark them as `failed`

### Files to Edit
| File | Change |
|---|---|
| `src/components/v2/V2GenerateStep.tsx` | Sequential preparation, remove useLiveGallery limit, fix state timing, add dispatch error recovery, smooth transitions |
| `src/pages/AutopicV2.tsx` | Improve stuck-job detection in recovery polling |
| `src/locales/sv.json` | Verify/fix translation keys for preparation status |

### Technical Risks
- Sequential preparation will be slightly slower for small batches (adds ~100ms per image) — acceptable tradeoff for stability
- Large batches (50 images) will take ~5-10 seconds to prepare before dispatching starts — show clear progress during this phase

