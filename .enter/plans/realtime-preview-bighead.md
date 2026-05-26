# Investigate and Fix Generation Failures

## Context
The user reported that there are many cases where the image generation fails. Currently, the application hides the actual error message returned by the AI API and only shows a generic "Generation Failed" (生成失败) message. This makes it difficult to know exactly why the AI model is rejecting the request.

## Proposed Solution

### 1. Expose the Actual Error Message
We will update `Index.tsx` to read the `error` state from the `useAIImage` hook. If the generation fails, we will display the exact error message returned by the backend (e.g., "Prompt violates safety policy" or "Image too large"). This will immediately tell us what is wrong.

### 2. Fix Canvas Dimensions (Integer Values)
We will update the `prepareImageFile` function in `Index.tsx` to use `Math.round()` for all canvas dimensions. The recent aspect ratio cropping logic might be creating canvases with floating-point dimensions (e.g., `1777.77px`), which can cause the Canvas API or the AI model to fail.

*(Note: We will NOT artificially limit the image size to 4MB or 2048px, as the user correctly pointed out this is unreasonable. We will rely on the backend's natural limits, which are currently set to 10MB in `useResourceUpload.ts`)*

## Files to Modify
- `src/pages/Index.tsx`:
  - Update `prepareImageFile` to include `Math.round` for `targetW` and `targetH`.
  - Update the `generateWithScale` function to use the `error` state from `useAIImage` instead of the generic `t(locale, "generateFailed")`.

## Verification
After these changes, if a generation fails, the UI will display the exact reason. We can then adjust the prompt or image processing further if needed based on the specific error.