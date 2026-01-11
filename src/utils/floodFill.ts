import { WallSegment } from "../components/BattlemapEditor/types";

interface Point {
  x: number;
  y: number;
}

/**
 * Calculates a polygon representing a flood-filled area bounded by walls.
 * Uses a grid-based approach:
 * 1. Rasterize walls onto a low-res grid.
 * 2. Flood fill the grid from the start point.
 * 3. Extract the contour (polygon) of the filled area.
 * 4. Simplify the polygon.
 */
export function calculateFogFill(
  startX: number,
  startY: number,
  walls: WallSegment[],
  bounds: { x: number; y: number; width: number; height: number },
  resolution = 20 // Higher resolution (smaller cell) = more accurate but slower. 20px is rough but fast.
): number[] | null {
  const { x: boundX, y: boundY, width, height } = bounds;
  const cols = Math.ceil(width / resolution);
  const rows = Math.ceil(height / resolution);

  // 0 = Empty, 1 = Wall, 2 = Filled
  const grid = new Uint8Array(cols * rows);

  const toIndex = (x: number, y: number) => y * cols + x;
  const toGrid = (wx: number, wy: number) => ({
    x: Math.floor((wx - boundX) / resolution),
    y: Math.floor((wy - boundY) / resolution),
  });

  // 1. Rasterize Walls (Bresenham)
  // Walls effectively block 8-way if we allow diagonal passing, but for 4-way fill, a diagonal wall must be solid "enough".
  // Standard Bresenham connects pixels.
  walls.forEach((wall) => {
    // Skip if completely outside bounds (simple optimization)
    // ...
    const p1 = toGrid(wall.x1, wall.y1);
    const p2 = toGrid(wall.x2, wall.y2);
    drawLine(p1.x, p1.y, p2.x, p2.y, grid, cols, rows);
  });

  // 2. Flood Fill (BFS)
  const start = toGrid(startX, startY);
  if (
    start.x < 0 ||
    start.x >= cols ||
    start.y < 0 ||
    start.y >= rows ||
    grid[toIndex(start.x, start.y)] === 1
  ) {
    // Start point is outside or on a wall
    return null;
  }

  const queue: number[] = [toIndex(start.x, start.y)];
  grid[toIndex(start.x, start.y)] = 2; // Mark filled

  let filledCount = 0;
  // Directions: N, S, W, E
  const dx = [0, 0, -1, 1];
  const dy = [-1, 1, 0, 0];

  while (queue.length > 0) {
    const idx = queue.shift();
    if (idx === undefined) break;
    const cx = idx % cols;
    const cy = Math.floor(idx / cols);
    filledCount++;

    for (let i = 0; i < 4; i++) {
      const nx = cx + dx[i];
      const ny = cy + dy[i];

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const nIdx = nx + ny * cols;
        if (grid[nIdx] === 0) {
          grid[nIdx] = 2; // Fill
          queue.push(nIdx);
        }
      }
    }
  }

  if (filledCount === 0) return null;

  // 3. Trace Contour (Moore-Neighbor Tracing)
  // Find a starting pixel for the boundary.
  // We scan until we find a pixel that is '2' and has an empty neighbor (or '1').
  // Actually simplest is: Find top-left most filled pixel.
  // BUT efficient fill might handle holes?
  // Fog rooms are usually simple polygons. Holes (islands) are complex.
  // For now, we assume simple polygon (outer boundary).
  // If there are islands, they will be ignored by outer contour trace.

  let startPixel: Point | null = null;
  // Scan to find first filled line
  outer: for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[toIndex(x, y)] === 2) {
        startPixel = { x, y };
        break outer;
      }
    }
  }

  if (!startPixel) return null;

  const path = traceContour(grid, cols, rows, startPixel);

  // 4. Simplify & Scale
  // Simply map back to world coords
  const worldPath: Point[] = path.map((p) => ({
    x: boundX + p.x * resolution + resolution / 2, // Centered in cell
    y: boundY + p.y * resolution + resolution / 2,
  }));

  // Simplify (Ramer-Douglas-Peucker)
  const simplified = simplifyPoly(worldPath, resolution * 1.5); // Tolerance based on resolution

  // Flatten
  const result: number[] = [];
  simplified.forEach((p) => result.push(p.x, p.y));

  return result;
}

function drawLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  grid: Uint8Array,
  cols: number,
  rows: number
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let finished = false;
  while (!finished) {
    if (x0 >= 0 && x0 < cols && y0 >= 0 && y0 < rows) {
      // If not already filled/visited (though here 1 is wall)
      if (grid[y0 * cols + x0] === 0) grid[y0 * cols + x0] = 1;
    }
    if (x0 === x1 && y0 === y1) {
      finished = true;
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function traceContour(
  grid: Uint8Array,
  cols: number,
  rows: number,
  start: Point
): Point[] {
  // Moore-Neighbor Tracing
  // Backtrack to find entering direction?
  // We scanned from top-left, so we know 'start' is a filled pixel.
  // Since it was the first one, (start.x-1, start.y) must be empty (or out of bounds).
  // So we "entered" from West.
  // Backtrack = West.
  // Initial Reference point B = (start.x-1, start.y).
  // Current pixel P = start.

  // Using a simplified logic:
  // "Follow" the edge.
  // Directions: N, NE, E, SE, S, SW, W, NW (Clockwise)
  /*
     7 0 1
     6 P 2
     5 4 3
  */

  // Instead of full Moore, let's use "Bug" algorithm (keeping left hand on wall)
  // or simple boundary traversal.
  // Let's implement Square Tracing (easier for 4-connected grid).
  // But our grid is 8-connected effectively?
  // Let's stick to Moore.

  const boundary: Point[] = [];
  let cx = start.x;
  let cy = start.y;
  let bx = start.x - 1; // Backtrack pointer
  let by = start.y;

  const initialBx = bx;
  const initialBy = by;
  const initialCx = cx;
  const initialCy = cy;

  // Directions neighbors (Clockwise from North)
  // But wait, the backtracking pointer moves around P.
  // See: http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_A4.pdf

  // Simple limit to prevent infinite loop
  let iters = 0;
  const maxIters = cols * rows * 4;

  // Helper to check '2' (Filled)
  const isFilled = (x: number, y: number) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
    return grid[y * cols + x] === 2;
  };

  // Clockwise search for next filled pixel around P, starting from B position
  /*
    Neighborhood of P(cx,cy):
    (cx-1, cy-1) ... etc
  */
  // Mover:
  // 0: x, y-1
  // 1: x+1, y-1
  // 2: x+1, y
  // 3: x+1, y+1
  // 4: x, y+1
  // 5: x-1, y+1
  // 6: x-1, y
  // 7: x-1, y-1

  const neighbors = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: 0 }, // 6: West
    { dx: -1, dy: -1 },
  ];

  do {
    boundary.push({ x: cx, y: cy });

    // Find starting index of B relative to P
    let bIdx = -1;
    for (let i = 0; i < 8; i++) {
      if (bx === cx + neighbors[i].dx && by === cy + neighbors[i].dy) {
        bIdx = i;
        break;
      }
    }
    // Fallback if backtracker invalid (shouldn't happen on grid)
    if (bIdx === -1) bIdx = 6; // Assume West if lost

    // Clockwise scan starting from B's NEXT neighbor
    let found = false;
    for (let k = 0; k < 8; k++) {
      // We want to scan CLOCKWISE from B.
      // Actually Moore says scan from B.
      const idx = (bIdx + k) % 8; // Start from B?
      // Wait, rule: "Stop at first filled pixel S"
      // S becomes new P.
      // The empty pixel previous to S becomes new B.
      // Correct.
      const nx = cx + neighbors[idx].dx;
      const ny = cy + neighbors[idx].dy;

      if (isFilled(nx, ny)) {
        // New P
        const px = cx;
        const py = cy;
        cx = nx;
        cy = ny;
        // New B is the previous neighbor in the scan
        // (idx - 1)
        const prev = (idx + 7) % 8;
        bx = px + neighbors[prev].dx;
        by = py + neighbors[prev].dy;
        found = true;
        break;
      }
    }

    if (!found) {
      // Isolated pixel?
      break;
    }

    iters++;
  } while (
    !(
      cx === initialCx &&
      cy === initialCy &&
      bx === initialBx &&
      by === initialBy
    ) &&
    iters < maxIters
  );

  return boundary;
}

function simplifyPoly(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  // Ramer-Douglas-Peucker
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > tolerance) {
    const res1 = simplifyPoly(points.slice(0, index + 1), tolerance);
    const res2 = simplifyPoly(points.slice(index), tolerance);
    return res1.slice(0, res1.length - 1).concat(res2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(p: Point, l1: Point, l2: Point) {
  let dx = l2.x - l1.x;
  let dy = l2.y - l1.y;
  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }
  const pvx = p.x - l1.x;
  const pvy = p.y - l1.y;
  // Projection of pvector onto line vector (dot product)
  const pvdot = pvx * dx + pvy * dy;
  // Scale line vector
  const dsx = pvdot * dx;
  const dsy = pvdot * dy;
  // ax = pvx - dsx, ay = pvy - dsy
  const ax = pvx - dsx;
  const ay = pvy - dsy;
  return Math.hypot(ax, ay);
}
