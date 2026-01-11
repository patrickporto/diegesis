# Refine Battlemap Interactions

This proposal aims to refine the Battlemap Editor's user experience by improving panel layout options, consolidating properties, and streamlining tool interactions.

## Goal

Enhance the flexibility of the panel system, fix UI redundancies, and implement "smart" tool switching to reduce friction during editing.

## Capabilities

### Panel System Enhancements
-   **Vertical Layouts:** Support `top` and `bottom` panel locations in addition to the existing corners.
-   **Smart Drop Zones:** Drop zones should be contextual and non-intrusive.
-   **Side Docks:** Replace toolbar toggle buttons with "Side Docks" that show tabs for closed panels on the edges of the screen, similar to IDEs or image editors.

### Fog of War UI Refinement
-   **Consolidated Properties:** Remove duplicate "Global Fog Opacity" controls.
-   **Tool Selection:** Move Fog Tool selection (Brush, Rect, Fill, etc.) from the main toolbar (where they are currently hidden or removed) into the `FogPropertiesPanel`.

### Drawing Tool Enhancements
-   **Live Preview:** Ensure drawing previews (cursor, shape outline) reflect the currently selected properties (color, stroke width, alpha).
-   **Auto-Select:**
    -   After placing a Token, automatically switch to the **Select** tool.
    -   After completing a Drawing (Rect, Ellipse, Polygon, Brush), automatically switch to the **Select** tool and select the newly created shape.

## Why
These changes address direct user feedback regarding usability friction:
-   Restricted panel placement.
-   Duplicate UI elements.
-   Missing tools (Fog selection).
-   Lack of visual feedback (Drawing properties).
-   Repetitive tool switching (drawing -> select -> move).
