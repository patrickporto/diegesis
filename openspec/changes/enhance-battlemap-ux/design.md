## Context
The Battlemap Editor is a canvas-based map editing tool with tokens, fog of war, walls, and drawing capabilities. Users expect modern, touch-friendly UX with flexible workspace layouts.

## Goals
- Provide professional-grade drawing tools with full property control
- Create a flexible, resizable panel system using `react-resizable-panels`
- Enable fog room management for streamlined dungeon mastering
- Deliver touch-friendly interactions for tablets and phones
- Create reusable UI components (ColorPicker, ContextMenu, Panels)

## Non-Goals
- Complete redesign of the rendering engine
- Multi-user collaborative editing features (beyond existing sync)
- 3D or WebGL advanced effects

## Decisions

### Panel System Architecture
- **Decision**: Use `react-resizable-panels` library
- **Why**: Mature library, good mobile support, handles complex layouts
- **Pattern**: Wrap panels in `<PanelGroup>` with `<Panel>` + `<PanelResizeHandle>`

### Color Picker Design
- **Decision**: Custom component with preset palette + HEX input + recent colors
- **Why**: Native color inputs are inconsistent across browsers/devices
- **Pattern**: Portal-based popup with click-outside detection

### WYSIWYG Text
- **Decision**: Replace TextInputOverlay with inline contentEditable div on canvas
- **Why**: Better UX, see exactly what you get
- **Trade-off**: More complex positioning, but better experience

### Fog Room Detection
- **Decision**: Use wall segments as boundaries, flood-fill algorithm
- **Why**: Walls already define room boundaries
- **Pattern**: On fill, detect enclosed area, prompt user to name room

### Mobile Context Menu
- **Decision**: Long-press triggers action sheet / bottom drawer on mobile
- **Why**: Right-click doesn't exist on touch; long-press is standard
- **Pattern**: Detect touch vs mouse, show appropriate UI

## Component Hierarchy

```
BattlemapEditor
├── PanelLayout (react-resizable-panels)
│   ├── LeftPanelGroup
│   │   ├── TokenManagerSidebar
│   │   └── RoomListPanel
│   ├── Canvas (center)
│   └── RightPanelGroup
│       ├── PropertyEditor / DrawingPropertiesPanel
│       ├── FogPropertiesPanel
│       └── BattlemapSettingsPanel
├── BattlemapToolbar
├── ContextMenu (portal)
└── ColorPicker (portal)
```

## Data Model Extensions

```typescript
// DrawingBrush extension
interface DrawingBrush {
  blur?: number;    // 0-20px
  opacity?: number; // 0-1
}

// New Room type
interface FogRoom {
  id: string;
  name: string;
  bounds: number[]; // polygon points
  isRevealed: boolean;
}

// BattlemapSettings extension
interface BattlemapSettings {
  gridOffsetX?: number;
  gridOffsetY?: number;
}
```

## Risks / Trade-offs
- **Performance**: Many resizable panels may impact render performance → Mitigate with lazy loading
- **Mobile complexity**: Touch gestures conflict with canvas interactions → Careful event handling
- **Learning curve**: New panel system changes existing workflow → Keep defaults similar

## Migration Plan
1. Install `react-resizable-panels`
2. Create panel wrapper components
3. Gradually migrate existing sidebars
4. Add new capabilities incrementally
5. Backward compatible data (new fields optional)

## Open Questions
- Should panel positions persist in localStorage or user settings?
- Should rooms support custom colors for fog visualization?
