# Enhance Panel System

## Summary
Enhance the Battlemap Editor's panel system to support robust drag-and-drop interactions, specifically enabling drops into empty zones and grouping multiple panels within the same drop zone using a tabbed interface.

## User Motivation
Users currently face limitations when organizing their value:
1.  **Empty Zone Drops:** Users cannot drag panels into empty corners because the drop zones are not rendered until the column/section exists.
2.  **Panel Stacking:** Users want to maximize screen real estate by stacking multiple panels (e.g., Token Library and Layers) in the same corner, switching between them via tabs, rather than having them compete for space or occupy different corners.

## Proposed Solution

### 1. Persistent Drop Zones
Refactor `PanelLayout` to separate the "Drop Target" logic from the "Content Rendering" logic.
-   **Always-Visible/Active Drop Targets:** Implement invisible or overlay drop zones for all 4 corners (`topLeft`, `bottomLeft`, `topRight`, `bottomRight`) that function even when the respective slot is empty.
-   **Visual Feedback:** When dragging a panel, highlight the potential drop zones to guide the user.

### 2. Multi-Panel State (Tabs)
Refactor the state management in `BattlemapEditor` to support multiple panels per location.
-   **Data Structure:** Change `panelLocations` from matching `PanelLocation -> PanelID` to `PanelLocation -> PanelID[]`.
-   **Active Tab:** specific state to track which panel is currently visible in a tabulated slot (e.g., `activeTabs: Record<PanelLocation, PanelID>`).

### 3. Tabbed Panel UI
Update the rendering execution to handle panel groups:
-   **Tab Header:** If a slot contains multiple panels, render a tab bar (e.g., "Tokens | Layers") above the content.
-   **Shared Container:** Wrap grouped panels in a single `DraggablePanel` container or a new `TabbedPanelGroup` container that handles the switching and common drag handle (dragging the tab vs dragging the whole group).

## Risks
-   **Complexity:** Managing nested arrays and active states increases the complexity of `BattlemapEditor`.
-   **Layout Thrashing:** `react-resizable-panels` might react poorly to rapid structure changes (0 panels -> 1 panel). We must ensure stable mounting of groups.
