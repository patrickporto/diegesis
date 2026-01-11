## ADDED Requirements

### Requirement: Grid Offsets Influence Token Placement

The battlemap SHALL adjust valid token placement positions based on grid offset X and Y values, ensuring tokens can only be placed at offset-adjusted grid intersections.

#### Scenario: Placing Token with Offsets

- **WHEN** grid offset X=10 and Y=15, and user attempts to place a token.
- **THEN** token snaps to the nearest position incorporating the offsets (e.g., not at raw grid lines, but shifted by 10px X and 15px Y).

### Requirement: Grid Offsets Influence Token Movement

The battlemap SHALL constrain token movement to offset-adjusted grid paths, preventing placement outside these adjusted boundaries during drag or move operations.

#### Scenario: Moving Token with Offsets

- **WHEN** grid offset X=5 and Y=5, and user drags a token across the grid.
- **THEN** movement snaps to positions aligned with the offset grid, maintaining consistent steps relative to the shifted coordinates.

### Requirement: Grid Offsets Influence All Snapping

All grid-related snapping (e.g., for tokens, drawings, or tools) SHALL incorporate offset X and Y, applying the shifts universally to alignment calculations.

#### Scenario: Snapping During Drawing with Offsets

- **WHEN** offsets are set and user draws a line with grid snap enabled.
- **THEN** the line endpoints snap to offset-adjusted grid points, not the default grid.
