# Investigate and Fix Generation Failures

## Context
The user reported that there are many cases where the image generation fails. Currently, the application hides the actual error message returned by the AI API and only shows a generic "Generation Failed" (生成失败) message. This makes it difficult to know exactly why the AI model is rejecting the request.

Possible reasons for failure:
1. **Strict Prompt / Safety Filters**: The prompt contains words like "skull", "hallucinations", or "bust shot" which might trigger the AI model's safety filters.
2. **Image Size/Resolution**: The uploaded image might be too large (e.g., > 4MB or > 2048x2048) for the AI model to process.
3. **Float Dimensions**: The recent aspect ratio cropping logic might be creating canvases with floating-point dimensions (e.g., `1777.77px`), which could cause issues.

## Proposed Solution

### 1. Expose the Actual Error Message
We will update `Index.tsx` to read the `error` state from the `useAIImage` hook. If the generation fails, we will display the exact error message returned by the backend (e.g., "Prompt violates safety policy" or "Image too large"). This will immediately tell us what is wrong.

### 2. Fix Canvas Dimensions and Add Max Resolution
We will update the `prepareImageFile` function in `Index.tsx` to:
- Use `Math.round()` for all canvas dimensions to ensure they are integers.
- Scale down the image if its longest side exceeds `2048` pixels. This ensures the image is always within a safe size limit for the AI model, while maintaining the correct aspect ratio.

## Files to Modify
- `src/pages/Index.tsx`:
  - Update `prepareImageFile` to include `Math.round` and a max dimension of 2048.
  - Update the `generateWithScale` function to use the `error` state from `useAIImage` instead of the generic `t(locale, "generateFailed")`.

## Verification
After these changes, if a generation fails, the UI will display the exact reason. We can then adjust the prompt or image processing further if needed based on the specific error.