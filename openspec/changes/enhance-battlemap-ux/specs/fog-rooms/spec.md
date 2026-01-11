## ADDED Requirements

### Requirement: Fog Properties Panel
The system SHALL provide a dedicated panel for fog of war controls including hide/reveal mode, brush size, and tool selection.

#### Scenario: User accesses fog controls via panel
- **WHEN** user activates fog tool
- **THEN** a fog properties panel appears with mode toggle, brush size slider, and tool options

### Requirement: Wall-Bounded Fog Fill
The system SHALL limit fog fill operations to areas bounded by walls by default.

#### Scenario: User fills fog within room
- **WHEN** user uses fog fill tool inside a wall-enclosed area
- **THEN** fog only fills the enclosed room, not beyond walls
- **WHEN** user holds Alt key while filling
- **THEN** fog fills without wall boundary constraint

### Requirement: Room Detection
The system SHALL detect rooms when performing fill operations and prompt the user to name the detected room.

#### Scenario: Room detected and named
- **WHEN** user performs a fog fill in an enclosed area
- **THEN** system detects the room boundary
- **AND** prompts user to name the room
- **WHEN** user enters name and confirms
- **THEN** room is saved to the room list

### Requirement: Room List Panel
The system SHALL provide a panel listing all detected rooms with hide/reveal controls.

#### Scenario: User reveals room from list
- **WHEN** user opens room list panel
- **AND** clicks reveal button on "Throne Room"
- **THEN** fog is removed from the Throne Room area on the map

### Requirement: Room Context Menu
The system SHALL allow hiding/revealing rooms via context menu on the map.

#### Scenario: User hides room via context menu
- **WHEN** user right-clicks on a revealed room area
- **AND** selects "Hide Room" from context menu
- **THEN** fog covers that room area
