# Design: Tabbed Panels & Robust Layout

## Data Model

### State Shape
```typescript
type PanelLocation = "topLeft" | "bottomLeft" | "topRight" | "bottomRight";

interface BattlemapEditorState {
  // Which panels are physically located where (array allows stacking)
  panelLocations: Record<PanelLocation, string[]>;

  // Which panel is visible in a stacked group (tab selection)
  activeTabs: Record<PanelLocation, string | null>;

  // Legacy/Global visibility toggle (optional, or derived from locations)
  openPanels: Record<string, boolean>;
}
```

## Layout Logic (`PanelLayout.tsx`)

The `PanelLayout` currently renders `react-resizable-panels`. Use the following logic to strictly determine structure:

### Rendering Columns
1.  **Left Column:** Render if `panelLocations.topLeft.length > 0` OR `panelLocations.bottomLeft.length > 0`.
2.  **Right Column:** Render if `panelLocations.topRight.length > 0` OR `panelLocations.bottomRight.length > 0`.

### Rendering Split
Inside a column (e.g., Left):
-   **If Top AND Bottom have panels:** Render `PanelGroup (vertical)` with two `Panel` components (Top and Bottom).
-   **If Only Top has panels:** Render single `Panel` (Top) taking 100% height.
-   **If Only Bottom has panels:** Render single `Panel` (Bottom) taking 100% height.

**Crucial:** This ensures we don't render empty space or 0-height panels.

## Drop Zone Logic

Since `Panel` components might not exist (e.g., empty quadrant), we cannot rely on `onDrop` events on the panels themselves for *initial* placement into an empty zone.

### Overlay Strategy
We will implement an **Overlay Layer** in `PanelLayout` that is only interactive during a drag operation.
1.  **Detection:** Use a global `onDragEnter` on the main container to detect when a panel is being dragged.
2.  **Zones:** Render 4 transparent rects covering the 4 quadrants of the viewport.
3.  **Z-Index:** These zones sit *below* the actual panels (so you can drop onto a specific panel if needed?) OR *above* everything if we want them to act as the primary "Move to Corner" targets.

*Decision:* Render Drop Zones *inside* the layout structure where possible, but use "Fallbacks" for empty areas.
Actually, simplest robust approach:
The `PanelLayout` main container is a grid or flex. The "Drop Zones" are always rendered as a background layer or distinct siblings.
When `dragging`, we show "Drop Indicators" in the center of the 4 quadrants.

## Component: `TabbedPanelHost`
Wrapper component that takes `panelIds`.
-   If `panelIds.length === 1`: Render just the panel (with standard draggable header).
-   If `panelIds.length > 1`: Render a Tab Bar + Active Panel.
    -   The Tab Bar must be draggable (moves the whole group).
    -   Individual Tabs might be draggable (moves just that panel).

For MVP, dragging the *Header* moves the active panel. Dragging a *Tab* (if implemented) splits it out.
Refinement: standard `DraggablePanel` header moves the *active* panel. To "Stack", you drop a panel *onto the header* of another panel? Or just drop into the same zone?
*Decision:* Drop into the **same zone** = Append to list.
User drops "Layers" into "Top Left" (which has "Tokens"). Result: "Tokens" and "Layers" both in "Top Left".
