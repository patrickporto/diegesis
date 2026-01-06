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
  type: "tokens" | "drawings" | "dm"; // Keep 'dm' special? Or just a type?
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
  backgroundImage?: string; // base64 or url
  layers?: Layer[]; // Array of dynamic layers. If undefined (legacy), we migrate.
  activeLayerId?: string; // ID of the currently active layer
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

export type ToolType = "select" | "token" | "text" | "draw" | "eraser";

export const DEFAULT_SETTINGS: BattlemapSettings = {
  gridType: "square",
  gridLineWidth: 1,
  gridColor: "black",
  gridOpacity: 0.3,
  gridCellSize: 50,
  snapToGrid: true,
};

export const GRID_COLORS: Record<GridColor, number> = {
  black: 0x000000,
  white: 0xffffff,
  orange: 0xff6600,
};
