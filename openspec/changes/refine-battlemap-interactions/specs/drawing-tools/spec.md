# Drawing Tools

## MODIFIED Requirements

### Live Preview
#### Scenario: Property Reflection
-   **Given** the user is using a drawing tool (Brush, Rect, etc.),
-   **And** they have selected specific properties (Color=Red, Width=5px),
-   **When** they move the cursor or drag to draw,
-   **Then** the preview graphics (cursor or shape outline) should reflect those properties visually.

### Tool Switching
#### Scenario: Auto-Select after Drawing
-   **Given** the user completes a drawing shape (Pointer Up),
-   **Then** the `activeTool` should automatically switch to "select".
-   **And** the newly created shape should be selected.

#### Scenario: Auto-Select after Token Drop
-   **Given** the user drags and drops a token onto the map,
-   **Then** the `activeTool` should automatically switch to "select".
