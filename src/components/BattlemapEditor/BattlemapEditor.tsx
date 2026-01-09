import { Graphics } from "pixi.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import { useSync } from "../../contexts/SyncContext";
import { useBattlemapStore } from "../../stores/useBattlemapStore";
// Assuming this might be used or TokenManagerSidebar covers it
import { BattlemapSettingsPanel } from "./BattlemapSettingsPanel";
import { BattlemapToolbar } from "./BattlemapToolbar";
import { ContextMenu } from "./ContextMenu"; // Correct path check needed
import { useBackgroundRenderer } from "./hooks/useBackgroundRenderer";
import { useBattlemapData } from "./hooks/useBattlemapData";
import { useBattlemapInteractions } from "./hooks/useBattlemapInteractions";
import { useBattlemapLayers } from "./hooks/useBattlemapLayers";
import { useDrawingRenderer } from "./hooks/useDrawingRenderer";
import { useFogRenderer } from "./hooks/useFogRenderer";
import { useGridRenderer } from "./hooks/useGridRenderer";
// Hooks
import { usePixiApp } from "./hooks/usePixiApp";
import { useTokenRenderer } from "./hooks/useTokenRenderer";
import { useWallInteractions } from "./hooks/useWallInteractions";
import { useWallRenderer } from "./hooks/useWallRenderer";
import { TokenManagerSidebar } from "./TokenManagerSidebar";
import { BattlemapSettings, ContextMenuAction, Layer, Token } from "./types";

interface BattlemapEditorProps {
  fileId: string;
  doc: Y.Doc;
}

export function BattlemapEditor({ fileId, doc }: BattlemapEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

  const [isTokensOpen, setIsTokensOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Store
  const {
    activeTool,
    setActiveTool,
    fogMode,
    setFogMode,
    fogTool,
    setFogTool,
    brushSize,
    setBrushSize,
    wallTool,
    setWallTool,
  } = useBattlemapStore();

  const {
    isSignedIn,
    uploadFile,
    getFileBlob,
    isInitialized: synced,
  } = useSync();

  // 1. Pixi App
  const { app, viewport, isReady } = usePixiApp({ containerRef, fileId });

  // 2. Data
  const {
    settings,
    updateSettings,
    tokens,
    tokensArray,
    drawings,
    drawingsArray,
    textsArray,
    fogShapes,
    fogArray,
    walls,
    wallsArray,
  } = useBattlemapData({ doc, fileId });

  // Restore Default Layers Logic
  useEffect(() => {
    // Only init if loaded.
    if (!synced) return;

    // Default layers definition
    const defineDefaults = (): Layer[] => [
      {
        id: "background",
        name: "Background",
        type: "map",
        visible: true,
        locked: true,
        opacity: 1,
        sortOrder: 0,
      },
      {
        id: "obstacles",
        name: "Walls & Obstacles",
        type: "obstacles",
        visible: true,
        locked: false,
        opacity: 1,
        sortOrder: 25, // Above tokens (2), below fog (50)
      },
      {
        id: "fog",
        name: "Fog of War",
        type: "fog",
        visible: true,
        locked: true,
        opacity: 1,
        sortOrder: 50,
      },
      {
        id: "tokens",
        name: "Tokens",
        type: "tokens",
        visible: true,
        locked: false,
        opacity: 1,
        sortOrder: 2,
      },
      {
        id: "grid",
        name: "Grid",
        type: "map",
        visible: true,
        locked: true,
        opacity: 1,
        sortOrder: 1,
      },
    ];

    // Full Init if empty
    if (!settings.layers || settings.layers.length === 0) {
      updateSettings({ layers: defineDefaults(), activeLayerId: "tokens" });
    } else {
      // Migration & Enforcement: Ensure all restricted layers exist and have correct props
      const currentLayers = [...settings.layers];
      let hasChanges = false;
      const defaults = defineDefaults();

      // check for missing layers
      defaults.forEach((defLayer) => {
        const existingIndex = currentLayers.findIndex(
          (l) => l.id === defLayer.id
        );

        if (existingIndex === -1) {
          // Missing: Add it
          currentLayers.push(defLayer);
          hasChanges = true;
        } else {
          // Exists: Enforce locked status and sortOrder for restricted layers
          const existing = currentLayers[existingIndex];
          const isRestricted =
            defLayer.id === "background" ||
            defLayer.id === "grid" ||
            defLayer.id === "fog";

          if (isRestricted) {
            if (
              existing.sortOrder !== defLayer.sortOrder ||
              existing.locked !== defLayer.locked
            ) {
              currentLayers[existingIndex] = {
                ...existing,
                sortOrder: defLayer.sortOrder,
                locked: defLayer.locked,
              };
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        updateSettings({ layers: currentLayers });
      }
    }
  }, [synced, settings.layers, updateSettings]);

  // 3. Layers
  const { layerContainersRef } = useBattlemapLayers({
    viewport,
    layers: settings.layers,
    isReady,
  });

  // 4. Interactions
  const previewGraphicsRef = useRef<Graphics | null>(null);
  useEffect(() => {
    if (viewport && !previewGraphicsRef.current) {
      const g = new Graphics();
      g.label = "preview";
      g.zIndex = 9999;
      viewport.addChild(g);
      previewGraphicsRef.current = g;
    }
  }, [viewport]);

  useBattlemapInteractions({
    app,
    viewport,
    doc,
    fogArray,
    textsArray,
    drawingsArray,
    settings,
    previewGraphicsRef,
  });

  // ...

  // 5. Renderers
  useTokenRenderer({
    tokens,
    settings,
    layerContainersRef,
    doc,
    tokensArray,
    isSignedIn,
    getFileBlob,
    viewport,
    app,
    setContextMenu,
  });

  useBackgroundRenderer({
    settings,
    layerContainersRef,
    app,
    getFileBlob,
    isReady,
    updateSettings,
  });

  useFogRenderer({ fogShapes, layerContainersRef, app, isReady, settings });
  useDrawingRenderer({ drawings, layerContainersRef, isReady });
  useGridRenderer({ settings, layerContainersRef, app, isReady });

  // Wall interactions and rendering
  useWallInteractions({
    app,
    viewport,
    doc,
    wallsArray,
    settings,
    previewGraphicsRef,
    setContextMenu,
  });

  useWallRenderer({
    walls,
    layerContainersRef,
    isReady,
    layersCheck: settings.layers?.length || 0,
  });

  // UI Handlers
  const handleSettingsChange = useCallback(
    (updates: Partial<BattlemapSettings>) => {
      updateSettings(updates);
    },
    [updateSettings]
  );

  const handleBackgroundUpload = useCallback(
    async (file: File) => {
      if (isSignedIn) {
        try {
          const { id } = await uploadFile(file);
          handleSettingsChange({ backgroundImage: `drive://${id}` });
        } catch (error) {
          console.error("Failed to upload to Drive:", error);
          alert("Failed to upload image to Google Drive.");
        }
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          handleSettingsChange({ backgroundImage: base64 });
        };
        reader.readAsDataURL(file);
      }
    },
    [handleSettingsChange, isSignedIn, uploadFile]
  );

  const handleBackgroundClear = useCallback(() => {
    handleSettingsChange({ backgroundImage: undefined });
  }, [handleSettingsChange]);

  const handleSetActiveLayer = useCallback(
    (id: string) => {
      handleSettingsChange({ activeLayerId: id });
    },
    [handleSettingsChange]
  );

  // NOTE: Drag & Drop Logic for Tokens (Dropping from Sidebar to Canvas)
  // This was in the original onDrop. Since useBattlemapInteractions handles canvas events,
  // we might need to handle the specific "DROP" event on the DIV wrapper here or in the hook.
  // The hook attaches to app.canvas.
  // The original code attached onDrop to the wrapper DIV.
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const tokenData = e.dataTransfer.getData("application/json");
      if (!tokenData || !viewport) return;

      try {
        const tokenItem = JSON.parse(tokenData);
        const canvas = app?.canvas;
        if (!canvas) return;
        const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
        const globalX = e.clientX - rect.left;
        const globalY = e.clientY - rect.top;

        const point = viewport.toLocal({ x: globalX, y: globalY });
        let posX = point.x;
        let posY = point.y;

        // We don't have direct access to GridRenderer.snapToGrid helper here unless imported
        // But we can reproduce or import it.
        // Assuming loose for now or implemented nearby.
        /*
        if (settings.snapToGrid) { ... }
        */
        // Basic implementation for now:
        if (settings.snapToGrid) {
          const size = settings.gridCellSize;
          posX = Math.round(posX / size) * size + size / 2; // Center?
          posY = Math.round(posY / size) * size + size / 2;
        }

        doc.transact(() => {
          tokensArray.push([
            {
              id: crypto.randomUUID(), // or uuidv7
              x: posX,
              y: posY,
              imageUrl: tokenItem.imageUrl,
              label: tokenItem.label,
              size: 1,
              layer: settings.activeLayerId || "tokens",
            } as Token,
          ]);
        });
      } catch (err) {
        console.error("Failed to drop token:", err);
      }
    },
    [doc, tokensArray, settings, viewport, app]
  );

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: "none" }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Loading Overlay */}
      {(!isReady || !synced) && (
        <div className="absolute inset-0 z-[60] bg-slate-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium animate-pulse">
              Loading Battlemap...
            </p>
          </div>
        </div>
      )}

      {/* Scroll Indicators (Simplified for brevity, or full implementation) */}

      <TokenManagerSidebar
        doc={doc}
        isOpen={isTokensOpen}
        onClose={() => setIsTokensOpen(false)}
        layers={settings.layers || []}
        activeLayerId={settings.activeLayerId || ""}
        onUpdateLayers={(layers) => updateSettings({ layers })}
        onSetActiveLayer={handleSetActiveLayer}
      />

      <BattlemapToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onTokensClick={() => setIsTokensOpen((prev) => !prev)}
        fogMode={fogMode}
        onFogModeChange={setFogMode}
        fogTool={fogTool}
        onFogToolChange={setFogTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        wallTool={wallTool}
        onWallToolChange={setWallTool}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenu.actions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {isSettingsOpen && (
        <BattlemapSettingsPanel
          isOpen={isSettingsOpen}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setIsSettingsOpen(false)}
          onBackgroundUpload={handleBackgroundUpload}
          onBackgroundClear={handleBackgroundClear}
        />
      )}
    </div>
  );
}
