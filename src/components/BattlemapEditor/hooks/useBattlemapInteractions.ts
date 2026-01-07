import { Application, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useCallback, useEffect, useRef } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import {
  BattlemapSettings,
  DrawingPath,
  FogShape,
  TextAnnotation,
} from "../types";

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
    if (activeTool === "select" || isSpacePressedRef.current) {
      // If space is pressed, we want drag regardless of tool?
      // Actually the keydown handler resumes it.
      // But if we switch tool, this effect runs.
      if (activeTool === "select") viewport.plugins.resume("drag");
    } else {
      if (!isSpacePressedRef.current) viewport.plugins.pause("drag");
    }
  }, [activeTool, viewport]);

  // Pointer Handlers
  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (isSpacePressedRef.current || e.button !== 0 || !viewport) return;

      const point = viewport.toLocal({ x: e.offsetX, y: e.offsetY });
      const { x, y } = point;

      if (activeTool === "fog") {
        if (fogTool === "grid") {
          const cellX =
            Math.floor(x / settings.gridCellSize) * settings.gridCellSize;
          const cellY =
            Math.floor(y / settings.gridCellSize) * settings.gridCellSize;
          doc.transact(() => {
            fogArray.push([
              {
                id: uuidv7(),
                type: "rect",
                data: [
                  cellX,
                  cellY,
                  settings.gridCellSize,
                  settings.gridCellSize,
                ],
                operation: fogMode === "hide" ? "add" : "sub",
              },
            ]);
          });
        } else if (fogTool === "polygon") {
          if (!isDrawing) {
            setIsDrawing(true);
            setCurrentPath([x, y]);
          } else {
            appendToCurrentPath(x, y);
          }
          // Preview update handled in Effect/Store subscription or render loop?
          // Actually better to handle preview in the interactions or a separate effect watching currentPath
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
    },
    [
      activeTool,
      fogTool,
      fogMode,
      isDrawing,
      settings,
      viewport,
      doc,
      fogArray,
      textsArray,
      setIsDrawing,
      setCurrentPath,
      appendToCurrentPath,
    ]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDrawing || !viewport) return;

      const point = viewport.toLocal({ x: e.offsetX, y: e.offsetY });
      const { x, y } = point;

      if (activeTool === "fog") {
        if (fogTool === "brush") {
          const lastX = currentPath[currentPath.length - 2];
          const lastY = currentPath[currentPath.length - 1];
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
      appendToCurrentPath,
      setCurrentPath,
    ]
  );

  const onPointerUp = useCallback(() => {
    if (!isDrawing) return;

    if (activeTool === "fog") {
      if (fogTool === "rect" || fogTool === "ellipse") {
        const [startX, startY, endX, endY] = currentPath;
        const width = endX - startX;
        const height = endY - startY;
        if (Math.abs(width) > 1 && Math.abs(height) > 1) {
          doc.transact(() => {
            fogArray.push([
              {
                id: uuidv7(),
                type: fogTool,
                data: [startX, startY, width, height],
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
      } else if (fogTool === "polygon" && currentPath.length >= 6) {
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
      }
      // NOTE: Polygon doesn't finish on pointer up necessarily?
      // Original code didn't finish polygon on pointer up immediately unless logic was specific.
      // Actually original code: "return; // Don't set isDrawing false, polygon continues until closed"
      // But here I'm setting isDrawing false at end.
      // If polygon, we probably shouldn't set isDrawing false here.
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

    if (activeTool !== "fog" || fogTool !== "polygon") {
      setIsDrawing(false);
      clearCurrentPath();
      if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
    }
  }, [
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
  ]);

  // Attach to Canvas
  useEffect(() => {
    if (!app?.canvas) return;
    const canvas = app.canvas as HTMLCanvasElement;

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp); // Window for drag release outside

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [app, onPointerDown, onPointerMove, onPointerUp]);
}
