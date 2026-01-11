import { Application, BlurFilter, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useCallback, useEffect, useRef } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { calculateFogFill } from "../../../utils/floodFill";
import { GridRenderer } from "../GridRenderer";
import {
  BattlemapSettings,
  ContextMenuAction,
  DrawingPath,
  DrawingShape,
  FogRoom,
  FogShape,
  Wall,
  WallSegment,
} from "../types";

const FOG_SIZE = 3000;

interface UseBattlemapInteractionsProps {
  app: Application | null;
  viewport: Viewport | null;
  doc: Y.Doc;
  fogArray: Y.Array<FogShape>;
  drawingsArray: Y.Array<DrawingPath>;
  wallsArray: Y.Array<Wall>;
  roomsArray: Y.Array<FogRoom>;
  settings: BattlemapSettings;
  previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  onOpenContextMenu: (
    x: number,
    y: number,
    actions: ContextMenuAction[]
  ) => void;
}

export function useBattlemapInteractions({
  app,
  viewport,
  doc,
  fogArray,
  drawingsArray,
  wallsArray,
  roomsArray,
  settings,
  previewGraphicsRef,
  onOpenContextMenu,
}: UseBattlemapInteractionsProps) {
  const isSpacePressedRef = useRef(false);
  const isMiddlePressedRef = useRef(false);
  const isSelectButtonPressedRef = useRef(false);
  /* eslint-disable react-compiler/react-compiler */
  const middleDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeHandleRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialResizeStateRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null); // For dragging items

  // Store access
  const activeTool = useBattlemapStore((s) => s.activeTool);
  const fogTool = useBattlemapStore((s) => s.fogTool);
  const drawTool = useBattlemapStore((s) => s.drawTool);
  const fogMode = useBattlemapStore((s) => s.fogMode);
  const activeRoomId = useBattlemapStore((s) => s.activeRoomId);
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

        // Enable temporary pan mode (updates toolbar)
        const { enableTemporaryPan } = useBattlemapStore.getState();
        enableTemporaryPan();

        if (viewport) {
          viewport.plugins.resume("drag");
        }
      }

      if (
        (e.code === "Delete" || e.code === "Backspace") &&
        useBattlemapStore.getState().activeTool === "select"
      ) {
        if (
          ["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName
          )
        )
          return;

        const { selectedDrawingIds, setSelectedDrawingIds } =
          useBattlemapStore.getState();

        if (selectedDrawingIds.length > 0) {
          doc.transact(() => {
            const items = drawingsArray.toArray();

            // Map to indices first, then sort descending to remove safely
            const indicesToDelete = items
              .map((d, i) => ({ id: d.id, index: i }))
              .filter((item) => selectedDrawingIds.includes(item.id))
              .map((item) => item.index)
              .sort((a, b) => b - a);

            indicesToDelete.forEach((index) => {
              drawingsArray.delete(index, 1);
            });
          });
          setSelectedDrawingIds([]);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;

        // Disable temporary pan mode (restore previous tool in toolbar)
        const { disableTemporaryPan } = useBattlemapStore.getState();
        disableTemporaryPan();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [viewport, doc, drawingsArray]);

  // Toggle drag based on tool
  useEffect(() => {
    if (!viewport) return;

    // Resume drag if:
    // 1. Tool is PAN
    // 2. Spacebar is held (temporary pan)
    // 3. Middle mouse button is held (temporary pan)

    if (
      activeTool === "pan" ||
      isSpacePressedRef.current ||
      isMiddlePressedRef.current
    ) {
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
      g.alpha = 1;
      g.filters = null;

      if (activeTool === "select") {
        g.clear();
        g.visible = false;

        // Marquee Selection Preview - only show when button pressed and no objects selected
        if (marqueeStartRef.current && isSelectButtonPressedRef.current) {
          const { selectedDrawingIds } = useBattlemapStore.getState();
          if (selectedDrawingIds.length === 0) {
            const startX = marqueeStartRef.current.x;
            const startY = marqueeStartRef.current.y;
            // Use raw viewport local for end point (x,y passed to updatePreview are viewport local)
            // normalize
            const minX = Math.min(startX, x);
            const minY = Math.min(startY, y);
            const w = Math.abs(x - startX);
            const h = Math.abs(y - startY);

            g.rect(minX, minY, w, h);
            g.fill({ color: 0x00aaff, alpha: 0.2 });
            g.stroke({ color: 0x00aaff, width: 1, alpha: 0.8 });
            g.visible = true;
          }
        }
        return;
      }

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
            settings.gridCellSize,
            settings.gridOffsetX || 0,
            settings.gridOffsetY || 0
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
      } else if (activeTool === "draw") {
        const {
          strokeColor,
          strokeWidth,
          fillColor,
          fillAlpha,
          opacity,
          blur,
        } = useBattlemapStore.getState().drawingProps;

        // Apply global properties to preview
        g.alpha = opacity ?? 1;
        if (blur && blur > 0) {
          const blurFilter = new BlurFilter();
          blurFilter.blur = blur;
          g.filters = [blurFilter];
        } else {
          g.filters = null;
        }

        if (drawTool === "brush") {
          // Brush Preview
          g.circle(x, y, (strokeWidth || 2) / 2);
          g.fill({ color: strokeColor, alpha: 1 });
          if (isDrawing && currentPath.length >= 2) {
            g.moveTo(currentPath[0], currentPath[1]);
            for (let i = 2; i < currentPath.length; i += 2) {
              g.lineTo(currentPath[i], currentPath[i + 1]);
            }
            g.lineTo(x, y);
            g.stroke({
              color: strokeColor,
              width: strokeWidth || 2,
              alpha: 1,
              cap: "round",
              join: "round",
            });
          }
        } else if (drawTool === "rect") {
          if (isDrawing) {
            const startX = currentPath[0];
            const startY = currentPath[1];
            const rectX = Math.min(startX, x);
            const rectY = Math.min(startY, y);
            const rectW = Math.abs(x - startX);
            const rectH = Math.abs(y - startY);
            g.rect(rectX, rectY, rectW, rectH);
            g.stroke({ color: strokeColor, width: strokeWidth || 2, alpha: 1 });
            g.fill({ color: fillColor || 0xffffff, alpha: fillAlpha ?? 0.1 });
          }
        } else if (drawTool === "ellipse") {
          if (isDrawing) {
            const startX = currentPath[0];
            const startY = currentPath[1];
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            const centerX = Math.min(startX, x) + width / 2;
            const centerY = Math.min(startY, y) + height / 2;

            g.ellipse(centerX, centerY, width / 2, height / 2);
            g.stroke({ color: strokeColor, width: strokeWidth || 2, alpha: 1 });
            g.fill({ color: fillColor || 0xffffff, alpha: fillAlpha ?? 0.1 });
          }
        } else if (drawTool === "polygon") {
          if (isDrawing && currentPath.length >= 2) {
            g.moveTo(currentPath[0], currentPath[1]);
            for (let i = 2; i < currentPath.length; i += 2) {
              g.lineTo(currentPath[i], currentPath[i + 1]);
            }
            g.lineTo(x, y);
            g.stroke({ color: strokeColor, width: strokeWidth || 2, alpha: 1 });
            g.fill({ color: fillColor || 0xffffff, alpha: fillAlpha ?? 0.1 }); // Show fill preview
          }
        }
      }
    },
    [
      activeTool,
      fogTool,
      drawTool,
      fogMode,
      brushSize,
      isDrawing,
      currentPath,
      settings.gridCellSize,
      settings.gridType,
      previewGraphicsRef,
    ]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!viewport) return;

      console.log("Canvas PointerDown:", {
        button: e.button,
        tool: activeTool,
        clientX: e.clientX,
        clientY: e.clientY,
        offsetX: e.offsetX,
        offsetY: e.offsetY,
      });

      // Allow middle button to pass through for drag (handled by mousedown listener)
      if (e.button === 1) return;

      // Handle Right Click (Context Menu)
      if (e.button === 2) {
        // Tokens context menu is handled by useTokenRenderer (Pixi interactions).
        // TODO: Implement Drawing context menu here (using drawingsArray).
        return;
      }

      // Tools only work with left button
      if (isSpacePressedRef.current || e.button !== 0) return;

      // Track left button press for select tool marquee visibility
      if (activeTool === "select" && e.button === 0) {
        isSelectButtonPressedRef.current = true;
      }

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
          const segments: WallSegment[] = [];
          if (wallsArray) {
            wallsArray.forEach((w) => segments.push(...w.segments));
          }

          const width = settings.mapWidth || FOG_SIZE;
          const height = settings.mapHeight || FOG_SIZE;
          const bounds = { x: 0, y: 0, width, height };

          // Use a reasonable resolution (e.g. 10px or 20px) depending on map size
          const resolution = 10;
          const poly = calculateFogFill(x, y, segments, bounds, resolution);

          if (poly && poly.length >= 6) {
            doc.transact(() => {
              const shapeId = uuidv7();
              fogArray.push([
                {
                  id: shapeId,
                  type: "poly",
                  data: poly,
                  operation: fogMode === "hide" ? "add" : "sub",
                },
              ]);

              // Auto-create Room if none active and we are revealing
              let targetRoomId = activeRoomId;
              if (!targetRoomId && fogMode === "reveal" && roomsArray) {
                targetRoomId = uuidv7();
                const newRoom: FogRoom = {
                  id: targetRoomId,
                  name: `Room ${roomsArray.length + 1}`,
                  color: "#3b82f6", // Default Blue
                  shapeIds: [],
                  bounds: [],
                  visible: true,
                  isRevealed: true,
                };
                roomsArray.push([newRoom]);
              }

              // Link to Room
              if (targetRoomId && fogMode === "reveal" && roomsArray) {
                const currentRooms = roomsArray.toArray();
                const roomIndex = currentRooms.findIndex(
                  (r) => r.id === targetRoomId
                );
                if (roomIndex !== -1) {
                  const room = currentRooms[roomIndex];
                  const updated = {
                    ...room,
                    shapeIds: [...(room.shapeIds || []), shapeId],
                  };
                  roomsArray.delete(roomIndex, 1);
                  roomsArray.insert(roomIndex, [updated]);
                }
              }
            });
          }
          return;
        } else if (fogTool === "grid") {
          const shape = GridRenderer.getCellShape(
            x,
            y,
            settings.gridType,
            settings.gridCellSize,
            settings.gridOffsetX || 0,
            settings.gridOffsetY || 0
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
        if (drawTool === "text") {
          doc.transact(() => {
            const id = uuidv7();
            drawingsArray.push([
              {
                id: id,
                type: "text",
                x,
                y,
                content: "Double click to edit",
                fontSize: 24,
                width: 200, // Default width for wrapping/resizing
                fontFamily: "Arial",
                strokeColor: "#ffffff",
                layer: "map",
              },
            ]);
            // Optional: Auto-select or enter edit mode immediately?
            // For now just place it.
          });
        } else if (drawTool === "polygon") {
          if (!isDrawing) {
            setIsDrawing(true);
            setCurrentPath([x, y]);
          } else {
            // Check if clicking near start point to close loop
            if (currentPath.length >= 2) {
              const startX = currentPath[0];
              const startY = currentPath[1];
              const dist = Math.hypot(x - startX, y - startY);
              if (dist < 20 && currentPath.length >= 6) {
                // Finish
                doc.transact(() => {
                  drawingsArray.push([
                    {
                      id: uuidv7(),
                      type: "polygon",
                      points: [...currentPath],
                      x: 0,
                      y: 0,
                      strokeColor: "#ff0000",
                      strokeWidth: 2,
                      fillColor: "#ffffff",
                      fillAlpha: 0.1,
                      layer: settings.activeLayerId || "map",
                    },
                  ]);
                });
                setIsDrawing(false);
                clearCurrentPath();
                if (previewGraphicsRef.current)
                  previewGraphicsRef.current.clear();
                return;
              }
            }
            appendToCurrentPath(x, y);
          }
        } else {
          // Brush, Rect, Ellipse
          setIsDrawing(true);
          if (drawTool === "brush") {
            setCurrentPath([x, y]);
          } else {
            // Rect/Ellipse initialization
            setCurrentPath([x, y, x, y]);
          }
        }
      } else if (activeTool === "select") {
        // Selection Logic
        // Selection Logic
        let hitId: string | null = null;
        let hitHandle: string | null = null;

        // Check handle hits first if something is selected
        const { selectedDrawingIds } = useBattlemapStore.getState();

        // Only allow resize if EXACTLY ONE item is selected
        if (selectedDrawingIds.length === 1) {
          const selectedDrawingId = selectedDrawingIds[0];
          const selectedItem = drawingsArray
            .toArray()
            .find((d) => d.id === selectedDrawingId);

          if (
            selectedItem &&
            (selectedItem.type === "rect" ||
              selectedItem.type === "ellipse" ||
              selectedItem.type === "text")
          ) {
            const handleSize = 10 / viewport.scaled;
            let bounds;

            if (selectedItem.type === "text") {
              const text = selectedItem.content || "";
              const fs = selectedItem.fontSize || 24;
              const approxWidth = text.length * fs * 0.6;
              const approxHeight = fs * 1.2;
              bounds = {
                x: selectedItem.x,
                y: selectedItem.y,
                width: approxWidth,
                height: approxHeight,
              };
            } else {
              bounds = {
                x: selectedItem.x,
                y: selectedItem.y,
                width: selectedItem.width,
                height: selectedItem.height,
              };
            }

            const handles = [
              { id: "tl", x: bounds.x, y: bounds.y },
              { id: "tr", x: bounds.x + bounds.width, y: bounds.y },
              {
                id: "bl",
                x: bounds.x,
                y: bounds.y + bounds.height,
              },
              {
                id: "br",
                x: bounds.x + bounds.width,
                y: bounds.y + bounds.height,
              },
            ];

            for (const h of handles) {
              if (
                Math.abs(x - h.x) < handleSize &&
                Math.abs(y - h.y) < handleSize
              ) {
                hitHandle = h.id;
                hitId = selectedItem.id;
                // Capture initial state for stable resizing
                initialResizeStateRef.current = { ...bounds };
                break;
              }
            }
          }
        }

        if (hitHandle) {
          resizeHandleRef.current = hitHandle;
          useBattlemapStore.getState().setIsDraggingDrawing(true); // Reuse drag flag for interaction state
          dragStartPosRef.current = { x, y };
        } else {
          // Normal selection/move
          resizeHandleRef.current = null;
          initialResizeStateRef.current = null;

          // Iterate in reverse to select top-most
          const items = drawingsArray.toArray();
          for (let i = items.length - 1; i >= 0; i--) {
            const d = items[i];
            let isHit = false;

            if (d.type === "text") {
              const text = d.content || "";
              const fs = d.fontSize || 24;
              const approxW = text.length * fs * 0.6;
              const approxH = fs * 1.2;
              if (
                x >= d.x &&
                x <= d.x + approxW &&
                y >= d.y &&
                y <= d.y + approxH
              ) {
                isHit = true;
              }
            } else if (d.type === "rect") {
              if (
                x >= d.x &&
                x <= d.x + d.width &&
                y >= d.y &&
                y <= d.y + d.height
              ) {
                isHit = true;
              }
            } else if (d.type === "ellipse") {
              const rx = d.width / 2;
              const ry = d.height / 2;
              const cx = d.x + rx;
              const cy = d.y + ry;
              const normalizedX = (x - cx) / rx;
              const normalizedY = (y - cy) / ry;
              if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
                isHit = true;
              }
            } else if (d.type === "polygon" || d.type === "brush") {
              // Basic bounding box check first
              let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
              const pts = d.points;
              for (let j = 0; j < pts.length; j += 2) {
                minX = Math.min(minX, pts[j]);
                maxX = Math.max(maxX, pts[j]);
                minY = Math.min(minY, pts[j + 1]);
                maxY = Math.max(maxY, pts[j + 1]);
              }
              if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                isHit = true;
              }
            }

            if (isHit) {
              hitId = d.id;
              break; // Found top-most
            }
          }

          const { setSelectedDrawingIds } = useBattlemapStore.getState();
          const isShift = e.shiftKey;
          const isAlreadySelected = hitId && selectedDrawingIds.includes(hitId);

          if (hitId) {
            if (isShift) {
              // Toggle selection
              if (isAlreadySelected) {
                setSelectedDrawingIds(
                  selectedDrawingIds.filter((id) => id !== hitId)
                );
              } else {
                setSelectedDrawingIds([...selectedDrawingIds, hitId]);
              }
              // Don't start dragging immediately if untoggling?
              // Actually, if we just toggled, we probably don't want to drag immediately unless we hold?
              // Let's allow dragging if we just selected it or if it remained selected.
              // If we unselected it, we shouldn't drag it.
              if (!isAlreadySelected) {
                // We just added it
                useBattlemapStore.getState().setIsDraggingDrawing(true);
                dragStartPosRef.current = { x, y };
              }
            } else {
              // No Shift
              if (isAlreadySelected) {
                // Keep other selections to allow trying to drag the group
                // We don't clear others yet. Any click on a selection should potentially be a drag start for the whole group.
                // IF we click and release without dragging, we might want to clear others?
                // Standard behavior:
                // - MouseDown on selected: Start drag, keep selection.
                // - MouseUp on same selected (didn't move): Select ONLY this one (deselect others).
                // For now, let's keep it simple: MouseDown on selected keeps group.
                useBattlemapStore.getState().setIsDraggingDrawing(true);
                dragStartPosRef.current = { x, y };
              } else {
                // Clicked a new unselected item -> Select ONLY this one
                setSelectedDrawingIds([hitId]);
                useBattlemapStore.getState().setIsDraggingDrawing(true);
                dragStartPosRef.current = { x, y };
              }
            }
          } else {
            // Clicked empty space
            if (!isShift) {
              setSelectedDrawingIds([]);
            }

            // START MARQUEE SELECTION
            // If dragging starts here, it's a marquee
            useBattlemapStore.getState().setIsDraggingDrawing(true); // Re-use drag flag
            marqueeStartRef.current = { x, y };
          }
        }
      } else if (activeTool === "text") {
        // Legacy text tool - removed functionality or mapped to drawTool 'text'
        // keeping mostly empty or redirecting logic if needed, but tool is removed from toolbar
      }

      // RIGHT CLICK -> Context Menu
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();

        // Hit Test for Drawings
        let hitId: string | null = null;
        const items = drawingsArray.toArray();
        for (let i = items.length - 1; i >= 0; i--) {
          const d = items[i];
          if (d.layer !== (settings.activeLayerId || "map")) continue;

          let isHit = false;
          if (d.type === "rect") {
            if (
              x >= d.x &&
              x <= d.x + d.width &&
              y >= d.y &&
              y <= d.y + d.height
            ) {
              isHit = true;
            }
          } else if (d.type === "ellipse") {
            const rx = d.width / 2;
            const ry = d.height / 2;
            const cx = d.x + rx;
            const cy = d.y + ry;
            if (
              Math.pow(x - cx, 2) / Math.pow(rx, 2) +
                Math.pow(y - cy, 2) / Math.pow(ry, 2) <=
              1
            ) {
              isHit = true;
            }
          } else if (d.type === "brush" || d.type === "polygon") {
            // Simplified bounding box hit for paths
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            const pts = d.points;
            for (let j = 0; j < pts.length; j += 2) {
              minX = Math.min(minX, pts[j]);
              maxX = Math.max(maxX, pts[j]);
              minY = Math.min(minY, pts[j + 1]);
              maxY = Math.max(maxY, pts[j + 1]);
            }
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
              isHit = true;
            }
          }

          if (isHit) {
            hitId = d.id;
            break; // Found top-most
          }
        }

        const actions: ContextMenuAction[] = [];
        if (hitId) {
          actions.push({
            id: "delete",
            label: "Delete",
            onClick: () => {
              const items = drawingsArray.toArray();
              const idx = items.findIndex((d) => d.id === hitId);
              if (idx !== -1) drawingsArray.delete(idx, 1);
            },
            danger: true,
          });
        } else {
          actions.push({
            id: "reset-view",
            label: "Reset View",
            onClick: () => viewport?.setZoom(1),
          });
        }

        if (actions.length > 0) {
          onOpenContextMenu(e.clientX, e.clientY, actions);
        }
        return;
      }

      // Update preview immediately on down
      updatePreview(x, y);
    },
    [
      viewport,
      doc,
      fogArray,
      drawingsArray,
      wallsArray,
      roomsArray,
      settings,
      previewGraphicsRef,
      activeTool,
      fogTool,
      drawTool,
      fogMode,
      activeRoomId,
      isDrawing,
      setIsDrawing,
      setCurrentPath,
      appendToCurrentPath,
      currentPath,
      clearCurrentPath,
      updatePreview,
      onOpenContextMenu,
    ]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const { isDraggingDrawing, isDrawing } = useBattlemapStore.getState();

      if (activeTool === "select") {
        const { selectedDrawingIds } = useBattlemapStore.getState();

        // FINISH MARQUEE SELECTION
        if (marqueeStartRef.current && viewport) {
          const start = marqueeStartRef.current;
          const end = viewport.toLocal({ x: e.offsetX, y: e.offsetY });

          // Check if it was a drag (tolerance)
          if (Math.hypot(end.x - start.x, end.y - start.y) > 5) {
            const minX = Math.min(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxX = Math.max(start.x, end.x);
            const maxY = Math.max(start.y, end.y);

            // Find all intersections
            const hits: string[] = [];
            drawingsArray.forEach((d) => {
              // Simple bbox check for all types for now
              let dMinX = 0,
                dMaxX = 0,
                dMinY = 0,
                dMaxY = 0;

              if (d.type === "rect" || d.type === "ellipse") {
                dMinX = d.x;
                dMaxX = d.x + d.width;
                dMinY = d.y;
                dMaxY = d.y + d.height;
              } else if (d.type === "text") {
                const fs = d.fontSize || 24;
                const approxW = d.width || (d.content?.length || 0) * fs * 0.6;
                const approxH = fs * 1.2; // Rough height
                dMinX = d.x;
                dMaxX = d.x + approxW;
                dMinY = d.y;
                dMaxY = d.y + approxH;
              } else if (d.type === "polygon" || d.type === "brush") {
                // Compute bounds
                let mx = Infinity,
                  my = Infinity,
                  Mx = -Infinity,
                  My = -Infinity;
                for (let i = 0; i < d.points.length; i += 2) {
                  mx = Math.min(mx, d.points[i]);
                  Mx = Math.max(Mx, d.points[i]);
                  my = Math.min(my, d.points[i + 1]);
                  My = Math.max(My, d.points[i + 1]);
                }
                dMinX = mx;
                dMaxX = Mx;
                dMinY = my;
                dMaxY = My;
              }

              // Intersection check (AABB)
              if (
                minX < dMaxX &&
                maxX > dMinX &&
                minY < dMaxY &&
                maxY > dMinY
              ) {
                hits.push(d.id);
              }
            });

            // If shift, toggle/add? For Marquee, usually ADD or REPLACE.
            // Let's standard: If shift, ADD. Else REPLACE.
            const isShift = e.shiftKey;
            if (isShift) {
              // Union
              const set = new Set([...selectedDrawingIds, ...hits]);
              useBattlemapStore
                .getState()
                .setSelectedDrawingIds(Array.from(set));
            } else {
              useBattlemapStore.getState().setSelectedDrawingIds(hits);
            }
          }

          // Cleanup
          marqueeStartRef.current = null;
          if (previewGraphicsRef.current) {
            previewGraphicsRef.current.clear();
          }
          // Force redraw to ensure cleared
          updatePreview(0, 0); // Coordinates don't matter since it will clear
        }

        // Always set pressed to false on up if left button
        if (e.button === 0) {
          isSelectButtonPressedRef.current = false;
        }

        useBattlemapStore.getState().setIsDraggingDrawing(false);
        dragStartPosRef.current = null;
        resizeHandleRef.current = null;
        initialResizeStateRef.current = null;
        return; // Stop here
      }

      if (!isDrawing && !isDraggingDrawing) return;

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
      } else if (activeTool === "draw" && isDrawing) {
        if (drawTool === "brush" && currentPath.length >= 4) {
          const newId = uuidv7();
          const { strokeColor, strokeWidth, opacity, blur } =
            useBattlemapStore.getState().drawingProps;

          doc.transact(() => {
            drawingsArray.push([
              {
                id: newId,
                type: "brush",
                points: [...currentPath],
                strokeColor: strokeColor || "#ff0000",
                strokeWidth: strokeWidth || 2,
                opacity: opacity ?? 1,
                blur: blur ?? 0,
                layer: settings.activeLayerId || "map",
                x: 0,
                y: 0,
              },
            ]);
          });
          // Auto Switch
          useBattlemapStore.getState().setActiveTool("select");
          useBattlemapStore.getState().setSelectedDrawingIds([newId]);
          setIsDrawing(false);
          clearCurrentPath();
        } else if (drawTool === "rect" || drawTool === "ellipse") {
          const [startX, startY, endX, endY] = currentPath;
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);

          if (width > 5 && height > 5) {
            // Min size check
            const newId = uuidv7();
            const {
              strokeColor,
              strokeWidth,
              fillColor,
              fillAlpha,
              opacity,
              blur,
            } = useBattlemapStore.getState().drawingProps;

            doc.transact(() => {
              drawingsArray.push([
                {
                  id: newId,
                  type: drawTool, // "rect" or "ellipse"
                  x,
                  y,
                  width,
                  height,
                  strokeColor: strokeColor || "#ff0000",
                  strokeWidth: strokeWidth || 2,
                  fillColor: fillColor || "#ffffff",
                  fillAlpha: fillAlpha ?? 0,
                  opacity: opacity ?? 1,
                  blur: blur ?? 0,
                  layer: settings.activeLayerId || "map",
                } as DrawingShape,
              ]);
            });
            // Auto Switch
            useBattlemapStore.getState().setActiveTool("select");
            useBattlemapStore.getState().setSelectedDrawingIds([newId]);
            setIsDrawing(false);
            clearCurrentPath();
          }
        } else if (drawTool === "polygon") {
          // Polygon finishes on double click or closing loop
          if (e.shiftKey) return;
        }
      }

      // Default clearance for non-polygon tools (or failed polygon)
      // Don't reset for wall tool - it has its own drawing logic
      const shouldClear =
        activeTool !== "wall" &&
        (activeTool !== "fog" || fogTool !== "polygon") &&
        (activeTool !== "draw" || drawTool !== "polygon");

      if (shouldClear) {
        setIsDrawing(false);
        clearCurrentPath();
        if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
      }
    },
    [
      activeTool,
      clearCurrentPath,
      currentPath,
      doc,
      drawTool,
      setIsDrawing,
      settings,
      viewport,
      drawingsArray,
      brushSize,
      fogArray,
      fogMode,
      fogTool,
      previewGraphicsRef,
    ]
  );

  // GLOBAL POINTER UP FIX
  useEffect(() => {
    const handleGlobalUp = () => {
      const { isDraggingDrawing, activeTool } = useBattlemapStore.getState();
      if (isDraggingDrawing || activeTool === "select") {
        useBattlemapStore.getState().setIsDraggingDrawing(false);
        dragStartPosRef.current = null;
        resizeHandleRef.current = null;
        initialResizeStateRef.current = null;
        isSelectButtonPressedRef.current = false;
        marqueeStartRef.current = null;
        const g = previewGraphicsRef.current;
        if (g) {
          g.clear();
          g.visible = false; // Hide if needed
        }
      }
    };

    window.addEventListener("pointerup", handleGlobalUp);
    return () => window.removeEventListener("pointerup", handleGlobalUp);
  }, [previewGraphicsRef]); // Run once

  const onDoubleClick = useCallback(
    (e: PointerEvent) => {
      if (!viewport) return;
      const point = viewport.toLocal({ x: e.offsetX, y: e.offsetY });

      if (activeTool === "draw" && drawTool === "polygon" && isDrawing) {
        // Finish Polygon
        if (currentPath.length >= 6) {
          const {
            strokeColor,
            strokeWidth,
            fillColor,
            fillAlpha,
            opacity,
            blur,
          } = useBattlemapStore.getState().drawingProps;

          const newId = uuidv7();
          doc.transact(() => {
            drawingsArray.push([
              {
                id: newId,
                type: "polygon",
                points: [...currentPath],
                x: 0,
                y: 0,
                strokeColor: strokeColor || "#ff0000",
                strokeWidth: strokeWidth || 2,
                fillColor: fillColor || "#ffffff",
                fillAlpha: fillAlpha ?? 0.1,
                opacity: opacity ?? 1,
                blur: blur ?? 0,
                layer: settings.activeLayerId || "map",
              },
            ]);
          });
          // Auto Switch
          useBattlemapStore.getState().setActiveTool("select");
          useBattlemapStore.getState().setSelectedDrawingIds([newId]);
          setIsDrawing(false);
          clearCurrentPath();
          if (previewGraphicsRef.current) previewGraphicsRef.current.clear();
        }
      } else if (activeTool === "select" || activeTool === "draw") {
        // Check for text editing
        // Simple hit test for now (could be optimized)
        const hitText = drawingsArray.toArray().find((d) => {
          if (d.type !== "text") return false;
          // Improved Hit Test for Text Edit
          const fs = d.fontSize || 24;
          // Use stored width or approximate
          const w = d.width || (d.content?.length || 0) * fs * 0.6;
          const h = fs * 1.2;

          return (
            point.x >= d.x &&
            point.x <= d.x + w &&
            point.y >= d.y &&
            point.y <= d.y + h
          );
        });

        if (hitText) {
          useBattlemapStore.getState().setEditingItemId(hitText.id);
        }
      }
    },
    [
      viewport,
      activeTool,
      drawTool,
      isDrawing,
      currentPath,
      doc,
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

  // Middle mouse button handler
  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        // Middle button
        e.preventDefault();
        e.stopPropagation();

        // Enable temporary pan mode (updates toolbar)
        const { enableTemporaryPan } = useBattlemapStore.getState();
        enableTemporaryPan();

        isMiddlePressedRef.current = true;
        middleDragStartRef.current = { x: e.clientX, y: e.clientY };

        // Change cursor to indicate pan mode
        if (app?.canvas) {
          (app.canvas as HTMLCanvasElement).style.cursor = "grab";
        }
      }
    },
    [app]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) {
        // Middle button

        // Disable temporary pan mode (restore previous tool in toolbar)
        const { disableTemporaryPan } = useBattlemapStore.getState();
        disableTemporaryPan();

        isMiddlePressedRef.current = false;
        middleDragStartRef.current = null;

        // Restore cursor
        if (app?.canvas) {
          (app.canvas as HTMLCanvasElement).style.cursor = "default";
        }
      }
    },
    [app]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!viewport) return;

      // Handle middle button drag manually
      if (isMiddlePressedRef.current && middleDragStartRef.current) {
        const dx = e.clientX - middleDragStartRef.current.x;
        const dy = e.clientY - middleDragStartRef.current.y;

        // Update viewport position
        // eslint-disable-next-line react-compiler/react-compiler
        viewport.x += dx;
        // eslint-disable-next-line react-compiler/react-compiler
        viewport.y += dy;

        // Update last position
        middleDragStartRef.current = { x: e.clientX, y: e.clientY };
        return; // Don't process other interactions during middle drag
      }

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
      const { isDraggingDrawing, selectedDrawingIds } =
        useBattlemapStore.getState();
      if (!isDraggingDrawing) {
        updatePreview(x, y);
      } else if (
        activeTool === "select" &&
        marqueeStartRef.current &&
        isSelectButtonPressedRef.current &&
        selectedDrawingIds.length === 0
      ) {
        const g = previewGraphicsRef.current;
        if (g) {
          g.clear();
          const startX = marqueeStartRef.current.x;
          const startY = marqueeStartRef.current.y;
          const minX = Math.min(startX, x);
          const minY = Math.min(startY, y);
          const w = Math.abs(x - startX);
          const h = Math.abs(y - startY);
          g.rect(minX, minY, w, h);
          g.fill({ color: 0x00aaff, alpha: 0.2 });
          g.stroke({ color: 0x00aaff, width: 1, alpha: 0.8 });
        }
      } else if (previewGraphicsRef.current) {
        previewGraphicsRef.current.clear();
      }

      if (!isDrawing && !isDraggingDrawing) return;

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
        if (drawTool === "brush") {
          // Optimization logic akin to fog brush
          const lastX = currentPath[currentPath.length - 2];
          const lastY = currentPath[currentPath.length - 1];
          if (currentPath.length < 2 || Math.hypot(x - lastX, y - lastY) > 2) {
            appendToCurrentPath(x, y);
          }
        } else if (drawTool === "rect" || drawTool === "ellipse") {
          const startX = currentPath[0];
          const startY = currentPath[1];
          setCurrentPath([startX, startY, x, y]);
        }
      } else if (activeTool === "select") {
        const { selectedDrawingIds } = useBattlemapStore.getState();
        if (selectedDrawingIds.length > 0 && dragStartPosRef.current) {
          // RESIZE Logic
          if (
            resizeHandleRef.current &&
            initialResizeStateRef.current &&
            selectedDrawingIds.length === 1
          ) {
            const selectedDrawingId = selectedDrawingIds[0];
            const dx = x - dragStartPosRef.current.x;
            const dy = y - dragStartPosRef.current.y;
            const init = initialResizeStateRef.current;
            const handle = resizeHandleRef.current;
            const startPos = dragStartPosRef.current;

            doc.transact(() => {
              const items = drawingsArray.toArray();
              const index = items.findIndex((d) => d.id === selectedDrawingId);
              if (index !== -1) {
                const item = items[index];
                if (item.type === "rect" || item.type === "ellipse") {
                  let newX = init.x;
                  let newY = init.y;
                  let newW = init.width;
                  let newH = init.height;

                  if (handle.includes("l")) {
                    newX += dx;
                    newW -= dx;
                  }
                  if (handle.includes("r")) {
                    newW += dx;
                  }
                  if (handle.includes("t")) {
                    newY += dy;
                    newH -= dy;
                  }
                  if (handle.includes("b")) {
                    newH += dy;
                  }

                  // Prevent negative size
                  if (newW < 10) newW = 10;
                  if (newH < 10) newH = 10;

                  const newItem = {
                    ...item,
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH,
                  };

                  drawingsArray.delete(index, 1);
                  drawingsArray.insert(index, [newItem]);
                } else if (item.type === "text") {
                  let newY = init.y;
                  let newH = init.height;

                  // Text primarily resizes by font size (Height)
                  // width follows content
                  if (handle.includes("t")) {
                    newY += dy;
                    newH -= dy;
                  }
                  if (handle.includes("b")) {
                    newH += dy;
                  }

                  if (newH < 10) newH = 10;

                  // Update font size based on height ratio (height = fontSize * 1.2)
                  const newFontSize = newH / 1.2;

                  // Width resize (wrapping) logic
                  let newW = init.width;
                  let finalX = init.x;

                  if (handle.includes("l")) {
                    const dx = x - startPos.x;
                    newW = Math.max(50, init.width - dx); // Min width 50
                    finalX = init.x + dx;
                  }
                  if (handle.includes("r")) {
                    const dx = x - startPos.x;
                    newW = Math.max(50, init.width + dx); // Min width 50
                  }

                  const newItem = {
                    ...item,
                    y: newY,
                    x: finalX,
                    width: newW,
                    fontSize: newFontSize,
                  };

                  drawingsArray.delete(index, 1);
                  drawingsArray.insert(index, [newItem]);
                }
              }
            });
          } else {
            // MOVE Logic (Multi-select support)
            const dx = x - dragStartPosRef.current.x;
            const dy = y - dragStartPosRef.current.y;

            // Move logic: Update ref to avoid accumulation
            dragStartPosRef.current = { x, y };

            doc.transact(() => {
              const items = drawingsArray.toArray();

              // Map items by ID for quick check/update if needed, or just iterate
              // Since we need to delete index and insert, working with the array list is best.
              // Careful with indices if we were deleting diverse items, but we replace 1-for-1.

              // We need to match IDs to current indices safely.
              const idToIndex = new Map<string, number>();
              items.forEach((d, i) => idToIndex.set(d.id, i));

              selectedDrawingIds.forEach((id) => {
                const index = idToIndex.get(id);
                if (index !== undefined) {
                  const item = items[index];
                  const newItem = { ...item };

                  // Move logic depends on type
                  if (newItem.type === "polygon" || newItem.type === "brush") {
                    // Points are absolute
                    newItem.points = newItem.points.map((v, i) =>
                      i % 2 === 0 ? v + dx : v + dy
                    );
                  } else {
                    // Rect, Ellipse, Text use x,y
                    newItem.x += dx;
                    newItem.y += dy;
                  }

                  // Perform the update
                  drawingsArray.delete(index, 1);
                  drawingsArray.insert(index, [newItem]);
                }
              });
            });
          }
        }
      }
    },
    [
      viewport,
      settings,
      activeTool,
      fogTool,
      drawTool,
      previewGraphicsRef,
      updatePreview,
      isDrawing,
      currentPath,
      appendToCurrentPath,
      setCurrentPath,
      doc,
      drawingsArray,
    ]
  );

  // Attach to Canvas
  useEffect(() => {
    if (!app?.canvas || !viewport) return;
    const canvas = app.canvas as HTMLCanvasElement;
    console.log("Attaching Battlemap Interactions to Canvas");

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener(
      "dblclick",
      onDoubleClick as unknown as EventListener
    ); // Pixi handles events differently, but for native canvas this works
    window.addEventListener("mouseup", onMouseUp); // Global to catch release anywhere
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener(
        "dblclick",
        onDoubleClick as unknown as EventListener
      );
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    app,
    viewport,
    activeTool,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onMouseDown,
    onMouseUp,
    onDoubleClick,
  ]);
}
