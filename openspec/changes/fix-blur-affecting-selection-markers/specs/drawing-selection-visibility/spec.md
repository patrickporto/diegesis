## ADDED Requirements

### Requirement: Selection Marker Clarity with Blur

The battlemap SHALL render selection markers (highlight box and corner handles) without blur effects, regardless of the blur setting on the selected drawing object. The selection markers must remain sharp and clear at all times to provide clear visual feedback about which objects are selected.

#### Scenario: Selection markers remain sharp on blurred drawing

- **WHEN** a drawing object has blur set to a non-zero value (e.g., 10px)
- **AND** the drawing object is selected
- **THEN** the cyan selection highlight box appears with sharp, clear edges
- **AND** the corner handles (resize indicators) appear with sharp, clear edges
- **AND** neither the highlight box nor handles are blurred

#### Scenario: Selection markers on unblurred drawing remain sharp

- **WHEN** a drawing object has blur set to zero
- **AND** the drawing object is selected
- **THEN** the cyan selection highlight box appears with sharp, clear edges
- **AND** the corner handles (resize indicators) appear with sharp, clear edges
- **AND** the drawing content itself is not blurred

#### Scenario: Selection markers update in real-time when blur changes

- **WHEN** a drawing object is selected
- **AND** user changes the blur value via properties panel
- **THEN** the drawing content reflects the new blur value immediately
- **AND** the selection markers (highlight box and handles) remain sharp and unchanged

#### Scenario: Multiple selected drawings with varying blur levels

- **WHEN** multiple drawing objects with different blur values are selected simultaneously
- **THEN** all selection markers (highlight boxes and handles) appear sharp and clear
- **AND** no selection markers are blurred regardless of individual drawing blur values
