# Spec: Side Dock Updates

## ADDED Requirements

### Requirement: Vertical Labels
The system SHALL display panel names vertically in side docks.

#### Scenario: Viewing Minimal Dock
- **WHEN** panels are minimized to the side dock
- **THEN** each panel toggle should display its full Title oriented vertically.

### Requirement: Universal Retrieval
The system SHALL ensure allow retrieving panels closed from any location.

#### Scenario: Closing a Top/Bottom Panel
- **GIVEN** a panel is located in the "Top" or "Bottom" slot
- **WHEN** the user closes this panel
- **THEN** it should appear in one of the Side Docks (Left or Right) so it can be reopened.
