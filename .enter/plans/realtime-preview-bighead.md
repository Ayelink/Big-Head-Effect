# Fix: Restore ratio parameter and enhance prompt for strict fidelity

## Context
The AI model is changing the aspect ratio of the output (e.g., turning a square image into a 3:4 portrait) and "inventing" body parts that weren't in the original photo.

## Solution

### 1. Restore the `ratio` parameter
The `ratio` parameter was removed in the previous step, which caused the AI to default to its own ratio. We need to pass `ratio: imageRatioRef.current` back into the `submitAndPoll` call so the API knows the exact aspect ratio to generate.

### 2. Enhance the Prompt
Update the `buildPrompt` function to explicitly forbid changing the aspect ratio and inventing body parts.

```typescript
function buildPrompt(scale: number): string {
  return `Edit this photo with ONLY the following change: scale up the person's entire head (skull, face, and hair) to ${scale}x its current size, keeping it centered on the same neck position.

CRITICAL RULES — you MUST follow ALL of these:
- The face must remain IDENTICAL: same person, same angle, same expression, same lighting, same skin texture
- Hair must scale proportionally with the head
- Do NOT modify, crop, extend, or reimagine ANY other part of the image
- Do NOT add body parts that are not visible in the original (e.g., if legs are not shown, do not add them)
- Do NOT change the background, clothing, pose, or image boundaries
- The output must have the EXACT same framing/crop as the input
- Only the head size changes — everything else stays pixel-perfect
- MUST maintain the EXACT same aspect ratio and dimensions as the uploaded image
- If the uploaded image is a half-body or bust shot, ONLY apply the big head effect to the visible head. ABSOLUTELY DO NOT hallucinate or generate missing body parts (like legs or lower torso) that are not present in the original image.`;
}
```

## Files to Modify
- `src/pages/Index.tsx`

## Verification
- Upload a square half-body image → output should remain square and half-body
- No extra body parts should be generated
