# Spec: Toolbar Updates

## ADDED Requirements

### Requirement: Fog Tools Location
The system SHALL display fog tools in the main toolbar.

#### Scenario: Using Fog Tool
- **WHEN** the user activates the Fog tool
- **THEN** the specific fog sub-tools (Brush, Rect, Ellipse, Polygon, Grid, Fill) MUST appear in the main floating Toolbar.

### Requirement: Properties Panel Role
The properties panel SHALL only show settings.

#### Scenario: Fog Properties
- **WHEN** the Fog tool is active
- **THEN** the "Properties" panel should only contain settings like "Mode" (Hide/Reveal) and "Opacity".
