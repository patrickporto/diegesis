## ADDED Requirements

### Requirement: Select Tool Marquee Preview Visibility

The battlemap SHALL only display the marquee selection preview when the select tool is active, the mouse button is currently pressed, and no objects are currently selected.

#### Scenario: Marquee preview appears only when conditions met

- **WHEN** the select tool is active
- **AND** no objects are currently selected
- **AND** user presses and holds the mouse button on empty space
- **THEN** marquee selection preview appears and follows mouse cursor

#### Scenario: Marquee preview does not appear when objects selected

- **WHEN** the select tool is active
- **AND** one or more objects are currently selected
- **AND** user presses the mouse button
- **THEN** marquee selection preview does NOT appear

#### Scenario: Marquee preview clears when button released

- **WHEN** the select tool is active
- **AND** marquee selection preview is visible
- **AND** user releases the mouse button
- **THEN** marquee selection preview immediately disappears

#### Scenario: Marquee preview clears when object selected

- **WHEN** the select tool is active
- **AND** marquee selection preview is visible
- **AND** user clicks on an object during selection
- **THEN** marquee selection preview immediately disappears
