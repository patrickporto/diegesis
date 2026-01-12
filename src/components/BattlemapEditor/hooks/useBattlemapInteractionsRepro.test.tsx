import { act, renderHook } from "@testing-library/react";
import { Graphics } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { useBattlemapInteractions } from "./useBattlemapInteractions";

describe("useBattlemapInteractions Repro", () => {
  let viewportMock: any;
  let doc: Y.Doc;
  let fogArray: Y.Array<any>;
  let drawingsArray: Y.Array<any>;
  let wallsArray: Y.Array<any>;
  let roomsArray: Y.Array<any>;
  let settings: any;
  let previewGraphicsRef: React.MutableRefObject<Graphics | null>;
  let onOpenContextMenu: any;
  let canvasElement: HTMLCanvasElement;
  let appMock: any;

  beforeEach(() => {
    useBattlemapStore.setState({
      activeTool: "select",
      selectedDrawingIds: [],
      isDraggingDrawing: false,
      isDrawing: false,
      editingItemId: null,
      fogTool: "rect",
      drawTool: "rect",
      drawingProps: {
        strokeColor: "#ff0000",
        strokeWidth: 2,
        fillColor: "#ffffff",
        fillAlpha: 0,
        blur: 0,
        opacity: 1,
      },
      // IMPORTANT: Initialize store methods if they are used by the hook and not just state properties
      // The hook uses actions like enableTemporaryPan which are usually bound in strict usage but here standard setState works for state props.
      // If the hook calls generic actions, we might need to mock them or ensure the store has them.
      // Based on previous file dump, the hook calls useBattlemapStore.getState().enableTemporaryPan etc.
    });

    // Mock store actions if they are not part of the initial state we set above
    // Assuming useBattlemapStore is a zustand store, setState merges.
    // We should probably ensure the actions exist or the hook will crash.
    // However, the real store likely has them defined. We are just setting initial state values.

    doc = new Y.Doc();
    fogArray = doc.getArray("fog");
    drawingsArray = doc.getArray("drawings");
    wallsArray = doc.getArray("walls");
    roomsArray = doc.getArray("rooms");
    settings = {
      snapToGrid: true,
      gridCellSize: 50,
      gridType: "square",
      gridOffsetX: 0,
      gridOffsetY: 0,
      activeLayerId: "map",
    };
    previewGraphicsRef = { current: new Graphics() };
    onOpenContextMenu = vi.fn();

    canvasElement = document.createElement("canvas");
    vi.spyOn(canvasElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      bottom: 600,
      right: 800,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      toJSON: () => ({}),
    });
    document.body.appendChild(canvasElement);

    appMock = { canvas: canvasElement } as any;

    viewportMock = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      toLocal: (p: any) => ({ x: p.offsetX ?? 0, y: p.offsetY ?? 0 }),
      plugins: {
        pause: vi.fn(),
        resume: vi.fn(),
      },
      scaled: 1,
    };
  });

  afterEach(() => {
    if (document.body.contains(canvasElement)) {
      document.body.removeChild(canvasElement);
    }
    vi.restoreAllMocks();
  });

  const renderInteractionsHook = () =>
    renderHook(() =>
      useBattlemapInteractions({
        app: appMock,
        viewport: viewportMock,
        doc,
        fogArray,
        drawingsArray,
        roomsArray,
        wallsArray,
        settings,
        previewGraphicsRef,
        onOpenContextMenu,
      })
    );

  it("should not re-attach event listeners on interactions", () => {
    const consoleSpy = vi.spyOn(console, "log");
    const { rerender } = renderInteractionsHook();

    // Initial mount
    expect(consoleSpy).toHaveBeenCalledWith(
      "Attaching Battlemap Interactions to Canvas"
    );
    consoleSpy.mockClear();

    // Simulate interactions that shouldn't trigger re-attachment
    act(() => {
      // Change tool in store - this SHOULD NOT trigger re-attachment if fixed
      // But currently it DOES because activeTool is a dependency of the main useEffect (or callbacks used by it)
      useBattlemapStore.setState({ activeTool: "draw", drawTool: "brush" });
    });

    // Force rerender from the hook's perspective (if props changed, but here store changed)
    // The hook subscribes to the store? No, it selects from it.
    // useBattlemapInteractions uses: const activeTool = useBattlemapStore((s) => s.activeTool);
    // So changing the store WILL trigger a re-render of the hook.

    // We don't need to call rerender() manually if external store updates trigger it,
    // but renderHook returns a result that updates.
    // However, for the logging to happen, the component (hook) needs to re-run.

    // Let's rely on the natural re-render caused by useBattlemapStore selector.
    // Wait, testing-library renderHook might not auto-rerender on external store changes unless we wait?
    // Let's force it to be sure.
    rerender();

    // Check if it logged again
    // In the BUGGY version, activeTool is in dependency array, so it WILL log.
    // We want to ASSERT that this FAILS initially (or rather, confirms the bug).
    // The requirement is that it SHOULD NOT log.
    // So if the bug exists, this expect will FAIL.
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "Attaching Battlemap Interactions to Canvas"
    );
  });
});
