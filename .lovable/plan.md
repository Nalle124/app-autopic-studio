

## Plan: Background Generation That Survives Page Navigation

### Problem
The generation loop runs entirely client-side in a sequential `for` loop. When the user leaves the page, the browser kills in-flight `fetch` requests and the loop stops — remaining images are never processed. The 4th image was likely mid-request when you navigated away.

### Solution: Fire-and-forget job creation + polling

Instead of processing images one-by-one in the browser loop, **submit all jobs to the backend immediately**, then **poll for results**. The edge function already creates `processing_jobs` records and does all PhotoRoom/storage work server-side — we just need to stop waiting for the response in the client loop.

### Changes

#### 1. Restructure the generation loop (V2GenerateStep.tsx)

**Current:** `for` loop calls `processExteriorImage` → waits for response → applies logo/plates client-side → moves to next image.

**New approach for exterior images:**
- Send all exterior image requests in parallel using `fetch` with **no `await`** on the response — fire-and-forget style. Each call to `process-car-image` already creates a `processing_jobs` record and uploads the result to storage.
- After dispatching all requests, switch to a **polling loop** that queries `processing_jobs` for the batch (by `project_id` or `user_id` + recent timestamp) every 3 seconds.
- As jobs complete (`status = 'completed'`), add them to `liveResults` from their `final_url`.
- Interior images still need client-side AI masking — these will be processed sequentially before the polling phase, or handled as a separate pre-step.

#### 2. Move post-processing to the edge function (process-car-image)

Logo overlay, plate blurring, and light adjustments currently happen client-side after the edge function returns. To survive page navigation, these must move server-side:
- Add optional parameters to `process-car-image`: `logoUrl`, `logoPreset`, `logoSize`, `plateBlur`, `plateStyle`, `plateLogo`, `lightBoost`, `lightEdit`.
- The edge function already has access to storage and can compose the final image. Logo overlay and light filters can be done via canvas-equivalent (sharp/PhotoRoom) or by calling the existing `blur-license-plates` function internally.
- This ensures the fully post-processed image is saved to `final_url` even if the client disconnects.

#### 3. Interior image handling

Interior images use Gemini AI masking which runs via `generate-scene-image` edge function. This already runs server-side. The approach:
- Pre-create a `processing_jobs` record with status `pending` for each interior image.
- Call `generate-scene-image` from a new small edge function (or extend `process-car-image` to handle interior mode) so it runs independently of the client.
- The polling loop picks up completed interior jobs the same way as exterior ones.

#### 4. Recovery on return (AutopicV2.tsx)

The existing recovery polling (added previously) already queries `processing_jobs` for recent jobs. This will now work correctly because all jobs are created at dispatch time and complete independently. Minor adjustments:
- Use `project_id` for more precise matching instead of time-based heuristic.
- Show shimmer placeholders for pending/processing jobs, completed images for done jobs.

### What stays unchanged
- The step wizard UI flow
- Scene selection, logo configuration, plate configuration UI
- The `process-car-image` edge function's core PhotoRoom logic
- Gallery display and project naming
- Credit deduction (already happens in `process-car-image`)

### File changes summary
| File | Change |
|------|--------|
| `supabase/functions/process-car-image/index.ts` | Add optional logo/plate/light params; apply post-processing server-side before saving `final_url` |
| `src/components/v2/V2GenerateStep.tsx` | Replace sequential await loop with fire-and-forget dispatch + polling loop; move post-processing params to request |
| `src/pages/AutopicV2.tsx` | Improve recovery polling to use `project_id`; handle partial results display |

### Risks & mitigations
- **Edge function timeout**: `process-car-image` already completes within ~15-30s per image. Adding logo overlay adds negligible time.
- **Interior masking**: The Gemini call can be slow (~30-60s). If it times out in the edge function, the job is marked `failed` and user can regenerate. This is better than silently losing the image when navigating away.

