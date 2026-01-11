# Change: Refine Battlemap UI Feedback

## Why
User feedback indicates usability friction with floating panels, unclear side dock icons, inaccessible closed panels, and missing tools in the toolbar. These changes aim to improve usability and align with user expectations.

## What Changes
- **Integrated Property Editor**: Move property editing for selected drawings from a floating panel to the docked "Properties" panel.
- **Side Dock Enhancements**: Display vertical text labels and ensure panels closed from Top/Bottom slots are accessible in the side docks.
- **Toolbar Refinement**: Move Fog sub-tools (Brush, Rect, etc.) back to the main toolbar.
- **Visual Fixes**: Fix Color Picker z-index issues.

## Impact
- **Affected Specs**: `properties-panel`, `side-dock`, `toolbar`
- **Affected Code**: `BattlemapEditor.tsx`, `SideDock.tsx`, `BattlemapToolbar.tsx`, `DrawingPropertiesPanel.tsx`, `PropertyEditor.tsx`
