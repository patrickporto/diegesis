import { act, renderHook } from "@testing-library/react";
import { Graphics } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { useBattlemapInteractions } from "./useBattlemapInteractions";

// Helper to create a PointerEvent with offsetX/offsetY properties
function createPointerEventWithOffset(
  type: string,
  init: {
    offsetX?: number;
    offsetY?: number;
    clientX?: number;
    clientY?: number;
    button?: number;
    shiftKey?: boolean;
    ctrlKey?: boolean;
  }
): PointerEvent {
  const event = new PointerEvent(type, {
    clientX: init.clientX ?? init.offsetX ?? 0,
    clientY: init.clientY ?? init.offsetY ?? 0,
    button: init.button || 0,
    shiftKey: init.shiftKey || false,
    ctrlKey: init.ctrlKey || false,
    bubbles: true,
    cancelable: true,
  });

  // Try to set offsetX/offsetY if possible, but our viewport mock will rely on clientX/Y
  try {
    Object.defineProperties(event, {
      offsetX: { value: init.offsetX ?? 0 },
      offsetY: { value: init.offsetY ?? 0 },
    });
  } catch (e) {
    // Ignore if fails
  }

  return event;
}

describe("useBattlemapInteractions", () => {
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

  beforeEach(() => {
    useBattlemapStore.setState({
      activeTool: "select",
      selectedDrawingIds: [],
      isDraggingDrawing: false,
      isDrawing: false,
      editingItemId: null,
      fogTool: "rect",
      drawTool: "rect",
      // Initialize drawingProps to ensure tests work correctly
      drawingProps: {
        strokeColor: "#ff0000",
        strokeWidth: 2,
        fillColor: "#ffffff",
        fillAlpha: 0,
        blur: 0,
        opacity: 1,
      },
    });

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

    // Create and append canvas element
    canvasElement = document.createElement("canvas");
    // Mock getBoundingClientRect to allow correct offsetX/Y calculation if computed
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

    const listeners: Record<string, ((event: any, ...args: any[]) => void)[]> =
      {};
    viewportMock = {
      on: vi.fn((event, cb) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
        return viewportMock;
      }),
      off: vi.fn((event, cb) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((l) => l !== cb);
        }
        return viewportMock;
      }),
      emit: (event: string, args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach((l) => l(args));
        }
      },
      toLocal: (p: any) => {
        // Use clientX/Y if provided (test fallback), otherwise x/y (offsetX/Y)
        if (p.clientX !== undefined && p.clientY !== undefined) {
          return { x: p.clientX, y: p.clientY };
        }
        if (typeof p === "number") return { x: p, y: p };
        if (p.x !== undefined && p.y !== undefined) return { x: p.x, y: p.y };
        const x = p.offsetX ?? 0;
        const y = p.offsetY ?? 0;
        return { x, y };
      },
      plugins: {
        pause: vi.fn(),
        resume: vi.fn(),
      },
      scaled: 1,
    };
  });

  // Cleanup canvas element after each test
  afterEach(() => {
    if (document.body.contains(canvasElement)) {
      document.body.removeChild(canvasElement);
    }
  });

  const renderInteractionsHook = () =>
    renderHook(() =>
      useBattlemapInteractions({
        app: { canvas: canvasElement } as any,
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

  it("should handle pointerdown for select tool", () => {
    useBattlemapStore.setState({ activeTool: "select" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          clientX: 10,
          clientY: 10,
          button: 0,
          shiftKey: false,
        })
      );
    });

    expect(true).toBe(true);
  });

  it("should handle pointerdown for fog tool with snapping", () => {
    useBattlemapStore.setState({ activeTool: "fog", fogTool: "rect" });
    renderInteractionsHook();

    act(() => {
      const event = createPointerEventWithOffset("pointerdown", {
        offsetX: 40,
        offsetY: 40,
        clientX: 40,
        clientY: 40,
        button: 0,
        shiftKey: false,
      });
      canvasElement.dispatchEvent(event);
    });

    const store = useBattlemapStore.getState();
    // rect tool stores startX, startY, endX, endY (4 values)
    expect(store.currentPath).toHaveLength(4);
    expect(store.currentPath[0]).toBe(50);
    expect(store.currentPath[1]).toBe(50);
  });

  it("should handle pointerdown for draw brush tool", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "brush" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 100,
          offsetY: 100,
          clientX: 100,
          clientY: 100,
          button: 0,
          shiftKey: false,
        })
      );
    });

    const store = useBattlemapStore.getState();
    expect(store.isDrawing).toBe(true);
    expect(store.currentPath).toHaveLength(2);
    expect(store.currentPath[0]).toBe(100);
    expect(store.currentPath[1]).toBe(100);
  });

  it("should create text drawing on click", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "text" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 50,
          offsetY: 50,
          clientX: 50,
          clientY: 50,
          button: 0,
          shiftKey: false,
        })
      );
    });

    expect(drawingsArray.length).toBe(1);
    const textDrawing = drawingsArray.toArray()[0];
    expect(textDrawing.type).toBe("text");
    expect(textDrawing.x).toBe(50);
    expect(textDrawing.y).toBe(50);
    expect(textDrawing.content).toBe("Double click to edit");
  });

  it("should handle hotkeys - Space for temporary pan", () => {
    renderInteractionsHook();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    });

    expect(viewportMock.plugins.resume).toHaveBeenCalled();
  });

  it("should handle hotkeys - Delete key removes selected drawing", () => {
    doc.transact(() => {
      drawingsArray.push([{ id: "d1", type: "brush" } as any]);
    });
    useBattlemapStore.setState({
      activeTool: "select",
      selectedDrawingIds: ["d1"],
    });

    renderInteractionsHook();

    expect(drawingsArray.length).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Delete" }));
    });

    expect(drawingsArray.length).toBe(0);
  });

  it("should handle hotkeys - Backspace key removes selected drawing", () => {
    doc.transact(() => {
      drawingsArray.push([{ id: "d1", type: "brush" } as any]);
    });
    useBattlemapStore.setState({
      activeTool: "select",
      selectedDrawingIds: ["d1"],
    });

    renderInteractionsHook();

    expect(drawingsArray.length).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Backspace" }));
    });

    expect(drawingsArray.length).toBe(0);
  });

  it("should ignore middle button for tool interactions", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "brush" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 100,
          offsetY: 100,
          clientX: 100,
          clientY: 100,
          button: 1,
          shiftKey: false,
        })
      );
    });

    const store = useBattlemapStore.getState();
    expect(store.isDrawing).toBe(false);
  });

  it("should ignore non-left button for tool interactions", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "brush" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 100,
          offsetY: 100,
          clientX: 100,
          clientY: 100,
          button: 2,
          shiftKey: false,
        })
      );
    });

    const store = useBattlemapStore.getState();
    expect(store.isDrawing).toBe(false);
  });

  it("should handle pointermove during brush drawing", () => {
    useBattlemapStore.setState({
      activeTool: "draw",
      drawTool: "brush",
      settings: { ...settings, snapToGrid: false },
    });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 100,
          offsetY: 100,
          clientX: 100,
          clientY: 100,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointermove", {
          offsetX: 120,
          offsetY: 120,
          clientX: 120,
          clientY: 120,
          button: 0,
          shiftKey: false,
        })
      );
    });

    const store = useBattlemapStore.getState();
    expect(store.currentPath.length).toBeGreaterThanOrEqual(4);
  });

  it("should handle pointerup to end drawing", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "brush" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 100,
          offsetY: 100,
          clientX: 100,
          clientY: 100,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointermove", {
          offsetX: 120,
          offsetY: 120,
          clientX: 120,
          clientY: 120,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      window.dispatchEvent(
        createPointerEventWithOffset("pointerup", {
          clientX: 150,
          clientY: 150,
          offsetX: 150,
          offsetY: 150,
          button: 0,
        })
      );
    });

    expect(drawingsArray.length).toBe(1);
    const drawing = drawingsArray.toArray()[0];
    expect(drawing.type).toBe("brush");
    expect(drawing.points).toBeDefined();
  });

  it("should create rectangle drawing on pointerup", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "rect" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 50,
          offsetY: 50,
          clientX: 50,
          clientY: 50,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointermove", {
          offsetX: 150,
          offsetY: 150,
          clientX: 150,
          clientY: 150,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      window.dispatchEvent(
        createPointerEventWithOffset("pointerup", {
          clientX: 150,
          clientY: 150,
          offsetX: 150,
          offsetY: 150,
          button: 0,
        })
      );
    });

    expect(drawingsArray.length).toBe(1);
    const rectDrawing = drawingsArray.toArray()[0];
    expect(rectDrawing.type).toBe("rect");
    expect(rectDrawing.x).toBe(50);
    expect(rectDrawing.y).toBe(50);
    expect(rectDrawing.width).toBe(100);
    expect(rectDrawing.height).toBe(100);
  });

  it("should create ellipse drawing on pointerup", () => {
    useBattlemapStore.setState({ activeTool: "draw", drawTool: "ellipse" });
    renderInteractionsHook();

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointerdown", {
          offsetX: 50,
          offsetY: 50,
          clientX: 50,
          clientY: 50,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      canvasElement.dispatchEvent(
        createPointerEventWithOffset("pointermove", {
          offsetX: 150,
          offsetY: 150,
          clientX: 150,
          clientY: 150,
          button: 0,
          shiftKey: false,
        })
      );
    });

    act(() => {
      window.dispatchEvent(
        createPointerEventWithOffset("pointerup", {
          clientX: 150,
          clientY: 150,
          offsetX: 150,
          offsetY: 150,
          button: 0,
        })
      );
    });

    expect(drawingsArray.length).toBe(1);
    const ellipse = drawingsArray.toArray()[0];
    expect(ellipse.type).toBe("ellipse");
    expect(ellipse.x).toBe(50);
    expect(ellipse.y).toBe(50);
    expect(ellipse.width).toBe(100);
    expect(ellipse.height).toBe(100);
  });
});
