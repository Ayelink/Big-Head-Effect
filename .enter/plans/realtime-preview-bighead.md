# Investigate and Fix Generation Failures

## Context
The user reported an increase in image generation failures after the recent aspect ratio cropping update. 

**Root Causes:**
1. **Floating-Point Pixels (Primary Bug)**: The math used to calculate the new cropped dimensions (`w / targetRatioValue`) often results in decimal numbers (e.g., `1333.33px`). HTML5 Canvas requires integer pixel values. Passing decimals causes the Canvas to generate corrupted or invalid image blobs, which the AI backend rejects.
2. **Prompt Safety Filters**: The recent prompt update included the phrase "bust shot". AI models have extremely strict safety filters, and words like "bust" can sometimes trigger false-positive NSFW blocks, causing the generation to fail silently.

## Proposed Solution

We will fix the root causes directly, while also improving error visibility just in case.

### 1. Fix Canvas Math (Integer Dimensions)
We will update the `prepareImageFile` function in `Index.tsx` to use `Math.round()` for all calculated dimensions (`targetW`, `targetH`, `offsetX`, `offsetY`). This guarantees the cropped image is a valid, whole-pixel image.

### 2. Soften Prompt Vocabulary
We will replace potentially sensitive words in the prompt (like "bust shot") with safer alternatives (like "upper body portrait") to avoid triggering the AI's safety filters.

### 3. Expose the Actual Error Message
We will update `Index.tsx` to read the `error` state from the `useAIImage` hook. If a generation fails, we will display the exact error message returned by the backend (e.g., "Prompt violates safety policy" or "Image too large") instead of a generic "Generation Failed". This ensures we never have to guess why a failure happened again.

## Files to Modify
- `src/pages/Index.tsx`:
  - Update `prepareImageFile` to include `Math.round` for all canvas calculations.
  - Update `buildPrompt` to use safer vocabulary.
  - Update `generateWithScale` to use the `error` state from `useAIImage`.

## Verification
After these changes, the floating-point bug will be fixed, and safety filter false-positives will be reduced. If any image still fails, the UI will explicitly state the reason.