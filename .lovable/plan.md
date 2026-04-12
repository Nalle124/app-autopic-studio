

## Problem Analysis

The user's images show unwanted objects/artifacts bleeding into generated backgrounds. The root cause is twofold:

1. **`reference_scale` is set to 1.0 for ALL scenes** — this tells PhotoRoom to match the reference background image as closely as possible. However, the AI also picks up visual cues from the original uploaded photo (the car's surroundings), creating hybrid artifacts. The PhotoRoom API default is 0.6, and lower values give the AI more creative freedom to generate a clean background.

2. **Several scenes are missing `ai_prompt`** — specifically Anthracite Studio, Arkitektur, Brofästet Sommar, Gamla Europa gata, Red Garage, and Showroom Panorama. Without a prompt, the fallback is a generic "place vehicle centered" instruction that gives no guidance about keeping the background clean or what the scene should look like.

3. **No negative prompt** — the `process-car-image` function does not send `background.negativePrompt` (unlike the demo function which does). This means there's no instruction telling the AI to avoid artifacts, extra objects, or elements from the original photo.

## Plan

### 1. Lower `reference_scale` globally

Update all scenes in the database from `1.0` to `0.65` (close to PhotoRoom's default of 0.6). This reduces how much the AI copies from the reference image while still maintaining the intended style/look. Studio scenes (like Anthracite Studio) should use an even lower value like `0.5` since they should be completely clean.

SQL migration:
- Set `reference_scale = 0.5` for studio scenes (category LIKE 'studio%')
- Set `reference_scale = 0.65` for outdoor/premium/autumn scenes

### 2. Add missing `ai_prompt` values

Write specific prompts for the 6 scenes that currently have NULL prompts, describing exactly what the background should contain and emphasizing cleanliness.

### 3. Add negative prompt to `process-car-image`

Add a `background.negativePrompt` parameter in the PhotoRoom API call (same pattern as the demo function) to explicitly reject:
- Objects from the original photo bleeding through
- Random artifacts, debris, extra vehicles
- Distorted or blurry elements

### 4. Enhance all existing prompts

Append a universal suffix to all prompts emphasizing "clean background, no foreign objects, no artifacts from original image" to reinforce the instruction.

---

### Technical Details

**Database migration** — update `scenes` table:
```sql
-- Lower reference_scale for studios
UPDATE scenes SET reference_scale = 0.5 WHERE category LIKE 'studio%';
-- Lower reference_scale for all others
UPDATE scenes SET reference_scale = 0.65 WHERE category NOT LIKE 'studio%';

-- Add missing prompts
UPDATE scenes SET ai_prompt = '...' WHERE ai_prompt IS NULL;
```

**Edge function change** — `supabase/functions/process-car-image/index.ts`:
- Add `background.negativePrompt` field after the prompt, similar to what already exists in `process-demo-image`
- Append a "clean scene" suffix to all prompts

