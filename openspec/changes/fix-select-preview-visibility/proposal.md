# Change: Fix Select Tool Preview Visibility

## Why

The select tool marquee preview is not disappearing properly when the mouse button is released. Currently, the preview may persist after mouse button release, which is confusing. The preview should only be visible when the mouse button is pressed AND there are no objects currently selected.

## What Changes

- Modify `updatePreview()` to only show marquee selection preview when:
  1. Mouse button is currently pressed
  2. No objects are currently selected
- Ensure marquee preview clears immediately when pointer is released or when an object is selected

## Impact

- Affected specs: New battlemap-selection capability
- Affected code: src/components/BattlemapEditor/hooks/useBattlemapInteractions.tsx
