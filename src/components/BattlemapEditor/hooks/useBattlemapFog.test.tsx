/**
 * @deprecated Tests for useBattlemapFog
 *
 * This test file is DEPRECATED because useBattlemapFog is now a deprecated
 * pass-through wrapper that delegates directly to useBattlemapInteractions.
 *
 * The wrapper hooks were removed as part of a refactoring that consolidated
 * all interaction logic into useBattlemapInteractions. The actual fog
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
import { useBattlemapFog } from "./useBattlemapFog";

describe.skip("useBattlemapFog (DEPRECATED)", () => {
  let doc: Y.Doc;
  let fogArray: Y.Array<any>;
  let roomsArray: Y.Array<any>;
  let wallsArray: Y.Array<any>;
  let previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  let settings: any;

  beforeEach(() => {
    // Reset store to consistent initial state
    useBattlemapStore.setState({
      activeTool: "fog",
      fogTool: "rect",
      fogMode: "hide",
      brushSize: 50,
      isDrawing: false,
      currentPath: [],
    });

    // Create real Yjs documents and arrays
    doc = new Y.Doc();
    fogArray = doc.getArray("fog");
    roomsArray = doc.getArray("rooms");
    wallsArray = doc.getArray("walls");
    settings = {
      gridCellSize: 50,
      gridType: "square",
      gridOffsetX: 0,
      gridOffsetY: 0,
    };

    // Create real PIXI Graphics instance
    previewGraphicsRef = {
      current: new Graphics(),
    };
  });

  /**
   * Helper to render hook with a mock viewport
   */
  const renderFogHook = () =>
    renderHook(() =>
      useBattlemapFog({
        viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
        doc,
        fogArray,
        roomsArray,
        wallsArray,
        settings,
        previewGraphicsRef,
      })
    );

  describe.skip("Hook Wrapper", () => {
    it.skip("should accept all required props", () => {
      renderFogHook();
      // Hook should render without throwing
    });

    it.skip("should provide default props when not specified", () => {
      renderFogHook();
      // Should not throw and should have default settings
    });

    it.skip("should handle null app prop", () => {
      renderHook(() =>
        useBattlemapFog({
          app: null,
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          fogArray,
          roomsArray,
          wallsArray,
          settings,
          previewGraphicsRef,
        })
      );
    });

    it.skip("should handle null viewport prop", () => {
      renderHook(() =>
        useBattlemapFog({
          app: null,
          viewport: null,
          doc,
          fogArray,
          roomsArray,
          wallsArray,
          settings,
          previewGraphicsRef,
        })
      );
    });

    it.skip("should use default onOpenContextMenu when not provided", () => {
      renderHook(() =>
        useBattlemapFog({
          app: null,
          viewport: null,
          doc,
          fogArray,
          roomsArray,
          wallsArray,
          settings,
          previewGraphicsRef,
        })
      );
      // Should not throw - default is provided in implementation
    });
  });

  describe.skip("Yjs Integration", () => {
    it.skip("should work with Yjs arrays", () => {
      renderFogHook();

      // Add fog to array through direct manipulation (simulating what interactions would do)
      act(() => {
        doc.transact(() => {
          fogArray.push([{ type: "rect", data: [0, 0, 100, 100] }]);
        });
      });

      expect(fogArray.length).toBe(1);
      expect(fogArray.get(0).type).toBe("rect");
    });

    it.skip("should maintain Yjs reactivity", () => {
      renderFogHook();

      act(() => {
        doc.transact(() => {
          roomsArray.push([{ id: "room1", name: "Test Room" }]);
        });
      });

      expect(roomsArray.length).toBe(1);
      expect(roomsArray.get(0).name).toBe("Test Room");
    });
  });

  describe.skip("Props Passing", () => {
    it.skip("should pass settings correctly", () => {
      const customSettings = {
        gridCellSize: 100,
        gridType: "hex" as const,
        gridOffsetX: 50,
        gridOffsetY: 50,
        activeLayerId: "obstacles",
      };

      renderHook(() =>
        useBattlemapFog({
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          fogArray,
          roomsArray,
          wallsArray,
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
        useBattlemapFog({
          viewport: { toWorld: (x: number, y: number) => ({ x, y }) } as any,
          doc,
          fogArray,
          roomsArray,
          wallsArray,
          settings,
          previewGraphicsRef: customGraphicsRef,
        })
      );
    });
  });
});
