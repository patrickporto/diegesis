import * as Y from "yjs";
import { create } from "zustand";

import {
  BattlemapSettings,
  DEFAULT_SETTINGS,
  DrawingPath,
  FogShape,
  FogToolMode,
  FogToolType,
  TextAnnotation,
  Token,
  ToolType,
} from "@/components/BattlemapEditor/types";

interface BattlemapState {
  // Tool State (local, not synced to Yjs)
  activeTool: ToolType;
  fogMode: FogToolMode;
  fogTool: FogToolType;
  brushSize: number;
  isDrawing: boolean;

  // Current drawing path (transient, not synced)
  currentPath: number[];

  // Synced State (derived from Yjs observers)
  fogShapes: FogShape[];
  tokens: Token[];
  drawings: DrawingPath[];
  texts: TextAnnotation[];
  settings: BattlemapSettings;

  // Actions - Tool State
  setActiveTool: (tool: ToolType) => void;
  setFogMode: (mode: FogToolMode) => void;
  setFogTool: (tool: FogToolType) => void;
  setBrushSize: (size: number) => void;
  setIsDrawing: (drawing: boolean) => void;
  setCurrentPath: (path: number[]) => void;
  appendToCurrentPath: (x: number, y: number) => void;
  clearCurrentPath: () => void;

  // Actions - Yjs Sync (called by observers)
  syncFogShapes: (shapes: FogShape[]) => void;
  syncTokens: (tokens: Token[]) => void;
  syncDrawings: (drawings: DrawingPath[]) => void;
  syncTexts: (texts: TextAnnotation[]) => void;
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
  fogMode: "hide",
  fogTool: "brush",
  brushSize: 50,
  isDrawing: false,
  currentPath: [],

  // Initial State - Synced
  fogShapes: [],
  tokens: [],
  drawings: [],
  texts: [],
  settings: DEFAULT_SETTINGS,

  // Tool Actions
  setActiveTool: (tool) => set({ activeTool: tool }),
  setFogMode: (mode) => set({ fogMode: mode }),
  setFogTool: (tool) => set({ fogTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setCurrentPath: (path) => set({ currentPath: path }),
  appendToCurrentPath: (x, y) =>
    set((state) => ({ currentPath: [...state.currentPath, x, y] })),
  clearCurrentPath: () => set({ currentPath: [] }),

  // Sync Actions (called by Yjs observers in component)
  syncFogShapes: (shapes) => set({ fogShapes: shapes }),
  syncTokens: (tokens) => set({ tokens: tokens }),
  syncDrawings: (drawings) => set({ drawings: drawings }),
  syncTexts: (texts) => set({ texts: texts }),
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
export const useBrushSize = () => useBattlemapStore((s) => s.brushSize);
export const useIsDrawing = () => useBattlemapStore((s) => s.isDrawing);
export const useFogShapes = () => useBattlemapStore((s) => s.fogShapes);
export const useTokens = () => useBattlemapStore((s) => s.tokens);
export const useSettings = () => useBattlemapStore((s) => s.settings);
