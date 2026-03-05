

## Plan: AI Studio Improvements – Multi-area Update

This is a large set of changes spanning UX flow redesign, mobile polish, visual updates, and verification of credit logic. Here's the structured breakdown.

---

### 1. Markdown Rendering in Chat

**What it means:** Currently, assistant text messages are rendered with plain `<p>` tags and `whitespace-pre-line`. If the AI returns markdown formatting (bold, lists, headers), it shows as raw text. Adding `react-markdown` would render `**bold**` as bold, `- item` as bullet lists, etc.

**Recommendation:** This is low-risk and low-cost — it only affects how responses are *displayed*, not what the AI generates. The prompts already instruct "never respond with only text" and "no emojis", so the AI rarely returns complex markdown. Adding it is a nice-to-have for richer responses. Cost impact: zero (rendering only).

**Action:** Install `react-markdown`, replace `<p>` rendering in `assistant` messages with `<ReactMarkdown>` wrapped in `prose prose-sm` classes.

---

### 2. Credits Verification Across All AI Flows

All AI flows (background, free-create, blur, logo, fix-interior) call `invokeWithTimeout` which routes to `generate-scene-image`. That edge function performs atomic credit decrement via `supabase.rpc("decrement_credits")` at line 274 — **before** any AI call. This covers all modes since the mode is just a parameter. **Already correct — no changes needed.**

---

### 3. Background Studio Flow Redesign (Skapa bakgrund)

Current flow: Category → Inspiration (4 images) → 3 guided steps (e.g., Ljussättning → Golv → Bakvägg).

**Problems identified:**
- Step 2 (inspiration) and Step 3 (category-specific questions) feel repetitive ("kaka på kaka")
- The guided questions are too technical (floor type, wall type) for car dealer users
- Missing composition selection (corner shot, wall, perspective)

**New flow:**
1. **Inspiration gallery** — Expanded: show ~6 categories (existing ones) but each shows 6-8 thumbnails (first 6 visible, "Visa fler" expands rest). Also show text: "Eller beskriv fritt med text och egen referensbild i chatten"
2. **Composition selection** — NEW step: visual mockup cards showing different compositions (hörn/corner, rak vägg/flat wall, perspektiv med djup/perspective with depth, etc.). These are simple silhouette mockups.
3. **Mood & details** — Context-aware: based on the category + composition chosen, show relevant options like lighting quality (systemkamera vs telefon-look), warm/cold tones, time of day. Make it feel fun and personalized, not technical.

**Changes:**
- Expand `CATEGORY_REFERENCES` to 8-10 images per category
- Add composition step with visual mockups
- Replace technical questions (floor, wall) with mood/feel questions
- Update `GUIDED_FLOWS` to the new 2-step structure
- Handle "screenshot of competitor ad" use case: if user uploads an image and describes wanting to recreate the background, the system prompt already handles this via free-create mode

---

### 4. Mobile Navbar Hide in Active Chat

When inside a chat mode (not the menu), hide the standard app header/navbar on mobile to create full-screen immersion.

**Implementation:** Dispatch a custom event or use a context/state flag. When `activeTab === 'ai-studio'` AND `chatMode !== null` on mobile, add a class that hides the fixed header. The AI Studio header ("AutoPic AI | Ny | Meny") becomes the only visible navigation.

Also add more padding/gap between the chat container and the standard navbar area.

---

### 5. Fix Interior: Remove Irrelevant Post-Gen Suggestions

Currently `fix-interior` mode falls through to `POST_GENERATION_SUGGESTIONS_BG` (ljusare, mörkare, etc.). These are irrelevant for interior masking.

**Action:** Add a dedicated empty or minimal suggestion set for `fix-interior` mode, or no suggestions at all.

---

### 6. Redigera Fritt Menu Image

Remove the arrow overlay from the preview image. Keep only the chat bubble mockup. Use the user's uploaded reference image (the scanned Audi) without modification.

---

### 7. Desktop Layout Consideration

The user notes that the chat feels small on desktop. This is a larger design question.

**Options to explore later:**
- Wider layout on desktop (e.g., max-w-4xl instead of max-w-2xl)
- Split-panel: chat on left, image preview/gallery on right
- Keep current but note for future iteration

**No changes now** — user said "det är lite större" and wants to do step by step.

---

### Technical Summary of Files to Modify

1. **`src/components/CreateSceneModal.tsx`**
   - Expand `CATEGORY_REFERENCES` with more images per category
   - Add composition step with visual mockups
   - Rework `GUIDED_FLOWS` to mood-based questions
   - Add `POST_GENERATION_SUGGESTIONS_FIX_INTERIOR` (empty/minimal)
   - Fix `postGenSuggestions` switch to include `fix-interior` case
   - Emit event/state for navbar hiding when `chatMode` is active

2. **`src/pages/Index.tsx`**
   - Listen for chatMode state to hide mobile header when in active chat
   - Add gap between chat container and navbar

3. **`public/mode-previews/redigera-fritt-preview.jpg`**
   - Replace with clean image (user's Audi reference) without arrow, keeping chat bubble overlay

4. **Install `react-markdown`** and update assistant message rendering

---

### Execution Order

Due to scope, I recommend splitting into phases:
- **Phase 1** (this session): Mobile navbar hide, fix-interior suggestions fix, redigera fritt image, markdown rendering, expanded inspiration gallery
- **Phase 2**: Composition step + mood-based guided flow redesign
- **Phase 3**: Desktop layout improvements

Shall I proceed with Phase 1, or do you want all phases done at once?

