# Tasks: Improve Drawing Tools

## Spec: Text Tool
- [x] implementation details: `src/components/BattlemapEditor/types.ts` update types
- [x] Refactor `BattlemapToolbar` to accommodate Draw sub-tools
    - [x] Create `drawSubTools` array (Brush, Text, Rect, Ellipse, Polygon)
    - [x] Add sub-toolbar rendering for "Draw" tool
- [x] Implement `Text` sub-tool interaction in `useBattlemapInteractions`
    - [x] Click handler to spawn input
- [x] Create `TextInputOverlay` component for in-place editing
    - [x] Position based on canvas coordinates
    - [x] Style config (font, color, size)
    - [x] `Shift+Enter` for newline
- [x] Update `useDrawingRenderer` to render `Text` shapes

## Spec: Shape Tools (Rect, Circle, Poly)
- [x] Implement `Rect` sub-tool interaction
    - [x] Drag to create (like Fog Rect)
- [x] Implement `Ellipse` sub-tool interaction
- [x] Implement `Polygon` sub-tool interaction
    - [x] Click points, double-click or close loop to finish
- [x] Update `useDrawingRenderer` to render `Rect`, `Ellipse`, `Polygon`
    - [x] Add stroke/fill properties support

## Spec: Editability
- [x] Add `Select` mode logic for Drawings (or extend generic Select tool)
- [x] Implement hit-testing for Drawing shapes in `useBattlemapInteractions`
- [x] Create `SelectionOverlay` or `TransformHandles` (Pixi or DOM)
    - [x] Visual indicator of selection
- [x] Implement 'Move' and 'Resize' interaction for selected drawing
- [x] Implement "Delete" interaction (Backspace/Delete key).
- [x] Implement "Property Editing":
    - [x] Create `PropertyEditor.tsx` (floating, context-aware).
    - [x] Allow changing color, stroke width, fill opacity, font size.

## Migration/Cleanup
- [x] Migrate `textsArray` to `drawingsArray`.
    - [x] Add migration logic to `BattlemapEditor.tsx` or a one-off script.
    - [x] Ensure `DrawingText` type is used consistently.
    - *Decision*: Better to migrate `textsArray` items to `DrawingText` items in `drawingsArray` and deprecate `textsArray` to have a single z-index stack.
- [x] Remove old independent `Text` tool from Toolbar
