export type GridType =
  | "none"
  | "square"
  | "hex-vertical"
  | "hex-horizontal"
  | "isometric";

export type GridColor = "black" | "white" | "orange";

// type LayerId = "map" | "tokens" | "dm";  <-- DEPRECATED

export interface Layer {
  id: string;
  name: string;
  type: "tokens" | "map" | "fog" | "obstacles" | "grid" | "wall" | "token";
  visible: boolean;
  locked: boolean;
  opacity: number;
  sortOrder: number;
}

export interface BattlemapSettings {
  gridType: GridType;
  gridLineWidth: number; // pixels: 1-5
  gridColor: GridColor;
  gridOpacity: number; // 0-1
  gridCellSize: number; // pixels per cell
  snapToGrid: boolean;
  fogOpacity: number; // 0-1, opacity of fog of war overlay
  backgroundImage?: string; // base64 or url
  mapWidth?: number; // Map width in pixels
  mapHeight?: number; // Map height in pixels
  layers?: Layer[]; // Array of dynamic layers. If undefined (legacy), we migrate.
  activeLayerId?: string; // ID of the currently active layer
  viewportX?: number; // Viewport position
  viewportY?: number;
  viewportScale?: number; // Viewport zoom level
  gridOffsetX?: number; // Grid X offset for alignment
  gridOffsetY?: number; // Grid Y offset for alignment
}

export interface Token {
  id: string;
  x: number;
  y: number;
  imageUrl: string;
  label?: string;
  size: number; // grid cells diameter
  layer: string;
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  layer: string;
}

export type DrawingType = "brush" | "text" | "rect" | "ellipse" | "polygon";

export interface DrawingBase {
  id: string;
  type: DrawingType;
  layer: string;
  x: number; // For shapes/text: start/top-left. For brush: 0 (points are absolute) or offset.
  y: number;
  rotation?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  fillAlpha?: number;
}

export interface DrawingBrush extends DrawingBase {
  type: "brush";
  points: number[]; // Absolute points
  blur?: number; // 0-20px blur effect
  opacity?: number; // 0-1 opacity
}

export interface DrawingText extends DrawingBase {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  width?: number; // max width
  blur?: number; // 0-20px blur effect
  opacity?: number; // 0-1 opacity
}

export interface DrawingShapeGeometry extends DrawingBase {
  type: "rect" | "ellipse";
  width: number;
  height: number;
  blur?: number; // 0-20px blur effect
  opacity?: number; // 0-1 opacity
}

export interface DrawingPolygon extends DrawingBase {
  type: "polygon";
  points: number[]; // Relative to x,y or Absolute? Let's use Absolute for consistency with Brush for now
  blur?: number; // 0-20px blur effect
  opacity?: number; // 0-1 opacity
}

export type DrawingShape =
  | DrawingBrush
  | DrawingText
  | DrawingShapeGeometry
  | DrawingPolygon;

// Alias for backward compatibility if needed, or we just update usages
export type DrawingPath = DrawingShape; // Temporary alias to avoid breaking everything immediately

export type ToolType =
  | "select"
  | "pan"
  | "token"
  | "text"
  | "draw"
  | "fog"
  | "wall";

// Wall Tool Types
export type WallToolType =
  | "polygon" // Draw connected segments with clicks (and drag for bezier)
  | "rect" // Draw rectangle walls
  | "ellipse" // Draw ellipse walls (approximated with segments)
  | "door"; // Place doors on existing walls

export type WallCurveType = "linear" | "quadratic" | "cubic";

// Wall segment represents a single line between two points
export interface WallSegment {
  id: string;
  // Start and end points
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Bezier control points (optional, for curved walls)
  cp1x?: number;
  cp1y?: number;
  cp2x?: number; // Only for cubic bezier
  cp2y?: number;
  curveType: WallCurveType;
  // Properties
  isDoor: boolean;
  allowsMovement: boolean; // default: true
  allowsVision: boolean; // default: false
  allowsSound: boolean; // default: false
}

export interface Wall {
  id: string;
  segments: WallSegment[];
  layer: string;
}

export type FogToolMode = "reveal" | "hide";
export type FogToolType =
  | "brush"
  | "rect"
  | "ellipse"
  | "polygon"
  | "grid"
  | "fill";

export interface FogShape {
  id: string;
  type: "brush" | "poly" | "rect" | "ellipse";
  data: number[]; // Points [x,y...] for brush/poly, [x,y,w,h] for rect/ellipse
  operation: "add" | "sub"; // 'add' = Hide (Draw Fog), 'sub' = Reveal (Cut Hole)
  opacity?: number;
  width?: number; // Brush stroke width
}

export interface FogRoom {
  id: string;
  name: string;
  color: string;
  shapeIds: string[];
  bounds: number[]; // Polygon points defining room boundary
  visible: boolean;
  isRevealed: boolean;
}

export const DEFAULT_SETTINGS: BattlemapSettings = {
  gridType: "square",
  gridLineWidth: 1,
  gridColor: "black",
  gridOpacity: 0.3,
  gridCellSize: 50,
  snapToGrid: true,
  fogOpacity: 0.85,
};

export const GRID_COLORS: Record<GridColor, number> = {
  black: 0x000000,
  white: 0xffffff,
  orange: 0xff6600,
};

export interface ContextMenuAction {
  id: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
  children?: ContextMenuAction[];
}
