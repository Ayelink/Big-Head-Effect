# Fix Aspect Ratio Cropping Issue

## Context
The AI model automatically crops images if they don't match its supported ratios, leading to unpredictable results. To fix this, we will enforce strict rules on the frontend before sending the image to the AI.

## Core Rules
1. **DO NOT crop the generated image**: The output from the AI will be displayed exactly as returned.
2. **Standard Ratios**: If the user uploads an image that matches a standard ratio (`16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `1:1`), **do not crop it**.
3. **Non-Standard Ratios**: Only if the user uploads a non-standard size, we will adjust (center-crop) the uploaded image to the closest standard ratio *before* uploading it to the AI.

## Implementation Steps
1. **Define Standard Ratios**: `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `1:1`.
2. **Pre-process Uploaded Image (`src/pages/Index.tsx`)**:
   - When a user selects a file, calculate its aspect ratio (`width / height`).
   - Check if it matches any standard ratio (with a small tolerance, e.g., `0.05`).
   - If it matches, use the original file directly.
   - If it does NOT match, use a Canvas to center-crop the image to the closest standard ratio, and generate a new File object.
3. **Upload and Generate**:
   - Upload the processed file (either original or cropped to standard).
   - Pass the exact matched standard ratio to the AI API's `ratio` parameter.
   - Display the AI's result directly without any post-processing.

## Files to Modify
- `src/pages/Index.tsx`: Add the image pre-processing logic (ratio checking and center-cropping for non-standard images) before calling `uploadFile`.