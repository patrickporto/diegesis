# Fog UI

## MODIFIED Requirements

### Properties Panel
#### Scenario: Consolidated Opacity
-   **Given** the `FogPropertiesPanel` is open,
-   **Then** the "Global Fog Opacity" slider should appear exactly once.

#### Scenario: Tool Selection
-   **Given** the Fog tool is active,
-   **Then** the `FogPropertiesPanel` should display buttons for selecting the current fog sub-tool (Brush, Fill, Rect, Ellipse, Polygon, Grid).
-   **When** a sub-tool is selected,
-   **Then** `activeTool` should remain "fog" but `fogTool` state should update.
