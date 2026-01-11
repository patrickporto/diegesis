# Design: Drawing Sync and Color Picker UX

## Architecture

### 1. Drawing Sync Logic

Currently, `useBattlemapInteractions.ts` handles the finalization of drawings. We need to ensure that every `points`-based drawing (Brush, Polygon) and every shape (Rect, Ellipse) consistently pulls from `useBattlemapStore.getState().drawingProps` at the moment of `doc.transact`.

**Flow**:
1. User changes color in Tool Dock -> `setDrawingProps` updates store.
2. User starts drawing -> `updatePreview` uses store props for `previewGraphicsRef`.
3. User ends drawing -> `onPointerUp` creates the Yjs fragment using store props.

### 2. Visual Color Picker

We will enhance `ColorPicker.tsx` by adding:
- A Hue slider (linear).
- A Saturation/Lightness/Value square (2D).
- A state representing the "current selection" distinct from the "applied value" if needed, or simply live-set.

Since we are using Vanilla CSS/Tailwind, we will use a small canvas or CSS gradients for the spectrum.

### 3. Palette Management

The `customColors` state in `ColorPicker` is currently stored in `localStorage`. We will keep this but make the UI more responsive to additions.

## Impacted Components

- `src/components/BattlemapEditor/hooks/useBattlemapInteractions.ts`: Update `onPointerUp` logic for all draw tools.
- `src/components/ui/ColorPicker.tsx`: Major UI refactor to include spectrum picker.
- `src/components/BattlemapEditor/PropertyEditor.tsx`: Match UI fields with `DrawingPropertiesPanel.tsx`.

## Trade-offs

- **Library vs Vanilla**: We will stick to a vanilla implementation for the color picker to keep dependencies low, as requested in general instructions (minimalism).
- **Z-Index**: The `ColorPicker` is already portaled; the new visual elements must also respect this and handle layout properly within the portal.
