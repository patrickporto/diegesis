# Tasks

- [ ] **Refactor Panel Layout & State** <!-- id: 0 -->
    -   Update `PanelLocation` type to include "top" and "bottom".
    -   Update `BattlemapEditor` state (`panelLocations`, `activePanelTabs`) to support new locations.
    -   Refactor `PanelLayout` component to use a Vertical PanelGroup wrapper for Top/Bottom slots.
    -   Update `PanelLayout` drop zone overlay to render "Top" and "Bottom" zones.

- [ ] **Implement Side Docks** <!-- id: 1 -->
    -   Create `components/BattlemapEditor/SideDock.tsx`.
    -   It should render a vertical list of tabs (icons/text) for panels assigned to that side (Left/Right).
    -   Integrate `SideDock` into `BattlemapEditor` layout (flanking the `PanelLayout`).
    -   Update `BattlemapToolbar` to remove the "Open Settings/Tokens/Layers" buttons.

- [ ] **Enhance Fog Properties Panel** <!-- id: 2 -->
    -   Remove duplicated "Global Fog Opacity" input from `FogPropertiesPanel.tsx`.
    -   Add Fog Tool selection buttons (Brush, Fill, Rect, Ellipse, Polygon, Grid) to `FogPropertiesPanel.tsx`.
    -   Ensure `activeTool` stays "fog" while switching sub-tools.

- [ ] **Refine Tool Interactions** <!-- id: 3 -->
    -   Update `useBattlemapInteractions.ts`:
        -   Inject `drawingProps` (color, width, etc.) into `updatePreview`.
        -   In `onPointerUp`, if completing a shape (Rect, Ellipse, Polygon, Brush, Text), set `activeTool` to "select" and set `selectedDrawingIds` to the new ID.
    -   Update `BattlemapEditor.tsx`:
        -   In `handleDrop` (Tokens), set `activeTool` to "select".
