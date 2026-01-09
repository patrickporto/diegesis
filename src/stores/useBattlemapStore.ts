import * as Y from "yjs";
import { create } from "zustand";

import {
  BattlemapSettings,
  DEFAULT_SETTINGS,
  DrawingPath,
  DrawingType,
  FogShape,
  FogToolMode,
  FogToolType,
  TextAnnotation,
  Token,
  ToolType,
  Wall,
  WallToolType,
} from "../components/BattlemapEditor/types";

interface BattlemapState {
  // Tool State (local, not synced to Yjs)
  activeTool: ToolType;
  previousTool: ToolType | null; // For temporary tool changes (Space, Middle Click)
  fogMode: FogToolMode;
  fogTool: FogToolType;
  drawTool: DrawingType;
  editingItemId: string | null;
  selectedDrawingIds: string[];
  wallTool: WallToolType;
  brushSize: number;
  isDrawing: boolean;
  selectedWallId: string | null;
  selectedSegmentIds: string[];
  selectedTokenIds: string[];
  isDraggingToken: boolean;
  isDraggingDrawing: boolean;

  // Current drawing path (transient, not synced)
  currentPath: number[];

  // Synced State (derived from Yjs observers)
  fogShapes: FogShape[];
  tokens: Token[];
  drawings: DrawingPath[];
  texts: TextAnnotation[];
  walls: Wall[];
  settings: BattlemapSettings;

  // Actions - Tool State
  setActiveTool: (tool: ToolType) => void;
  enableTemporaryPan: () => void; // Temporarily switch to pan (Space, Middle Click)
  disableTemporaryPan: () => void; // Restore previous tool
  setFogMode: (mode: FogToolMode) => void;
  setFogTool: (tool: FogToolType) => void;
  setDrawTool: (tool: DrawingType) => void;
  setEditingItemId: (id: string | null) => void; // New: Action to set editingItemId
  setSelectedDrawingIds: (ids: string[]) => void;
  setIsDraggingDrawing: (dragging: boolean) => void;
  setWallTool: (tool: WallToolType) => void;
  setBrushSize: (size: number) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCurrentPath: (path: number[]) => void;
  appendToCurrentPath: (x: number, y: number) => void;
  clearCurrentPath: () => void;
  setSelectedWall: (id: string | null) => void;
  setSelectedSegments: (ids: string[]) => void;
  setSelectedTokens: (ids: string[]) => void;
  setIsDraggingToken: (dragging: boolean) => void;

  // Actions - Yjs Sync (called by observers)
  syncFogShapes: (shapes: FogShape[]) => void;
  syncTokens: (tokens: Token[]) => void;
  syncDrawings: (drawings: DrawingPath[]) => void;
  syncTexts: (texts: TextAnnotation[]) => void;
  syncWalls: (walls: Wall[]) => void;
  syncSettings: (settings: BattlemapSettings) => void;

  // Fog Actions (with Yjs transaction)
  addFogShape: (
    shape: FogShape,
    fogArray: Y.Array<FogShape>,
    doc: Y.Doc
  ) => void;
}

export const useBattlemapStore = create<BattlemapState>((set) => ({
  // Initial State - Tools
  activeTool: "select",
  previousTool: null,
  fogMode: "hide",
  fogTool: "brush",
  drawTool: "brush",
  editingItemId: null,
  selectedDrawingIds: [], // New
  wallTool: "polygon",
  brushSize: 50,
  isDrawing: false,
  selectedWallId: null,
  selectedSegmentIds: [],
  selectedTokenIds: [],
  isDraggingToken: false,
  isDraggingDrawing: false, // New
  currentPath: [],

  // Initial State - Synced
  fogShapes: [],
  tokens: [],
  drawings: [],
  texts: [],
  walls: [],
  settings: DEFAULT_SETTINGS,

  // Tool Actions
  setActiveTool: (tool) => set({ activeTool: tool, previousTool: null }),
  enableTemporaryPan: () =>
    set((state) => ({
      previousTool:
        state.activeTool !== "pan" ? state.activeTool : state.previousTool,
      activeTool: "pan",
    })),
  disableTemporaryPan: () =>
    set((state) => ({
      activeTool: state.previousTool || state.activeTool,
      previousTool: null,
    })),
  setFogMode: (mode) => set({ fogMode: mode }),
  setFogTool: (tool) => set({ fogTool: tool }),
  setDrawTool: (tool) => set({ drawTool: tool }),
  setEditingItemId: (id) => set({ editingItemId: id }),
  setSelectedDrawingIds: (ids) => set({ selectedDrawingIds: ids }),
  setWallTool: (tool) => set({ wallTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setIsDraggingDrawing: (dragging: boolean) =>
    set({ isDraggingDrawing: dragging }),
  setCurrentPath: (path) => set({ currentPath: path }),
  appendToCurrentPath: (x, y) =>
    set((state) => ({ currentPath: [...state.currentPath, x, y] })),
  clearCurrentPath: () => set({ currentPath: [] }),
  setSelectedWall: (id) => set({ selectedWallId: id }),
  setSelectedSegments: (ids) => set({ selectedSegmentIds: ids }),
  setSelectedTokens: (ids) => set({ selectedTokenIds: ids }),
  setIsDraggingToken: (dragging) => set({ isDraggingToken: dragging }),

  // Sync Actions (called by Yjs observers in component)
  syncFogShapes: (shapes) => set({ fogShapes: shapes }),
  syncTokens: (tokens) => set({ tokens: tokens }),
  syncDrawings: (drawings) => set({ drawings: drawings }),
  syncTexts: (texts) => set({ texts: texts }),
  syncWalls: (walls) => set({ walls: walls }),
  syncSettings: (settings) => set({ settings: settings }),

  // Fog Shape Creation
  addFogShape: (shape, fogArray, doc) => {
    doc.transact(() => {
      fogArray.push([shape]);
    });
    // State will update via Yjs observer -> syncFogShapes
  },
}));

// Selector hooks for performance optimization
export const useActiveTool = () => useBattlemapStore((s) => s.activeTool);
export const useFogMode = () => useBattlemapStore((s) => s.fogMode);
export const useFogTool = () => useBattlemapStore((s) => s.fogTool);
export const useDrawTool = () => useBattlemapStore((s) => s.drawTool);
export const useWallTool = () => useBattlemapStore((s) => s.wallTool);
export const useBrushSize = () => useBattlemapStore((s) => s.brushSize);
export const useIsDrawing = () => useBattlemapStore((s) => s.isDrawing);
export const useFogShapes = () => useBattlemapStore((s) => s.fogShapes);
export const useTokens = () => useBattlemapStore((s) => s.tokens);
export const useWalls = () => useBattlemapStore((s) => s.walls);
export const useSettings = () => useBattlemapStore((s) => s.settings);
export const useSelectedWallId = () =>
  useBattlemapStore((s) => s.selectedWallId);
export const useSelectedSegmentIds = () =>
  useBattlemapStore((s) => s.selectedSegmentIds);
export const useSelectedTokenIds = () =>
  useBattlemapStore((s) => s.selectedTokenIds);
export const useIsDraggingToken = () =>
  useBattlemapStore((s) => s.isDraggingToken);
export const useSelectedDrawingIds = () =>
  useBattlemapStore((s) => s.selectedDrawingIds);
export const useIsDraggingDrawing = () =>
  useBattlemapStore((s) => s.isDraggingDrawing);
