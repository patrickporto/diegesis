# Design: Improved Drawing System

## Core Concepts

### 1. Unified Drawing Model
We will transition from `DrawingPath` (points array) to a discriminated union `DrawingShape`.

```typescript
export type DrawingType = 'brush' | 'text' | 'rect' | 'ellipse' | 'polygon';

export interface DrawingCheck props {
  id: string;
  type: DrawingType;
  layer: string;
  x: number;
  y: number;
  rotation?: number;
  // Visual properties
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string; // For shapes
  fillAlpha?: number;
}

export interface DrawingBrush extends DrawingBase {
  type: 'brush';
  points: number[]; // Flat array [x,y,x,y...] relative to x,y or absolute?
  // Current brush is absolute. We might want to keep it absolute for simplicity or make x,y the bounding box top-left.
  // For simplicity relative to global, x,y might be 0,0 or the center.
  // Let's stick to existing pattern: points are absolute, x/y are optional offsets or 0.
}

export interface DrawingText extends DrawingBase {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string; // e.g. "Arial", "Courier New", "fantasy"
  width?: number; // wrap width
}

export interface DrawingShapeGeometry extends DrawingBase {
  type: 'rect' | 'ellipse';
  width: number;
  height: number;
}

export interface DrawingPolygon extends DrawingBase {
  type: 'polygon';
  points: number[];
}

export type DrawingShape = DrawingBrush | DrawingText | DrawingShapeGeometry | DrawingPolygon;
```

### 2. Rendering Architecture (`useDrawingRenderer`)
- Refactor `useDrawingRenderer` to handle the new `DrawingShape` union.
- Create sub-renderers or helper functions for each shape type (similar to `drawFogShape` in `useFogRenderer`).
- **Text Rendering**: Use `PIXI.Text` or `PIXI.HTMLText` for rendering.
- **Editability**:
    - When a specific "Select/Edit" tool is active (or maybe a mode within Drawing), render handles or a selection box around the active shape.
    - For text, double-click triggers an HTML overlay input (textarea) positioned over the canvas for editing, which updates the PIXI text on blur/enter.

### 3. Interaction Model (`useBattlemapInteractions`)
- **Drawing Mode**:
    - **Brush**: Existing logic.
    - **Shapes**: Drag-to-create (Rect, Ellipse) or Click-to-add-points (Polygon). Re-use `currentPath` logic but finalize differently.
    - **Text**: Click to place cursor -> Show HTML Input overlay -> User types -> Click away/Enter to finalize -> Create `DrawingText` object.
- **Editing Mode**:
    - Click to select a drawing.
    - Drag to move.
    - Handles to resize (optional for MVP, maybe just move/properties first).
    - Context menu or Toolbar to change Color/Font/Size of selected item.

### 4. UI/UX
- **Toolbar**:
    - "Draw" tool becomes a container like "Fog" or "Walls".
    - Sub-tools: Brush, Text, Rect, Circle, Polygon.
    - Settings Bar (Contextual):
        - When Text active: Font selection, Size slider, Color picker.
        - When Shape active: Stroke color, Fill color/opacity, Stroke width.
- **In-Canvas Text Editor**:
    - A transparent-bg `textarea` absolutely positioned on top of the canvas matching grid coordinates.
    - Supports `Shift+Enter` for new lines.
    - `Enter` (without Shift) could finish editing, or maybe user has to click "Done" or click away.
