import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useSync } from "@/contexts/SyncContext";

import { BattlemapLayerPanel } from "./BattlemapLayerPanel";
import { BattlemapSettingsPanel } from "./BattlemapSettingsPanel";
import { BattlemapToolbar } from "./BattlemapToolbar";
import { ContextMenu, ContextMenuAction } from "./ContextMenu";
import { GridRenderer } from "./GridRenderer";
import { TokenLibrary } from "./TokenLibrary";
import {
  BattlemapSettings,
  DEFAULT_SETTINGS,
  DrawingPath,
  Layer,
  TextAnnotation,
  Token,
  ToolType,
} from "./types";

interface BattlemapEditorProps {
  fileId: string;
  doc: Y.Doc;
}

export function BattlemapEditor({ fileId, doc }: BattlemapEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const layerContainersRef = useRef<Map<string, Container>>(new Map());
  const previewGraphicsRef = useRef<Graphics | null>(null);

  const tokenContainersRef = useRef(new Map<string, Container>());

  // Yjs data structures
  const settingsMap = useMemo(
    () =>
      doc.getMap<BattlemapSettings[keyof BattlemapSettings]>(
        `battlemap-settings-${fileId}`
      ),
    [doc, fileId]
  );
  const tokensArray = useMemo(
    () => doc.getArray<Token>(`battlemap-tokens-${fileId}`),
    [doc, fileId]
  );
  const drawingsArray = useMemo(
    () => doc.getArray<DrawingPath>(`battlemap-drawings-${fileId}`),
    [doc, fileId]
  );
  const textsArray = useMemo(
    () => doc.getArray<TextAnnotation>(`battlemap-texts-${fileId}`),
    [doc, fileId]
  );

  // Local state
  const [settings, setSettings] = useState<BattlemapSettings>(DEFAULT_SETTINGS);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [texts, setTexts] = useState<TextAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const currentPathRef = useRef<number[]>([]);
  const isSpacePressedRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);
  const [viewportState, setViewportState] = useState({
    x: 0,
    y: 0,
    scale: 1,
    worldWidth: 0,
    worldHeight: 0,
    screenWidth: 0,
    screenHeight: 0,
  });

  // Settings handlers
  const handleSettingsChange = useCallback(
    (updates: Partial<BattlemapSettings>) => {
      doc.transact(() => {
        Object.entries(updates).forEach(([key, value]) => {
          settingsMap.set(key, value);
        });
      });
    },
    [doc, settingsMap]
  );

  // Load settings from Yjs
  useEffect(() => {
    const loadSettings = () => {
      const loaded: Partial<BattlemapSettings> = {};
      settingsMap.forEach((value, key) => {
        (loaded as Record<string, unknown>)[key] = value;
      });
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
    };

    settingsMap.observe(loadSettings);
    loadSettings();

    return () => settingsMap.unobserve(loadSettings);
  }, [settingsMap]);

  // Ensure default layers exist
  useEffect(() => {
    if (isReady && (!settings.layers || settings.layers.length === 0)) {
      const defaults: Layer[] = [
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
          id: "map",
          name: "Map",
          type: "drawings",
          visible: true,
          locked: false,
          opacity: 1,
          sortOrder: 1,
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
          id: "dm",
          name: "DM Info",
          type: "dm",
          visible: true,
          locked: false,
          opacity: 1,
          sortOrder: 3,
        },
        {
          id: "grid",
          name: "Grid",
          type: "map",
          visible: true,
          locked: true,
          opacity: 1,
          sortOrder: 100,
        },
      ];
      // Only update if we are essentially "owning" this init or it's empty
      // Use transact to avoid loops if multiple clients?
      // Just set it.
      handleSettingsChange({ layers: defaults, activeLayerId: "tokens" });
    }
  }, [isReady, settings.layers, handleSettingsChange]);

  // Load drawings from Yjs
  useEffect(() => {
    const observer = () => setDrawings(drawingsArray.toArray());
    drawingsArray.observe(observer);
    observer();
    return () => drawingsArray.unobserve(observer);
  }, [drawingsArray]);

  // Load texts from Yjs
  useEffect(() => {
    const observer = () => setTexts(textsArray.toArray());
    textsArray.observe(observer);
    observer();
    return () => textsArray.unobserve(observer);
  }, [textsArray]);

  // Load tokens from Yjs
  useEffect(() => {
    const observer = () => setTokens(tokensArray.toArray());
    tokensArray.observe(observer);
    observer();
    return () => tokensArray.unobserve(observer);
  }, [tokensArray]);

  // Update Layer Visibility and Enforcement
  useEffect(() => {
    const containers = layerContainersRef.current;
    if (containers.size === 0 || !settings.layers) return;

    // Enforcement: background and grid MUST be locked, and grid MUST have highest sort order
    const needsEnforcement = settings.layers.some(
      (l) =>
        ((l.id === "background" || l.id === "grid") && !l.locked) ||
        (l.id === "grid" && l.sortOrder !== 100)
    );
    if (needsEnforcement) {
      const updated = settings.layers.map((l) => {
        if (l.id === "background") return { ...l, locked: true };
        if (l.id === "grid") return { ...l, locked: true, sortOrder: 100 };
        return l;
      });
      handleSettingsChange({ layers: updated });
      return;
    }

    settings.layers.forEach((layer) => {
      const container = containers.get(layer.id);
      if (container) {
        container.visible = layer.visible;
        container.alpha = layer.opacity;
        // Ensure grid has a very high zIndex to stay on top
        container.zIndex = layer.id === "grid" ? 1000 : layer.sortOrder;
      }
    });

    if (viewportRef.current) {
      viewportRef.current.sortableChildren = true;
      viewportRef.current.sortChildren();
    }
  }, [settings.layers, isReady, handleSettingsChange]);

  // Initialize Pixi.js application
  useEffect(() => {
    if (!containerRef.current) return;

    // Capture ref value to ensure stable cleanup without lint warnings
    const layerContainers = layerContainersRef.current;

    let isMounted = true;
    let app: Application | null = null;

    const initApp = async () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      const newApp = new Application();
      await newApp.init({
        background: "#1a1a2e",
        width,
        height,
        antialias: true,
      });

      if (!isMounted) {
        newApp.destroy({ removeView: true });
        return;
      }

      app = newApp;

      container.appendChild(app.canvas);
      appRef.current = app;

      // Create Viewport
      const viewport = new Viewport({
        screenWidth: width,
        screenHeight: height,
        worldWidth: width, // Start with screen size, expands
        worldHeight: height,
        events: app.renderer.events,
      });

      viewport
        .drag({
          mouseButtons: "left-middle-right",
          wheel: false,
        })
        .pinch()
        .wheel()
        .decelerate();

      // Initially pause drag if starting with a tool other than select
      // Handled by separate useEffect now
      // console.log("Init complete");

      // For "Space to Pan", we might need custom handling or "keyToPress" if we want that.
      // Let's stick to Wheel Zoom + Middle/Right Pan by default?
      // viewport.drag({ mouseButtons: "middle-right" });

      app.stage.addChild(viewport);
      viewportRef.current = viewport;

      // Create Preview Graphics
      const preview = new Graphics();
      preview.label = "preview";
      preview.zIndex = 10000; // Always on top
      viewport.addChild(preview);
      previewGraphicsRef.current = preview;

      // Initial Layers Setup handled in useEffect now

      // Create containers for layers
      // We'll do this in a separate useEffect that reacts to `settings.layers`
      // But we need a root for them.

      // Handle resize
      const handleResize = () => {
        if (app && container) {
          app.renderer.resize(container.clientWidth, container.clientHeight);
          viewport.resize(container.clientWidth, container.clientHeight);
        }
      };

      viewport.on("moved", () => {
        setViewportState({
          x: viewport.x,
          y: viewport.y,
          scale: viewport.scale.x,
          worldWidth: viewport.worldWidth,
          worldHeight: viewport.worldHeight,
          screenWidth: viewport.screenWidth,
          screenHeight: viewport.screenHeight,
        });
      });

      window.addEventListener("resize", handleResize);

      setIsReady(true);

      return () => {
        window.removeEventListener("resize", handleResize);
        viewport.destroy(); // Viewport cleanup
      };
    };

    let cleanupResize: (() => void) | undefined;

    initApp().then((cleanup) => {
      cleanupResize = cleanup;
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      if (app) {
        try {
          app.destroy(
            { removeView: true },
            { children: true, texture: true, textureSource: true }
          );
        } catch (e) {
          // Ignore destroy errors
        }
        appRef.current = null;
        viewportRef.current = null;
        layerContainers.clear();
      }
    };
  }, [fileId]);

  // Space to Pan logic
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressedRef.current) {
        // Only trigger if not typing in a prompt/input
        if (
          ["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName
          )
        )
          return;

        isSpacePressedRef.current = true;
        setIsPanning(true);
        if (viewportRef.current) {
          viewportRef.current.plugins.resume("drag");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        setIsPanning(false);
        // If we are in drawing mode, we might want to pause drag again
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [activeTool]);

  // Toggle drag based on tool
  useEffect(() => {
    if (!viewportRef.current) return;
    const viewport = viewportRef.current;

    if (activeTool === "select" || isPanning) {
      viewport.plugins.resume("drag");
    } else {
      viewport.plugins.pause("drag");
    }
  }, [activeTool, isPanning, isReady]);

  // Sync Layers from Settings to Pixi
  useEffect(() => {
    if (!viewportRef.current || !settings.layers) return;
    const viewport = viewportRef.current;

    // Create missing containers
    settings.layers.forEach((layer) => {
      if (!layerContainersRef.current.has(layer.id)) {
        const container = new Container();
        container.label = layer.id; // Helpful for debugging
        container.zIndex = layer.sortOrder;

        // Special handling for Grid?
        if (layer.id === "grid") {
          // It's a Graphics object
          const grid = new Graphics();
          grid.label = "grid";
          grid.zIndex = layer.sortOrder;
          viewport.addChild(grid);
          layerContainersRef.current.set(layer.id, grid);
        } else {
          viewport.addChild(container);
          layerContainersRef.current.set(layer.id, container);
        }
      }
    });

    // Remove deleted layers
    for (const [id, container] of layerContainersRef.current) {
      if (!settings.layers.some((l) => l.id === id)) {
        container.destroy({ children: true });
        layerContainersRef.current.delete(id);
      }
    }

    viewport.sortChildren();
  }, [settings.layers, isReady]);

  // Render grid
  useEffect(() => {
    const gridContainer = layerContainersRef.current.get("grid") as Graphics;
    if (!gridContainer || !viewportRef.current) return;

    // Use world values or just a large area?
    const { worldWidth, worldHeight } = viewportRef.current;
    // We should probably draw grid over the whole "background" area.
    // If background is infinite, grid is tricky.
    // For now, let's assume world size = screen size if no background, or background size.
    // We'll update world size when background loads.

    GridRenderer.render(
      gridContainer,
      worldWidth,
      worldHeight,
      settings.gridType,
      settings.gridCellSize,
      {
        color: settings.gridColor,
        width: settings.gridLineWidth,
        alpha: settings.gridOpacity,
      }
    );
  }, [settings, isReady]);

  const { uploadFile, getFileBlob, isSignedIn } = useSync();

  // Handle Token Action (Delete, Move)
  const handleTokenAction = useCallback(
    (tokenId: string, action: string, payload?: unknown) => {
      const idx = tokensArray.toArray().findIndex((t) => t.id === tokenId);
      if (idx === -1) return;

      doc.transact(() => {
        if (action === "delete") {
          tokensArray.delete(idx, 1);
        } else if (action === "layer") {
          const token = tokensArray.get(idx);
          const updated = { ...token, layer: payload as string };
          tokensArray.delete(idx, 1);
          tokensArray.insert(idx, [updated]);
        } else if (action === "lock") {
          // Not implemented
        }
      });
    },
    [doc, tokensArray]
  );

  const handleDrawingAction = useCallback(
    (drawingId: string, action: string, payload?: unknown) => {
      const idx = drawingsArray.toArray().findIndex((d) => d.id === drawingId);
      if (idx === -1) return;

      doc.transact(() => {
        if (action === "delete") {
          drawingsArray.delete(idx, 1);
        } else if (action === "layer") {
          const drawing = drawingsArray.get(idx);
          drawingsArray.delete(idx, 1);
          drawingsArray.insert(idx, [{ ...drawing, layer: payload as string }]);
        }
      });
    },
    [doc, drawingsArray]
  );

  // Render background image
  useEffect(() => {
    const bgContainer = layerContainersRef.current.get("background");
    if (!bgContainer || !viewportRef.current) return;

    const loadBackground = async () => {
      bgContainer.removeChildren();

      if (!settings.backgroundImage) return;

      const bgUrl = settings.backgroundImage;
      let imageUrl = bgUrl;
      let objectUrl: string | null = null;

      try {
        if (bgUrl.startsWith("drive://")) {
          if (!isSignedIn) return;
          const fileId = bgUrl.replace("drive://", "");
          const blob = await getFileBlob(fileId);
          objectUrl = URL.createObjectURL(blob);
          imageUrl = objectUrl;
        }

        const texture = await Assets.load(imageUrl);
        if (!bgContainer) return; // check again?

        const sprite = new Sprite(texture);
        bgContainer.addChild(sprite);

        // Resize viewport world to match background!
        const viewport = viewportRef.current;
        if (viewport) {
          viewport.resize(undefined, undefined, sprite.width, sprite.height);
          // Center? viewport.moveCenter(sprite.width/2, sprite.height/2);
        }
      } catch (error) {
        console.error("Failed to load background image:", error);
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };

    loadBackground();
  }, [settings.backgroundImage, isReady, isSignedIn, getFileBlob]);

  // Render tokens optimized
  useEffect(() => {
    const currentIds = new Set(tokens.map((t) => t.id));
    const tokenContainers = tokenContainersRef.current;

    // Check if tokens layer exists (legacy support or if deleted)
    // Actually we iterate all tokens, check their layer property, and add to that container.

    // Remove deleted tokens
    for (const [id, container] of tokenContainers) {
      if (!currentIds.has(id)) {
        container.destroy({ children: true });
        tokenContainers.delete(id);
      }
    }

    tokens.forEach((token) => {
      let container = tokenContainers.get(token.id);
      const size = token.size * settings.gridCellSize;

      if (!container) {
        // Create new token container
        container = new Container();
        container.label = "token";

        // Initial setup
        container.eventMode = "static";
        container.cursor = "grab";

        // Graphics content
        const contentContainer = new Container();
        container.addChild(contentContainer);

        if (token.imageUrl) {
          const sprite = new Sprite(Texture.WHITE);
          sprite.width = size;
          sprite.height = size;
          sprite.label = "sprite";

          const mask = new Graphics();
          mask.circle(size / 2, size / 2, size / 2);
          mask.fill(0xffffff);

          sprite.mask = mask;
          contentContainer.addChild(mask);
          contentContainer.addChild(sprite);

          // Load image
          const loadTexture = async () => {
            try {
              let url = token.imageUrl;
              let objectUrl: string | null = null;

              if (url.startsWith("drive://") && isSignedIn) {
                const id = url.replace("drive://", "");
                // Check cache? For now just fetch
                const blob = await getFileBlob(id);
                objectUrl = URL.createObjectURL(blob);
                url = objectUrl;
              }

              const texture = await Assets.load(url);
              if (container && !container.destroyed) {
                sprite.texture = texture;
                sprite.width = size;
                sprite.height = size;
              }
              if (objectUrl) URL.revokeObjectURL(objectUrl);
            } catch (e) {
              console.error("Failed to load token texture", e);
            }
          };
          loadTexture();
        } else {
          // Placeholder
          const circle = new Graphics();
          circle.circle(size / 2, size / 2, size / 2);
          circle.fill({ color: 0x4a90d9, alpha: 0.8 });
          circle.stroke({ color: 0xffffff, width: 2 });
          contentContainer.addChild(circle);

          if (token.label) {
            const label = new Text({
              text: token.label,
              style: {
                fontSize: 12,
                fill: 0xffffff,
                fontWeight: "bold",
              },
            });
            label.anchor.set(0.5);
            label.x = size / 2;
            label.y = size + 10;
            contentContainer.addChild(label);
          }
        }

        // Add drag handlers
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        container.on("pointerdown", (e) => {
          if (activeTool === "eraser") {
            e.stopPropagation();
            handleTokenAction(token.id, "delete");
            return;
          }

          if (activeTool !== "select") return;

          if (e.button === 2 || e.nativeEvent.button === 2) {
            e.stopPropagation();
            const actions: ContextMenuAction[] = [
              {
                id: "delete",
                label: "Delete Token",
                danger: true,
                onClick: () => handleTokenAction(token.id, "delete"),
              },
              {
                id: "layer",
                label: "Move to Layer",
                onClick: () => undefined,
                children: (settings.layers || []).map((l) => ({
                  id: l.id,
                  label: l.name,
                  onClick: () => handleTokenAction(token.id, "layer", l.id),
                })),
              },
            ];
            // Use client coordinates for fixed positioning
            setContextMenu({ x: e.client.x, y: e.client.y, actions });
            return;
          }

          // Stop propagation for select tool so we don't pan when dragging token
          e.stopPropagation();
          isDragging = true;
          (container as Container & { isDragging: boolean }).isDragging = true;
          container.cursor = "grabbing";
          const worldPos = viewport.toWorld(e.global.x, e.global.y);
          dragOffset = {
            x: worldPos.x - container.x,
            y: worldPos.y - container.y,
          };
        });

        container.on("globalpointermove", (e) => {
          if (!isDragging) return;
          const viewport = viewportRef.current;
          if (!viewport) return;

          const worldPos = viewport.toWorld(e.global.x, e.global.y);
          let newX = worldPos.x - dragOffset.x;
          let newY = worldPos.y - dragOffset.y;

          if (settings.snapToGrid) {
            const centerX = newX + size / 2;
            const centerY = newY + size / 2;
            const snapped = GridRenderer.snapToGrid(
              centerX,
              centerY,
              settings.gridType,
              settings.gridCellSize
            );
            newX = snapped.x - size / 2;
            newY = snapped.y - size / 2;
          }

          container.x = newX;
          container.y = newY;
        });

        container.on("pointerup", () => {
          if (!isDragging) return;
          isDragging = false;
          (container as Container & { isDragging: boolean }).isDragging = false;
          container.cursor = "grab";

          // Update Yjs
          const idx = tokensArray.toArray().findIndex((t) => t.id === token.id);
          if (idx !== -1) {
            doc.transact(() => {
              const currentToken = tokensArray.get(idx);
              const updatedToken = {
                ...currentToken,
                x: container.x + size / 2,
                y: container.y + size / 2,
              };

              tokensArray.delete(idx, 1);
              tokensArray.insert(idx, [updatedToken]);
            });
          }
        });

        // Add to layer
        // Find layer by ID or default to 'tokens'
        const layerId = token.layer || "tokens";
        const targetLayer = layerContainersRef.current.get(layerId);

        if (targetLayer) {
          targetLayer.addChild(container);
        }

        tokenContainers.set(token.id, container);
      }

      // Update props that might change (position, size)
      // Note: We are NOT updating texture here if imageUrl changes to avoid complexity for now,
      // assuming immutable tokens mostly.

      // Update position (unless dragging? local update happens via event, this is syncing from others)
      // Actually, if we are dragging, we shouldn't force-update from state if state hasn't caught up?
      // But Yjs update is "truth".
      // Simple approach: Always update. If local drag is smoother, we might see jitter.
      // But we update Yjs on drag end.
      // While dragging, we are updating local container x/y.
      // If we receive a network update, it overrides.

      // Ideally check if dragging this specific token.
      // But `container` closure has `isDragging`. We can't access it easily.
      // We can attach `isDragging` to container instance.
      if (!(container as Container & { isDragging?: boolean }).isDragging) {
        container.x = token.x - size / 2;
        container.y = token.y - size / 2;
      }
    });
  }, [
    tokens,
    settings,
    activeTool,
    doc,
    tokensArray,
    isReady,
    isSignedIn,
    getFileBlob,
    handleTokenAction,
  ]);

  // Render drawings
  useEffect(() => {
    // Clear drawings from all layers
    layerContainersRef.current.forEach((container) => {
      container.children
        .filter((c) => c.label === "drawing")
        .forEach((c) => c.destroy({ children: true }));
    });

    drawings.forEach((path) => {
      if (path.points.length < 4) return;

      const graphics = new Graphics();
      graphics.label = "drawing";
      // Make interactive for selection/context menu
      graphics.eventMode = "static";
      graphics.cursor = "pointer";

      graphics.moveTo(path.points[0], path.points[1]);

      for (let i = 2; i < path.points.length; i += 2) {
        graphics.lineTo(path.points[i], path.points[i + 1]);
      }

      graphics.stroke({
        color: parseInt(path.color.replace("#", ""), 16),
        width: path.width,
        // Add native hit detection for stroke?
        // Pixi 8 semantics.
      });
      // To ensure hit detection on stroke, we might need a HitArea.
      // Or just trust Pixi's `containsPoint` on stroke.

      graphics.on("pointerover", () => {
        if (activeTool === "select" || activeTool === "eraser") {
          graphics.alpha = 0.6;
        }
      });
      graphics.on("pointerout", () => {
        graphics.alpha = 1.0;
      });

      // Context Menu for Drawing
      graphics.on("pointerdown", (e) => {
        if (activeTool === "eraser") {
          e.stopPropagation();
          handleDrawingAction(path.id, "delete");
          return;
        }

        if (e.button === 2 || e.nativeEvent.button === 2) {
          e.stopPropagation();

          const actions: ContextMenuAction[] = [
            {
              id: "delete",
              label: "Delete Drawing",
              danger: true,
              onClick: () => handleDrawingAction(path.id, "delete"),
            },
            {
              id: "layer",
              label: "Move to Layer",
              onClick: () => undefined,
              children: (settings.layers || []).map((l) => ({
                id: l.id,
                label: l.name,
                onClick: () => handleDrawingAction(path.id, "layer", l.id),
              })),
            },
          ];
          setContextMenu({ x: e.client.x, y: e.client.y, actions });
        }
      });

      // Find target layer
      const layerId = path.layer || "map";
      const targetLayer = layerContainersRef.current.get(layerId);

      if (targetLayer) {
        targetLayer.addChild(graphics);
      }
    });
  }, [drawings, isReady, settings.layers, activeTool, handleDrawingAction]); // Re-render if layers change (might be deleted)

  // Render text annotations
  useEffect(() => {
    // Clear texts
    layerContainersRef.current.forEach((container) => {
      container.children
        .filter((c) => c.label === "text")
        .forEach((c) => c.destroy({ children: true }));
    });

    texts.forEach((annotation) => {
      const text = new Text({
        text: annotation.text,
        style: {
          fontSize: annotation.fontSize,
          fill: annotation.color,
          fontWeight: "bold",
          //          dropShadow: {
          //            color: 0x000000,
          //            blur: 2,
          //            distance: 1,
          //          },
        },
      });
      text.label = "text";
      text.x = annotation.x;
      text.y = annotation.y;
      text.eventMode = "static";
      text.cursor = "move";

      const layerId = annotation.layer || "map";
      const targetLayer = layerContainersRef.current.get(layerId);

      if (targetLayer) {
        targetLayer.addChild(text);
      }
    });
  }, [texts, isReady, settings.layers]);

  // Handle canvas interactions
  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;

    const onPointerDown = (e: PointerEvent) => {
      // If holding space, let viewport handle panning
      if (isSpacePressedRef.current) return;

      if (e.button !== 0) return;
      // Use Viewport coordinates!
      const viewport = viewportRef.current;
      if (!viewport) return;

      const point = viewport.toWorld(e.offsetX, e.offsetY);
      const x = point.x;
      const y = point.y;

      // Determine active layer for new objects
      // Default to first 'tokens' layer if not set? Or use activeLayerId from settings
      // For now hardcode:
      // Tokens -> 'tokens' layer (or active if type matches?)
      // Drawings -> 'map' layer (or active)
      // Texts -> 'map' layer

      // Better: Use `settings.activeLayerId`. If not set, fallback.
      // const activeLayerId = settings.activeLayerId || "tokens";
      // Validate if active layer supports the tool?
      // For MVP, just dump into active layer.

      if (activeTool === "draw") {
        setIsDrawing(true);
        currentPathRef.current = [x, y];
      } else if (activeTool === "token") {
        // Disabled per user request: "Remove click-to-create token"
        // But drag-drop logic below handles it.
        // If user wants to click to place FROM library selection (if we had one selected), that's different.
        // For now, removing click-to-create generic token.
      } else if (activeTool === "text") {
        const text = prompt("Digite o texto:");
        if (text) {
          doc.transact(() => {
            textsArray.push([
              {
                id: uuidv7(),
                x,
                y,
                text,
                fontSize: 16,
                color: "#ffffff",
                layer: "map", // Force map or active?
              },
            ]);
          });
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing || activeTool !== "draw" || !viewportRef.current) return;

      const point = viewportRef.current.toWorld(e.offsetX, e.offsetY);
      const x = point.x;
      const y = point.y;

      currentPathRef.current.push(x, y);

      // Live preview
      const preview = previewGraphicsRef.current;
      if (preview) {
        const points = currentPathRef.current;
        preview.clear();
        if (points.length >= 4) {
          preview.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            preview.lineTo(points[i], points[i + 1]);
          }
          preview.stroke({ color: 0xff0000, width: 2 });
        }
      }
    };

    const onPointerUp = () => {
      if (!isDrawing) return;

      if (currentPathRef.current.length >= 4) {
        doc.transact(() => {
          drawingsArray.push([
            {
              id: uuidv7(),
              points: [...currentPathRef.current],
              color: "#ff0000",
              width: 2,
              layer: settings.activeLayerId || "map",
            },
          ]);
        });
      }

      setIsDrawing(false);
      currentPathRef.current = [];
      if (previewGraphicsRef.current) {
        previewGraphicsRef.current.clear();
      }
    };

    app.canvas.addEventListener("pointerdown", onPointerDown);
    app.canvas.addEventListener("pointermove", onPointerMove);
    app.canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      if (app && app.canvas) {
        app.canvas.removeEventListener("pointerdown", onPointerDown);
        app.canvas.removeEventListener("pointermove", onPointerMove);
        app.canvas.removeEventListener("pointerup", onPointerUp);
      }
    };
  }, [
    activeTool,
    isDrawing,
    settings,
    doc,
    tokensArray,
    textsArray,
    drawingsArray,
  ]);

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
        // Fallback to base64 if not signed in
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

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const tokenData = e.dataTransfer.getData("application/json");
      if (!tokenData || !viewportRef.current) return;

      try {
        const tokenItem = JSON.parse(tokenData);
        // Get global point
        // React DnD gives clientX/Y.
        // We need to convert to Canvas space, then Viewport space.

        // Actually, viewport.toLocal expects global interaction point.
        // We can synthesize one or manually map.

        // Let's assume passed client coordinates are what we use to map to canvas, then viewport.
        // But App.renderer.events.mapPositionToPoint logic is internal.

        const canvas = appRef.current?.canvas;
        if (!canvas) return;
        const rect = (canvas as HTMLCanvasElement).getBoundingClientRect();
        const globalX = e.clientX - rect.left;
        const globalY = e.clientY - rect.top;

        // Viewport toLocal takes global "Point" which is usually screen coordinates in Pixi terms?
        // Pixi interaction usually normalizes this.

        const viewport = viewportRef.current;
        const point = viewport.toWorld(globalX, globalY);

        let posX = point.x;
        let posY = point.y;

        if (settings.snapToGrid) {
          const snapped = GridRenderer.snapToGrid(
            posX,
            posY,
            settings.gridType,
            settings.gridCellSize
          );
          posX = snapped.x;
          posY = snapped.y;
        }

        // Add to active layer
        const targetLayerId = settings.activeLayerId || "tokens";

        doc.transact(() => {
          tokensArray.push([
            {
              id: uuidv7(),
              x: posX,
              y: posY,
              imageUrl: tokenItem.imageUrl, // Use the image from library
              label: tokenItem.label,
              size: 1,
              layer: targetLayerId,
            },
          ]);
        });
      } catch (err) {
        console.error("Failed to drop token:", err);
      }
    },
    [doc, tokensArray, settings]
  );

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: "none" }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Custom Scroll Indicators */}
      {viewportState.worldWidth > viewportState.screenWidth && (
        <div className="absolute right-1 top-2 bottom-2 w-1.5 pointer-events-none z-30">
          <div
            className="bg-white/30 rounded-full transition-opacity duration-300"
            style={{
              height: `${
                (viewportState.screenHeight /
                  (viewportState.worldHeight * viewportState.scale)) *
                100
              }%`,
              transform: `translateY(${
                (Math.abs(viewportState.y) /
                  (viewportState.worldHeight * viewportState.scale)) *
                (viewportState.screenHeight - 20) /*margin*/
              }px)`,
              opacity: isPanning ? 1 : 0.4,
            }}
          />
        </div>
      )}
      {viewportState.worldHeight > viewportState.screenHeight && (
        <div className="absolute bottom-1 left-2 right-2 h-1.5 pointer-events-none z-30">
          <div
            className="bg-white/30 rounded-full transition-opacity duration-300"
            style={{
              width: `${
                (viewportState.screenWidth /
                  (viewportState.worldWidth * viewportState.scale)) *
                100
              }%`,
              transform: `translateX(${
                (Math.abs(viewportState.x) /
                  (viewportState.worldWidth * viewportState.scale)) *
                (viewportState.screenWidth - 20)
              }px)`,
              opacity: isPanning ? 1 : 0.4,
            }}
          />
        </div>
      )}

      <TokenLibrary
        doc={doc}
        fileId={fileId}
        isOpen={activeTool === "token"}
        onClose={() => setActiveTool("select")}
      />

      <BattlemapToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onLayersClick={() => setIsLayerPanelOpen((prev) => !prev)}
      />

      <BattlemapLayerPanel
        isOpen={isLayerPanelOpen}
        onClose={() => setIsLayerPanelOpen(false)}
        layers={settings.layers || []}
        activeLayerId={settings.activeLayerId || ""}
        onUpdateLayers={(layers) => handleSettingsChange({ layers })}
        onSetActiveLayer={(id) => handleSettingsChange({ activeLayerId: id })}
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
