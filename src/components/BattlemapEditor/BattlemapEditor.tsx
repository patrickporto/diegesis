import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
} from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { BattlemapSettingsPanel } from "./BattlemapSettingsPanel";
import { BattlemapToolbar } from "./BattlemapToolbar";
import { GridRenderer } from "./GridRenderer";
import {
  BattlemapSettings,
  DEFAULT_SETTINGS,
  DrawingPath,
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
  const appRef = useRef<Application | null>(null);
  const layersRef = useRef<{
    background: Container;
    grid: Graphics;
    drawings: Container;
    tokens: Container;
    texts: Container;
  } | null>(null);

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
  const currentPathRef = useRef<number[]>([]);

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

  // Load tokens from Yjs
  useEffect(() => {
    const observer = () => setTokens(tokensArray.toArray());
    tokensArray.observe(observer);
    observer();
    return () => tokensArray.unobserve(observer);
  }, [tokensArray]);

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

  // Initialize Pixi.js application
  useEffect(() => {
    if (!containerRef.current) return;

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

      // Create layers
      const background = new Container();
      const grid = new Graphics();
      const drawingsContainer = new Container();
      const tokensContainer = new Container();
      const textsContainer = new Container();

      app.stage.addChild(background);
      app.stage.addChild(grid);
      app.stage.addChild(drawingsContainer);
      app.stage.addChild(tokensContainer);
      app.stage.addChild(textsContainer);

      layersRef.current = {
        background,
        grid,
        drawings: drawingsContainer,
        tokens: tokensContainer,
        texts: textsContainer,
      };

      // Enable stage interactivity
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      // Handle resize
      const handleResize = () => {
        if (app && container) {
          app.renderer.resize(container.clientWidth, container.clientHeight);
        }
      };

      window.addEventListener("resize", handleResize);

      // Return cleanup for resize listener
      return () => {
        window.removeEventListener("resize", handleResize);
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
        layersRef.current = null;
      }
    };
  }, [fileId]);

  // Render grid when settings change
  useEffect(() => {
    if (!appRef.current || !layersRef.current) return;

    const { grid } = layersRef.current;
    const { width, height } = appRef.current.screen;

    GridRenderer.render(
      grid,
      width,
      height,
      settings.gridType,
      settings.gridCellSize,
      {
        color: settings.gridColor,
        width: settings.gridLineWidth,
        alpha: settings.gridOpacity,
      }
    );
  }, [settings]);

  // Render background image
  useEffect(() => {
    if (!appRef.current || !layersRef.current) return;

    const { background } = layersRef.current;
    background.removeChildren();

    if (settings.backgroundImage) {
      const bgUrl = settings.backgroundImage;
      const loadBackground = async () => {
        try {
          const texture = await Assets.load(bgUrl);
          if (!appRef.current) return;

          const sprite = new Sprite(texture);
          sprite.width = appRef.current.screen.width;
          sprite.height = appRef.current.screen.height;
          background.addChild(sprite);
        } catch (error) {
          console.error("Failed to load background image:", error);
        }
      };
      loadBackground();
    }
  }, [settings.backgroundImage]);

  // Render tokens
  useEffect(() => {
    if (!appRef.current || !layersRef.current) return;

    const { tokens: tokensContainer } = layersRef.current;
    tokensContainer.removeChildren();

    tokens.forEach((token) => {
      const container = new Container();
      container.x = token.x;
      container.y = token.y;

      // Token circle placeholder
      const circle = new Graphics();
      const size = token.size * settings.gridCellSize;
      circle.circle(0, 0, size / 2);
      circle.fill({ color: 0x4a90d9, alpha: 0.8 });
      circle.stroke({ color: 0xffffff, width: 2 });
      container.addChild(circle);

      // Label
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
        label.y = size / 2 + 10;
        container.addChild(label);
      }

      // Make draggable
      container.eventMode = "static";
      container.cursor = "grab";

      let isDragging = false;
      let dragOffset = { x: 0, y: 0 };

      container.on("pointerdown", (e) => {
        if (activeTool !== "select") return;
        isDragging = true;
        container.cursor = "grabbing";
        const pos = e.global;
        dragOffset = { x: pos.x - container.x, y: pos.y - container.y };
      });

      container.on("globalpointermove", (e) => {
        if (!isDragging) return;
        let newX = e.global.x - dragOffset.x;
        let newY = e.global.y - dragOffset.y;

        if (settings.snapToGrid) {
          const snapped = GridRenderer.snapToGrid(
            newX,
            newY,
            settings.gridType,
            settings.gridCellSize
          );
          newX = snapped.x;
          newY = snapped.y;
        }

        container.x = newX;
        container.y = newY;
      });

      container.on("pointerup", () => {
        if (!isDragging) return;
        isDragging = false;
        container.cursor = "grab";

        // Update Yjs
        const idx = tokens.findIndex((t) => t.id === token.id);
        if (idx !== -1) {
          doc.transact(() => {
            tokensArray.delete(idx, 1);
            tokensArray.insert(idx, [
              { ...token, x: container.x, y: container.y },
            ]);
          });
        }
      });

      tokensContainer.addChild(container);
    });
  }, [tokens, settings, activeTool, doc, tokensArray]);

  // Render drawings
  useEffect(() => {
    if (!layersRef.current) return;

    const { drawings: drawingsContainer } = layersRef.current;
    drawingsContainer.removeChildren();

    drawings.forEach((path) => {
      if (path.points.length < 4) return;

      const graphics = new Graphics();
      graphics.moveTo(path.points[0], path.points[1]);

      for (let i = 2; i < path.points.length; i += 2) {
        graphics.lineTo(path.points[i], path.points[i + 1]);
      }

      graphics.stroke({
        color: parseInt(path.color.replace("#", ""), 16),
        width: path.width,
      });

      drawingsContainer.addChild(graphics);
    });
  }, [drawings]);

  // Render text annotations
  useEffect(() => {
    if (!layersRef.current) return;

    const { texts: textsContainer } = layersRef.current;
    textsContainer.removeChildren();

    texts.forEach((annotation) => {
      const text = new Text({
        text: annotation.text,
        style: {
          fontSize: annotation.fontSize,
          fill: annotation.color,
          fontWeight: "bold",
          dropShadow: {
            color: 0x000000,
            blur: 2,
            distance: 1,
          },
        },
      });
      text.x = annotation.x;
      text.y = annotation.y;
      text.eventMode = "static";
      text.cursor = "move";

      textsContainer.addChild(text);
    });
  }, [texts]);

  // Handle canvas interactions
  useEffect(() => {
    if (!appRef.current) return;

    const app = appRef.current;

    const onPointerDown = (e: PointerEvent) => {
      const rect = app.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (activeTool === "draw") {
        setIsDrawing(true);
        currentPathRef.current = [x, y];
      } else if (activeTool === "token") {
        let posX = x;
        let posY = y;

        if (settings.snapToGrid) {
          const snapped = GridRenderer.snapToGrid(
            x,
            y,
            settings.gridType,
            settings.gridCellSize
          );
          posX = snapped.x;
          posY = snapped.y;
        }

        doc.transact(() => {
          tokensArray.push([
            {
              id: uuidv7(),
              x: posX,
              y: posY,
              imageUrl: "",
              size: 1,
            },
          ]);
        });
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
              },
            ]);
          });
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing || activeTool !== "draw") return;

      const rect = app.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      currentPathRef.current.push(x, y);

      // Live preview
      if (layersRef.current) {
        const graphics = new Graphics();
        const points = currentPathRef.current;

        graphics.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) {
          graphics.lineTo(points[i], points[i + 1]);
        }
        graphics.stroke({ color: 0xff0000, width: 2 });

        layersRef.current.drawings.addChild(graphics);
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
            },
          ]);
        });
      }

      setIsDrawing(false);
      currentPathRef.current = [];
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

  const handleBackgroundUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        handleSettingsChange({ backgroundImage: base64 });
      };
      reader.readAsDataURL(file);
    },
    [handleSettingsChange]
  );

  const handleBackgroundClear = useCallback(() => {
    handleSettingsChange({ backgroundImage: undefined });
  }, [handleSettingsChange]);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: "none" }}
      />

      <BattlemapToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <BattlemapSettingsPanel
        settings={settings}
        onSettingsChange={handleSettingsChange}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onBackgroundUpload={handleBackgroundUpload}
        onBackgroundClear={handleBackgroundClear}
      />
    </div>
  );
}
