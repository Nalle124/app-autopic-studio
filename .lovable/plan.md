

## Problem

The current code sends the background via `background.imageFile`, which tells PhotoRoom to use it as a **static backdrop** — it just composites the car on top without any AI scene understanding. This is why the car isn't naturally placed/grounded in the scene.

The previously working version used `background.guidance.imageFile` (or `imageUrl`) + `background.guidance.scale` + a short `background.prompt`, which activates PhotoRoom's **AI scene generation mode**. In this mode, PhotoRoom uses the reference image as a visual guide and generates a scene that naturally integrates the car with correct perspective, grounding, shadows, and reflections.

## Plan

### 1. Switch from static to guidance mode in both edge functions

**Files:** `supabase/functions/process-car-image/index.ts`, `supabase/functions/process-demo-image/index.ts`

Replace:
```
background.imageFile  →  background.guidance.imageFile
```

Add:
```
background.prompt = scene.aiPrompt || scene.name
background.guidance.scale = scene.referenceScale || 0.7
```

Remove:
```
background.color = 'white'  (not needed with guidance mode)
```

### 2. Keep shadow/reflection and padding logic as-is

The `shadow.mode`, `verticalAlignment`, `paddingBottom`, and `lighting.mode` parameters are orthogonal to the background mode and should continue working with guidance mode.

### 3. Keep the hallucination fix

The hallucination fix came from removing legacy fields (`negativePrompt`, `expandPrompt`, etc.) and using clean parameters. The guidance mode with a high `guidance.scale` (0.7–0.85) ensures the output closely matches the reference image, preventing random objects from appearing.

### Technical details

- `background.guidance.scale` controls how closely the AI follows the reference: 0.7 = close match, 1.0 = almost exact
- Each scene's `reference_scale` from the database will be used (currently 0.85 for studio scenes)
- The `background.prompt` will use the scene's `ai_prompt` field or fall back to the scene name
- `background.imageFile` and `background.prompt` **cannot** coexist per the API docs, but `background.guidance.imageFile` **can** coexist with `background.prompt`

