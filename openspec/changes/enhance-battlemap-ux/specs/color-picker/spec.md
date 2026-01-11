## ADDED Requirements

### Requirement: Color Picker with Presets
The system SHALL provide a reusable color picker component with a predefined palette of colors.

#### Scenario: User selects preset color
- **WHEN** user opens color picker for stroke color
- **THEN** a palette of preset colors is displayed
- **WHEN** user clicks on orange preset
- **THEN** orange is selected as the stroke color

### Requirement: Custom Color Input
The system SHALL allow users to enter custom colors via HEX code input.

#### Scenario: User enters custom HEX color
- **WHEN** user opens color picker
- **AND** types "#3b82f6" in HEX input field
- **THEN** that blue color is selected and shown in preview

### Requirement: Recent Colors
The system SHALL track and display recently used colors for quick access.

#### Scenario: Recent color shown
- **WHEN** user has previously used "#ff6b6b"
- **AND** opens color picker
- **THEN** "#ff6b6b" appears in the recent colors section

### Requirement: Custom Color Addition
The system SHALL allow users to add custom colors to their personal palette.

#### Scenario: User adds custom color to palette
- **WHEN** user selects a custom color
- **AND** clicks "Add to palette" button
- **THEN** color is saved to their custom palette
- **AND** appears in future color picker opens

## MODIFIED Requirements

### Requirement: Grid Offset Configuration
The system SHALL allow users to configure grid X and Y offset for alignment with background images.

#### Scenario: User adjusts grid offset
- **WHEN** user sets grid X offset to 25px and Y offset to 10px
- **THEN** the grid renders shifted by those amounts
- **AND** snap-to-grid calculations account for the offset
