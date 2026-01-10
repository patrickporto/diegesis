import { Container, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { Wall, WallSegment } from "../types";

const WALL_COLOR = 0xf59e0b; // Amber
const DOOR_COLOR = 0xa855f7; // Purple
const SELECTED_COLOR = 0x3b82f6; // Blue
const WALL_WIDTH = 4;
const DOOR_WIDTH = 6;

interface UseWallRendererProps {
  walls: Wall[];
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  isReady: boolean;
  layersCheck: number; // Version/timestamp to force re-check
}

// Draw a single wall segment
const drawSegment = (
  g: Graphics,
  seg: WallSegment,
  isSelected: boolean
): void => {
  const color = isSelected
    ? SELECTED_COLOR
    : seg.isDoor
    ? DOOR_COLOR
    : WALL_COLOR;
  const width = seg.isDoor ? DOOR_WIDTH : WALL_WIDTH;
  const alpha = isSelected || !seg.allowsVision ? 1 : 0.3; // Always fully opaque if selected or blocks vision

  if (seg.curveType === "linear" || !seg.curveType) {
    g.moveTo(seg.x1, seg.y1);
    g.lineTo(seg.x2, seg.y2);
    g.stroke({ color, width, alpha, cap: "round" });
  } else if (
    seg.curveType === "quadratic" &&
    seg.cp1x !== undefined &&
    seg.cp1y !== undefined
  ) {
    g.moveTo(seg.x1, seg.y1);
    g.quadraticCurveTo(seg.cp1x, seg.cp1y, seg.x2, seg.y2);
    g.stroke({ color, width, alpha, cap: "round" });
  } else if (
    seg.curveType === "cubic" &&
    seg.cp1x !== undefined &&
    seg.cp1y !== undefined &&
    seg.cp2x !== undefined &&
    seg.cp2y !== undefined
  ) {
    g.moveTo(seg.x1, seg.y1);
    g.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x2, seg.y2);
    g.stroke({ color, width, alpha, cap: "round" });
  }

  // Draw door indicator
  if (seg.isDoor) {
    const midX = (seg.x1 + seg.x2) / 2;
    const midY = (seg.y1 + seg.y2) / 2;
    // Draw blocked visual if it's a closed door?
    // Usually doors block movement/vision when closed.
    // Let's just draw a clear indicator.

    // Draw box for door
    g.circle(midX, midY, 6);
    g.fill({ color: DOOR_COLOR, alpha: 1 });
    g.stroke({ color: 0xffffff, width: 2 });
  }

  // Draw endpoints for visual feedback
  g.circle(seg.x1, seg.y1, 3);
  g.fill({ color, alpha: 0.8 });
  g.circle(seg.x2, seg.y2, 3);
  g.fill({ color, alpha: 0.8 });

  // Draw handles if selected
  if (isSelected) {
    // Endpoints (Square or larger circle)
    g.rect(seg.x1 - 4, seg.y1 - 4, 8, 8);
    g.fill({ color: 0xffffff });
    g.stroke({ color: SELECTED_COLOR, width: 2 });

    g.rect(seg.x2 - 4, seg.y2 - 4, 8, 8);
    g.fill({ color: 0xffffff });
    g.stroke({ color: SELECTED_COLOR, width: 2 });

    // Control Points for Bezier
    if (
      seg.curveType === "cubic" &&
      seg.cp1x !== undefined &&
      seg.cp1y !== undefined &&
      seg.cp2x !== undefined &&
      seg.cp2y !== undefined
    ) {
      // Draw lines to control points
      g.moveTo(seg.x1, seg.y1);
      g.lineTo(seg.cp1x, seg.cp1y);
      g.stroke({ color: SELECTED_COLOR, width: 1, alpha: 0.5 });

      g.moveTo(seg.x2, seg.y2);
      g.lineTo(seg.cp2x, seg.cp2y);
      g.stroke({ color: SELECTED_COLOR, width: 1, alpha: 0.5 });

      // CP handles (Circle)
      g.circle(seg.cp1x, seg.cp1y, 4);
      g.fill({ color: 0xffffff });
      g.stroke({ color: SELECTED_COLOR, width: 2 });

      g.circle(seg.cp2x, seg.cp2y, 4);
      g.fill({ color: 0xffffff });
      g.stroke({ color: SELECTED_COLOR, width: 2 });
    } else if (
      seg.curveType === "quadratic" &&
      seg.cp1x !== undefined &&
      seg.cp1y !== undefined
    ) {
      // Draw line to control point
      g.moveTo(seg.x1, seg.y1);
      g.lineTo(seg.cp1x, seg.cp1y);
      g.lineTo(seg.x2, seg.y2);
      g.stroke({ color: SELECTED_COLOR, width: 1, alpha: 0.5 });

      // CP handle
      g.circle(seg.cp1x, seg.cp1y, 4);
      g.fill({ color: 0xffffff });
      g.stroke({ color: SELECTED_COLOR, width: 2 });
    }
  }
};

export function useWallRenderer({
  walls,
  layerContainersRef,
  isReady,
  layersCheck,
}: UseWallRendererProps) {
  const selectedSegmentIds = useBattlemapStore((s) => s.selectedSegmentIds);

  const wallGraphicsRef = useRef<Graphics | null>(null);

  // Create or update wall graphics
  useEffect(() => {
    if (!isReady) return;

    // Find the walls layer container
    const wallsContainer = layerContainersRef.current.get("walls");
    if (!wallsContainer) {
      console.warn("WallRenderer: Walls container not found!");
      return;
    }

    // Create graphics if not exists
    if (!wallGraphicsRef.current) {
      const g = new Graphics();
      g.label = "walls";
      g.zIndex = 10; // Above background, below tokens
      wallsContainer.addChild(g);
      wallGraphicsRef.current = g;
    }

    const g = wallGraphicsRef.current;
    g.clear();

    // Draw all walls
    walls.forEach((wall: Wall) => {
      wall.segments.forEach((seg: WallSegment) => {
        // Only highlight if explicitly selected in segment list
        const isSegSelected = selectedSegmentIds.includes(seg.id);
        drawSegment(g, seg, isSegSelected);
      });
    });
  }, [walls, selectedSegmentIds, isReady, layerContainersRef, layersCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wallGraphicsRef.current) {
        wallGraphicsRef.current.destroy();
        wallGraphicsRef.current = null;
      }
    };
  }, []);
}
