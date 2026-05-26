# Implement Analytics Tracking

## Context
The user wants to track user behavior and error rates to understand how the application is being used. Specifically, we need to track:
1. Page views (handled automatically by the SDK).
2. Users with interaction (can be derived from button clicks).
3. Button clicks (Upload, Camera, Regenerate, Change Photo, Download, Language Switch).
4. Upload failures.
5. AI generation failures.

## Proposed Solution

We will use the `@enter-pro/analytics-sdk` to instrument the application. I have already registered the necessary custom events in the backend:
- `button_click`
- `upload_failed`
- `generation_failed`

We will add imperative tracking (`trackEvent`) to the event handlers in `src/pages/Index.tsx`.

### Implementation Details
1. **Import SDK**: Import `trackEvent` from `@enter-pro/analytics-sdk` in `src/pages/Index.tsx`.
2. **Track Button Clicks**:
   - Upload Area / Upload Button: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'upload_click' } })`
   - Camera Button: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'camera_click' } })`
   - Regenerate Button: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'regenerate_click' } })`
   - Change Photo Button: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'change_photo_click' } })`
   - View Full (Download) Link: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'download_click' } })`
   - Language Switcher: `trackEvent('button_click', { eventType: 'custom', properties: { action_type: 'language_switch', language: l } })`
3. **Track Failures**:
   - In `processImage` catch block: `trackEvent('upload_failed', { eventType: 'custom', properties: { error_message: String(err) } })`
   - In `generateWithScale` error block: `trackEvent('generation_failed', { eventType: 'custom', properties: { scale } })` (We will also track the specific error message if available).

## Files to Modify
- `src/pages/Index.tsx`: Add `trackEvent` calls to the respective handlers.

## Verification
- Click various buttons and verify in the network tab that a `POST` request is sent to `/v1/track` with the correct event payload.
- Simulate an upload or generation failure and verify the failure events are tracked.