# Design: Refine Battlemap UI Feedback

## Context
User feedback indicates usability issues with the recent panel system changes:
1. Floating property editor is preferred to be docked.
2. Side dock icons are insufficient; full vertical names are requested.
3. Closed panels in "other corners" (Top/Bottom) become inaccessible.
4. Fog tools should be in the toolbar for quick access.
5. Z-index issues with Color Picker.

## Architecture

### 1. Integrated Property Editor
Currently, `PropertyEditor.tsx` is a standalone floating component.
We will refactor `BattlemapEditor`'s `renderInnerPanelContent("properties")` to serve a dual purpose:
- **Default (No Selection)**: Show Global/Tool properties (like `DrawingPropertiesPanel` for active tool defaults).
- **Selection Active**: Show properties for the *selected* item(s).
- This effectively merges `PropertyEditor` into the docked "Properties" panel.

### 2. Side Dock Enhancements
- **Vertical Text**: CSS `writing-mode: vertical-rl` (or transform rotate) to display full names.
- **Panel Discovery**: `SideDock` currently filters only `left` or `right` locations.
  - **Change**: "Left" SideDock will capture closed panels from `topLeft`, `bottomLeft`, and potentially `top` (if we map Top -> Left dock or create a Top dock).
  - **Decision**: Since `top` and `bottom` panels are full width, they don't map cleanly to side docks *spatially*.
  - **Proposal**:
    - **Top Panels**: If closed, show a minimal "tab" or "bar" at the top edge? OR map them to Left/Right docks based on preference?
    - Given the user said "side docks", mapping everything to Left/Right docks is the cleanest UI pattern for "minimized to side".
    - **Mapping**:
      - `Top`, `TopLeft`, `BottomLeft` -> **Left Dock**
      - `Bottom`, `TopRight`, `BottomRight` -> **Right Dock** (or simpler split).
    - Alternatively, just ensure `BattlemapEditor` passes ALL closed panels to one of the docks.

### 3. Toolbar Refactor
- Revert `FogPropertiesPanel` changes that added tool buttons.
- Restore/Add Fog Sub-toolbar to `BattlemapToolbar`.

### 4. Z-Index Fixes
- `ColorPicker` is usually absolute positioned. If the panel container has `overflow-y: auto`, the picker gets clipped.
- **Solution**: Use a React Portal for `ColorPicker` (render to `document.body` or a top-level overlay div) so it sits above everything.
