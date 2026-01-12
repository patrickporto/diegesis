/**
 * Pure mathematical functions for wall geometry calculations.
 * These are extracted from useWallInteractions for better testability.
 */

import { WallCurveType, WallSegment } from "../../types";

// Constants
export const SNAP_THRESHOLD = 15; // pixels for magnetic snap to nearby endpoints
export const DOOR_HIT_THRESHOLD = 20; // pixels to detect clicks on walls
export const MIN_DOOR_WIDTH = 50; // default door width when splitting
export const ELLIPSE_SEGMENTS = 16; // number of segments to approximate ellipse

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  segments: WallSegment[];
  layer: string;
}

// Helper: Linearly interpolate
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Helper to create a wall segment with defaults
export const createSegment = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  isDoor = false,
  curveType: WallCurveType = "linear"
): WallSegment => ({
  id: crypto.randomUUID(),
  x1,
  y1,
  x2,
  y2,
  curveType,
  isDoor,
  allowsMovement: true,
  allowsVision: false,
  allowsSound: false,
});

// Helper to find nearby endpoints for snapping
export const findNearbyEndpoint = (
  x: number,
  y: number,
  walls: Wall[],
  threshold: number = SNAP_THRESHOLD
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
export const generateEllipseSegments = (
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  numSegments: number = ELLIPSE_SEGMENTS
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
export const getCubicBezierPoint = (
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
export const getQuadraticBezierPoint = (
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
// Returns { dist, t, x, y }
export interface DistToSegmentResult {
  dist: number;
  t: number;
  x: number;
  y: number;
}

export const distToSegment = (
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
): DistToSegmentResult => {
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

// Helper: Split a segment at ratio t (0-1) preserving curvature
export const splitSegment = (
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      x1: x0,
      y1: y0,
      x2: x012,
      y2: y012,
      cp1x: x01,
      cp1y: y01,
    };

    const seg2: WallSegment = {
      ...props,
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      x1: seg.x1,
      y1: seg.y1,
      x2: splitX,
      y2: splitY,
    };

    const seg2: WallSegment = {
      ...props,
      id: crypto.randomUUID(),
      x1: splitX,
      y1: splitY,
      x2: seg.x2,
      y2: seg.y2,
    };
    return [seg1, seg2];
  }
};

// Check if segment bounds overlap with rectangle
export const segmentOverlapsRect = (
  seg: WallSegment,
  rectMinX: number,
  rectMinY: number,
  rectMaxX: number,
  rectMaxY: number
): boolean => {
  const sMinX = Math.min(seg.x1, seg.x2, seg.cp1x ?? 99999, seg.cp2x ?? 99999);
  const sMaxX = Math.max(
    seg.x1,
    seg.x2,
    seg.cp1x ?? -99999,
    seg.cp2x ?? -99999
  );
  const sMinY = Math.min(seg.y1, seg.y2, seg.cp1y ?? 99999, seg.cp2y ?? 99999);
  const sMaxY = Math.max(
    seg.y1,
    seg.y2,
    seg.cp1y ?? -99999,
    seg.cp2y ?? -99999
  );

  return (
    rectMinX <= sMaxX &&
    rectMaxX >= sMinX &&
    rectMinY <= sMaxY &&
    rectMaxY >= sMinY
  );
};

// Calculate bounding box of points
export const calculateBoundsFromPoints = (
  points: number[]
): { x: number; y: number; width: number; height: number } => {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let i = 0; i < points.length; i += 2) {
    const px = points[i];
    const py = points[i + 1];
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
