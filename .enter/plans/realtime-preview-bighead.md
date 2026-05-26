# Fix Aspect Ratio Cropping Issue

## Context
The user is experiencing image cropping after the AI generation. 

**The Root Cause:**
The AI model (`google/gemini-3.1-flash-image-preview`) strictly requires specific aspect ratios (`16:9`, `4:3`, `1:1`, `3:4`, `9:16`). 
If an uploaded image has a custom ratio (e.g., `2:3`), we currently calculate the closest supported ratio (e.g., `3:4`) and tell the AI to use it. 
Because the AI is forced to output `3:4`, it automatically crops the original `2:3` image to fit the new `3:4` bounding box. This is a hard limitation of the AI model itself—it cannot output arbitrary dimensions.

## Proposed Solution: The "Pad and Crop" Workaround
Since the AI model cannot handle custom ratios, we must handle it on the frontend using Canvas.

1. **Before AI (Padding)**: 
   - Calculate the closest supported AI ratio.
   - Draw the original image onto a Canvas that exactly matches that supported ratio.
   - Fill the empty space (padding) with a solid color (e.g., white or black).
   - Upload this *padded* image to the AI.
2. **AI Generation**:
   - The AI receives an image that is *already* in its supported ratio. It will not crop anything. It will just enlarge the head.
3. **After AI (Cropping)**:
   - Download the AI-generated image.
   - Draw it onto a Canvas.
   - Crop out the padding we added in Step 1, restoring the image to its *exact original dimensions*.
   - Display this final image to the user.

## Files to Modify
- `src/pages/Index.tsx`: 
  - Add a utility function to pad the image before upload.
  - Add a utility function to crop the image after generation.
  - Update the `processImage` and `generateWithScale` flows to use these utilities.

## Verification
- Upload an image with an extreme custom ratio (e.g., a very tall panorama).
- Verify that the final generated image has the exact same pixel dimensions as the original upload, with no content cropped out.