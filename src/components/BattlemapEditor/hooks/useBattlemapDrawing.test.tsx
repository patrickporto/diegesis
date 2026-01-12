/**
 * @deprecated Tests for useBattlemapDrawing
 *
 * This test file is DEPRECATED because useBattlemapDrawing is now a deprecated
 * pass-through wrapper that delegates directly to useBattlemapInteractions.
 *
 * The wrapper hooks were removed as part of a refactoring that consolidated
 * all interaction logic into useBattlemapInteractions. The actual drawing
 * interaction logic is now tested in useBattlemapInteractions.test.tsx.
 *
 * This file is kept for backwards compatibility only and the tests are
 * skipped. Use useBattlemapInteractions.test.tsx instead.
 */

import { act, renderHook } from "@testing-library/react";
import { Graphics } from "pixi.js";
import { beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { useBattlemapDrawing } from "./useBattlemapDrawing.ts";

describe.skip("useBattlemapDrawing (DEPRECATED)", () => {
  let doc: Y.Doc;
  let drawingsArray: Y.Array<any>;
  let previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  let settings: any;

  beforeEach(() => {
    // Reset store to consistent initial state
    useBattlemapStore.setState({
      activeTool: "draw",
      drawTool: "rect",
      brushSize: 10,
      isDrawing: false,
      currentPath: [],
      drawingProps: {
        strokeColor: "#ff0000",
        strokeWidth: 2,
        fillColor: "#ffffff",
        fillAlpha: 0.1,
        opacity: 1,
        blur: 0,
      },
    });

    // Create real Yjs document and array
    doc = new Y.Doc();
    drawingsArray = doc.getArray("drawings");
    settings = { activeLayerId: "map" };

    // Create real PIXI Graphics instance
    // vitest-webgl-canvas-mock makes this possible in test environment
    previewGraphicsRef = {
      current: new Graphics(),
    };
  });

  /**
   * Helper to render drawing hook
   */
  const renderDrawingHook = () =>
    renderHook(() =>
      useBattlemapDrawing({
        viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
        doc,
        drawingsArray,
        settings,
        previewGraphicsRef,
      })
    );

  describe.skip("Hook Wrapper", () => {
    it.skip("should accept all required props", () => {
      renderDrawingHook();
      // Hook should render without throwing
    });

    it.skip("should provide default props when not specified", () => {
      renderDrawingHook();
      // Should not throw and should have default settings
    });

    it.skip("should handle null app prop", () => {
      renderHook(() =>
        useBattlemapDrawing({
          app: null,
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
        })
      );
    });

    it.skip("should handle null viewport prop", () => {
      renderHook(() =>
        useBattlemapDrawing({
          app: null,
          viewport: null,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
        })
      );
    });

    it.skip("should use default onOpenContextMenu when not provided", () => {
      renderHook(() =>
        useBattlemapDrawing({
          app: null,
          viewport: null,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
        })
      );
      // Should not throw - default is provided in implementation
    });
  });

  describe.skip("Yjs Integration", () => {
    it.skip("should work with Yjs drawings array", () => {
      renderDrawingHook();

      // Add drawing to array through direct manipulation (simulating what interactions would do)
      act(() => {
        doc.transact(() => {
          drawingsArray.push([
            { type: "rect", x: 10, y: 10, width: 50, height: 50 },
          ]);
        });
      });

      expect(drawingsArray.length).toBe(1);
      expect(drawingsArray.get(0).type).toBe("rect");
    });

    it.skip("should maintain Yjs reactivity", () => {
      renderDrawingHook();

      act(() => {
        doc.transact(() => {
          drawingsArray.push([
            { type: "brush", points: [0, 0, 10, 10, 20, 20] },
            { type: "rect", x: 50, y: 50, width: 100, height: 100 },
          ]);
        });
      });

      expect(drawingsArray.length).toBe(2);
      expect(drawingsArray.get(0).type).toBe("brush");
      expect(drawingsArray.get(1).type).toBe("rect");
    });
  });

  describe.skip("Props Passing", () => {
    it.skip("should pass settings correctly", () => {
      const customSettings = {
        activeLayerId: "tokens",
        gridCellSize: 100,
        snapToGrid: true,
      };

      renderHook(() =>
        useBattlemapDrawing({
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          drawingsArray,
          settings: customSettings,
          previewGraphicsRef,
        })
      );
    });

    it.skip("should pass graphics ref correctly", () => {
      const customGraphicsRef: React.MutableRefObject<Graphics | null> = {
        current: new Graphics(),
      };

      renderHook(() =>
        useBattlemapDrawing({
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef: customGraphicsRef,
        })
      );
    });
  });

  describe.skip("Drawing Props from Store", () => {
    it.skip("should work with various drawing props from store", () => {
      useBattlemapStore.setState({
        drawingProps: {
          strokeColor: "#00ff00",
          strokeWidth: 5,
          fillColor: "#0000ff",
          fillAlpha: 0.5,
          opacity: 0.8,
          blur: 10,
        },
      });

      renderDrawingHook();

      const storeState = useBattlemapStore.getState();
      expect(storeState.drawingProps.strokeColor).toBe("#00ff00");
      expect(storeState.drawingProps.strokeWidth).toBe(5);
    });
  });
});
