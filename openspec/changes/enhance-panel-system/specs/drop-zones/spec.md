# Drop Zones

## ADDED Requirements

### Always Active Drop Targets
The layout system must provide valid drop targets for all supported panel locations (TL, TR, BL, BR) regardless of whether those locations currently contain content.

#### Scenario: Dropping into an empty corner
Given the Battlemap Editor is open
And the "Top Right" corner is empty
When I drag the "Token Manager" panel from "Top Left"
And I release it over the "Top Right" quadrant
Then the "Token Manager" panel moves to "Top Right"
And the "Top Left" becomes empty

#### Scenario: Dropping into an empty column
Given the Battlemap Editor is open
And the entire "Right Column" is empty (TR and BR empty)
When I drag a panel to the right side of the screen
Then I should see visual indicators for "Top Right" and "Bottom Right" drop zones
And releasing the mouse places the panel in the selected zone
