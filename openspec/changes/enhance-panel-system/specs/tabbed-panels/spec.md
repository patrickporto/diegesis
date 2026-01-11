# Tabbed Panels

## ADDED Requirements

### Multi-Panel Locations
A single panel location (e.g., "Top Left") must be able to contain multiple panels simultaneously.

#### Scenario: Stacking panels
Given the "Token Library" is in "Top Left"
When I drag the "Layer Manager" panel into "Top Left"
Then both "Token Library" and "Layer Manager" are associated with "Top Left"
And a Tab Bar appears above the panel content showing both titles

### Tab Switching
Users must be able to switch between stacked panels.

#### Scenario: Switching tabs
Given "Token Library" and "Layer Manager" are stacked in "Top Left"
And "Token Library" is currently visible
When I click the "Layers" tab
Then the "Layer Manager" content becomes visible
And the "Token Library" content is hidden

### Tab Dragging
(Optional for first pass, but good to specify)
Users can drag a tab to move just that panel.

#### Scenario: Dragging a tab out
Given "Token Library" and "Layer Manager" are stacked in "Top Left"
When I drag the "Layers" tab to "Top Right"
Then "Layers" panel moves to "Top Right"
And "Tokens" panel remains in "Top Left"
