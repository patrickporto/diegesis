## ADDED Requirements

### Requirement: Reusable Context Menu Component
The system SHALL provide a reusable context menu component usable by all placeable objects (tokens, drawings, walls, rooms).

#### Scenario: Context menu on token
- **WHEN** user right-clicks a token on desktop
- **THEN** context menu appears with token-specific actions (edit, delete, move to layer)

### Requirement: Touch-Friendly Context Menu
The system SHALL support long-press gesture to trigger context menus on touch devices.

#### Scenario: Context menu via long-press
- **WHEN** user long-presses (500ms) on a token on mobile
- **THEN** context menu appears as a bottom drawer or action sheet

### Requirement: Adaptive Context Menu Layout
The system SHALL display context menus appropriately for screen size: popup on desktop, bottom drawer on phones, action sheet on tablets/TVs.

#### Scenario: Context menu on tablet
- **WHEN** user triggers context menu on tablet (10" screen)
- **THEN** context menu appears as centered action sheet with large touch targets

### Requirement: Placeable Abstraction
The system SHALL provide a common interface for all map objects that can be selected and have context menus.

#### Scenario: Consistent selection behavior
- **WHEN** user selects any placeable (token, drawing, wall segment, room)
- **THEN** selection highlighting and context menu trigger work consistently
