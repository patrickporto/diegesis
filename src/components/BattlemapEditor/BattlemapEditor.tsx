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
import { useBattlemapHotkeys } from "./hooks/useBattlemapHotkeys";
import { useBattlemapInteractions } from "./hooks/useBattlemapInteractions";
import { useBattlemapLayers } from "./hooks/useBattlemapLayers";
import { useDrawingRenderer } from "./hooks/useDrawingRenderer";
import { useFogRenderer } from "./hooks/useFogRenderer";
import { useGridRenderer } from "./hooks/useGridRenderer";
// Hooks
import { usePixiApp } from "./hooks/usePixiApp";
import { useTokenRenderer } from "./hooks/useTokenRenderer";
import { useWallInteractions } from "./hooks/useWallInteractions";

interface LegacyText {
  id: string;
  x: number;
  y: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
}
import { DrawingPropertiesPanel } from "./DrawingPropertiesPanel";
import { FogPropertiesPanel } from "./FogPropertiesPanel";
import { GridRenderer } from "./GridRenderer";
import { useWallRenderer } from "./hooks/useWallRenderer";
import { HotkeysHelp } from "./HotkeysHelp";
import { LayerManagerPanel } from "./LayerManagerPanel";
import { PanelLayout, PanelLocation } from "./PanelLayout";
import { PropertyEditor } from "./PropertyEditor";
import { SideDock } from "./SideDock";
import { TabbedPanelHost } from "./TabbedPanelHost";
import { TextInputOverlay } from "./TextInputOverlay";
import { TokenManagerSidebar } from "./TokenManagerSidebar";
import { DrawingShape } from "./types";
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

  // Panel State Management - All panels now use SideDock action icons
  const [panelLocations, setPanelLocations] = useState<
    Record<PanelLocation, string[]>
  >({
    top: [],
    bottom: [],
    topLeft: [],
    bottomLeft: [],
    topRight: [],
    bottomRight: [],
  });

  // Clean up any SideDock panels that may have been accidentally added to panelLocations
  useEffect(() => {
    const sideDockPanelIds = ["tokens", "layers", "settings", "properties"];
    setPanelLocations((prev) => {
      const next = { ...prev };
      let hasChanges = false;
      for (const loc in next) {
        const originalLength = next[loc as PanelLocation].length;
        next[loc as PanelLocation] = next[loc as PanelLocation].filter(
          (id) => !sideDockPanelIds.includes(id)
        );
        if (next[loc as PanelLocation].length !== originalLength) {
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, []);

  const [activePanelTabs, setActivePanelTabs] = useState<
    Record<PanelLocation, string | null>
  >({
    top: null,
    bottom: null,
    topLeft: null,
    bottomLeft: null,
    topRight: null,
    bottomRight: null,
  });

  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    tokens: false,
    layers: false,
    settings: false,
    properties: false,
  });

  const getPanelTitle = (id: string) => {
    switch (id) {
      case "tokens":
        return "Tokens";
      case "layers":
        return "Layers";
      case "settings":
        return "Settings";
      case "properties":
        return "Properties";
      default:
        return id;
    }
  };

  const getPanelIcon = (id: string) => {
    switch (id) {
      case "tokens":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "layers":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        );
      case "settings":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case "properties":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  const handlePanelDrop = (panelId: string, location: PanelLocation) => {
    setPanelLocations((prev) => {
      const next = { ...prev };
      // Remove from old location
      for (const loc in next) {
        next[loc as PanelLocation] = next[loc as PanelLocation].filter(
          (id) => id !== panelId
        );
      }
      // Add to new location
      next[location] = [...next[location], panelId];
      return next;
    });

    // Make it the active tab in the new location
    setActivePanelTabs((prev) => ({
      ...prev,
      [location]: panelId,
    }));
  };

  const togglePanel = useCallback(
    (id: string, force?: boolean) => {
      const newState = force !== undefined ? force : !openPanels[id];
      setOpenPanels((prev) => ({
        ...prev,
        [id]: newState,
      }));

      if (newState) {
        // If opening, ensure it's the active tab in its location
        let foundLoc: PanelLocation | null = null;
        for (const [loc, ids] of Object.entries(panelLocations)) {
          if (ids.includes(id)) {
            foundLoc = loc as PanelLocation;
            break;
          }
        }

        if (foundLoc) {
          setActivePanelTabs((prev) => ({
            ...prev,
            [foundLoc]: id,
          }));
        }
      }
    },
    [openPanels, panelLocations]
  );

  // Store
  const {
    activeTool,
    setActiveTool,
    fogMode,
    setFogMode,
    fogTool,
    setFogTool,
    drawTool,
    setDrawTool,
    brushSize,
    setBrushSize,
    wallTool,
    setWallTool,
    drawingProps,
    setDrawingProps,
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
    fogShapes,
    fogArray,
    walls,
    wallsArray,
    roomsArray,
  } = useBattlemapData({ doc, fileId });

  // Enable keyboard shortcuts
  useBattlemapHotkeys();

  const selectedDrawingIds = useBattlemapStore((s) => s.selectedDrawingIds);

  // Auto-open Properties panel on selection or tool change
  useEffect(() => {
    if (activeTool === "draw" || activeTool === "fog") {
      togglePanel("properties", true);
    } else if (activeTool === "select" && selectedDrawingIds.length > 0) {
      togglePanel("properties", true);
    }
  }, [activeTool, selectedDrawingIds.length, togglePanel]);

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
        id: "grid",
        name: "Grid",
        type: "grid",
        visible: true,
        locked: true,
        opacity: 1,
        sortOrder: 999, // On top
      },
      {
        id: "fog",
        name: "Fog of War",
        type: "fog",
        visible: true, // Visible (applied) by default
        locked: true, // System layer
        opacity: 1,
        sortOrder: 1000, // Topmost overlay
      },
      {
        id: "tokens",
        name: "Tokens",
        type: "token",
        visible: true,
        locked: false,
        opacity: 1,
        sortOrder: 50,
      },
      {
        id: "walls",
        name: "Walls",
        type: "wall",
        visible: true,
        locked: false,
        opacity: 1,
        sortOrder: 60,
      },
      {
        id: "map",
        name: "Map",
        type: "map",
        visible: true,
        locked: false,
        opacity: 1,
        sortOrder: 10,
      },
    ];

    // Full Init if empty
    if (!settings.layers || settings.layers.length === 0) {
      updateSettings({ layers: defineDefaults(), activeLayerId: "tokens" });
    } else {
      const defaults = defineDefaults();
      const currentLayers = [...settings.layers];
      let hasChanges = false;

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
        updateSettings({
          layers: currentLayers,
          activeLayerId: currentLayers[0].id,
        });
      }
    }
  }, [synced, settings.layers, updateSettings]);

  // Migration: Transfer legacy Texts to Drawings
  useEffect(() => {
    const textsArray = doc.getArray<LegacyText>("texts");
    if (textsArray.length > 0) {
      doc.transact(() => {
        const items = textsArray.toArray();
        const newDrawings = items.map(
          (t): DrawingShape => ({
            id: t.id,
            type: "text" as const,
            x: t.x,
            y: t.y,
            content: t.content || "",
            fontSize: t.fontSize || 24,
            fontFamily: t.fontFamily || "Arial",
            strokeColor: "#ffffff",
            layer: "map",
          })
        );
        drawingsArray.push(newDrawings);
        // Clear old array
        textsArray.delete(0, textsArray.length);
      });
    }
  }, [doc, drawingsArray]);

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
    drawingsArray,
    wallsArray,
    roomsArray,
    settings,
    previewGraphicsRef,
    onOpenContextMenu: (x, y, actions) => setContextMenu({ x, y, actions }),
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
  // Helper to render a specific panel content (inner)
  const renderInnerPanelContent = (
    id: string,
    orientation: "vertical" | "horizontal" = "vertical"
  ) => {
    switch (id) {
      case "tokens":
        return (
          <TokenManagerSidebar
            doc={doc}
            onClose={() => togglePanel("tokens", false)}
            orientation={orientation}
          />
        );
      case "layers":
        return (
          <LayerManagerPanel
            layers={settings.layers || []}
            activeLayerId={settings.activeLayerId || ""}
            onUpdateLayers={(layers) => updateSettings({ layers })}
            onSetActiveLayer={handleSetActiveLayer}
            onClose={() => togglePanel("layers", false)}
          />
        );
      case "settings":
        return (
          <BattlemapSettingsPanel
            isOpen={true}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onClose={() => togglePanel("settings", false)}
            onBackgroundUpload={handleBackgroundUpload}
            onBackgroundClear={handleBackgroundClear}
          />
        );
      case "properties":
        // If selection active, show Property Editor
        if (
          activeTool === "select" &&
          selectedDrawingIds.length > 0 &&
          drawingsArray
        ) {
          return <PropertyEditor key={id} drawingsArray={drawingsArray} />;
        }

        // If Fog tool active, show simplified properties
        if (activeTool === "fog") {
          return (
            <FogPropertiesPanel key={id} activeTool={activeTool} doc={doc} />
          );
        }

        // Default: Drawing Properties (Tool Defaults)
        return (
          <DrawingPropertiesPanel
            key={id}
            activeTool={activeTool}
            drawTool={drawTool}
            properties={drawingProps}
            onPropertiesChange={setDrawingProps}
          />
        );
      default:
        return null;
    }
  };

  const getSlotContent = (location: PanelLocation) => {
    const orientation =
      location === "top" || location === "bottom" ? "horizontal" : "vertical";

    // For topRight, render panels directly based on openPanels state
    // since these are now controlled by SideDock action icons
    if (location === "topRight") {
      const sideDockPanelIds = ["tokens", "layers", "settings", "properties"];

      // Check which panels have been moved to other locations
      const movedPanelIds = new Set<string>();
      for (const [loc, ids] of Object.entries(panelLocations)) {
        if (loc !== "topRight") {
          ids.forEach((id) => movedPanelIds.add(id));
        }
      }

      // Only show panels that are open AND not moved to another location
      const visibleIds = sideDockPanelIds.filter(
        (id) => openPanels[id] && !movedPanelIds.has(id)
      );

      if (visibleIds.length === 0) return null;

      // Determine active ID
      let activeId = activePanelTabs[location];
      if (!activeId || !visibleIds.includes(activeId)) {
        activeId = visibleIds[0];
      }

      return (
        <TabbedPanelHost
          panelIds={visibleIds}
          activeId={activeId as string}
          onSelect={(id) =>
            setActivePanelTabs((prev) => ({ ...prev, [location]: id }))
          }
          onClose={(id) => togglePanel(id, false)}
          renderPanelContent={renderInnerPanelContent}
          getPanelTitle={getPanelTitle}
          orientation={orientation}
        />
      );
    }

    // For other locations, use panelLocations as before
    const ids = panelLocations[location] || [];
    const visibleIds = ids.filter((id) => openPanels[id]);

    if (visibleIds.length === 0) return null;

    // Determine active ID
    let activeId = activePanelTabs[location];
    if (!activeId || !visibleIds.includes(activeId)) {
      activeId = visibleIds[0];
    }

    return (
      <TabbedPanelHost
        panelIds={visibleIds}
        activeId={activeId as string}
        onSelect={(id) =>
          setActivePanelTabs((prev) => ({ ...prev, [location]: id }))
        }
        onClose={(id) => togglePanel(id, false)}
        renderPanelContent={renderInnerPanelContent}
        getPanelTitle={getPanelTitle}
        orientation={orientation}
      />
    );
  };
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

        if (settings.snapToGrid) {
          const snapped = GridRenderer.snapToGrid(
            posX,
            posY,
            settings.gridType,
            settings.gridCellSize,
            settings.gridOffsetX || 0,
            settings.gridOffsetY || 0
          );
          posX = snapped.x;
          posY = snapped.y;
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
        useBattlemapStore.getState().setActiveTool("select");
      } catch (err) {
        console.error("Failed to drop token:", err);
      }
    },
    [doc, tokensArray, settings, viewport, app]
  );

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
      <PanelLayout
        top={getSlotContent("top")}
        bottom={getSlotContent("bottom")}
        topLeft={getSlotContent("topLeft")}
        bottomLeft={getSlotContent("bottomLeft")}
        topRight={getSlotContent("topRight")}
        bottomRight={getSlotContent("bottomRight")}
        onPanelDrop={handlePanelDrop}
      >
        {/* Side Docks in all 4 positions */}

        {/* Left Dock */}
        <SideDock
          position="left"
          panels={[...panelLocations.topLeft, ...panelLocations.bottomLeft]
            .filter((id) => !openPanels[id])
            .map((id) => ({
              id,
              title: getPanelTitle(id),
              icon: getPanelIcon(id),
              isOpen: false,
            }))}
          onToggle={(id) => togglePanel(id, true)}
        />

        {/* Right Dock - includes the 4 main panels when closed */}
        <SideDock
          position="right"
          panels={[
            ...["tokens", "layers", "settings", "properties"].filter(
              (id) =>
                !openPanels[id] &&
                !Object.values(panelLocations).some((arr) => arr.includes(id))
            ),
            ...panelLocations.topRight,
            ...panelLocations.bottomRight,
          ]
            .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
            .filter((id) => !openPanels[id])
            .map((id) => ({
              id,
              title: getPanelTitle(id),
              icon: getPanelIcon(id),
              isOpen: false,
            }))}
          onToggle={(id) => togglePanel(id, true)}
        />

        {/* Top Dock */}
        <SideDock
          position="top"
          panels={panelLocations.top
            .filter((id) => !openPanels[id])
            .map((id) => ({
              id,
              title: getPanelTitle(id),
              icon: getPanelIcon(id),
              isOpen: false,
            }))}
          onToggle={(id) => togglePanel(id, true)}
        />

        {/* Bottom Dock */}
        <SideDock
          position="bottom"
          panels={panelLocations.bottom
            .filter((id) => !openPanels[id])
            .map((id) => ({
              id,
              title: getPanelTitle(id),
              icon: getPanelIcon(id),
              isOpen: false,
            }))}
          onToggle={(id) => togglePanel(id, true)}
        />

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

        <BattlemapToolbar
          activeTool={activeTool}
          onToolChange={(tool) => {
            setActiveTool(tool);
            // If new tool has properties, ensure properties panel is open (or logically visible)
            // But 'properties' visibility in openPanels might be manual?
            // Actually, we said properties panel visibility is controlled by active tool usually.
            // But we can also allow user to close it.
            // For now, let's auto-open properties if applicable.
            if (tool === "fog" || tool === "draw") {
              togglePanel("properties", true);
              togglePanel("settings", false);
              togglePanel("tokens", false);
            }
          }}
          fogMode={fogMode}
          onFogModeChange={setFogMode}
          fogTool={fogTool}
          onFogToolChange={setFogTool}
          drawTool={drawTool}
          onDrawToolChange={setDrawTool}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          wallTool={wallTool}
          onWallToolChange={setWallTool}
        />

        <TextInputOverlay
          viewport={viewport}
          drawings={drawings}
          drawingsArray={drawingsArray}
          doc={doc}
        />

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextMenu.actions}
            onClose={() => setContextMenu(null)}
          />
        )}

        <HotkeysHelp />
      </PanelLayout>
    </div>
  );
}
