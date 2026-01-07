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
  type: "tokens" | "map" | "fog";
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
  layers?: Layer[]; // Array of dynamic layers. If undefined (legacy), we migrate.
  activeLayerId?: string; // ID of the currently active layer
  viewportX?: number; // Viewport position
  viewportY?: number;
  viewportScale?: number; // Viewport zoom level
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

export interface DrawingPath {
  id: string;
  points: number[]; // [x1, y1, x2, y2, ...]
  color: string;
  width: number;
  layer: string;
}

export type ToolType = "select" | "token" | "text" | "draw" | "eraser" | "fog";

export type FogToolMode = "reveal" | "hide";
export type FogToolType = "brush" | "rect" | "ellipse" | "polygon" | "grid";

export interface FogShape {
  id: string;
  type: "brush" | "poly" | "rect" | "ellipse";
  data: number[]; // Points [x,y...] for brush/poly, [x,y,w,h] for rect/ellipse
  operation: "add" | "sub"; // 'add' = Hide (Draw Fog), 'sub' = Reveal (Cut Hole)
  opacity?: number;
  width?: number; // Brush stroke width
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
