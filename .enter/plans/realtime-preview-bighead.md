# Fix: Preserve Original Image Fidelity in Big Head Effect

## Context
The current AI prompt ("Transform this photo into a big head small body caricature") gives the model too much creative freedom. Results show:
- Face/head angle changes from original
- Facial features are altered
- Half-body photos get "imagined" full bodies added
- Overall composition changes

The user's requirement is strictly: **enlarge only the head+hair region while keeping EVERYTHING else pixel-perfect identical**. If the source is half-body, the output must remain half-body.

## Root Cause
The `buildPrompt()` function in `src/pages/Index.tsx` (line 12-22) uses vague language like "transform", "caricature", "cute funny bobblehead" which invites the model to re-interpret the entire image.

## Fix: Rewrite the Prompt

Replace the current prompt with an extremely restrictive one that:
1. Explicitly says to keep the **exact same image** — same face, same angle, same expression, same background, same crop
2. Only instruction is to **scale up the head (including hair) proportionally**
3. Explicitly says: **do NOT add body parts, do NOT change the crop, do NOT change face orientation or features**
4. Makes clear that if it's a half-body or bust shot, the result must remain exactly that

### New prompt (in `buildPrompt`):

```
Edit this photo with ONLY the following change: scale up the person's entire head (skull, face, and hair) to ${scale}x its current size, keeping it centered on the same neck position.

CRITICAL RULES — you MUST follow ALL of these:
- The face must remain IDENTICAL: same person, same angle, same expression, same lighting, same skin texture
- Hair must scale proportionally with the head
- Do NOT modify, crop, extend, or reimagine ANY other part of the image
- Do NOT add body parts that are not visible in the original (e.g., if legs are not shown, do not add them)
- Do NOT change the background, clothing, pose, or image boundaries
- The output must have the EXACT same framing/crop as the input
- Only the head size changes — everything else stays pixel-perfect
```

### Also remove the `ratio` parameter
Currently passing a detected ratio which may cause the AI to resize/reframe the output. Remove `ratio` from the generation options to let the model produce output matching the source exactly.

## Files to Modify
- `src/pages/Index.tsx` — rewrite `buildPrompt()` function and remove `ratio` from `generateWithScale`

## Verification
- Upload a half-body photo → output should remain half-body with only the head enlarged
- Face details, angle, expression should be identical to original
- No body parts should be "invented" or added
