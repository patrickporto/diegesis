import "@testing-library/jest-dom";
import "vitest-webgl-canvas-mock";

// Simple mock for indexedDB to avoid ReferenceError
if (typeof window !== "undefined" && !window.indexedDB) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).indexedDB = {
    open: () =>
      ({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
  };
}

// Mock document global for tests that need document.createElement
if (typeof document === "undefined") {
  // @ts-expect-error - global.document doesn't exist in Node.js types, but we're mocking it for tests
  global.document = {
    createElement: (tagName: string) => {
      const el = {
        tagName: tagName.toUpperCase(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return el as any;
    },
  };
}

// Mock CanvasRenderingContext2D for PIXI Text measurements
// Must be defined before PIXI is imported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/* eslint-disable @typescript-eslint/no-empty-function */
class MockCanvasRenderingContext2D {
  constructor() {
    // Initialize context properties
    this.canvas = null;
    this.fillStyle = "#000000";
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
    this.font = "16px Arial";
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  canvas: any;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;

  measureText(text: string) {
    return {
      width: text.length * 10,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
      fontBoundingBoxAscent: 14,
      fontBoundingBoxDescent: 4,
    };
  }

  fillText() {}
  strokeText() {}
  fillRect() {}
  strokeRect() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  setTransform() {}
  resetTransform() {}
  save() {}
  restore() {}
  scale() {}
  rotate() {}
  translate() {}
  transform() {}
  createLinearGradient() {
    return {};
  }
  createRadialGradient() {
    return {};
  }
  createPattern() {
    return {};
  }
  drawImage() {}
}
/* eslint-enable @typescript-eslint/no-empty-function */

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).CanvasRenderingContext2D = MockCanvasRenderingContext2D;
}

// Mock document global for tests that need document.createElement
if (typeof document === "undefined") {
  // @ts-expect-error - global.document doesn't exist in Node.js types, but we're mocking it for tests
  global.document = {
    createElement: (tagName: string) => {
      const el = {
        tagName: tagName.toUpperCase(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return el as any;
    },
  };
}

// Mock CanvasRenderingContext2D for PIXI Text measurements
if (typeof window !== "undefined" && !window.CanvasRenderingContext2D) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /* eslint-disable @typescript-eslint/no-empty-function */
  (window as any).CanvasRenderingContext2D = class {
    measureText(text: string) {
      return {
        width: text.length * 10,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 10,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4,
      };
    }
    fillText() {}
    strokeText() {}
    fillRect() {}
    strokeRect() {}
    clearRect() {}
    beginPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    arc() {}
    setTransform() {}
    resetTransform() {}
    save() {}
    restore() {}
    scale() {}
    rotate() {}
    translate() {}
    transform() {}
    createLinearGradient() {
      return {};
    }
    createRadialGradient() {
      return {};
    }
    createPattern() {
      return {};
    }
    drawImage() {}
  };
  /* eslint-enable @typescript-eslint/no-empty-function */
}
