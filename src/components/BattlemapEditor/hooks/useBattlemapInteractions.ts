import { Application, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useCallback, useEffect, useRef } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { GridRenderer } from "../GridRenderer"; // Import GridRenderer
import {
  BattlemapSettings,
  DrawingPath,
  FogShape,
  TextAnnotation,
} from "../types";

const FOG_SIZE = 3000;

interface UseBattlemapInteractionsProps {
  app: Application | null;
  viewport: Viewport | null;
  doc: Y.Doc;
  fogArray: Y.Array<FogShape>;
  textsArray: Y.Array<TextAnnotation>;
  drawingsArray: Y.Array<DrawingPath>;
  settings: BattlemapSettings;
  previewGraphicsRef: React.MutableRefObject<Graphics | null>;
}

export function useBattlemapInteractions({
  app,
  viewport,
  doc,
  fogArray,
  textsArray,
  drawingsArray,
  settings,
  previewGraphicsRef,
}: UseBattlemapInteractionsProps) {
  const isSpacePressedRef = useRef(false);

  // Store access
  const activeTool = useBattlemapStore((s) => s.activeTool);
  const fogTool = useBattlemapStore((s) => s.fogTool);
  const fogMode = useBattlemapStore((s) => s.fogMode);
  const brushSize = useBattlemapStore((s) => s.brushSize);
  const isDrawing = useBattlemapStore((s) => s.isDrawing);
  const setIsDrawing = useBattlemapStore((s) => s.setIsDrawing);
  const setCurrentPath = useBattlemapStore((s) => s.setCurrentPath);
  const appendToCurrentPath = useBattlemapStore((s) => s.appendToCurrentPath);
  const currentPath = useBattlemapStore((s) => s.currentPath);
  const clearCurrentPath = useBattlemapStore((s) => s.clearCurrentPath);

  // Keyboard events for Space panning
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressedRef.current) {
        if (
          ["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName
          )
        )
          return;

        isSpacePressedRef.current = true;
        if (viewport) {
          viewport.plugins.resume("drag");
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        // Re-evaluate drag pause based on tool??
        // For now, let the tool effect handle it
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [viewport]);

  // Toggle drag based on tool
  useEffect(() => {
    if (!viewport) return;

    // Resume drag if:
    // 1. Tool is PAN
    // 2. Spacebar is held (temporary pan)
    // 3. Tool is Select but dragging viewport (handled by Spacebar check mostly, or middle click if configured)

    // Explicitly:
    if (activeTool === "pan" || isSpacePressedRef.current) {
      viewport.plugins.resume("drag");
    } else {
      viewport.plugins.pause("drag");
    }
  }, [activeTool, viewport]);

  // Helper to render preview
  const updatePreview = useCallback(
    (x: number, y: number) => {
      const g = previewGraphicsRef.current;
      if (!g) return;

      g.clear();

      if (activeTool === "fog") {
        // Preview Style Configuration
        const isHide = fogMode === "hide";
        const fillColor = isHide ? 0x000000 : 0xffffff;
        const fillAlpha = 0.5;
        const strokeColor = isHide ? 0xffffff : 0xff0000;
        const strokeAlpha = 0.8;
        const strokeWidth = 2;

        if (fogTool === "fill") {
          g.rect(0, 0, FOG_SIZE, FOG_SIZE);
          g.fill({ color: fillColor, alpha: fillAlpha });
          g.stroke({
            color: strokeColor,
            width: strokeWidth,
            alpha: strokeAlpha,
          });
        } else if (fogTool === "brush") {
          // BRUSH: Show circle cursor (hover) or brushed path (drawing)
          g.circle(x, y, brushSize / 2);
          g.fill({ color: fillColor, alpha: 0.3 }); // Lighter fill for cursor
          g.stroke({ color: strokeColor, width: 1, alpha: strokeAlpha });

          // If drawing, show the full path so far?
          // Actually, brush path is complex to preview fully efficiently if long.
          // But we can show the current stroke if we want.
          // For now, let's just show the cursor.
          // If we want to show the stroke trail:
          if (isDrawing && currentPath.length >= 2) {
            g.moveTo(currentPath[0], currentPath[1]);
            for (let i = 2; i < currentPath.length; i += 2) {
              g.lineTo(currentPath[i], currentPath[i + 1]);
            }
            // Draw line to current pos
            g.lineTo(x, y);
            g.stroke({
              width: brushSize,
              color: fillColor,
              alpha: 0.5,
              cap: "round",
              join: "round",
            });
          }
        } else if (fogTool === "grid") {
          // GRID: Highlight cell using generic getCellShape
          const shape = GridRenderer.getCellShape(
            x,
            y,
            settings.gridType,
            settings.gridCellSize
          );

          if (shape) {
            if (shape.type === "rect") {
              const [rx, ry, rw, rh] = shape.data;
              g.rect(rx, ry, rw, rh);
            } else if (shape.type === "poly") {
              g.poly(shape.data);
            }
            g.fill({ color: fillColor, alpha: fillAlpha });
            g.stroke({
              color: strokeColor,
              width: strokeWidth,
              alpha: strokeAlpha,
            });
          }
        } else if (isDrawing) {
          // RECT / ELLIPSE / POLYGON (Drawing State)
          if (fogTool === "rect") {
            const startX = currentPath[0];
            const startY = currentPath[1];
            // Normalize preview
            const rectX = Math.min(startX, x);
            const rectY = Math.min(startY, y);
            const rectW = Math.abs(x - startX);
            const rectH = Math.abs(y - startY);

            g.rect(rectX, rectY, rectW, rectH);
            g.fill({ color: fillColor, alpha: fillAlpha });
            g.stroke({
              color: strokeColor,
              width: strokeWidth,
              alpha: strokeAlpha,
            });
          } else if (fogTool === "ellipse") {
            const startX = currentPath[0];
            const startY = currentPath[1];
            const width = x - startX;
            const height = y - startY;

            // Ellipse is usually defined by center and radius in Pixi 8?
            // Or center X, center Y, radius X, radius Y
            // x + width/2 is the center.
            const centerX = startX + width / 2;
            const centerY = startY + height / 2;
            const radiusX = Math.abs(width / 2);
            const radiusY = Math.abs(height / 2);

            g.ellipse(centerX, centerY, radiusX, radiusY);
            g.fill({ color: fillColor, alpha: fillAlpha });
            g.stroke({
              color: strokeColor,
              width: strokeWidth,
              alpha: strokeAlpha,
            });
          } else if (fogTool === "polygon") {
            if (currentPath.length >= 2) {
              g.moveTo(currentPath[0], currentPath[1]);
              for (let i = 2; i < currentPath.length; i += 2) {
                g.lineTo(currentPath[i], currentPath[i + 1]);
              }
              g.lineTo(x, y); // Dynamic line to cursor
              g.stroke({
                color: strokeColor,
                width: strokeWidth,
                alpha: strokeAlpha,
              });
              g.fill({ color: fillColor, alpha: 0.2 }); // Light fill to show potential shape
            }
          }
        }
      } else if (activeTool === "draw" && isDrawing) {
        // DRAW TOOL
        if (currentPath.length >= 2) {
          g.moveTo(currentPath[0], currentPath[1]);
          for (let i = 2; i < currentPath.length; i += 2) {
            g.lineTo(currentPath[i], currentPath[i + 1]);
          }
          g.lineTo(x, y);
          g.stroke({ color: 0xff0000, width: 2, alpha: 1 });
        }
      }
    },
    [
      activeTool,
      fogTool,
      fogMode,
      brushSize,
      isDrawing,
      currentPath,
      settings.gridCellSize,
      settings.gridType,
      previewGraphicsRef,
    ]
  );

  // Pointer Handlers
  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (isSpacePressedRef.current || e.button !== 0 || !viewport) return;

      const point = viewport.toLocal({ x: e.offsetX, y: e.offsetY });
      let { x, y } = point;

      // Snap logic (Magnetic Snap)
      // Toggle snap if Ctrl is pressed (invert setting)
      // Exception: Grid tool and Fill tool handle their own logic/don't need standard snap
      const shouldSnap = e.ctrlKey ? !settings.snapToGrid : settings.snapToGrid;
      if (
        shouldSnap &&
        activeTool === "fog" &&
        fogTool !== "grid" &&
        fogTool !== "fill"
      ) {
        const s = settings.gridCellSize;
        x = Math.round(x / s) * s;
        y = Math.round(y / s) * s;
      }

      if (activeTool === "fog") {
        if (fogTool === "fill") {
          doc.transact(() => {
            fogArray.push([
              {
                id: uuidv7(),
                type: "rect",
                data: [0, 0, FOG_SIZE, FOG_SIZE],
                operation: fogMode === "hide" ? "add" : "sub",
              },
            ]);
          });
          return;
        } else if (fogTool === "grid") {
          const shape = GridRenderer.getCellShape(
            x,
            y,
            settings.gridType,
            settings.gridCellSize
          );

          if (shape) {
            doc.transact(() => {
              fogArray.push([
                {
                  id: uuidv7(),
                  type: shape.type, // 'rect' or 'poly'
                  data: shape.data,
                  operation: fogMode === "hide" ? "add" : "sub",
                },
              ]);
            });
          }
        } else if (fogTool === "polygon") {
          if (!isDrawing) {
            setIsDrawing(true);
            setCurrentPath([x, y]);
          } else {
            appendToCurrentPath(x, y);
          }
        } else {
          setIsDrawing(true);
          if (fogTool === "brush") {
            setCurrentPath([x, y]);
          } else {
            // Rect/Ellipse
            setCurrentPath([x, y, x, y]);
          }
        }
      } else if (activeTool === "draw") {
        setIsDrawing(true);
        setCurrentPath([x, y]);
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
                layer: "map",
              },
            ]);
          });
        }
      }

      // Update preview immediately on down
      updatePreview(x, y);
    },
    [
      activeTool,
      fogTool,
      fogMode,
      isDrawing,
      settings.gridType,
      settings.gridCellSize,
      settings.snapToGrid,
      viewport,
      doc,
      fogArray,
      textsArray,
      setIsDrawing,
      setCurrentPath,
      appendToCurrentPath,
      updatePreview,
    ]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!viewport) return; // Removed !isDrawing check to allow hover preview

      const point = viewport.toLocal({ x: e.offsetX, y: e.offsetY });
      let { x, y } = point;

      // Snap logic (Magnetic Snap)
      const shouldSnap = e.ctrlKey ? !settings.snapToGrid : settings.snapToGrid;
      if (
        shouldSnap &&
        activeTool === "fog" &&
        fogTool !== "grid" &&
        fogTool !== "fill"
      ) {
        const s = settings.gridCellSize;
        x = Math.round(x / s) * s;
        y = Math.round(y / s) * s;
      }

      // Update Preview (Always, for hover cursors etc)
      updatePreview(x, y);

      if (!isDrawing) return;

      if (activeTool === "fog") {
        if (fogTool === "brush") {
          const lastX = currentPath[currentPath.length - 2];
          const lastY = currentPath[currentPath.length - 1];
          // Optimization: don't add too many points
          if (currentPath.length < 2 || Math.hypot(x - lastX, y - lastY) > 5) {
            appendToCurrentPath(x, y);
          }
        } else if (fogTool === "rect" || fogTool === "ellipse") {
          const startX = currentPath[0];
          const startY = currentPath[1];
          setCurrentPath([startX, startY, x, y]);
        }
      } else if (activeTool === "draw") {
        appendToCurrentPath(x, y);
      }
    },
    [
      isDrawing,
      viewport,
      activeTool,
      fogTool,
      currentPath,
      settings.gridCellSize,
      settings.snapToGrid,
      appendToCurrentPath,
      setCurrentPath,
      updatePreview,
    ]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing) return;

      if (activeTool === "fog") {
        if (fogTool === "rect" || fogTool === "ellipse") {
          const [startX, startY, endX, endY] = currentPath;
          // Normalize coordinates
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);

          if (width > 1 && height > 1) {
            doc.transact(() => {
              fogArray.push([
                {
                  id: uuidv7(),
                  type: fogTool,
                  data: [x, y, width, height],
                  operation: fogMode === "hide" ? "add" : "sub",
                },
              ]);
            });
          }
        } else if (fogTool === "brush" && currentPath.length >= 4) {
          doc.transact(() => {
            fogArray.push([
              {
                id: uuidv7(),
                type: "brush",
                data: [...currentPath],
                operation: fogMode === "hide" ? "add" : "sub",
                width: brushSize,
              },
            ]);
          });
        } else if (fogTool === "polygon") {
          // If Shift is pressed, keep adding points (return early)
          if (e.shiftKey) return;

          // If finishing (Shift released), push the shape if valid
          if (currentPath.length >= 6) {
            doc.transact(() => {
              fogArray.push([
                {
                  id: uuidv7(),
                  type: "poly",
                  data: [...currentPath],
                  operation: fogMode === "hide" ? "add" : "sub",
                },
              ]);
            });
            // Force finish
            setIsDrawing(false);
            clearCurrentPath();
            if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
          }
        }
      } else if (activeTool === "draw" && currentPath.length >= 4) {
        doc.transact(() => {
          drawingsArray.push([
            {
              id: uuidv7(),
              points: [...currentPath],
              color: "#ff0000",
              width: 2,
              layer: settings.activeLayerId || "map",
            },
          ]);
        });
      }

      // Default clearance for non-polygon tools (or failed polygon)
      // Don't reset for wall tool - it has its own drawing logic
      if (
        activeTool !== "wall" &&
        (activeTool !== "fog" || fogTool !== "polygon")
      ) {
        setIsDrawing(false);
        clearCurrentPath();
        if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
      }
    },
    [
      isDrawing,
      activeTool,
      fogTool,
      fogMode,
      brushSize,
      currentPath,
      doc,
      fogArray,
      drawingsArray,
      setIsDrawing,
      clearCurrentPath,
      previewGraphicsRef,
      settings.activeLayerId,
    ]
  );

  const onPointerLeave = useCallback(() => {
    if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
  }, [previewGraphicsRef]);

  // Attach to Canvas
  useEffect(() => {
    if (!app?.canvas) return;
    const canvas = app.canvas as HTMLCanvasElement;

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [app, onPointerDown, onPointerMove, onPointerUp, onPointerLeave]);
}
