# Change: Enhance Battlemap UX

## Why
The Battlemap Editor has grown organically and needs a comprehensive UX overhaul:
- Drawing tools lack fill color control and pre-draw property configuration
- Brush tool lacks customization (blur, opacity, thickness)
- Text editing uses a modal overlay instead of inline WYSIWYG
- Panels (tokens, layers, settings) are fixed and not resizable/movable
- Fog of War lacks room detection and management
- Context menus are not touch-friendly
- No consistent color picker component across tools

## What Changes

### Drawing Tools Enhancements
- Add fill color selection alongside stroke color
- Add brush properties: thickness, color, blur, opacity before drawing
- Convert text tool to inline WYSIWYG editing
- Add property preview panel before creating shapes

### Resizable Panel System (react-resizable-panels)
- **NEW DEPENDENCY**: `react-resizable-panels`
- Make TokenManagerSidebar, SettingsPanel, PropertyEditor resizable
- Allow panels to be freely positioned (corners)
- Support panel grouping (tabbed panels)
- Mobile-responsive panel behavior

### Map Settings Improvements
- Add grid X/Y offset configuration
- Create collapsible settings sections
- Improved UX with logical groupings

### Fog of War Rooms
- Create FogPropertiesPanel with hide/reveal/brush controls
- Implement wall-bounded fill (default behavior)
- Add room detection when filling
- Create Room management list panel
- Room hide/reveal via list or context menu

### Reusable Color Picker
- Preset color palette
- Custom color addition
- Intuitive UX for all users

### Enhanced Context Menu
- Reusable component for all placeables
- Touch-friendly (long-press on mobile)
- Works on tablets and phones
- Create Placeable abstraction layer

## Impact
- **Affected code**:
  - `PropertyEditor.tsx` - Major refactor
  - `TokenManagerSidebar.tsx` - Panel system integration
  - `BattlemapSettingsPanel.tsx` - Sections + grid offset
  - `ContextMenu.tsx` - Complete rewrite
  - `useBattlemapInteractions.ts` - Text WYSIWYG
  - `useFogRenderer.ts` - Room detection
  - `types.ts` - Room, DrawingBrush extensions
- **New components**:
  - `ColorPicker.tsx`
  - `ResizablePanel.tsx`
  - `FogPropertiesPanel.tsx`
  - `RoomListPanel.tsx`
  - `DrawingPropertiesPanel.tsx`
- **Added specs**: drawing-tools, panel-system, fog-rooms, context-menu, color-picker
