import { Application, Graphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { useCallback, useEffect, useRef } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { GridRenderer } from "../GridRenderer";
import type {
  BattlemapSettings,
  ContextMenuAction,
  Wall,
  WallSegment,
  WallToolType,
} from "../types";

// Force tsc refresh

const SNAP_THRESHOLD = 15; // pixels for magnetic snap to nearby endpoints
const DOOR_HIT_THRESHOLD = 20; // pixels to detect clicks on walls
const MIN_DOOR_WIDTH = 50; // default door width when splitting
const ELLIPSE_SEGMENTS = 16; // number of segments to approximate ellipse

interface UseWallInteractionsProps {
  app: Application | null;
  viewport: Viewport | null;
  doc: Y.Doc;
  wallsArray: Y.Array<Wall>;
  settings: BattlemapSettings;
  previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  setContextMenu: (
    menu: { x: number; y: number; actions: ContextMenuAction[] } | null
  ) => void;
}

interface Point {
  x: number;
  y: number;
}

interface EditDragState {
  type: "handle" | "wall";
  segmentId: string;
  handleType?: "p1" | "p2" | "cp1" | "cp2";
  startX: number;
  startY: number;
  originalSegments?: Record<string, WallSegment>;
}

interface SelectionBox {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface AutocompleteState {
  isActive: boolean;
  type: "door";
  targetWallId: string;
  targetSegmentId: string;
  p1: { x: number; y: number; t: number }; // Start of new door
  p2: { x: number; y: number; t: number }; // End of new door
}

// Helper to create a wall segment with defaults
const createSegment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  isDoor = false
): WallSegment => ({
  id: uuidv7(),
  x1,
  y1,
  x2,
  y2,
  curveType: "linear",
  isDoor,
  allowsMovement: true,
  allowsVision: false,
  allowsSound: false,
});

// Helper to find nearby endpoints for snapping
const findNearbyEndpoint = (
  x: number,
  y: number,
  walls: Wall[],
  threshold: number
): Point | null => {
  for (const wall of walls) {
    for (const seg of wall.segments) {
      // Check start point
      const d1 = Math.hypot(seg.x1 - x, seg.y1 - y);
      if (d1 <= threshold) {
        return { x: seg.x1, y: seg.y1 };
      }
      // Check end point
      const d2 = Math.hypot(seg.x2 - x, seg.y2 - y);
      if (d2 <= threshold) {
        return { x: seg.x2, y: seg.y2 };
      }
    }
  }
  return null;
};

// Generate ellipse points
const generateEllipseSegments = (
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  numSegments: number
): WallSegment[] => {
  const segments: WallSegment[] = [];
  for (let i = 0; i < numSegments; i++) {
    const angle1 = (i / numSegments) * Math.PI * 2;
    const angle2 = ((i + 1) / numSegments) * Math.PI * 2;
    const x1 = centerX + Math.cos(angle1) * radiusX;
    const y1 = centerY + Math.sin(angle1) * radiusY;
    const x2 = centerX + Math.cos(angle2) * radiusX;
    const y2 = centerY + Math.sin(angle2) * radiusY;
    segments.push(createSegment(x1, y1, x2, y2));
  }
  return segments;
};

// Helper: cubic Bezier point
const getCubicBezierPoint = (
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
};

// Helper: quadratic Bezier point
const getQuadraticBezierPoint = (
  t: number,
  p0: number,
  p1: number,
  p2: number
) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return mt2 * p0 + 2 * mt * t * p1 + t2 * p2;
};

// Calculates distance from point (px,py) to a segment (linear/curve)
// Returns { dist, t, closestX, closestY }
const distToSegment = (
  px: number,
  py: number,
  seg: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    cp1x?: number;
    cp1y?: number;
    cp2x?: number;
    cp2y?: number;
    curveType?: string;
  }
) => {
  if (seg.curveType === "cubic") {
    const x1 = seg.x1;
    const y1 = seg.y1;
    const x2 = seg.x2;
    const y2 = seg.y2;
    const cp1x = seg.cp1x ?? x1;
    const cp1y = seg.cp1y ?? y1;
    const cp2x = seg.cp2x ?? x1;
    const cp2y = seg.cp2y ?? y1;

    let minD2 = Infinity;
    let bestT = 0;
    let bestX = x1;
    let bestY = y1;

    // Sampling approach (sufficient for selection)
    // 20 samples is usually enough for picking
    const samples = 20;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bx = getCubicBezierPoint(t, x1, cp1x, cp2x, x2);
      const by = getCubicBezierPoint(t, y1, cp1y, cp2y, y2);
      const d2 = (px - bx) ** 2 + (py - by) ** 2;
      if (d2 < minD2) {
        minD2 = d2;
        bestT = t;
        bestX = bx;
        bestY = by;
      }
    }
    return { dist: Math.sqrt(minD2), t: bestT, x: bestX, y: bestY };
  } else if (seg.curveType === "quadratic") {
    const x1 = seg.x1;
    const y1 = seg.y1;
    const x2 = seg.x2;
    const y2 = seg.y2;
    const cp1x = seg.cp1x ?? x1;
    const cp1y = seg.cp1y ?? y1;

    let minD2 = Infinity;
    let bestT = 0;
    let bestX = x1;
    let bestY = y1;

    const samples = 15;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const bx = getQuadraticBezierPoint(t, x1, cp1x, x2);
      const by = getQuadraticBezierPoint(t, y1, cp1y, y2);
      const d2 = (px - bx) ** 2 + (py - by) ** 2;
      if (d2 < minD2) {
        minD2 = d2;
        bestT = t;
        bestX = bx;
        bestY = by;
      }
    }
    return { dist: Math.sqrt(minD2), t: bestT, x: bestX, y: bestY };
  } else {
    // Linear
    const l2 = (seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2;
    if (l2 === 0)
      return {
        dist: Math.hypot(px - seg.x1, py - seg.y1),
        t: 0,
        x: seg.x1,
        y: seg.y1,
      };

    let t =
      ((px - seg.x1) * (seg.x2 - seg.x1) + (py - seg.y1) * (seg.y2 - seg.y1)) /
      l2;
    t = Math.max(0, Math.min(1, t));
    const cx = seg.x1 + t * (seg.x2 - seg.x1);
    const cy = seg.y1 + t * (seg.y2 - seg.y1);
    return { dist: Math.hypot(px - cx, py - cy), t, x: cx, y: cy };
  }
};

// Helper: Linearly interpolate
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Helper: Split a segment at ratio t (0-1) preserving curvature
const splitSegment = (
  seg: WallSegment,
  t: number
): [WallSegment, WallSegment] => {
  // Shared props
  const props = {
    isDoor: seg.isDoor,
    allowsMovement: seg.allowsMovement,
    allowsVision: seg.allowsVision,
    allowsSound: seg.allowsSound,
    curveType: seg.curveType,
  };

  if (seg.curveType === "cubic") {
    // De Casteljau for Cubic
    const x0 = seg.x1,
      y0 = seg.y1;
    const x1 = seg.cp1x ?? x0,
      y1 = seg.cp1y ?? y0;
    const x2 = seg.cp2x ?? x0,
      y2 = seg.cp2y ?? y0;
    const x3 = seg.x2,
      y3 = seg.y2;

    // Level 1
    const x01 = lerp(x0, x1, t),
      y01 = lerp(y0, y1, t);
    const x12 = lerp(x1, x2, t),
      y12 = lerp(y1, y2, t);
    const x23 = lerp(x2, x3, t),
      y23 = lerp(y2, y3, t);

    // Level 2
    const x012 = lerp(x01, x12, t),
      y012 = lerp(y01, y12, t);
    const x123 = lerp(x12, x23, t),
      y123 = lerp(y12, y23, t);

    // Level 3 (Split Point)
    const x0123 = lerp(x012, x123, t),
      y0123 = lerp(y012, y123, t);

    const seg1: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: x0,
      y1: y0,
      x2: x0123,
      y2: y0123,
      cp1x: x01,
      cp1y: y01,
      cp2x: x012,
      cp2y: y012,
    };

    const seg2: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: x0123,
      y1: y0123,
      x2: x3,
      y2: y3,
      cp1x: x123,
      cp1y: y123,
      cp2x: x23,
      cp2y: y23,
    };
    return [seg1, seg2];
  } else if (seg.curveType === "quadratic") {
    // De Casteljau for Quadratic
    const x0 = seg.x1,
      y0 = seg.y1;
    const x1 = seg.cp1x ?? x0,
      y1 = seg.cp1y ?? y0;
    const x2 = seg.x2,
      y2 = seg.y2;

    const x01 = lerp(x0, x1, t),
      y01 = lerp(y0, y1, t);
    const x12 = lerp(x1, x2, t),
      y12 = lerp(y1, y2, t);
    const x012 = lerp(x01, x12, t),
      y012 = lerp(y01, y12, t);

    const seg1: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: x0,
      y1: y0,
      x2: x012,
      y2: y012,
      cp1x: x01,
      cp1y: y01,
    };

    const seg2: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: x012,
      y1: y012,
      x2: x2,
      y2: y2,
      cp1x: x12,
      cp1y: y12,
    };
    return [seg1, seg2];
  } else {
    // Linear
    const splitX = lerp(seg.x1, seg.x2, t);
    const splitY = lerp(seg.y1, seg.y2, t);

    const seg1: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: seg.x1,
      y1: seg.y1,
      x2: splitX,
      y2: splitY,
    };

    const seg2: WallSegment = {
      ...props,
      id: uuidv7(),
      x1: splitX,
      y1: splitY,
      x2: seg.x2,
      y2: seg.y2,
    };
    return [seg1, seg2];
  }
};

export function useWallInteractions({
  app,
  viewport,
  doc,
  wallsArray,
  settings,
  setContextMenu,
}: UseWallInteractionsProps) {
  const isSpacePressedRef = useRef(false);
  const isCtrlPressedRef = useRef(false);
  const isAltPressedRef = useRef(false);

  const activeTool = useBattlemapStore((s) => s.activeTool);
  const wallTool = useBattlemapStore((s) => s.wallTool);
  const isDrawing = useBattlemapStore((s) => s.isDrawing);
  const setIsDrawing = useBattlemapStore((s) => s.setIsDrawing);
  const clearCurrentPath = useBattlemapStore((s) => s.clearCurrentPath);
  const walls = useBattlemapStore((s) => s.walls);

  // Remove useWallMath call as the functions are defined locally

  // Keyboard events for Ctrl (snap toggle) and Space (pan)
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
      if (e.ctrlKey || e.metaKey) {
        isCtrlPressedRef.current = true;
      }
      if (e.altKey) {
        isAltPressedRef.current = true;
      }

      if (e.code === "KeyA" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (activeTool === "select") {
          const state = useBattlemapStore.getState();
          const { selectedSegmentIds, selectedWallId, walls } = state;

          if (selectedWallId || selectedSegmentIds.length > 0) {
            // Select ENTIRE parent wall of currently selected segments
            // First find which walls are involved
            const involvedWallIds = new Set<string>();
            if (selectedWallId) involvedWallIds.add(selectedWallId);

            walls.forEach((w) => {
              if (w.segments.some((s) => selectedSegmentIds.includes(s.id))) {
                involvedWallIds.add(w.id);
              }
            });

            if (involvedWallIds.size > 0) {
              // Select all segments from these walls
              const allSegIds: string[] = [];
              let primaryWallId: string | null = null;

              walls.forEach((w) => {
                if (involvedWallIds.has(w.id)) {
                  if (!primaryWallId) primaryWallId = w.id;
                  w.segments.forEach((s) => allSegIds.push(s.id));
                }
              });

              useBattlemapStore.setState({
                selectedWallId: primaryWallId, // Just pick the first one
                selectedSegmentIds: allSegIds,
              });
            }
          } else {
            // Nothing selected? Select ALL walls/segments
            const allSegIds: string[] = [];
            walls.forEach((w) =>
              w.segments.forEach((s) => allSegIds.push(s.id))
            );
            // Avoid setting selectedWallId to everything as it's a single ID.
            // Just select segments.
            useBattlemapStore.setState({
              selectedWallId: walls[0]?.id || null,
              selectedSegmentIds: allSegIds,
            });
          }
        }
      }

      // Delete / Backspace handler
      if (e.code === "Delete" || e.code === "Backspace") {
        if (
          ["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName
          )
        )
          return;

        const state = useBattlemapStore.getState();
        const { selectedSegmentIds, selectedWallId } = state;

        if (selectedSegmentIds.length > 0 || selectedWallId) {
          e.preventDefault();
          doc.transact(() => {
            for (let i = wallsArray.length - 1; i >= 0; i--) {
              const w = wallsArray.get(i);
              if (!w) continue; // Ensure wall exists

              // Check segments
              const segsToDelete = w.segments.filter((s) =>
                selectedSegmentIds.includes(s.id)
              );

              if (segsToDelete.length > 0) {
                // Filter out deleted segments
                const newSegments = w.segments.filter(
                  (s) => !selectedSegmentIds.includes(s.id)
                );

                // Delete the old wall entry
                wallsArray.delete(i, 1);

                // If any segments remain, re-insert the wall with updated segments
                // If NO segments remain, the wall is effectively deleted (which is what we want)
                if (newSegments.length > 0) {
                  wallsArray.insert(i, [{ ...w, segments: newSegments }]);
                }
              }
            }
          });

          useBattlemapStore.setState({
            selectedWallId: null,
            selectedSegmentIds: [],
          });
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
      }
      if (!e.ctrlKey && !e.metaKey) {
        isCtrlPressedRef.current = false;
      }
      if (!e.altKey) {
        isAltPressedRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [viewport, activeTool, doc, wallsArray]);

  // Refs to hold current callback references (to avoid stale closures in event listeners)
  const onPointerDownRef = useRef<
    (e: PointerEvent | MouseEvent | TouchEvent) => void
  >(() => undefined);
  const onPointerMoveRef = useRef<
    (e: PointerEvent | MouseEvent | TouchEvent) => void
  >(() => undefined);
  const onPointerUpRef = useRef<
    (e: PointerEvent | MouseEvent | TouchEvent) => void
  >(() => undefined);
  const onPointerLeaveRef = useRef<
    (e: PointerEvent | MouseEvent | TouchEvent) => void
  >(() => undefined);
  const onDoubleClickRef = useRef<(e: MouseEvent) => void>(() => undefined);

  // Transient state for editing
  const editDragStateRef = useRef<EditDragState | null>(null);

  // Transient state for box selection
  const selectionBoxRef = useRef<SelectionBox | null>(null);

  // Transient state for autocomplete
  const autocompleteStateRef = useRef<AutocompleteState | null>(null);

  // Create dedicated preview graphics for wall tool
  const wallPreviewGraphicsRef = useRef<Graphics | null>(null);

  useEffect(() => {
    const isActive = activeTool === "wall" || activeTool === "select";

    if (!viewport || !isActive) {
      // Clean up when wall or select tool is not active
      if (wallPreviewGraphicsRef.current) {
        viewport?.removeChild(wallPreviewGraphicsRef.current);
        wallPreviewGraphicsRef.current.destroy();
        wallPreviewGraphicsRef.current = null;
      }
      return;
    }

    // Create and add preview graphics when wall/select tool is active
    if (!wallPreviewGraphicsRef.current) {
      const g = new Graphics();
      wallPreviewGraphicsRef.current = g;
      viewport.addChild(g);
    }

    return () => {
      if (wallPreviewGraphicsRef.current) {
        viewport.removeChild(wallPreviewGraphicsRef.current);
        wallPreviewGraphicsRef.current.destroy();
        wallPreviewGraphicsRef.current = null;
      }
    };
  }, [viewport, activeTool]);

  // Snap coordinate to grid or nearby endpoint
  const snapCoordinate = useCallback(
    (x: number, y: number, forceNoSnap = false): Point => {
      // Toggle logic: Alt inhibits ALL snapping
      if (forceNoSnap || isAltPressedRef.current) {
        return { x, y };
      }

      const gridSnapEnabled = isCtrlPressedRef.current
        ? !settings.snapToGrid
        : settings.snapToGrid;

      // Endpoint snap always on unless Alt is pressed
      const disableEndpointSnap = isAltPressedRef.current;

      if (!disableEndpointSnap) {
        // First check for nearby wall endpoints (higher priority)
        const nearbyPoint = findNearbyEndpoint(x, y, walls, SNAP_THRESHOLD);
        if (nearbyPoint) {
          return nearbyPoint;
        }
      }

      if (!gridSnapEnabled) {
        return { x, y };
      }

      // Snap to grid
      const snapped = GridRenderer.snapToGrid(
        x,
        y,
        settings.gridType,
        settings.gridCellSize,
        settings.gridOffsetX || 0,
        settings.gridOffsetY || 0
      );
      return snapped;
    },
    [
      settings.snapToGrid,
      settings.gridType,
      settings.gridCellSize,
      settings.gridOffsetX,
      settings.gridOffsetY,
      walls,
    ]
  );

  // State for polygon bezier drawing
  interface PolyNode {
    x: number;
    y: number;
    handleInX?: number;
    handleInY?: number;
    handleOutX?: number;
    handleOutY?: number;
  }

  const nodesRef = useRef<PolyNode[]>([]);
  const dragStateRef = useRef<{ isDragging: boolean; origin: Point | null }>({
    isDragging: false,
    origin: null,
  });

  // Helper to convert nodes to cubic bezier segments
  // Helper to convert nodes to cubic bezier segments
  const nodesToSegments = useCallback((nodes: PolyNode[]): WallSegment[] => {
    const segments: WallSegment[] = [];
    if (nodes.length < 2) return segments;

    for (let i = 0; i < nodes.length - 1; i++) {
      const p1 = nodes[i];
      const p2 = nodes[i + 1];

      // If either has a relevant handle pointing towards the segment, it's a curve
      // For p1, handleOut points to p2. For p2, handleIn points from p1.
      if (
        (p1.handleOutX !== undefined && p1.handleOutY !== undefined) ||
        (p2.handleInX !== undefined && p2.handleInY !== undefined)
      ) {
        // Cubic Bezier
        // Default control points to the node itself if handle missing
        const cp1x = p1.handleOutX !== undefined ? p1.handleOutX : p1.x;
        const cp1y = p1.handleOutY !== undefined ? p1.handleOutY : p1.y;
        const cp2x = p2.handleInX !== undefined ? p2.handleInX : p2.x;
        const cp2y = p2.handleInY !== undefined ? p2.handleInY : p2.y;

        segments.push({
          id: uuidv7(),
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          cp1x,
          cp1y,
          cp2x,
          cp2y,
          curveType: "cubic",
          isDoor: false,
          allowsMovement: true,
          allowsVision: false,
          allowsSound: false,
        });
      } else {
        // Linear
        segments.push(createSegment(p1.x, p1.y, p2.x, p2.y));
      }
    }
    return segments;
  }, []); // nodesToSegments has no external dependencies that change, so empty array is fine.

  // Draw preview
  const updatePreview = useCallback(
    (x: number, y: number, tool: WallToolType) => {
      const g = wallPreviewGraphicsRef.current;

      if (!g) return;

      const state = useBattlemapStore.getState();
      const { isDrawing, currentPath } = state;

      g.clear();

      const strokeColor = 0xf59e0b; // Amber color for walls
      const strokeWidth = 3;
      const strokeAlpha = 0.8;
      const fillAlpha = 0.2;

      // Draw active nodes preview (Polygon)
      if (tool === "polygon" && isDrawing) {
        const nodes = nodesRef.current;
        if (nodes.length === 0) return;

        // Draw segments between committed nodes
        if (nodes.length > 0) {
          // We can reuse nodesToSegments logic for rendering, but simplified for Pixi
          // Or just manually draw the path
          g.strokeStyle = {
            color: strokeColor,
            width: strokeWidth,
            alpha: strokeAlpha,
          };
          g.moveTo(nodes[0].x, nodes[0].y);

          for (let i = 0; i < nodes.length - 1; i++) {
            const p1 = nodes[i];
            const p2 = nodes[i + 1];

            if (
              (p1.handleOutX !== undefined && p1.handleOutY !== undefined) ||
              (p2.handleInX !== undefined && p2.handleInY !== undefined)
            ) {
              const cp1x = p1.handleOutX !== undefined ? p1.handleOutX : p1.x;
              const cp1y = p1.handleOutY !== undefined ? p1.handleOutY : p1.y;
              const cp2x = p2.handleInX !== undefined ? p2.handleInX : p2.x;
              const cp2y = p2.handleInY !== undefined ? p2.handleInY : p2.y;
              g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            } else {
              g.lineTo(p2.x, p2.y);
            }
          }
          g.stroke();

          // Draw line to current cursor
          const lastNode = nodes[nodes.length - 1];
          // If dragging, we might be adjusting the last node's handles, so "cursor" logic handles that.
          // If NOT dragging, we draw a preview line to cursor (x, y)
          if (!dragStateRef.current.isDragging) {
            g.moveTo(lastNode.x, lastNode.y);
            // If last node has handleOut, this preview line could be a curve too?
            // For now, keep it simple: linear preview to cursor
            // But if lastNode has handleOut, it "launches" the curve.
            if (
              lastNode.handleOutX !== undefined &&
              lastNode.handleOutY !== undefined
            ) {
              g.quadraticCurveTo(
                lastNode.handleOutX,
                lastNode.handleOutY,
                x,
                y
              );
            } else {
              g.lineTo(x, y);
            }
            g.stroke({ width: 1, alpha: 0.5 });
          }
        }

        // Draw handles/vertices
        for (const node of nodes) {
          g.circle(node.x, node.y, 4);
          g.fill({ color: strokeColor, alpha: 1 });

          // Draw handles if they exist
          if (node.handleInX !== undefined && node.handleInY !== undefined) {
            g.moveTo(node.x, node.y);
            g.lineTo(node.handleInX, node.handleInY);
            g.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
            g.circle(node.handleInX, node.handleInY, 3);
            g.fill({ color: 0xffffff });
          }
          if (node.handleOutX !== undefined && node.handleOutY !== undefined) {
            g.moveTo(node.x, node.y);
            g.lineTo(node.handleOutX, node.handleOutY);
            g.stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
            g.circle(node.handleOutX, node.handleOutY, 3);
            g.fill({ color: 0xffffff });
          }
        }
      } else if (tool === "rect" && isDrawing && currentPath.length >= 2) {
        const startX = currentPath[0];
        const startY = currentPath[1];
        const rectX = Math.min(startX, x);
        const rectY = Math.min(startY, y);
        const rectW = Math.abs(x - startX);
        const rectH = Math.abs(y - startY);

        g.rect(rectX, rectY, rectW, rectH);
        g.stroke({
          color: strokeColor,
          width: strokeWidth,
          alpha: strokeAlpha,
        });
        g.fill({ color: strokeColor, alpha: fillAlpha });
      } else if (tool === "ellipse" && isDrawing && currentPath.length >= 2) {
        const startX = currentPath[0];
        const startY = currentPath[1];
        const radiusX = Math.abs(x - startX);
        const radiusY = Math.abs(y - startY);

        g.ellipse(startX, startY, radiusX, radiusY);
        g.stroke({
          color: strokeColor,
          width: strokeWidth,
          alpha: strokeAlpha,
        });
        g.fill({ color: strokeColor, alpha: fillAlpha });
      } else if (tool === "door") {
        // Show door indicator at cursor
        g.circle(x, y, 8);
        g.stroke({ color: 0x22c55e, width: 2, alpha: 0.8 });
        g.circle(x, y, 3);
        g.fill({ color: 0x22c55e, alpha: 1 });
      }

      // Show snap indicator for nearby endpoints
      const nearbyPoint = findNearbyEndpoint(x, y, walls, SNAP_THRESHOLD);
      if (nearbyPoint && !isCtrlPressedRef.current) {
        g.circle(nearbyPoint.x, nearbyPoint.y, 8);
        g.stroke({ color: 0x3b82f6, width: 2, alpha: 0.8 });
      }
    },
    [walls] // Removed nodesRef and dragStateRef as they are refs and their .current values are accessed directly.
  );

  // Pointer handlers
  const onPointerDown = useCallback(
    (e: PointerEvent | MouseEvent | TouchEvent) => {
      if (
        isSpacePressedRef.current ||
        ("button" in e && e.button !== 0) ||
        !viewport
      )
        return;
      if (activeTool !== "wall" && activeTool !== "select") return;

      // Check for layer lock
      const isLocked = settings.layers?.find(
        (l) => l.id === "obstacles"
      )?.locked;
      if (isLocked) return;

      // Use offsetX/offsetY for direct canvas-relative coordinates if available
      let canvasX: number;
      let canvasY: number;

      if ("offsetX" in e && typeof (e as MouseEvent).offsetX === "number") {
        // Standard PointerEvent/MouseEvent
        canvasX = (e as MouseEvent).offsetX;
        canvasY = (e as MouseEvent).offsetY;
      } else {
        // TouchEvent or fallback
        const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
        const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;
        const canvas = app?.canvas as HTMLCanvasElement;
        const rect = canvas?.getBoundingClientRect();
        canvasX = clientX - (rect?.left || 0);
        canvasY = clientY - (rect?.top || 0);
      }

      const point = viewport.toLocal({ x: canvasX, y: canvasY });
      const snapped = snapCoordinate(point.x, point.y);
      const { x, y } = snapped;

      const state = useBattlemapStore.getState();
      const {
        wallTool,
        isDrawing,
        setCurrentPath,
        appendToCurrentPath,
        selectedWallId,
        selectedSegmentIds,
        isDraggingToken,
      } = state;

      if (isDraggingToken) return;

      if (activeTool === "select") {
        const currentWalls = useBattlemapStore.getState().walls;
        // First, check for handles (highest priority)
        let handleFound = false;
        for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
          const wall = currentWalls[wIndex];
          for (let sIndex = 0; sIndex < wall.segments.length; sIndex++) {
            const seg = wall.segments[sIndex];
            const isSelected =
              selectedWallId === wall.id || selectedSegmentIds.includes(seg.id);

            if (!isSelected) continue;

            const checkHandle = (
              hx: number | undefined,
              hy: number | undefined,
              type: "p1" | "p2" | "cp1" | "cp2"
            ) => {
              if (hx === undefined || hy === undefined) return false;
              if (Math.hypot(hx - x, hy - y) <= 10) {
                editDragStateRef.current = {
                  type: "handle",
                  segmentId: seg.id,
                  handleType: type,
                  startX: x,
                  startY: y,
                };
                return true;
              }
              return false;
            };

            if (checkHandle(seg.x1, seg.y1, "p1")) {
              handleFound = true;
              break;
            }
            if (checkHandle(seg.x2, seg.y2, "p2")) {
              handleFound = true;
              break;
            }
            if (seg.curveType === "quadratic" || seg.curveType === "cubic") {
              if (checkHandle(seg.cp1x, seg.cp1y, "cp1")) {
                handleFound = true;
                break;
              }
            }
            if (seg.curveType === "cubic") {
              if (checkHandle(seg.cp2x, seg.cp2y, "cp2")) {
                handleFound = true;
                break;
              }
            }
          }
          if (handleFound) break;
        }

        if (handleFound) return;

        // CHECK IF CLICKED ON ALREADY SELECTED SEGMENT (FOR DRAGGING)
        // If we click on a segment that is already selected, we might be starting a drag
        // so we shouldn't immediately clear selection or re-select unless Shift is held.
        if (selectedSegmentIds.length > 0) {
          for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
            const wall = currentWalls[wIndex];
            for (let sIndex = 0; sIndex < wall.segments.length; sIndex++) {
              const seg = wall.segments[sIndex];
              if (selectedSegmentIds.includes(seg.id)) {
                const { dist: d } = distToSegment(point.x, point.y, seg);
                if (d < 20) {
                  // Start Wall Drag
                  const snapshot: Record<string, WallSegment> = {};
                  // If shift is NOT held, we might want to move the whole wall,
                  // but for now let's stick to moving selected segments.
                  // BETTER UX: If clicking a selected segment, move all selected segments.
                  selectedSegmentIds.forEach((id) => {
                    // Find segment in current walls
                    for (const w of currentWalls) {
                      const s = w.segments.find((sg) => sg.id === id);
                      if (s) snapshot[id] = { ...s };
                    }
                  });

                  editDragStateRef.current = {
                    type: "wall",
                    segmentId: seg.id, // The one we clicked
                    startX: x, // Use snapped or raw? Raw is smoother probably, but consistency... let's use current x,y
                    startY: y,
                    originalSegments: snapshot,
                  };
                  return; // Stop processing, we are dragging
                }
              }
            }
          }
        }

        // If not dragging existing selection, check for new selection
        let hitWallId: string | null = null;
        let hitSegmentId: string | null = null;
        let hitDist = Number.MAX_VALUE;

        // Simple distance check to all segments
        for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
          const wall = currentWalls[wIndex];
          for (let sIndex = 0; sIndex < wall.segments.length; sIndex++) {
            const seg = wall.segments[sIndex];
            const { dist: d } = distToSegment(point.x, point.y, seg);
            // Increase threshold for easier selection
            if (d < 20 && d < hitDist) {
              hitDist = d;
              hitWallId = wall.id;
              hitSegmentId = seg.id;
            }
          }
        }

        // Update selection
        if (hitWallId && hitSegmentId) {
          const isShift = (e as MouseEvent).shiftKey;
          let newSelectedSegments = [...selectedSegmentIds];

          if (isShift) {
            if (newSelectedSegments.includes(hitSegmentId)) {
              newSelectedSegments = newSelectedSegments.filter(
                (id) => id !== hitSegmentId
              );
            } else {
              newSelectedSegments.push(hitSegmentId);
            }
          } else {
            // New selection - only if we didn't just click an already selected one (handled above)
            newSelectedSegments = [hitSegmentId];
          }

          useBattlemapStore.setState({
            selectedWallId: hitWallId,
            selectedSegmentIds: newSelectedSegments,
          });
        } else {
          // Clicked empty space
          // Clicked empty space

          if (activeTool === "select") {
            // Start Box Selection
            selectionBoxRef.current = {
              isActive: true,
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
            };

            // If NOT Holding Shift, clear selection immediately?
            // Or only clear if box ends up being empty/small?
            // Usual behavior: Click empty space clears selection immediately.
            // Drag box starts new selection.
            // Shift+Drag adds.
            if (!(e as MouseEvent).shiftKey) {
              useBattlemapStore.setState({
                selectedWallId: null,
                selectedSegmentIds: [],
                selectedTokenIds: [],
              });
            }
          } else {
            useBattlemapStore.setState({
              selectedWallId: null,
              selectedSegmentIds: [],
              selectedTokenIds: [],
            });
          }
        }

        if (hitWallId) return; // Selected something, stop processing
      }

      if (activeTool !== "wall") return;

      if (wallTool === "polygon") {
        if (!isDrawing) {
          // Start new polygon
          state.setIsDrawing(true);
          // Just for store compatibility, we can push something to currentPath if needed,
          // but we mostly rely on nodesRef now.
          setCurrentPath([x, y]);
          nodesRef.current = [{ x, y }];
          dragStateRef.current = { isDragging: true, origin: { x, y } };
        } else {
          // Add new node
          const newNode: PolyNode = { x, y };
          nodesRef.current.push(newNode);
          dragStateRef.current = { isDragging: true, origin: { x, y } };
          // Keep store in sync roughly (just points)
          appendToCurrentPath(x, y);
        }
      } else if (wallTool === "rect" || wallTool === "ellipse") {
        state.setIsDrawing(true);
        setCurrentPath([x, y]);
      } else if (wallTool === "door") {
        // Find nearest segment to toggle door
        let bestDist = DOOR_HIT_THRESHOLD;
        let bestWallIndex = -1;
        let bestSegIndex = -1;
        // Explicitly type bestPoint to avoid 'never' inference if initialized to null
        let bestPoint: { x: number; y: number; t: number } | null = null;

        // Use UNSNAPPED coordinates for hit detection for better feel
        // But point.x/y from viewport.toLocal might be better than 'x,y' if snap is on?
        // Let's use the raw mouse pos transformed to world (point.x, point.y)
        const hitX = point.x;
        const hitY = point.y;

        // IMPORTANT: Get fresh walls from store to avoid stale closure
        const currentWalls = useBattlemapStore.getState().walls;

        currentWalls.forEach((wall, wIndex) => {
          wall.segments.forEach((seg, sIndex) => {
            const { dist, t, x: cx, y: cy } = distToSegment(hitX, hitY, seg);
            if (dist < bestDist) {
              bestDist = dist;
              bestWallIndex = wIndex;
              bestSegIndex = sIndex;
              bestPoint = { x: cx, y: cy, t };
            }
          });
        });

        if (bestWallIndex !== -1 && bestSegIndex !== -1 && bestPoint) {
          // Extract bestPoint to typed variable to help TypeScript
          const clickPoint = bestPoint as { x: number; y: number; t: number };
          const targetWall = currentWalls[bestWallIndex];
          const targetSeg = targetWall.segments[bestSegIndex];
          const segLength = Math.hypot(
            targetSeg.x2 - targetSeg.x1,
            targetSeg.y2 - targetSeg.y1
          );

          // If segment is long enough and click is "inside" (not near ends), split it
          // Near center means t is not close to 0 or 1.
          // However, if we want a fixed size door, we need to check if there is space.
          // MIN_DOOR_WIDTH is e.g. 50.

          // If segment is already short (e.g. < 1.5 * door width), just toggle it.
          if (segLength < MIN_DOOR_WIDTH * 1.5) {
            // Toggle existing segment
            doc.transact(() => {
              const wallItem = wallsArray.get(bestWallIndex);
              const newSegments = [...wallItem.segments];
              newSegments[bestSegIndex] = {
                ...targetSeg,
                isDoor: !targetSeg.isDoor,
                allowsMovement: !targetSeg.isDoor, // Open door = movement allowed
                allowsVision: !targetSeg.isDoor, // Open door = vision allowed? Usually doors block vision when closed
                // If isDoor becomes true (Closed Door initially?), usually blocks movement/vision?
                // Implementation plan says: "allows movement but block vision/sound by default"
                // Let's stick to defaults: isDoor=true -> standard door properties
              };

              // If turning INTO a door
              if (!targetSeg.isDoor) {
                newSegments[bestSegIndex].allowsMovement = true; // Can walk through logic? Or needs to be "opened"?
                newSegments[bestSegIndex].allowsVision = false; // Blocks sight
              } else {
                // Turning OFF door -> standard wall
                newSegments[bestSegIndex].allowsMovement = false;
                newSegments[bestSegIndex].allowsVision = false;
              }

              wallsArray.delete(bestWallIndex, 1);
              wallsArray.insert(bestWallIndex, [
                { ...wallItem, segments: newSegments },
              ]);
            });
          } else {
            // Split segment into Wall-Door-Wall
            // Click point is center of door
            const cx = clickPoint.x;
            const cy = clickPoint.y;

            // Unit vector of segment
            const dx = (targetSeg.x2 - targetSeg.x1) / segLength;
            const dy = (targetSeg.y2 - targetSeg.y1) / segLength;

            const halfDoor = MIN_DOOR_WIDTH / 2;

            // P1 (start of door)
            const p1x = cx - dx * halfDoor;
            const p1y = cy - dy * halfDoor;

            // P2 (end of door)
            const p2x = cx + dx * halfDoor;
            const p2y = cy + dy * halfDoor;

            // Validate P1 and P2 are within segment?
            // t check?
            // Simplest: Check distances from start
            // Dist from Start to C = t * segLength
            const distToCenter = clickPoint.t * segLength;

            if (
              distToCenter < halfDoor ||
              segLength - distToCenter < halfDoor
            ) {
              // Too close to edge, don't split, just fail or toggle?
              // User probably meant to toggle if clicking near end?
              // No, just return for now to avoid weird tiny wall segments.
              return;
            }

            const newSeg1 = createSegment(targetSeg.x1, targetSeg.y1, p1x, p1y);
            const doorSeg = createSegment(p1x, p1y, p2x, p2y, true); // isDoor = true
            // Defaults for door
            doorSeg.allowsMovement = true;
            doorSeg.allowsVision = false;

            const newSeg2 = createSegment(p2x, p2y, targetSeg.x2, targetSeg.y2);

            doc.transact(() => {
              const wallItem = wallsArray.get(bestWallIndex);
              const newSegments = [...wallItem.segments];
              // Replace old segment with 3 new ones
              newSegments.splice(bestSegIndex, 1, newSeg1, doorSeg, newSeg2);

              wallsArray.delete(bestWallIndex, 1);
              wallsArray.insert(bestWallIndex, [
                { ...wallItem, segments: newSegments },
              ]);
            });
          }
        }
      }

      updatePreview(x, y, wallTool);
    },
    [
      activeTool,
      viewport,
      snapCoordinate,
      updatePreview,
      doc,
      wallsArray,
      app,
      settings.layers,
    ]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent | MouseEvent | TouchEvent) => {
      if (!viewport || (activeTool !== "wall" && activeTool !== "select"))
        return;

      // Extract client coordinates and convert to canvas-relative
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;

      const canvas = app?.canvas as HTMLCanvasElement;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const point = viewport.toLocal({ x: canvasX, y: canvasY });
      const snapped = snapCoordinate(point.x, point.y);
      const { x, y } = snapped;

      const { wallTool, isDrawing } = useBattlemapStore.getState();

      // Box Selection Logic
      if (activeTool === "select" && selectionBoxRef.current?.isActive) {
        const box = selectionBoxRef.current;
        box.currentX = x; // Snapped or clientX? usually selection is free, but mapped to world
        box.currentY = y;

        // Draw Preview
        const g = wallPreviewGraphicsRef.current;
        if (g) {
          g.clear();
          const rectX = Math.min(box.startX, box.currentX);
          const rectY = Math.min(box.startY, box.currentY);
          const rectW = Math.abs(box.currentX - box.startX);
          const rectH = Math.abs(box.currentY - box.startY);

          g.rect(rectX, rectY, rectW, rectH);
          g.fill({ color: 0x3b82f6, alpha: 0.2 });
          g.stroke({ color: 0x3b82f6, width: 1, alpha: 0.8 });
        }
        return;
      }

      // EDITING LOGIC
      if (activeTool === "select" && editDragStateRef.current) {
        const drag = editDragStateRef.current;
        const dx = x - drag.startX;
        const dy = y - drag.startY;

        if (drag.type === "handle" && drag.handleType) {
          const { segmentId, handleType } = drag;

          // Find specific segment to update
          doc.transact(() => {
            let found = false;
            for (let i = 0; i < wallsArray.length; i++) {
              if (found) break;
              const w = wallsArray.get(i);
              const segIdx = w.segments.findIndex((s) => s.id === segmentId);
              if (segIdx !== -1) {
                found = true;
                const newSegments = [...w.segments];
                const seg = { ...newSegments[segIdx] };

                if (handleType === "p1") {
                  seg.x1 = x;
                  seg.y1 = y;
                } else if (handleType === "p2") {
                  seg.x2 = x;
                  seg.y2 = y;
                } else if (handleType === "cp1") {
                  seg.cp1x = x;
                  seg.cp1y = y;
                } else if (handleType === "cp2") {
                  seg.cp2x = x;
                  seg.cp2y = y;
                }

                newSegments[segIdx] = seg;
                wallsArray.delete(i, 1);
                wallsArray.insert(i, [{ ...w, segments: newSegments }]);
              }
            }
          });
        } else if (drag.type === "wall" && drag.originalSegments) {
          const originalSegments = drag.originalSegments;
          // Move all dragged segments
          doc.transact(() => {
            for (const [id, originalSeg] of Object.entries(originalSegments)) {
              for (let i = 0; i < wallsArray.length; i++) {
                const w = wallsArray.get(i);
                let modified = false;
                const newSegments = w.segments.map((seg) => {
                  if (seg.id === id) {
                    modified = true;
                    return {
                      ...seg,
                      x1: originalSeg.x1 + dx,
                      y1: originalSeg.y1 + dy,
                      x2: originalSeg.x2 + dx,
                      y2: originalSeg.y2 + dy,
                      ...(seg.cp1x !== undefined
                        ? { cp1x: (originalSeg.cp1x || 0) + dx }
                        : {}),
                      ...(seg.cp1y !== undefined
                        ? { cp1y: (originalSeg.cp1y || 0) + dy }
                        : {}),
                      ...(seg.cp2x !== undefined
                        ? { cp2x: (originalSeg.cp2x || 0) + dx }
                        : {}),
                      ...(seg.cp2y !== undefined
                        ? { cp2y: (originalSeg.cp2y || 0) + dy }
                        : {}),
                    };
                  }
                  return seg;
                });

                if (modified) {
                  wallsArray.delete(i, 1);
                  wallsArray.insert(i, [{ ...w, segments: newSegments }]);
                }
              }
            }
          });
        }
        return;
      }

      if (
        wallTool === "polygon" &&
        isDrawing &&
        dragStateRef.current.isDragging &&
        dragStateRef.current.origin
      ) {
        // We are dragging to create handles for the ACTIVE node (the last one)
        const nodes = nodesRef.current;
        if (nodes.length > 0) {
          const activeNode = nodes[nodes.length - 1];
          const origin = dragStateRef.current.origin;

          const dx = x - origin.x;
          const dy = y - origin.y;

          activeNode.handleOutX = origin.x + dx;
          activeNode.handleOutY = origin.y + dy;
          activeNode.handleInX = origin.x - dx;
          activeNode.handleInY = origin.y - dy;

          updatePreview(x, y, wallTool);
          return;
        }
      }

      // AUTOCOMPLETE DETECTION (For Linear Wall Only)
      if (
        wallTool === "polygon" &&
        isDrawing &&
        !dragStateRef.current.isDragging
      ) {
        const nodes = nodesRef.current;
        if (nodes.length > 0) {
          const lastNode = nodes[nodes.length - 1];

          // If dragging a straight line from lastNode to (x,y)
          // Check if this line is ON TOP of an existing wall
          // And length is "door-like" (< 150px)
          const overlayLength = Math.hypot(x - lastNode.x, y - lastNode.y);

          let bestCandidate: {
            wIdx: number;
            sIdx: number;
            startT: number;
            endT: number;
          } | null = null;

          const currentWalls = useBattlemapStore.getState().walls;
          if (overlayLength > 10 && overlayLength < 150) {
            // Normalize Draw Vector
            const drawDx = x - lastNode.x;
            const drawDy = y - lastNode.y;
            const len = Math.hypot(drawDx, drawDy);
            const ndx = drawDx / (len || 1);
            const ndy = drawDy / (len || 1);

            for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
              const w = currentWalls[wIndex];
              for (let sIndex = 0; sIndex < w.segments.length; sIndex++) {
                const s = w.segments[sIndex];
                // Only support Linear overlap for now
                if (s.curveType && s.curveType !== "linear") continue;

                // Check collinearity
                const sdx = s.x2 - s.x1;
                const sdy = s.y2 - s.y1;
                const sLen = Math.hypot(sdx, sdy);
                if (sLen === 0) continue;

                // Check if start point is on segment
                const { dist: d1, t: t1 } = distToSegment(
                  lastNode.x,
                  lastNode.y,
                  s
                );
                const { dist: d2, t: t2 } = distToSegment(x, y, s);

                if (d1 < 10 && d2 < 10) {
                  // Cross product check for collinearity
                  const cross = ndx * (sdy / sLen) - ndy * (sdx / sLen);
                  if (Math.abs(cross) < 0.1) {
                    bestCandidate = {
                      wIdx: wIndex,
                      sIdx: sIndex,
                      startT: t1,
                      endT: t2,
                    };
                    break;
                  }
                }
              }
              if (bestCandidate) break;
            }
          }

          if (bestCandidate) {
            const currentWallsFresh = useBattlemapStore.getState().walls;
            const targetWall = currentWallsFresh[bestCandidate.wIdx];
            const targetSeg = targetWall.segments[bestCandidate.sIdx];
            autocompleteStateRef.current = {
              isActive: true,
              type: "door",
              targetWallId: targetWall.id,
              targetSegmentId: targetSeg.id,
              p1: { x: lastNode.x, y: lastNode.y, t: bestCandidate.startT },
              p2: { x, y, t: bestCandidate.endT },
            };

            const g = wallPreviewGraphicsRef.current;
            if (g) {
              g.clear();
              g.moveTo(lastNode.x, lastNode.y);
              g.lineTo(x, y);
              g.stroke({ color: 0x10b981, width: 4, alpha: 0.8 }); // Green
              return;
            }
          } else {
            autocompleteStateRef.current = null;
          }
        }
      }

      updatePreview(x, y, wallTool);
    },
    [activeTool, viewport, snapCoordinate, updatePreview, doc, wallsArray, app]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent | MouseEvent | TouchEvent) => {
      // Box Selection Finalization
      if (activeTool === "select" && selectionBoxRef.current?.isActive) {
        const box = selectionBoxRef.current;
        selectionBoxRef.current = null; // deactivate

        const minX = Math.min(box.startX, box.currentX);
        const maxX = Math.max(box.startX, box.currentX);
        const minY = Math.min(box.startY, box.currentY);
        const maxY = Math.max(box.startY, box.currentY);

        // Clear preview
        if (wallPreviewGraphicsRef.current) {
          wallPreviewGraphicsRef.current.clear();
        }

        // Don't select if box is tiny (just a click) - handled by click handler usually?
        // But click handler runs AFTER up?
        // Actually, if we consumed the event here, we might conflict with click.
        // But if size is small, we assume it was a click and let dblclick/click handlers work?
        // Let's rely on threshold.
        if (Math.abs(maxX - minX) < 5 && Math.abs(maxY - minY) < 5) {
          return;
        }

        // Find intersecting segments
        const currentWalls = useBattlemapStore.getState().walls;
        const newSelection: string[] = [];

        currentWalls.forEach((w) => {
          w.segments.forEach((s) => {
            // Check if segment intersects box.
            // A simple approx: Check AABB of segment against box.
            // If specific precision needed: line-rect intersection.
            // Let's use simple AABB check for now + verifying endpoints inside?
            // Most users expect "Touching" selects.
            // Segment AABB:
            const sMinX = Math.min(
              s.x1,
              s.x2,
              s.cp1x ?? 99999,
              s.cp2x ?? 99999
            );
            const sMaxX = Math.max(
              s.x1,
              s.x2,
              s.cp1x ?? -99999,
              s.cp2x ?? -99999
            );
            const sMinY = Math.min(
              s.y1,
              s.y2,
              s.cp1y ?? 99999,
              s.cp2y ?? 99999
            );
            const sMaxY = Math.max(
              s.y1,
              s.y2,
              s.cp1y ?? -99999,
              s.cp2y ?? -99999
            );

            const overlaps =
              minX <= sMaxX && maxX >= sMinX && minY <= sMaxY && maxY >= sMinY;
            // If overlaps, rigorous check? Or good enough?
            // For linear: AABB is approximation but usually ok.
            // Ideally check if line intersects rect.
            // Let's stick to AABB for perf/simplicity MVP.
            if (overlaps) {
              newSelection.push(s.id);
            }
          });
        });

        // Handle Shift Key (Add to selection)
        // e.shiftKey might not be available on TouchEvent consistently without check
        const isShift = (e as MouseEvent).shiftKey;
        if (isShift) {
          const current = useBattlemapStore.getState().selectedSegmentIds;
          // Merge unique
          const combined = Array.from(new Set([...current, ...newSelection]));
          useBattlemapStore.setState({
            selectedSegmentIds: combined,
            selectedWallId: null,
          });
        } else {
          // Standard selection
          useBattlemapStore.setState({
            selectedSegmentIds: newSelection,
            selectedWallId: null,
          });
        }
        return; // Consumed
      }

      // Stop dragging handles
      if (editDragStateRef.current) {
        editDragStateRef.current = null;
        return;
      }

      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false;
        dragStateRef.current.origin = null;
      }

      if (activeTool !== "wall" || !viewport) return;

      // Extract client coordinates
      const clientX = "clientX" in e ? e.clientX : e.touches[0].clientX;
      const clientY = "clientY" in e ? e.clientY : e.touches[0].clientY;

      // Use app.canvas directly
      const canvas = app?.canvas as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const point = viewport.toLocal({ x: canvasX, y: canvasY });
      const snapped = snapCoordinate(point.x, point.y);
      const { x, y } = snapped;

      const state = useBattlemapStore.getState();
      const {
        wallTool,
        isDrawing,
        currentPath,
        setIsDrawing,
        clearCurrentPath,
      } = state;

      // Autocomplete Finalization (Door)
      if (activeTool === "wall" && autocompleteStateRef.current?.isActive) {
        const auto = autocompleteStateRef.current;
        autocompleteStateRef.current = null;

        doc.transact(() => {
          let found = false;
          for (let i = 0; i < wallsArray.length; i++) {
            if (found) break;
            const w = wallsArray.get(i);
            if (w.id === auto.targetWallId) {
              const segIdx = w.segments.findIndex(
                (s) => s.id === auto.targetSegmentId
              );
              if (segIdx !== -1) {
                found = true;
                const segments = [...w.segments];
                const originalSeg = segments[segIdx];

                const tStart = auto.p1.t;
                const tEnd = auto.p2.t;
                const tMin = Math.min(tStart, tEnd);
                const tMax = Math.max(tStart, tEnd);

                // Split into 3
                // 1. Split at tMax
                const [prefix, after] = splitSegment(originalSeg, tMax);
                // 2. Split prefix at tMin/tMax
                // If tMax is 0, we avoid division (though threshold prevents this)
                const tRelative = tMax > 0 ? tMin / tMax : 0;
                const [before, door] = splitSegment(prefix, tRelative);

                door.isDoor = true;

                // Replace 1 with 3
                segments.splice(segIdx, 1, before, door, after);

                wallsArray.delete(i, 1);
                wallsArray.insert(i, [{ ...w, segments }]);
              }
            }
          }
        });

        // Cleanup
        setIsDrawing(false);
        clearCurrentPath();
        nodesRef.current = [];
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
        return;
      }

      if (activeTool !== "wall" && activeTool !== "select") return;
      if (wallTool === "rect" && isDrawing && currentPath.length >= 2) {
        const startX = currentPath[0];
        const startY = currentPath[1];
        const rectX = Math.min(startX, x);
        const rectY = Math.min(startY, y);
        const rectW = Math.abs(x - startX);
        const rectH = Math.abs(y - startY);

        if (rectW > 5 && rectH > 5) {
          const segments: WallSegment[] = [
            createSegment(rectX, rectY, rectX + rectW, rectY), // Top
            createSegment(rectX + rectW, rectY, rectX + rectW, rectY + rectH), // Right
            createSegment(rectX + rectW, rectY + rectH, rectX, rectY + rectH), // Bottom
            createSegment(rectX, rectY + rectH, rectX, rectY), // Left
          ];

          doc.transact(() => {
            wallsArray.push([
              {
                id: uuidv7(),
                segments,
                layer: settings.activeLayerId || "obstacles",
              },
            ]);
          });
        }

        setIsDrawing(false);
        clearCurrentPath();
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
      } else if (
        wallTool === "ellipse" &&
        isDrawing &&
        currentPath.length >= 2
      ) {
        const centerX = currentPath[0];
        const centerY = currentPath[1];
        const radiusX = Math.abs(x - centerX);
        const radiusY = Math.abs(y - centerY);

        if (radiusX > 5 && radiusY > 5) {
          const segments = generateEllipseSegments(
            centerX,
            centerY,
            radiusX,
            radiusY,
            ELLIPSE_SEGMENTS
          );

          doc.transact(() => {
            wallsArray.push([
              {
                id: uuidv7(),
                segments,
                layer: settings.activeLayerId || "obstacles",
              },
            ]);
          });
        }

        setIsDrawing(false);
        clearCurrentPath();
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
      }
      // Polygon logic now handled via DoubleClick/state, pointerUp just ends handle drag
    },
    [activeTool, viewport, snapCoordinate, doc, wallsArray, app, settings]
  );

  // Escape to cancel drawing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && activeTool === "wall" && isDrawing) {
        // If polygon has nodes, finish it? Or cancel?
        // Typically Escape cancels current operation. Enter finishes.
        // Let's make Escape FINISH if enough nodes, else cancel.
        // Replicating DoubleClick logic for Finish:
        if (wallTool === "polygon" && nodesRef.current.length >= 2) {
          const segments = nodesToSegments(nodesRef.current);
          if (segments.length > 0) {
            doc.transact(() => {
              wallsArray.push([
                {
                  id: uuidv7(),
                  segments,
                  layer: settings.activeLayerId || "obstacles",
                },
              ]);
            });
          }
        }

        setIsDrawing(false);
        clearCurrentPath();
        nodesRef.current = [];
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
      } else if (
        e.code === "Enter" &&
        activeTool === "wall" &&
        isDrawing &&
        wallTool === "polygon"
      ) {
        // Enter also finishes
        if (nodesRef.current.length >= 2) {
          const segments = nodesToSegments(nodesRef.current);
          if (segments.length > 0) {
            doc.transact(() => {
              wallsArray.push([
                {
                  id: uuidv7(),
                  segments,
                  layer: settings.activeLayerId || "obstacles",
                },
              ]);
            });
          }
        }
        setIsDrawing(false);
        clearCurrentPath();
        nodesRef.current = [];
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeTool,
    wallTool,
    isDrawing,
    doc,
    wallsArray,
    settings,
    setIsDrawing,
    clearCurrentPath,
    nodesToSegments,
  ]);

  const onPointerLeave = useCallback(() => {
    if (wallPreviewGraphicsRef.current) wallPreviewGraphicsRef.current.clear();
  }, []);

  // Update refs when callbacks change
  // Double-click handler
  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      // Split segment on double click
      if (!viewport) return;

      // Extract client coordinates
      const clientX = e.clientX;
      const clientY = e.clientY;

      const canvas = app?.canvas as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const point = viewport.toLocal({ x: canvasX, y: canvasY });
      const { x, y } = point;

      // Hit detection
      const currentWalls = useBattlemapStore.getState().walls;
      let hitWallId: string | null = null;
      let hitDist = 20;

      let bestValues: {
        wallIndex: number;
        segIndex: number;
        t: number;
      } | null = null;

      for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
        const wall = currentWalls[wIndex];
        for (let sIndex = 0; sIndex < wall.segments.length; sIndex++) {
          const seg = wall.segments[sIndex];
          const { dist, t } = distToSegment(x, y, seg);
          if (dist < hitDist) {
            hitDist = dist;
            hitWallId = wall.id;
            bestValues = { wallIndex: wIndex, segIndex: sIndex, t };
          }
        }
      }

      if (hitWallId && bestValues) {
        doc.transact(() => {
          const wallItem = wallsArray.get(bestValues.wallIndex);
          if (!wallItem) return;

          const newSegments = [...wallItem.segments];
          const seg = newSegments[bestValues.segIndex];

          const [newSeg1, newSeg2] = splitSegment(seg, bestValues.t);

          newSegments.splice(bestValues.segIndex, 1, newSeg1, newSeg2);

          wallsArray.delete(bestValues.wallIndex, 1);
          wallsArray.insert(bestValues.wallIndex, [
            { ...wallItem, segments: newSegments },
          ]);
        });
        return;
      }

      const state = useBattlemapStore.getState();
      const { wallTool, isDrawing, setIsDrawing, clearCurrentPath } = state;

      if (activeTool === "wall" && wallTool === "polygon" && isDrawing) {
        // Finish drawing polygon
        // Dblclick adds nodes twice usually via pointerdown.
        // We might need to trim the last redundant node if it's identical to previous.
        if (nodesRef.current.length >= 2) {
          const last = nodesRef.current[nodesRef.current.length - 1];
          const prev = nodesRef.current[nodesRef.current.length - 2];
          if (Math.hypot(last.x - prev.x, last.y - prev.y) < 5) {
            nodesRef.current.pop();
          }
        }

        if (nodesRef.current.length >= 2) {
          const segments = nodesToSegments(nodesRef.current);
          doc.transact(() => {
            wallsArray.push([
              {
                id: uuidv7(),
                segments,
                layer: settings.activeLayerId || "obstacles",
              },
            ]);
          });
        }

        setIsDrawing(false);
        clearCurrentPath();
        nodesRef.current = [];
        if (wallPreviewGraphicsRef.current)
          wallPreviewGraphicsRef.current.clear();
      }
    },
    [viewport, app, wallsArray, doc, activeTool, nodesToSegments, settings]
  );

  // Context Menu Handler
  const onContextMenu = useCallback(
    (e: PointerEvent | MouseEvent) => {
      e.preventDefault();
      if (!viewport) return;

      // Extract client coordinates
      const clientX = "clientX" in e ? e.clientX : 0;
      const clientY = "clientY" in e ? e.clientY : 0;

      const canvas = app?.canvas as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const point = viewport.toLocal({ x: canvasX, y: canvasY });
      const { x, y } = point;

      // Simple hit detection for context menu (check all walls)
      // Usually we context menu the selected segment if we clicked ON it, or any segment if not selected
      const currentWalls = useBattlemapStore.getState().walls;

      let hitWallId: string | null = null;
      let hitSegmentId: string | null = null;
      let hitDist = 20; // threshold

      // Best hit
      let bestValues: {
        wallIndex: number;
        segIndex: number;
        t: number;
      } | null = null;

      for (let wIndex = 0; wIndex < currentWalls.length; wIndex++) {
        const wall = currentWalls[wIndex];
        for (let sIndex = 0; sIndex < wall.segments.length; sIndex++) {
          const seg = wall.segments[sIndex];
          const { dist, t } = distToSegment(x, y, seg);
          if (dist < hitDist) {
            hitDist = dist;
            hitWallId = wall.id;
            hitSegmentId = seg.id;
            bestValues = { wallIndex: wIndex, segIndex: sIndex, t };
          }
        }
      }

      if (hitWallId && hitSegmentId && bestValues) {
        // Build actions
        const actions: ContextMenuAction[] = [
          {
            id: "toggle-door",
            label: "Toggle Door",
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                const wallItem = wallsArray.get(bestValues.wallIndex);
                if (!wallItem) return;

                const newSegments = [...wallItem.segments];
                const seg = newSegments[bestValues.segIndex];

                newSegments[bestValues.segIndex] = {
                  ...seg,
                  isDoor: !seg.isDoor,
                  allowsMovement: !seg.isDoor,
                  allowsVision: !seg.isDoor, // Simple toggle default
                };

                wallsArray.delete(bestValues.wallIndex, 1);
                wallsArray.insert(bestValues.wallIndex, [
                  { ...wallItem, segments: newSegments },
                ]);
              });
            },
          },
          {
            id: "split-segment",
            label: "Split Segment",
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                const wallItem = wallsArray.get(bestValues.wallIndex);
                if (!wallItem) return;

                const newSegments = [...wallItem.segments];
                const seg = newSegments[bestValues.segIndex];

                const [newSeg1, newSeg2] = splitSegment(seg, bestValues.t);

                // Replace 1 with 2
                newSegments.splice(bestValues.segIndex, 1, newSeg1, newSeg2);

                wallsArray.delete(bestValues.wallIndex, 1);
                wallsArray.insert(bestValues.wallIndex, [
                  { ...wallItem, segments: newSegments },
                ]);
              });
            },
          },
          // Curve Conversions
          {
            id: "to-linear",
            label: "Convert to Straight Line",
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                const wallItem = wallsArray.get(bestValues.wallIndex);
                if (!wallItem) return;

                const newSegments = [...wallItem.segments];
                const seg = newSegments[bestValues.segIndex];

                if (seg.curveType === "linear") return;

                newSegments[bestValues.segIndex] = {
                  ...seg,
                  curveType: "linear",
                  cp1x: undefined,
                  cp1y: undefined,
                  cp2x: undefined,
                  cp2y: undefined,
                };

                wallsArray.delete(bestValues.wallIndex, 1);
                wallsArray.insert(bestValues.wallIndex, [
                  { ...wallItem, segments: newSegments },
                ]);
              });
            },
          },
          {
            id: "to-cubic",
            label: "Convert to Curve (Complex)",
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                const wallItem = wallsArray.get(bestValues.wallIndex);
                if (!wallItem) return;

                const newSegments = [...wallItem.segments];
                const seg = newSegments[bestValues.segIndex];

                const cp1x = seg.x1 + (seg.x2 - seg.x1) / 3;
                const cp1y = seg.y1 + (seg.y2 - seg.y1) / 3;
                const cp2x = seg.x1 + (2 * (seg.x2 - seg.x1)) / 3;
                const cp2y = seg.y1 + (2 * (seg.y2 - seg.y1)) / 3;

                newSegments[bestValues.segIndex] = {
                  ...seg,
                  curveType: "cubic",
                  cp1x,
                  cp1y,
                  cp2x,
                  cp2y,
                };

                wallsArray.delete(bestValues.wallIndex, 1);
                wallsArray.insert(bestValues.wallIndex, [
                  { ...wallItem, segments: newSegments },
                ]);
              });
            },
          },
          {
            id: "delete-segment",
            label: "Delete Segment",
            danger: true,
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                const wallItem = wallsArray.get(bestValues.wallIndex);
                if (!wallItem) return;

                const newSegments = [...wallItem.segments];
                newSegments.splice(bestValues.segIndex, 1);

                wallsArray.delete(bestValues.wallIndex, 1);

                if (newSegments.length > 0) {
                  wallsArray.insert(bestValues.wallIndex, [
                    { ...wallItem, segments: newSegments },
                  ]);
                }
                // If 0 segments, wall is gone (deleted)
              });
            },
          },
          {
            id: "delete-wall",
            label: "Delete Entire Wall",
            danger: true,
            onClick: () => {
              doc.transact(() => {
                if (!bestValues) return;
                wallsArray.delete(bestValues.wallIndex, 1);
              });
            },
          },
        ];

        // Merge logic
        const selectedSegmentIds =
          useBattlemapStore.getState().selectedSegmentIds;
        if (selectedSegmentIds.length === 2) {
          // Check adjacency
          // Need to find the wall and segments
          const wallItem = wallsArray.get(bestValues.wallIndex);
          if (wallItem) {
            const segmentsToMerge = wallItem.segments
              .map((s, index) => ({ s, index }))
              .filter((item) => selectedSegmentIds.includes(item.s.id));

            // Sort by index to ensure order
            segmentsToMerge.sort((a, b) => a.index - b.index);

            if (segmentsToMerge.length === 2) {
              const first = segmentsToMerge[0];
              const second = segmentsToMerge[1];

              // Must be adjacent indices? Or just geometrically touching?
              // In a chain, adjacent indices usually touch.
              const areAdjacentIndices = second.index === first.index + 1;

              // Verify vertex match? Start of 2nd should match End of 1st
              // But wall could be reversed? Usually walls are ordered chains.
              const touches =
                Math.hypot(first.s.x2 - second.s.x1, first.s.y2 - second.s.y1) <
                0.1;

              if (areAdjacentIndices && touches) {
                actions.unshift({
                  id: "merge-segments",
                  label: "Merge Segments",
                  onClick: () => {
                    doc.transact(() => {
                      const w = wallsArray.get(bestValues.wallIndex);
                      if (!w) return;

                      const newSegments = [...w.segments];
                      // Create Merged Segment
                      // From First.Start to Second.End
                      const mergedSeg = createSegment(
                        first.s.x1,
                        first.s.y1,
                        second.s.x2,
                        second.s.y2
                      );
                      // Remove both, insert new
                      // Splice at first.index, remove 2, insert merged
                      newSegments.splice(first.index, 2, mergedSeg);

                      wallsArray.delete(bestValues.wallIndex, 1);
                      wallsArray.insert(bestValues.wallIndex, [
                        { ...w, segments: newSegments },
                      ]);

                      // Clear selection or select new?
                      useBattlemapStore.setState({ selectedSegmentIds: [] });
                    });
                  },
                });
              }
            }
          }
        }

        setContextMenu({
          x: clientX,
          y: clientY,
          actions,
        });
      }
    },
    [viewport, app, wallsArray, doc, setContextMenu]
  );

  const onContextMenuRef = useRef<(e: PointerEvent | MouseEvent) => void>(
    () => undefined
  );

  useEffect(() => {
    onContextMenuRef.current = onContextMenu;
  }, [onContextMenu]);

  // Update refs to avoid stale closures
  useEffect(() => {
    onPointerDownRef.current = onPointerDown;
    onPointerMoveRef.current = onPointerMove;
    onPointerUpRef.current = onPointerUp;
    onPointerLeaveRef.current = onPointerLeave;
    onDoubleClickRef.current = onDoubleClick;
    onContextMenuRef.current = onContextMenu;
  }, [
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onDoubleClick,
    onContextMenu,
  ]);

  // Attach listeners
  useEffect(() => {
    if (!app?.canvas || (activeTool !== "wall" && activeTool !== "select")) {
      return;
    }
    const canvas = app.canvas as HTMLCanvasElement;

    // Stable wrapper functions that call current refs
    const handlePointerDown = (e: PointerEvent | MouseEvent | TouchEvent) =>
      onPointerDownRef.current(e);
    const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) =>
      onPointerMoveRef.current(e);
    const handlePointerLeave = (e: PointerEvent | MouseEvent | TouchEvent) =>
      onPointerLeaveRef.current(e);
    const handleDoubleClick = (e: MouseEvent) => onDoubleClickRef.current(e);
    const handlePointerUp = (e: PointerEvent | MouseEvent | TouchEvent) =>
      onPointerUpRef.current(e);
    const handleContextMenu = (e: PointerEvent | MouseEvent) =>
      onContextMenuRef.current(e);

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [app, activeTool, wallTool]);
}
