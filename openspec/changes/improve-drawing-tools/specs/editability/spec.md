# Editability Improvements

## ADDED Requirements

#### Scenario: User selects a drawing
- **Given** multiple drawing elements on the canvas
- **And** the user is in "Select" mode (or "Draw" tool is not effectively creating new shapes, maybe a specific "Edit" sub-tool or re-using the main "Select" tool)
- **When** the user clicks on a Rectangle drawing
- **Then** the rectangle is highlighted (e.g., bounding box or selection outline)
- **And** the toolbar updates to show the properties of this rectangle (Color, Stroke, etc.)

#### Scenario: User moves a drawing
- **Given** a drawing is selected
- **When** the user drags the drawing
- **Then** the drawing moves follows the cursor
- **When** released, the new position is saved

#### Scenario: User edits text content
- **Given** a text drawing is on the canvas
- **When** the user double-clicks the text
- **Then** the in-canvas text input overlay appears with the current text
- **When** the user modifies the text and presses `Enter`
- **Then** the `DrawingText` object is updated

#### Scenario: User deletes a drawing
- **Given** a drawing is selected
- **When** the user presses `Delete` or `Backspace`
- **Then** the drawing is removed from the canvas and data
