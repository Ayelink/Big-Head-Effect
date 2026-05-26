# Fix: Restore ratio parameter to preserve original image dimensions

## Context
After removing the `ratio` parameter, the AI model defaults to a different output ratio (e.g., 3:4 portrait) even when the input is square. This causes the output to have a completely different crop/composition from the input.

## Solution
Re-add the `ratio` parameter using the dynamic detection logic that already exists (`imageRatioRef`). The detection code already reads the uploaded image's width/height and maps it to the closest supported ratio. This ensures the output matches the input's aspect ratio.

Additionally, reinforce in the prompt that the output dimensions must match the input exactly.

## Changes in `src/pages/Index.tsx`

1. Re-add `ratio: imageRatioRef.current` to the `submitAndPoll` options
2. Add a line to the prompt: "The output image must have the EXACT same aspect ratio and dimensions as the input"

## Verification
- Upload a square image → output should remain square
- Upload a portrait image → output should remain portrait
- No extra content should be "invented" beyond the original frame
