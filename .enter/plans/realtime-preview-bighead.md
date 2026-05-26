# Investigate and Fix Generation Failures

## Context
The user reported that there are many cases where the image generation fails. Currently, the application hides the actual error message returned by the AI API and only shows a generic "Generation Failed" (生成失败) message. This makes it difficult to know exactly why the AI model is rejecting the request.

**Why is this happening more frequently now?**
In the previous step, we added logic to automatically crop non-standard images (e.g., `2:3`) to the closest standard ratio (e.g., `3:4`) using the HTML5 Canvas API. 
When calculating the new dimensions, the math (`w / targetRatioValue`) often results in **floating-point numbers** (e.g., `1080.3333px`). 
Passing floating-point dimensions to the Canvas API or uploading an image with fractional pixels can cause the image encoding to fail or be rejected by the AI backend. Before this change, we were uploading the raw file directly, which always had integer dimensions.

## Proposed Solution

### 1. Fix Canvas Dimensions (Integer Values)
We will update the `prepareImageFile` function in `Index.tsx` to use `Math.round()` for all canvas dimensions. This ensures the cropped image always has valid, whole-number pixel dimensions.

### 2. Expose the Actual Error Message
We will update `Index.tsx` to read the `error` state from the `useAIImage` hook. If the generation fails, we will display the exact error message returned by the backend (e.g., "Prompt violates safety policy" or "Image too large"). This will immediately tell us what is wrong if failures continue.

## Files to Modify
- `src/pages/Index.tsx`:
  - Update `prepareImageFile` to include `Math.round` for `targetW` and `targetH`.
  - Update the `generateWithScale` function to use the `error` state from `useAIImage` instead of the generic `t(locale, "generateFailed")`.

## Verification
After these changes, the floating-point pixel issue will be resolved. If a generation still fails, the UI will display the exact reason, allowing us to debug further.