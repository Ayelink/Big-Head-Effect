# Fix: Strict Image Fidelity and Ratio Preservation

## Context
The user is experiencing two issues with the AI-generated "big head" effect:
1. **Ratio/Cropping**: The generated image has a different aspect ratio or crop compared to the original.
2. **Fidelity/Hallucination**: The AI alters the person's face, changes the background, or hallucinates body parts (like adding a full body to a half-body shot).

## Root Cause
1. **Ratio**: The AI model (`google/gemini-3.1-flash-image-preview`) only supports specific aspect ratios (16:9, 4:3, 1:1, 3:4, 9:16). If the uploaded image doesn't perfectly match one of these, the AI crops it.
2. **Fidelity**: Generative AI models naturally want to "redraw" the whole image. Even with strict prompts, they struggle to keep exact pixel fidelity.

## Solution

### 1. Fix the Ratio Issue (Canvas Padding/Cropping)
Since the AI only accepts fixed ratios, we must handle the ratio mismatch on the frontend:
- **Pre-process**: Before uploading, draw the user's image onto a Canvas that exactly matches the closest supported AI ratio (e.g., 3:4). Pad the extra space with a solid color (e.g., white).
- **Post-process**: After the AI generates the image, draw it back onto a Canvas and crop out the padding, restoring the exact original dimensions.
*(Alternatively, we can just accept the closest ratio but ensure the prompt strictly forbids zooming out or changing the composition).*

Let's try a simpler approach first: The AI is likely zooming out to fit the new ratio. We will instruct it to maintain the exact scale.

### 2. Ultra-Strict Prompting
We need to frame the prompt not as a "transformation" but as a "photoshop edit".

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
- Upload the provided image (man with phones).
- The output should have the exact same face, no extra body parts, and the same relative framing.
