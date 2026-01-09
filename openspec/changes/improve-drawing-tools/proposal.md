# Improve Drawing Tools

## Summary
Enhance the drawing capabilities of the Battlemap Editor by unifying text and shape tools into the drawing system, enabling in-canvas text editing, and adding support for geometric shapes (rectangle, circle, polygon). All drawing elements will be editable.

## Problem
- **Text Tool**: Currently uses `window.prompt`, which is disruptive and limited (no multiline, fixed styling). It is separate from the drawing tools.
- **Drawing Tool**: Limited to freehand lines (`DrawingPath`). No support for geometric shapes which are available in Fog/Wall tools.
- **Editability**: Drawings are static once created; they cannot be selected, moved, or modified.

## Solution
1.  **Unify Drawing Model**: Expand `DrawingPath` to a more robust `DrawingShape` model that supports `brush`, `text`, `rect`, `ellipse`, `polygon`.
2.  **Enhanced Text Tool**: Move text into the drawing toolset. Implement an in-canvas rich text editor (or simplified text input) allowing font, color, size, and multiline (Shift+Enter) configuration.
3.  **New Shape Tools**: Add sub-tools for Rectangle, Circle/Ellipse, and Polygon, reusing patterns from the Fog tool.
4.  **Edit Mode**: Allow selecting drawing elements to modify their properties (color, text content, geometry) or transformation (move, delete).
5.  **Reusable Components**: Refactor shape rendering logic to be reusable between Fog, Walls, and Drawing where possible, or at least follow consistent patterns.

## Scope
-   **Added**: Text, Rectangle, Ellipse, Polygon sub-tools to Drawing.
-   **Modified**: Existing Text tool (merged into Drawing), Drawing renderer.
-   **Removed**: Standalone Text tool button (moved to Drawing sub-menu).
