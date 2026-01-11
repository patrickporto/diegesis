import { Graphics } from "pixi.js";

import { GRID_COLORS, GridColor, GridType } from "./types";

interface StrokeOptions {
  color: GridColor;
  width: number;
  alpha: number;
}

export class GridRenderer {
  /**
   * Draw a square grid
   */
  static drawSquareGrid(
    graphics: Graphics,
    width: number,
    height: number,
    cellSize: number,
    options: StrokeOptions,
    offsetX = 0,
    offsetY = 0
  ): void {
    const color = GRID_COLORS[options.color];

    // Draw vertical lines
    for (let x = offsetX; x <= width; x += cellSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = offsetY; y <= height; y += cellSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }

    graphics.stroke({
      color,
      width: options.width,
      alpha: options.alpha,
    });
  }

  /**
   * Draw a hexagonal grid
   * @param orientation - "vertical" for pointy-top, "horizontal" for flat-top
   */
  static drawHexGrid(
    graphics: Graphics,
    width: number,
    height: number,
    cellSize: number,
    orientation: "vertical" | "horizontal",
    options: StrokeOptions
  ): void {
    const color = GRID_COLORS[options.color];

    if (orientation === "vertical") {
      // Pointy-top hexagons
      const hexHeight = cellSize;
      const hexWidth = (Math.sqrt(3) / 2) * hexHeight;
      const vertDist = hexHeight * 0.75;

      for (let row = 0; row * vertDist < height + hexHeight; row++) {
        for (let col = 0; col * hexWidth < width + hexWidth; col++) {
          const offsetX = row % 2 === 1 ? hexWidth / 2 : 0;
          const cx = col * hexWidth + offsetX;
          const cy = row * vertDist;

          this.drawHexagon(graphics, cx, cy, cellSize / 2, true);
        }
      }
    } else {
      // Flat-top hexagons
      const hexWidth = cellSize;
      const hexHeight = (Math.sqrt(3) / 2) * hexWidth;
      const horizDist = hexWidth * 0.75;

      for (let col = 0; col * horizDist < width + hexWidth; col++) {
        for (let row = 0; row * hexHeight < height + hexHeight; row++) {
          const offsetY = col % 2 === 1 ? hexHeight / 2 : 0;
          const cx = col * horizDist;
          const cy = row * hexHeight + offsetY;

          this.drawHexagon(graphics, cx, cy, cellSize / 2, false);
        }
      }
    }

    graphics.stroke({
      color,
      width: options.width,
      alpha: options.alpha,
    });
  }

  /**
   * Draw a single hexagon
   */
  private static drawHexagon(
    graphics: Graphics,
    cx: number,
    cy: number,
    radius: number,
    pointyTop: boolean
  ): void {
    const angleOffset = pointyTop ? Math.PI / 6 : 0;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + angleOffset;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);

      if (i === 0) {
        graphics.moveTo(x, y);
      } else {
        graphics.lineTo(x, y);
      }
    }
    graphics.closePath();
  }

  /**
   * Draw an isometric grid (diamond pattern)
   */
  static drawIsometricGrid(
    graphics: Graphics,
    width: number,
    height: number,
    cellSize: number,
    options: StrokeOptions
  ): void {
    const color = GRID_COLORS[options.color];

    // Isometric cell dimensions
    const isoWidth = cellSize;
    const isoHeight = cellSize / 2;

    // Draw lines going down-right
    const numDiagonals = Math.ceil((width + height) / isoWidth) * 2;

    for (let i = -numDiagonals; i <= numDiagonals; i++) {
      // Lines from top-left to bottom-right direction
      const startX = i * isoWidth;
      const startY = 0;
      const endX = startX + height * (isoWidth / isoHeight);
      const endY = height;

      graphics.moveTo(startX, startY);
      graphics.lineTo(endX, endY);

      // Lines from top-right to bottom-left direction
      const startX2 = i * isoWidth;
      const startY2 = 0;
      const endX2 = startX2 - height * (isoWidth / isoHeight);
      const endY2 = height;

      graphics.moveTo(startX2, startY2);
      graphics.lineTo(endX2, endY2);
    }

    graphics.stroke({
      color,
      width: options.width,
      alpha: options.alpha,
    });
  }

  /**
   * Main render method that dispatches to the appropriate grid type
   */
  static render(
    graphics: Graphics,
    width: number,
    height: number,
    gridType: GridType,
    cellSize: number,
    options: StrokeOptions,
    offsetX = 0,
    offsetY = 0
  ): void {
    graphics.clear();

    switch (gridType) {
      case "none":
        // No grid to draw
        break;
      case "square":
        this.drawSquareGrid(
          graphics,
          width,
          height,
          cellSize,
          options,
          offsetX,
          offsetY
        );
        break;
      case "hex-vertical":
        this.drawHexGrid(
          graphics,
          width,
          height,
          cellSize,
          "vertical",
          options
        );
        break;
      case "hex-horizontal":
        this.drawHexGrid(
          graphics,
          width,
          height,
          cellSize,
          "horizontal",
          options
        );
        break;
      case "isometric":
        this.drawIsometricGrid(graphics, width, height, cellSize, options);
        break;
    }
  }

  /**
   * Snap a position to the nearest grid cell center
   */
  static snapToGrid(
    x: number,
    y: number,
    gridType: GridType,
    cellSize: number,
    offsetX = 0,
    offsetY = 0
  ): { x: number; y: number } {
    switch (gridType) {
      case "none":
        return { x, y };

      case "square": {
        // Find which cell the point is in, then return that cell's center
        const cellX = Math.floor((x - offsetX) / cellSize);
        const cellY = Math.floor((y - offsetY) / cellSize);
        const snappedX = cellX * cellSize + cellSize / 2 + offsetX;
        const snappedY = cellY * cellSize + cellSize / 2 + offsetY;
        return { x: snappedX, y: snappedY };
      }

      case "hex-vertical": {
        const hexHeight = cellSize;
        const hexWidth = (Math.sqrt(3) / 2) * hexHeight;
        const vertDist = hexHeight * 0.75;

        const row = Math.round((y - offsetY) / vertDist);
        const hexOffset = Math.abs(row) % 2 === 1 ? hexWidth / 2 : 0;
        const col = Math.round((x - offsetX - hexOffset) / hexWidth);

        return {
          x: col * hexWidth + hexOffset + offsetX,
          y: row * vertDist + offsetY,
        };
      }

      case "hex-horizontal": {
        const hexWidth = cellSize;
        const hexHeight = (Math.sqrt(3) / 2) * hexWidth;
        const horizDist = hexWidth * 0.75;

        const col = Math.round((x - offsetX) / horizDist);
        const hexOffsetY = Math.abs(col) % 2 === 1 ? hexHeight / 2 : 0;
        const row = Math.round((y - offsetY - hexOffsetY) / hexHeight);

        return {
          x: col * horizDist + offsetX,
          y: row * hexHeight + hexOffsetY + offsetY,
        };
      }

      case "isometric": {
        const isoWidth = cellSize;
        const isoHeight = cellSize / 2;

        const xAdjusted = x - offsetX;
        const yAdjusted = y - offsetY;

        const isoX = xAdjusted / isoWidth + yAdjusted / isoHeight;
        const isoY = yAdjusted / isoHeight - xAdjusted / isoWidth;

        const snappedIsoX = Math.round(isoX);
        const snappedIsoY = Math.round(isoY);

        return {
          x: ((snappedIsoX - snappedIsoY) * isoWidth) / 2 + offsetX,
          y: ((snappedIsoX + snappedIsoY) * isoHeight) / 2 + offsetY,
        };
      }

      default:
        return { x, y };
    }
  }

  /**
   * Get the shape of the grid cell at the given position
   */
  static getCellShape(
    x: number,
    y: number,
    gridType: GridType,
    cellSize: number,
    offsetX = 0,
    offsetY = 0
  ): { type: "rect" | "poly"; data: number[] } | null {
    if (gridType === "none") return null;

    if (gridType === "square") {
      const cellX = Math.floor((x - offsetX) / cellSize) * cellSize + offsetX;
      const cellY = Math.floor((y - offsetY) / cellSize) * cellSize + offsetY;
      return {
        type: "rect",
        data: [cellX, cellY, cellSize, cellSize],
      };
    }

    if (gridType.startsWith("hex")) {
      const center = this.snapToGrid(
        x,
        y,
        gridType,
        cellSize,
        offsetX,
        offsetY
      );
      const points: number[] = [];
      const radius = cellSize / 2;
      const pointyTop = gridType === "hex-vertical";
      const angleOffset = pointyTop ? Math.PI / 6 : 0;

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + angleOffset;
        points.push(center.x + radius * Math.cos(angle));
        points.push(center.y + radius * Math.sin(angle));
      }

      return {
        type: "poly",
        data: points,
      };
    }

    if (gridType === "isometric") {
      const isoWidth = cellSize;
      const isoHeight = cellSize / 2;

      const xAdjusted = x - offsetX;
      const yAdjusted = y - offsetY;

      const isoX = xAdjusted / isoWidth + yAdjusted / isoHeight;
      const isoY = yAdjusted / isoHeight - xAdjusted / isoWidth;
      const tileX = Math.floor(isoX);
      const tileY = Math.floor(isoY);

      const cenIsoX = tileX + 0.5;
      const cenIsoY = tileY + 0.5;

      const cx = ((cenIsoX - cenIsoY) * isoWidth) / 2 + offsetX;
      const cy = ((cenIsoX + cenIsoY) * isoHeight) / 2 + offsetY;

      return {
        type: "poly",
        data: [
          cx,
          cy - isoHeight / 2, // Top
          cx + isoWidth / 2,
          cy, // Right
          cx,
          cy + isoHeight / 2, // Bottom
          cx - isoWidth / 2,
          cy, // Left
        ],
      };
    }

    return null;
  }
}
