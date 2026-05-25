# Fix: Image Ratio Consistency & Top Alignment

## Context
The generated image uses a hardcoded `ratio: "3:4"` in the AI call, but the original uploaded image can be any aspect ratio. This causes the generated result to have a different aspect ratio than the original. Additionally, the left thumbnails and right preview should be top-aligned instead of center-aligned.

## Changes

### 1. Detect original image aspect ratio and pass to AI (`src/pages/Index.tsx`)
- In `processImage`, after creating the blob URL, load it into an `Image` object to read `naturalWidth`/`naturalHeight`
- Store the aspect ratio in a ref (e.g. `imageRatioRef`)
- Compute the closest supported ratio string (e.g. "3:4", "4:3", "1:1", "9:16", "16:9") from the actual dimensions
- Pass this dynamic ratio to `generateWithScale` instead of the hardcoded `"3:4"`

### 2. Top-align the image area (`src/pages/Index.tsx`, line 228-237)
- Change `items-center` → `items-start` on the main preview container (line 237)
- Change `flex-1 min-h-0` on the image area to use `items-start` alignment

### 3. Keep thumbnail aspect ratio consistent
- Instead of fixed `h-[74px]`, use the same dynamic ratio for thumbnails (or just use `aspect-[3/4]` as default since most portraits are taller than wide). Better approach: use `aspect-auto` with `object-cover` to let each thumbnail naturally crop to fill.

## Files to Modify
- `src/pages/Index.tsx`

## Verification
- Upload a landscape image → generated image should maintain landscape ratio
- Upload a portrait image → generated image should maintain portrait ratio
- Left thumbnails and right preview should align at the top
