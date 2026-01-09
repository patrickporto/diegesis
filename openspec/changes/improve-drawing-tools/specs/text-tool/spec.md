# Text Tool Improvements

## ADDED Requirements

#### Scenario: User adds text to the map
- **Given** the user selects the "Text" tool from the Drawing sub-menu
- **When** the user clicks on the battlemap at position (100, 100)
- **Then** a transparent text input area appears at (100, 100)
- **And** the input automatically focuses for typing
- **And** a "Text Settings" panel appears allows configuration of:
    - Font Family (e.g., Arial, Fantasy, Handwriting)
    - Font Size (slider 10px-200px)
    - Color (picker)

#### Scenario: User types multiline text
- **Given** the user is typing in the text input overlay
- **When** the user presses `Shift + Enter`
- **Then** a new line is inserted in the text input
- **And** the height of the input adjusts to fit the content

#### Scenario: User finalizes text entry
- **Given** the user has typed "Hidden Trap"
- **When** the user clicks outside the text input area OR presses `Enter` (without Shift)
- **Then** the temporary input is removed
- **And** a new `DrawingText` object is created on the active layer
- **And** the text "Hidden Trap" is rendered on the canvas using the selected style

## MODIFIED Requirements

#### Scenario: Toolbar organization
- **Given** the Battlemap Toolbar
- **When** the user views the tools
- **Then** the top-level "Text" tool button is removed
- **And** the "Draw" tool button reveals a sub-menu containing "Text" along with Brush/Shapes

## REMOVED Requirements
- The standalone "Add Text" button is removed from the main toolbar.
- The `window.prompt` dialog for adding text is removed.
