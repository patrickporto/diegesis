## ADDED Requirements

### Requirement: Drawing Fill Color
The system SHALL allow users to configure both stroke color and fill color for shape drawings (rect, ellipse, polygon).

#### Scenario: User sets fill color before drawing rectangle
- **WHEN** user has drawing tool active with rect sub-tool
- **AND** user opens the drawing properties panel
- **AND** user selects a fill color
- **THEN** the next rectangle drawn uses that fill color

### Requirement: Brush Tool Properties
The system SHALL allow users to configure brush thickness, blur, and opacity before drawing.

#### Scenario: User configures brush with blur effect
- **WHEN** user selects brush tool
- **AND** user sets blur to 5px and opacity to 0.7 in properties panel
- **THEN** brush strokes render with 5px blur and 70% opacity

### Requirement: Pre-Draw Properties Panel
The system SHALL display a properties configuration panel when a drawing tool is active, allowing users to set properties before drawing.

#### Scenario: Properties panel appears on tool selection
- **WHEN** user selects any drawing sub-tool (brush, rect, ellipse, polygon)
- **THEN** a properties panel appears with relevant configuration options

### Requirement: WYSIWYG Text Editing
The system SHALL allow inline text editing directly on the canvas using contentEditable, replacing modal-based text input.

#### Scenario: User edits text inline
- **WHEN** user double-clicks on an existing text drawing
- **THEN** the text becomes editable inline on the canvas
- **AND** user can type and see changes in real-time
- **AND** pressing Escape or clicking outside confirms the text
