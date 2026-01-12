# Change: Fix Blur Affecting Selection Markers

## Why

When a drawing object has blur applied, the selection markers (cyan highlight box and corner handles) are also rendered with the blur effect. This makes the selection markers unclear and reduces visibility of selected objects. Users expect selection markers to always be sharp and clear regardless of the blur setting on the drawing object itself.

## What Changes

- Modify `useDrawingRenderer.ts` to separate the rendering of drawing content (which can have blur) from the rendering of selection markers (which should never be blurred)
- Use a two-tier rendering approach:
  - Main Graphics object for drawing content with blur filter (if blur > 0)
  - Separate Graphics object or render pass for selection markers without any blur
- Ensure selection markers remain sharp, clear, and visible at all blur levels (0px to maximum)

## Impact

- Affected specs: New drawing-selection-visibility capability
- Affected code: `src/components/BattlemapEditor/hooks/useDrawingRenderer.ts`
- User-facing: Selection markers will now be crisp and clear regardless of drawing blur setting
