/**
 * @deprecated Tests for useBattlemapSelection
 *
 * This test file is DEPRECATED because useBattlemapSelection is now a deprecated
 * pass-through wrapper that delegates directly to useBattlemapInteractions.
 *
 * The wrapper hooks were removed as part of a refactoring that consolidated
 * all interaction logic into useBattlemapInteractions. The actual selection
 * interaction logic is now tested in useBattlemapInteractions.test.tsx.
 *
 * This file is kept for backwards compatibility only and the tests are
 * skipped. Use useBattlemapInteractions.test.tsx instead.
 */

import { act, renderHook } from "@testing-library/react";
import { Graphics } from "pixi.js";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { useBattlemapSelection } from "./useBattlemapSelection.ts";

describe.skip("useBattlemapSelection (DEPRECATED)", () => {
  let appMock: any;
  let viewportMock: any;
  let doc: Y.Doc;
  let drawingsArray: Y.Array<any>;
  let previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  let onOpenContextMenu: Mock;
  let settings: any;

  beforeEach(() => {
    // Reset store to consistent initial state
    useBattlemapStore.setState({
      activeTool: "select",
      selectedDrawingIds: [],
      isDraggingDrawing: false,
      editingItemId: null,
    });

    // Create real Yjs document and array
    doc = new Y.Doc();
    drawingsArray = doc.getArray("drawings");
    settings = {
      activeLayerId: "map",
      snapToGrid: false,
      gridCellSize: 50,
    };

    // Create mock viewport
    viewportMock = {
      scaled: 1,
      toWorld: (x: number, y: number) => ({ x, y }),
      toLocal: (p: { x: number; y: number }) => p,
      setZoom: () => {
        // Mock implementation
      },
      plugins: {
        pause: () => {
          // Mock implementation
        },
        resume: () => {
          // Mock implementation
        },
      },
    };

    // Create mock app
    appMock = {
      canvas: document.createElement("canvas"),
    };

    // Create real PIXI Graphics instance
    previewGraphicsRef = {
      current: new Graphics(),
    };

    onOpenContextMenu = vi.fn();
  });

  /**
   * Helper to render selection hook
   */
  const renderSelectionHook = () =>
    renderHook(() =>
      useBattlemapSelection({
        app: appMock,
        viewport: viewportMock,
        doc,
        drawingsArray,
        settings,
        previewGraphicsRef,
        onOpenContextMenu,
      })
    );

  describe.skip("Hook Wrapper", () => {
    it.skip("should accept all required props", () => {
      renderSelectionHook();
      // Hook should render without throwing
    });

    it.skip("should handle null app prop", () => {
      renderHook(() =>
        useBattlemapSelection({
          app: null,
          viewport: viewportMock,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
          onOpenContextMenu,
        })
      );
    });

    it.skip("should handle null viewport prop", () => {
      renderHook(() =>
        useBattlemapSelection({
          app: appMock,
          viewport: null,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
          onOpenContextMenu,
        })
      );
    });

    it.skip("should handle null onOpenContextMenu prop", () => {
      renderHook(() =>
        useBattlemapSelection({
          app: appMock,
          viewport: viewportMock,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef,
          onOpenContextMenu: null,
        })
      );
    });
  });

  describe.skip("Yjs Integration", () => {
    it.skip("should work with Yjs drawings array", () => {
      renderSelectionHook();

      // Add drawing to array through direct manipulation
      act(() => {
        doc.transact(() => {
          drawingsArray.push([
            {
              id: "d1",
              type: "rect",
              x: 10,
              y: 10,
              width: 20,
              height: 20,
              layer: "map",
            },
          ]);
        });
      });

      expect(drawingsArray.length).toBe(1);
      expect(drawingsArray.get(0).type).toBe("rect");
    });

    it.skip("should maintain Yjs reactivity", () => {
      renderSelectionHook();

      // First add an item
      act(() => {
        doc.transact(() => {
          drawingsArray.push([
            { type: "rect", x: 0, y: 0, width: 50, height: 50 },
          ]);
        });
      });

      expect(drawingsArray.length).toBe(1);

      // Then delete it
      act(() => {
        doc.transact(() => {
          drawingsArray.delete(0, 1);
        });
      });

      expect(drawingsArray.length).toBe(0);
    });
  });

  describe.skip("Props Passing", () => {
    it.skip("should pass settings correctly", () => {
      const customSettings = {
        activeLayerId: "tokens",
        snapToGrid: true,
        gridCellSize: 100,
      };

      renderHook(() =>
        useBattlemapSelection({
          app: appMock,
          viewport: viewportMock,
          doc,
          drawingsArray,
          settings: customSettings,
          previewGraphicsRef,
          onOpenContextMenu,
        })
      );
    });

    it.skip("should pass graphics ref correctly", () => {
      const customGraphicsRef: React.MutableRefObject<Graphics | null> = {
        current: new Graphics(),
      };

      renderHook(() =>
        useBattlemapSelection({
          app: appMock,
          viewport: viewportMock,
          doc,
          drawingsArray,
          settings,
          previewGraphicsRef: customGraphicsRef,
          onOpenContextMenu,
        })
      );
    });
  });

  describe.skip("Layer Filtering", () => {
    it.skip("should respect active layer in settings", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: [],
      });

      const settingsWithLayer = {
        activeLayerId: "tokens",
      };

      renderHook(() =>
        useBattlemapSelection({
          app: appMock,
          viewport: viewportMock,
          doc,
          drawingsArray,
          settings: settingsWithLayer,
          previewGraphicsRef,
          onOpenContextMenu,
        })
      );
    });
  });
});
