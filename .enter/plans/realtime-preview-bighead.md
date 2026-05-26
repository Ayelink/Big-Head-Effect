# Fix: Exact Image Ratio and Fidelity

## Context
The user is asking why we can't just use the exact uploaded image ratio, and why there are ratio restrictions. They also want strict fidelity (no face changes, no hallucinated body parts).

## Root Cause
The AI model we are using (`google/gemini-3.1-flash-image-preview`) has a strict API limitation: it **only accepts specific predefined ratio strings** (`1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`). If we pass an arbitrary ratio (like `2:3` or `original`), the API will reject it or default to `1:1`. Because the AI forces the output into one of these fixed ratios, it ends up cropping or padding the original image, which changes the composition.

## Solution

Since we **must** use this specific AI model (as per the system reminder), and the AI model **forces** fixed ratios, the only way to guarantee the output has the EXACT same dimensions and crop as the uploaded image is to handle it on the frontend using Canvas:

### 1. Pre-processing (Padding)
Before uploading the image to the AI:
- Calculate the closest supported AI ratio (e.g., `3:4`).
- Create a Canvas with that exact `3:4` ratio.
- Draw the user's original image in the center of this Canvas, padding the empty space with a solid color (e.g., white).
- Upload this padded image to the AI.
*This ensures the AI receives an image that perfectly matches its required ratio, so it won't crop the actual photo content.*

### 2. Post-processing (Cropping)
After the AI generates the "big head" image:
- Download the AI-generated image.
- Draw it onto a new Canvas that has the **exact dimensions of the user's original uploaded image**.
- This effectively crops out the padding we added in step 1.
- Display this final cropped image to the user.

### 3. Ultra-Strict Prompt
Update the prompt to be extremely explicit about acting as a photo editor, not a generative artist.

```typescript
function buildPrompt(scale: number): string {
  return `You are a strict photo editing tool. Your ONLY task is to enlarge the head in this photo.

CRITICAL INSTRUCTIONS:
1. SCALE ONLY THE HEAD: Enlarge the head and hair to ${scale}x size.
2. ZERO OTHER CHANGES: The face identity, expression, glasses, lighting, and skin MUST remain 100% identical to the original. Do not redraw or alter the face.
3. NO HALLUCINATIONS: If this is a half-body or bust shot, keep it exactly as a half-body or bust shot. DO NOT add legs, lower body, or any parts not visible in the original.
4. EXACT COMPOSITION: Keep the exact same background, hands, clothing, and framing. Do not zoom out. Do not change the image boundaries.`;
}
```

## Files to Modify
- `src/pages/Index.tsx`

## Verification
- Upload an image with an arbitrary ratio (e.g., 2:3).
- The final displayed result will have the exact same 2:3 ratio.
- The face will remain identical, and no extra body parts will be added.
