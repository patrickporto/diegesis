# Panel System

## MODIFIED Requirements

### Panel Placement
#### Scenario: Vertical Panels
-   **Given** the user is dragging a panel,
-   **When** they drag it to the top or bottom edge of the screen,
-   **Then** a full-width drop zone should appear.
-   **And** dropping the panel should dock it to the top or bottom, spanning the entire width.

### Drop Zones
#### Scenario: Smart Overlays
-   **Given** a panel drag is in progress,
-   **When** the user drags near an empty edge,
-   **Then** the destination drop zone should be highlighted.
-   **And** if the mouse is not near a specific zone, the overlays should remain unobstructive.

### Side Docks
#### Scenario: Collapsed Panels
-   **Given** a panel location (e.g., Top Left) has assigned panels but is closed/collapsed,
-   **Then** a "Side Dock" on the left edge should display tabs/icons for those panels.
-   **When** the user clicks a tab in the dock,
-   **Then** the corresponding panel should expand.
