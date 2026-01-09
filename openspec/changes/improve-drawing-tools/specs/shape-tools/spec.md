# Shape Tools Improvements

## ADDED Requirements

#### Scenario: User draws a rectangle
- **Given** the user selects the "Rectangle" sub-tool from the Drawing menu
- **When** the user presses down at (50, 50) and drags to (150, 150)
- **Then** a preview of the rectangle is shown
- **When** the user releases the mouse
- **Then** a `DrawingShape` of type `rect` is created with x=50, y=50, w=100, h=100
- **And** the rectangle is rendered with the current stroke/fill settings

#### Scenario: User draws an ellipse
- **Given** the user selects the "Ellipse" sub-tool
- **When** the user presses down at center (200, 200) and drags outward
- **Then** an ellipse preview is shown expanding from the center (or corner, standardizing on Fog tool behavior)
- **When** the user releases
- **Then** a `DrawingShape` of type `ellipse` is created

#### Scenario: User draws a polygon
- **Given** the user selects the "Polygon" sub-tool
- **When** the user clicks at (10,10), then (50,10), then (30, 40)
- **Then** a line path connects the points
- **When** the user double-clicks OR clicks back near the start point
- **Then** the path is closed
- **And** a `DrawingShape` of type `polygon` is created

#### Scenario: Shape Configuration
- **Given** a shape tool is active
- **When** the user adjusts settings in the toolbar
- **Then** they can configure:
    - Stroke Color
    - Stroke Width
    - Fill Color
    - Fill Opacity (0-100%)
