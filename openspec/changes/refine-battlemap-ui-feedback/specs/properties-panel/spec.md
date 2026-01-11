# Spec: Properties Panel Integration

## ADDED Requirements

### Requirement: Docked Property Editing
The system SHALL display property editing controls in the docked Properties panel.

#### Scenario: Selecting an Item
- **WHEN** the user selects a drawing on the canvas
- **AND** the "Properties" panel is open
- **THEN** the panel should display the properties of the *selected* drawing (Color, Size, etc.)
- **AND** the floating `PropertyEditor` should NOT appear.

#### Scenario: Using a Tool (No Selection)
- **WHEN** the user is using the "Brush" tool (and nothing is selected)
- **AND** the "Properties" panel is open
- **THEN** it should display the *default* tool properties (Stroke Color, Width) that will be applied to the next drawing.

### Requirement: Selection State Handling
The system SHALL switch between tool defaults and selection properties.

#### Scenario: Switching Context
- **GIVEN** the "Properties" panel is showing selection properties
- **WHEN** the user clicks empty space to deselect
- **THEN** the panel should revert to showing the Active Tool's default properties.
