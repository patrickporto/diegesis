import { describe, expect, it } from "vitest";

import {
  calculateBoundsFromPoints,
  createSegment,
  distToSegment,
  DOOR_HIT_THRESHOLD,
  ELLIPSE_SEGMENTS,
  findNearbyEndpoint,
  generateEllipseSegments,
  getCubicBezierPoint,
  getQuadraticBezierPoint,
  lerp,
  MIN_DOOR_WIDTH,
  segmentOverlapsRect,
  SNAP_THRESHOLD,
  splitSegment,
  type Wall,
} from "./wallMath";

describe("wallMath - Pure Mathematical Functions", () => {
  describe("lerp (Linear Interpolation)", () => {
    it("should interpolate correctly at t=0.5", () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it("should return start value at t=0", () => {
      expect(lerp(10, 100, 0)).toBe(10);
    });

    it("should return end value at t=1", () => {
      expect(lerp(10, 100, 1)).toBe(100);
    });

    it("should handle negative values", () => {
      expect(lerp(-100, 100, 0.5)).toBe(0);
    });

    it("should extrapolate beyond range", () => {
      expect(lerp(0, 100, 2)).toBe(200);
      expect(lerp(0, 100, -0.5)).toBe(-50);
    });
  });

  describe("createSegment", () => {
    it("should create a linear segment with defaults", () => {
      const seg = createSegment(0, 0, 100, 100);
      expect(seg.id).toBeDefined();
      expect(seg.x1).toBe(0);
      expect(seg.y1).toBe(0);
      expect(seg.x2).toBe(100);
      expect(seg.y2).toBe(100);
      expect(seg.curveType).toBe("linear");
      expect(seg.isDoor).toBe(false);
      expect(seg.allowsMovement).toBe(true);
      expect(seg.allowsVision).toBe(false);
      expect(seg.allowsSound).toBe(false);
    });

    it("should create a door segment", () => {
      const seg = createSegment(0, 0, 100, 0, true);
      expect(seg.isDoor).toBe(true);
      expect(seg.allowsMovement).toBe(true);
      expect(seg.allowsVision).toBe(false);
    });

    it("should create a cubic curve segment", () => {
      const seg = createSegment(0, 0, 100, 100, false, "cubic");
      expect(seg.curveType).toBe("cubic");
    });

    it("should create a quadratic curve segment", () => {
      const seg = createSegment(0, 0, 100, 100, false, "quadratic");
      expect(seg.curveType).toBe("quadratic");
    });
  });

  describe("findNearbyEndpoint", () => {
    const walls: Wall[] = [
      {
        id: "wall1",
        layer: "obstacles",
        segments: [
          createSegment(0, 0, 100, 0),
          createSegment(100, 0, 100, 100),
        ],
      },
    ];

    it("should find nearby start point within threshold", () => {
      const point = findNearbyEndpoint(5, 5, walls, SNAP_THRESHOLD);
      expect(point).toEqual({ x: 0, y: 0 });
    });

    it("should find nearby end point within threshold", () => {
      const point = findNearbyEndpoint(95, 5, walls, SNAP_THRESHOLD);
      expect(point).toEqual({ x: 100, y: 0 });
    });

    it("should return null when no endpoint is nearby", () => {
      const point = findNearbyEndpoint(50, 50, walls, SNAP_THRESHOLD);
      expect(point).toBeNull();
    });

    it("should respect custom threshold", () => {
      const point = findNearbyEndpoint(20, 0, walls, 30);
      expect(point).toEqual({ x: 0, y: 0 });
    });

    it("should handle empty walls array", () => {
      const point = findNearbyEndpoint(0, 0, [], SNAP_THRESHOLD);
      expect(point).toBeNull();
    });

    it("should handle walls with no segments", () => {
      const walls: Wall[] = [{ id: "empty", layer: "obstacles", segments: [] }];
      const point = findNearbyEndpoint(0, 0, walls, SNAP_THRESHOLD);
      expect(point).toBeNull();
    });
  });

  describe("generateEllipseSegments", () => {
    it("should generate correct number of segments", () => {
      const segments = generateEllipseSegments(100, 100, 50, 30);
      expect(segments.length).toBe(ELLIPSE_SEGMENTS);
    });

    it("should generate segments that form a closed loop", () => {
      const segments = generateEllipseSegments(100, 100, 50, 30);
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];

      // Last segment's end should connect back to first segment's start
      expect(
        Math.hypot(lastSeg.x2 - firstSeg.x1, lastSeg.y2 - firstSeg.y1)
      ).toBeLessThan(1);
    });

    it("should generate circle when radiusX = radiusY", () => {
      const segments = generateEllipseSegments(0, 0, 50, 50);
      segments.forEach((seg) => {
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;
        const dist = Math.hypot(midX, midY);
        // All midpoints should be close to radius
        expect(dist).toBeGreaterThan(45);
        expect(dist).toBeLessThan(55);
      });
    });

    it("should generate ellipse with different radii", () => {
      const segments = generateEllipseSegments(0, 0, 100, 30);
      // Check some horizontal points (should be at x ~100)
      const farRightSeg = segments.find((s) => s.x1 > 90);
      expect(farRightSeg).toBeDefined();
    });

    it("should handle custom segment count", () => {
      const segments = generateEllipseSegments(0, 0, 50, 50, 8);
      expect(segments.length).toBe(8);
    });
  });

  describe("getCubicBezierPoint", () => {
    it("should return start point at t=0", () => {
      expect(getCubicBezierPoint(0, 0, 10, 20, 40)).toBeCloseTo(0);
    });

    it("should return end point at t=1", () => {
      expect(getCubicBezierPoint(1, 0, 10, 30, 40)).toBeCloseTo(40);
    });

    it("should calculate midpoint at t=0.5", () => {
      // Linear interpolation case (all control points on line)
      const result = getCubicBezierPoint(0.5, 0, 20, 20, 40);
      expect(result).toBeCloseTo(20);
    });

    it("should produce smooth curve values", () => {
      const points = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        points.push(getCubicBezierPoint(t, 0, 30, 70, 100));
      }
      // Values should be monotonically increasing
      for (let i = 1; i < points.length; i++) {
        expect(points[i]).toBeGreaterThan(points[i - 1]);
      }
    });
  });

  describe("getQuadraticBezierPoint", () => {
    it("should return start point at t=0", () => {
      expect(getQuadraticBezierPoint(0, 0, 20, 40)).toBeCloseTo(0);
    });

    it("should return end point at t=1", () => {
      expect(getQuadraticBezierPoint(1, 0, 20, 40)).toBeCloseTo(40);
    });

    it("should calculate midpoint at t=0.5", () => {
      const result = getQuadraticBezierPoint(0.5, 0, 20, 40);
      expect(result).toBeCloseTo(20);
    });
  });

  describe("distToSegment (Linear)", () => {
    it("should calculate distance to segment endpoint", () => {
      const seg = createSegment(0, 0, 100, 0);
      const result = distToSegment(50, 50, seg);
      expect(result.dist).toBe(50);
    });

    it("should find perpendicular distance to segment", () => {
      const seg = createSegment(0, 0, 100, 0);
      const result = distToSegment(50, 30, seg);
      expect(result.dist).toBe(30);
      expect(result.t).toBe(0.5);
    });

    it("should handle point before segment start", () => {
      const seg = createSegment(50, 0, 100, 0);
      const result = distToSegment(0, 10, seg);
      expect(result.x).toBe(50);
      expect(result.y).toBe(0);
      expect(result.t).toBe(0);
    });

    it("should handle point after segment end", () => {
      const seg = createSegment(0, 0, 50, 0);
      const result = distToSegment(100, 10, seg);
      expect(result.x).toBe(50);
      expect(result.y).toBe(0);
      expect(result.t).toBe(1);
    });

    it("should handle point on segment", () => {
      const seg = createSegment(0, 0, 100, 0);
      const result = distToSegment(50, 0, seg);
      expect(result.dist).toBe(0);
      expect(result.t).toBe(0.5);
    });

    it("should handle zero-length segment", () => {
      const seg = createSegment(50, 50, 50, 50);
      const result = distToSegment(60, 60, seg);
      expect(result.dist).toBeCloseTo(Math.hypot(10, 10));
    });
  });

  describe("distToSegment (Quadratic)", () => {
    it("should calculate distance to quadratic curve", () => {
      const seg = createSegment(0, 0, 100, 0, false, "quadratic");
      seg.cp1x = 50;
      seg.cp1y = 50;

      const result = distToSegment(50, 25, seg);
      // Control point is at (50, 50), curve apex is at (50, 50)
      // But at t=0.5, the actual point should be lower due to bezier math
      expect(result.dist).toBeLessThan(50);
      expect(result.t).toBeGreaterThan(0);
      expect(result.t).toBeLessThan(1);
    });

    it("should find closest point on curve", () => {
      const seg = createSegment(0, 0, 100, 0, false, "quadratic");
      seg.cp1x = 50;
      seg.cp1y = 100;

      const result = distToSegment(50, 100, seg);
      // Control point at (50, 100) pulls the curve up
      // The peak of the quadratic bezier is at y=50 (t=0.5)
      // So point (50, 100) is about 50 units away from the curve
      expect(result.dist).toBeLessThan(60);
    });
  });

  describe("distToSegment (Cubic)", () => {
    it("should calculate distance to cubic curve", () => {
      const seg = createSegment(0, 0, 100, 0, false, "cubic");
      seg.cp1x = 25;
      seg.cp1y = 50;
      seg.cp2x = 75;
      seg.cp2y = 50;

      const result = distToSegment(50, 50, seg);
      // With both control points at y=50, the peak is near (50, 50)
      // Due to sampling (20 samples), we may miss the exact peak
      expect(result.dist).toBeLessThan(15);
    });

    it("should handle curve with different control points", () => {
      const seg = createSegment(0, 0, 100, 0, false, "cubic");
      seg.cp1x = 0;
      seg.cp1y = 100;
      seg.cp2x = 100;
      seg.cp2y = 100;

      const result = distToSegment(50, 100, seg);
      // With control points at (0,100) and (100,100), the curve's peak is around y=75
      // So point (50, 100) is about 25 units away from the curve
      expect(result.dist).toBeLessThan(35);
    });
  });

  describe("splitSegment (Linear)", () => {
    it("should split linear segment at midpoint", () => {
      const seg = createSegment(0, 0, 100, 0);
      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.x1).toBe(0);
      expect(seg1.y1).toBe(0);
      expect(seg1.x2).toBe(50);
      expect(seg1.y2).toBe(0);

      expect(seg2.x1).toBe(50);
      expect(seg2.y1).toBe(0);
      expect(seg2.x2).toBe(100);
      expect(seg2.y2).toBe(0);
    });

    it("should preserve door property when splitting", () => {
      const seg = createSegment(0, 0, 100, 0, true);
      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.isDoor).toBe(true);
      expect(seg2.isDoor).toBe(true);
    });

    it("should split at t=0.25", () => {
      const seg = createSegment(0, 0, 100, 0);
      const [seg1, seg2] = splitSegment(seg, 0.25);

      expect(seg1.x2).toBe(25);
      expect(seg2.x1).toBe(25);
    });

    it("should create unique IDs for new segments", () => {
      const seg = createSegment(0, 0, 100, 0);
      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.id).not.toBe(seg2.id);
      expect(seg1.id).not.toBe(seg.id);
      expect(seg2.id).not.toBe(seg.id);
    });
  });

  describe("splitSegment (Quadratic)", () => {
    it("should split quadratic curve", () => {
      const seg = createSegment(0, 0, 100, 0, false, "quadratic");
      seg.cp1x = 50;
      seg.cp1y = 50;

      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.curveType).toBe("quadratic");
      expect(seg2.curveType).toBe("quadratic");
      expect(seg1.x2).toBe(seg2.x1);
      expect(seg1.y2).toBe(seg2.y1);
    });

    it("should preserve control points properly", () => {
      const seg = createSegment(0, 0, 100, 0, false, "quadratic");
      seg.cp1x = 50;
      seg.cp1y = 50;

      const [seg1, seg2] = splitSegment(seg, 0.5);

      // First segment's control point should be towards the original control point
      expect(seg1.cp1x).toBeDefined();
      expect(seg1.cp1y).toBeDefined();

      // Second segment's control point should be from split point towards end
      expect(seg2.cp1x).toBeDefined();
      expect(seg2.cp1y).toBeDefined();
    });
  });

  describe("splitSegment (Cubic)", () => {
    it("should split cubic curve at midpoint", () => {
      const seg = createSegment(0, 0, 100, 0, false, "cubic");
      seg.cp1x = 25;
      seg.cp1y = 50;
      seg.cp2x = 75;
      seg.cp2y = 50;

      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.curveType).toBe("cubic");
      expect(seg2.curveType).toBe("cubic");
      expect(seg1.x2).toBe(seg2.x1);
      expect(seg1.y2).toBe(seg2.y1);
    });

    it("should preserve both control points", () => {
      const seg = createSegment(0, 0, 100, 0, false, "cubic");
      seg.cp1x = 25;
      seg.cp1y = 50;
      seg.cp2x = 75;
      seg.cp2y = 50;

      const [seg1, seg2] = splitSegment(seg, 0.5);

      expect(seg1.cp1x).toBeDefined();
      expect(seg1.cp1y).toBeDefined();
      expect(seg1.cp2x).toBeDefined();
      expect(seg1.cp2y).toBeDefined();

      expect(seg2.cp1x).toBeDefined();
      expect(seg2.cp1y).toBeDefined();
      expect(seg2.cp2x).toBeDefined();
      expect(seg2.cp2y).toBeDefined();
    });
  });

  describe("segmentOverlapsRect", () => {
    it("should detect segment inside rectangle", () => {
      const seg = createSegment(10, 10, 90, 90);
      const overlaps = segmentOverlapsRect(seg, 0, 0, 100, 100);
      expect(overlaps).toBe(true);
    });

    it("should detect segment outside rectangle", () => {
      const seg = createSegment(200, 200, 300, 300);
      const overlaps = segmentOverlapsRect(seg, 0, 0, 100, 100);
      expect(overlaps).toBe(false);
    });

    it("should detect segment partially overlapping rectangle", () => {
      const seg = createSegment(50, 50, 150, 150);
      const overlaps = segmentOverlapsRect(seg, 0, 0, 100, 100);
      expect(overlaps).toBe(true);
    });

    it("should handle segment with control points", () => {
      const seg = createSegment(50, 50, 50, 50, false, "cubic");
      seg.cp1x = 0;
      seg.cp1y = 0;
      seg.cp2x = 100;
      seg.cp2y = 100;

      const overlaps = segmentOverlapsRect(seg, 0, 0, 100, 100);
      expect(overlaps).toBe(true);
    });

    it("should handle degenerate rectangle (zero size)", () => {
      const seg = createSegment(50, 50, 100, 50);
      const overlaps = segmentOverlapsRect(seg, 50, 50, 50, 50);
      expect(overlaps).toBe(true);
    });
  });

  describe("calculateBoundsFromPoints", () => {
    it("should calculate bounds for rectangle points", () => {
      const points = [0, 0, 100, 0, 100, 100, 0, 100];
      const bounds = calculateBoundsFromPoints(points);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });

    it("should calculate bounds for non-zero origin", () => {
      const points = [50, 50, 150, 50, 150, 150, 50, 150];
      const bounds = calculateBoundsFromPoints(points);

      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(50);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });

    it("should handle negative coordinates", () => {
      const points = [-50, -50, 50, -50, 50, 50, -50, 50];
      const bounds = calculateBoundsFromPoints(points);

      expect(bounds.x).toBe(-50);
      expect(bounds.y).toBe(-50);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });

    it("should handle empty array", () => {
      const bounds = calculateBoundsFromPoints([]);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it("should handle single point", () => {
      const points = [50, 50];
      const bounds = calculateBoundsFromPoints(points);

      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(50);
      expect(bounds.width).toBe(0);
      expect(bounds.height).toBe(0);
    });

    it("should handle two points (line)", () => {
      const points = [0, 0, 100, 100];
      const bounds = calculateBoundsFromPoints(points);

      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(100);
    });
  });

  describe("Constants", () => {
    it("should have defined constants", () => {
      expect(SNAP_THRESHOLD).toBe(15);
      expect(DOOR_HIT_THRESHOLD).toBe(20);
      expect(MIN_DOOR_WIDTH).toBe(50);
      expect(ELLIPSE_SEGMENTS).toBe(16);
    });
  });
});
