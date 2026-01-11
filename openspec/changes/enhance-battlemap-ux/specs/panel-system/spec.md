## ADDED Requirements

### Requirement: Resizable Panels
The system SHALL use react-resizable-panels to make all sidebar panels (TokenManager, Settings, Properties) resizable.

#### Scenario: User resizes token manager panel
- **WHEN** user drags the edge of the Token Manager panel
- **THEN** the panel width changes accordingly
- **AND** the canvas adjusts to fill remaining space

### Requirement: Movable Panel Positions
The system SHALL allow panels to be positioned at any corner of the screen.

#### Scenario: User moves panel to opposite corner
- **WHEN** user drags a panel header to the top-right corner
- **THEN** the panel docks to the top-right corner

### Requirement: Panel Grouping
The system SHALL allow users to group multiple panels into tabbed containers.

#### Scenario: User groups properties and settings
- **WHEN** user drags settings panel onto properties panel
- **THEN** both panels appear as tabs in a single container
- **AND** user can switch between them via tab headers

### Requirement: Mobile Responsive Panels
The system SHALL provide mobile-friendly panel behavior with collapsed defaults and full-screen expansion.

#### Scenario: Panel on mobile device
- **WHEN** viewport width is less than 768px
- **THEN** panels collapse to icon buttons
- **AND** tapping a panel icon expands it as an overlay
