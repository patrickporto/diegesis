# Design: Refine Battlemap Interactions

## Panel Layout System

### Vertical Layouts
The `PanelLayout` component will be refactored to support full-width Top and Bottom panels.
-   **Current Structure:** Horizontal Group [Left, Center, Right]
-   **New Structure:**
    -   Vertical Group
        -   Top Panel (Collapsible)
        -   Horizontal Group (Middle)
            -   Left Panel
            -   Center (Canvas)
            -   Right Panel
        -   Bottom Panel (Collapsible)

This allows the Top and Bottom panels to span the entire width of the editor, accommodating wider tools or timelines if needed.

### Drop Zones
The global drop zone overlay will be updated to include 4 new zones:
-   `top` (Top 20% height)
-   `bottom` (Bottom 20% height)
-   `topLeft`, `topRight`, `bottomLeft`, `bottomRight` (Corner quadrants of the middle section)

Detailed "Placeholder" logic:
-   The "Drop Here" overlay should only appear during a drag event.
-   The distinct gray background/border of empty panel slots should be minimized or removed when no panel is present (handled by `react-resizable-panels` conditional rendering).

### Side Docks
To replace the Toolbar toggle buttons, we will introduce **Side Docks**.
-   **Location:** Narrow vertical strips on the far left and right of the screen (outside the `PanelLayout` or part of the `Middle` group).
-   **Behavior:**
    -   Display small tabs/icons for every panel assigned to that side's quadrants (TopLeft/BottomLeft -> Left Dock; TopRight/BottomRight -> Right Dock).
    -   Clicking a tab toggles the transparency/visibility of that panel in the layout.
    -   This allows users to quickly access panels without a centralized toolbar menu.

## Fog Properties & Tools
The `FogPropertiesPanel` currently lacks tool selection controls.
-   We will migrate the Fog Tool buttons (Brush, Rect, Ellipse, Polygon, Grid, Fill) into the `FogPropertiesPanel`.
-   This removes the need for a "sub-toolbar" in the main toolbar.
-   We will check `settings.fogOpacity` binding to ensure it's not duplicated.

## Tool Switching Logic
### Auto-Select
Implementation will reside in `useBattlemapInteractions.ts` (for Drawings) and `BattlemapEditor.tsx` (for Tokens).

**Flow (Drawing):**
1.  User selects Drawing Tool (e.g., Rect).
2.  User draws shape.
3.  `onPointerUp` detects completion.
4.  Shape is added to `drawingsArray`.
5.  **NEW:** `activeTool` is set to `select`.
6.  **NEW:** `selectedDrawingIds` is updated to contain only the new shape `id`.

**Flow (Token):**
1.  User drags token from sidebar.
2.  User drops token on canvas.
3.  `handleDrop` adds token.
4.  **NEW:** `activeTool` is set to `select`.
5.  **NEW:** `selectedTokenIds` (if exists) or just generic selection state is updated.

## Drawing Preview
The `updatePreview` function in `useBattlemapInteractions` currently uses hardcoded colors.
-   It will be updated to read `useBattlemapStore.getState().drawingProps`.
-   This ensures the cursor usage matches the actual drawn result.
