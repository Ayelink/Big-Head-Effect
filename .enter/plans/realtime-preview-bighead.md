# Implement Mobile-Friendly Image Download

## Context
The user wants to ensure that clicking the "Download" (查看原图/下载) button on mobile devices allows for a one-click save to the photo album, rather than just opening the image in a new browser tab (which is the current behavior using `<a href="..." target="_blank">`). 
Additionally, the user asked if this one-click download approach would conflict with a future "paid download" feature.

## Analysis

### 1. Current Behavior vs. Desired Behavior
- **Current**: `<a href={resultImageUrl} target="_blank" download>` opens the image URL in a new tab. On mobile browsers (like Safari or WeChat), this often just displays the image, requiring the user to long-press and select "Save Image".
- **Desired**: Clicking the button should programmatically fetch the image blob and trigger a forced download prompt, which on mobile usually pops up a "Download" or "Save to Photos" dialog directly.

### 2. Conflict with Future Paid Downloads?
**No, there is no conflict.** 
If a paid download feature is added later, the flow would simply be:
1. User clicks "Download".
2. App checks if the user has paid (or has credits).
3. If not paid -> Show payment modal.
4. If paid -> Execute the exact same programmatic download function we are about to build.
The actual mechanism of saving the file to the device is completely decoupled from the business logic of checking payment status.

### 3. Image Retention Time
The user asked how long the generated images are kept in the H5 interface before being cleared.
- **Current State**: The images are stored in React state (`historyImages`). This means they are kept **only in memory**. If the user refreshes the page, closes the browser tab, or kills the app (e.g., swiping away WeChat), the state is completely cleared immediately. There is no persistence (like LocalStorage or IndexedDB) implemented for the history.

## Proposed Solution

We will replace the `<a>` tag with a `<button>` and implement a programmatic download function.

### Implementation Details
1. **Create `handleDownload` function**:
   - Fetch the image from `resultImageUrl` using `fetch()`.
   - Convert the response to a `Blob`.
   - Create a temporary object URL (`URL.createObjectURL(blob)`).
   - Create a hidden `<a>` element, set its `href` to the blob URL, and set the `download` attribute to a generated filename (e.g., `bighead-effect.png`).
   - Programmatically click the hidden `<a>` element.
   - Clean up the object URL.
2. **Update UI**:
   - Change the "View Full" `<a>` tag to a `<button onClick={handleDownload}>`.
   - Keep the existing analytics tracking (`trackEvent`).

## Files to Modify
- `src/pages/Index.tsx`: Add `handleDownload` and update the download button.

## Verification
- On a mobile device (or simulator), clicking the download button should trigger the browser's native download/save dialog instead of opening a new tab.