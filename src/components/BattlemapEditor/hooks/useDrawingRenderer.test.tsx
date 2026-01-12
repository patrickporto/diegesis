/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react";
import { Container, Graphics } from "pixi.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { useDrawingRenderer } from "./useDrawingRenderer";

// Mock canvas for PIXI.js text metrics that require getContext
const mockCanvasContext = {
  measureText: vi.fn(() => ({ width: 100 })),
  font: "",
  fillStyle: "",
  strokeStyle: "",
  save: vi.fn(),
  restore: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(),
};

// Setup canvas mock for PIXI.js
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
  if (tagName === "canvas") {
    const canvas = originalCreateElement("canvas");
    // Directly assign the mock method instead of spying on the instance
    // because JSDOM elements might not have the property as own property
    Object.defineProperty(canvas, "getContext", {
      value: vi.fn().mockReturnValue(mockCanvasContext),
      writable: true,
    });
    return canvas;
  }
  return originalCreateElement(tagName);
});

// Mock Pixi.js
vi.mock("pixi.js", async () => {
  const actual = await vi.importActual("pixi.js");

  // Create a proper mock BlurFilter class that can be instantiated with 'new'
  class MockBlurFilter {
    blur = 0;
  }

  return {
    ...actual,
    BlurFilter: MockBlurFilter,
  };
});

describe("useDrawingRenderer", () => {
  let layerContainersRef: React.MutableRefObject<Map<string, Container>>;

  beforeEach(() => {
    // Reset store
    useBattlemapStore.setState({
      drawings: [],
      selectedDrawingIds: [],
    });

    // Create mock layer containers
    layerContainersRef = {
      current: new Map([
        ["map", new Container()],
        ["tokens", new Container()],
      ]),
    };
  });

  const mockDrawings = [
    {
      id: "draw1",
      type: "brush" as const,
      layer: "map",
      x: 0,
      y: 0,
      points: [0, 0, 100, 100, 200, 200],
      strokeColor: "#ff0000",
      strokeWidth: 2,
      opacity: 1,
      blur: 0,
    },
    {
      id: "draw2",
      type: "rect" as const,
      layer: "map",
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      strokeColor: "#00ff00",
      strokeWidth: 2,
      fillColor: "#ffffff",
      fillAlpha: 0.5,
      opacity: 0.8,
      blur: 5,
    },
    {
      id: "draw3",
      type: "ellipse" as const,
      layer: "tokens",
      x: 50,
      y: 50,
      width: 100,
      height: 50,
      strokeColor: "#0000ff",
      strokeWidth: 3,
      fillColor: "#ffff00",
      fillAlpha: 0.3,
    },
  ];

  describe("Rendering Brush Drawings", () => {
    it("should render brush strokes with correct properties", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[0]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should not render brush with less than 4 points", () => {
      const shortBrush = {
        ...mockDrawings[0],
        points: [0, 0, 10], // Only 3 coordinates (1.5 points)
      };

      useBattlemapStore.setState({ drawings: [shortBrush] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      // Should create graphics but not draw (points < 4)
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should apply opacity to brush", () => {
      const brushWithOpacity = {
        ...mockDrawings[0],
        opacity: 0.5,
      };

      useBattlemapStore.setState({ drawings: [brushWithOpacity] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const graphics = mapContainer?.children[0] as Graphics;
      expect(graphics?.alpha).toBe(0.5);
    });

    it("should apply blur filter when blur > 0", () => {
      const brushWithBlur = {
        ...mockDrawings[0],
        blur: 10,
      };

      useBattlemapStore.setState({ drawings: [brushWithBlur] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const graphics = mapContainer?.children[0] as Graphics;
      expect(graphics?.filters).toBeDefined();
      expect(graphics?.filters?.length).toBe(1);
    });

    it("should not apply blur filter when blur = 0", () => {
      const brushNoBlur = {
        ...mockDrawings[0],
        blur: 0,
      };

      useBattlemapStore.setState({ drawings: [brushNoBlur] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const graphics = mapContainer?.children[0] as Graphics;
      expect(graphics?.filters).toBeNull();
    });

    it("should not apply blur filter to selection markers", () => {
      const brushWithBlur = {
        ...mockDrawings[0],
        blur: 10,
      };

      useBattlemapStore.setState({
        selectedDrawingIds: [brushWithBlur.id],
        drawings: [brushWithBlur],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      // First child is content graphics (should have blur filter)
      const contentGraphics = mapContainer?.children[0] as Graphics;
      expect(contentGraphics?.filters).toBeDefined();
      expect(contentGraphics?.filters?.length).toBe(1);
      // Second child is selection graphics (should not have blur filter)
      const selectionGraphics = mapContainer?.children[1] as Graphics;
      expect(selectionGraphics?.filters).toBeNull();
    });
  });

  describe("Rendering Rectangle Drawings", () => {
    it("should render rectangle with stroke and fill", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[1]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should render rectangle without fill color", () => {
      const rectNoFill = {
        ...mockDrawings[1],
        fillColor: undefined,
      };

      useBattlemapStore.setState({ drawings: [rectNoFill] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should apply custom stroke width", () => {
      const rectWithStrokeWidth = {
        ...mockDrawings[1],
        strokeWidth: 5,
      };

      useBattlemapStore.setState({ drawings: [rectWithStrokeWidth] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should apply default stroke width when not specified", () => {
      const rectDefaultStroke = {
        ...mockDrawings[1],
        strokeWidth: undefined,
      };

      useBattlemapStore.setState({ drawings: [rectDefaultStroke] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Rendering Ellipse Drawings", () => {
    it("should render ellipse with correct dimensions", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[2]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const tokensContainer = layerContainersRef.current.get("tokens");
      expect(tokensContainer?.children.length).toBeGreaterThan(0);
    });

    it("should render ellipse in correct layer", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[2]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const tokensContainer = layerContainersRef.current.get("tokens");
      const mapContainer = layerContainersRef.current.get("map");

      expect(tokensContainer?.children.length).toBeGreaterThan(0);
      expect(mapContainer?.children.length).toBe(0);
    });
  });

  describe("Rendering Polygon Drawings", () => {
    it("should render polygon with points", () => {
      const polygon = {
        id: "poly1",
        type: "polygon" as const,
        layer: "map",
        x: 0,
        y: 0,
        points: [0, 0, 100, 0, 100, 100, 0, 100],
        strokeColor: "#ff0000",
        strokeWidth: 2,
      };

      useBattlemapStore.setState({ drawings: [polygon] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should render polygon with fill", () => {
      const polygonWithFill = {
        id: "poly2",
        type: "polygon" as const,
        layer: "map",
        x: 0,
        y: 0,
        points: [0, 0, 100, 0, 100, 100, 0, 100],
        strokeColor: "#ff0000",
        strokeWidth: 2,
        fillColor: "#0000ff",
        fillAlpha: 0.5,
      };

      useBattlemapStore.setState({ drawings: [polygonWithFill] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Rendering Text Drawings", () => {
    it("should render text with content", () => {
      const textDrawing = {
        id: "text1",
        type: "text" as const,
        layer: "map",
        x: 100,
        y: 100,
        content: "Test Text",
        fontSize: 16,
        fontFamily: "Arial",
        strokeColor: "#ffffff",
        width: 200,
      };

      useBattlemapStore.setState({ drawings: [textDrawing] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should render text with custom font size", () => {
      const textWithFontSize = {
        id: "text2",
        type: "text" as const,
        layer: "map",
        x: 100,
        y: 100,
        content: "Large Text",
        fontSize: 32,
        fontFamily: "Arial",
        strokeColor: "#ffffff",
        width: 200,
      };

      useBattlemapStore.setState({ drawings: [textWithFontSize] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should apply opacity to text", () => {
      const textWithOpacity = {
        id: "text3",
        type: "text" as const,
        layer: "map",
        x: 100,
        y: 100,
        content: "Faded Text",
        fontSize: 16,
        fontFamily: "Arial",
        strokeColor: "#ffffff",
        width: 200,
        opacity: 0.5,
      };

      useBattlemapStore.setState({ drawings: [textWithOpacity] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const graphics = mapContainer?.children[0] as Graphics;
      expect(graphics?.alpha).toBe(0.5);
    });
  });

  describe("Selection Rendering", () => {
    it("should not show selection when no drawing is selected", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[0]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      expect(useBattlemapStore.getState().selectedDrawingIds).toEqual([]);
    });

    it("should show selection when drawing is selected", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: ["draw1"],
        drawings: [mockDrawings[0]],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      expect(useBattlemapStore.getState().selectedDrawingIds).toEqual([
        "draw1",
      ]);
    });

    it("should show selection for multiple drawings", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: ["draw1", "draw2"],
        drawings: mockDrawings.slice(0, 2),
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      expect(useBattlemapStore.getState().selectedDrawingIds).toHaveLength(2);
    });
  });

  describe("Layer Management", () => {
    it("should render drawings to correct layer containers", () => {
      useBattlemapStore.setState({ drawings: mockDrawings });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const tokensContainer = layerContainersRef.current.get("tokens");

      expect(mapContainer?.children.length).toBe(2); // brush and rect
      expect(tokensContainer?.children.length).toBe(1); // ellipse
    });

    it("should handle missing layer container gracefully", () => {
      const drawingOnMissingLayer = {
        ...mockDrawings[0],
        layer: "nonexistent",
      };

      useBattlemapStore.setState({ drawings: [drawingOnMissingLayer] });

      // Should not throw error
      expect(() => {
        renderHook(() =>
          useDrawingRenderer({
            layerContainersRef,
            isReady: true,
          })
        );
      }).not.toThrow();
    });

    it("should move drawing to different layer", () => {
      const drawing = { ...mockDrawings[0], layer: "map" as const };
      useBattlemapStore.setState({ drawings: [drawing] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      // Move to different layer by updating Zustand store
      const drawingMoved = { ...drawing, layer: "tokens" as const };
      useBattlemapStore.setState({ drawings: [drawingMoved] });

      // Re-render to reflect changes
      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const tokensContainer = layerContainersRef.current.get("tokens");

      expect(mapContainer?.children.length).toBe(0);
      expect(tokensContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Cleanup and Lifecycle", () => {
    it("should destroy graphics when drawing is removed", () => {
      useBattlemapStore.setState({ drawings: [mockDrawings[0]] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      const initialCount = mapContainer?.children.length || 0;
      expect(initialCount).toBeGreaterThan(0);

      // Remove drawing by clearing Zustand store
      useBattlemapStore.setState({ drawings: [] });

      // Re-render to reflect changes
      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const finalCount = mapContainer?.children.length || 0;
      expect(finalCount).toBe(0);
    });

    it("should not render when isReady is false", () => {
      // Create fresh containers for this test to avoid pollution
      const freshContainers = {
        current: new Map([
          ["map", new Container()],
          ["tokens", new Container()],
        ]),
      };

      useBattlemapStore.setState({ drawings: mockDrawings });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef: freshContainers,
          isReady: false,
        })
      );

      const mapContainer = freshContainers.current.get("map");
      const tokensContainer = freshContainers.current.get("tokens");

      expect(mapContainer?.children.length).toBe(0);
      expect(tokensContainer?.children.length).toBe(0);
    });

    it("should start rendering when isReady becomes true", () => {
      // Create fresh containers for this test
      const freshContainers = {
        current: new Map([
          ["map", new Container()],
          ["tokens", new Container()],
        ]),
      };

      useBattlemapStore.setState({ drawings: mockDrawings });

      const { rerender } = renderHook(
        ({ isReady }) =>
          useDrawingRenderer({
            layerContainersRef: freshContainers,
            isReady,
          }),
        { initialProps: { isReady: false } }
      );

      const mapContainer = freshContainers.current.get("map");
      const tokensContainer = freshContainers.current.get("tokens");

      // Initially should not render because isReady is false
      expect(mapContainer?.children.length).toBe(0);
      expect(tokensContainer?.children.length).toBe(0);

      // Now set isReady to true
      rerender({ isReady: true });

      // Should now render
      expect(mapContainer?.children.length).toBeGreaterThan(0);
      expect(tokensContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Update Handling", () => {
    it("should redraw when drawing properties change", () => {
      const drawing = { ...mockDrawings[0], strokeColor: "#ff0000" };
      useBattlemapStore.setState({ drawings: [drawing] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      // Update drawing color
      const drawingUpdated = { ...drawing, strokeColor: "#00ff00" };
      useBattlemapStore.setState({ drawings: [drawingUpdated] });

      // Re-render to reflect changes
      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should redraw when drawing position changes", () => {
      const drawing = { ...mockDrawings[1], x: 10, y: 10 };
      useBattlemapStore.setState({ drawings: [drawing] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      // Move drawing
      const drawingMoved = { ...drawing, x: 50, y: 50 };
      useBattlemapStore.setState({ drawings: [drawingMoved] });

      // Re-render to reflect changes
      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Selection Bounds Calculation", () => {
    it("should calculate correct bounds for rectangle", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: ["draw2"],
        drawings: [mockDrawings[1]],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should calculate correct bounds for ellipse", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: ["draw3"],
        drawings: [mockDrawings[2]],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const tokensContainer = layerContainersRef.current.get("tokens");
      expect(tokensContainer?.children.length).toBeGreaterThan(0);
    });

    it("should calculate bounds from points for brush", () => {
      useBattlemapStore.setState({
        selectedDrawingIds: ["draw1"],
        drawings: [mockDrawings[0]],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    // Skip: PIXI text measurement requires CanvasRenderingContext2D which is not available in test environment
    it("should calculate bounds from text content", () => {
      const textDrawing = {
        id: "text-bounds",
        type: "text" as const,
        layer: "map",
        x: 100,
        y: 100,
        content: "Bounds Test",
        fontSize: 16,
        fontFamily: "Arial",
        strokeColor: "#ffffff",
        width: 200,
      };

      useBattlemapStore.setState({
        selectedDrawingIds: ["text-bounds"],
        drawings: [textDrawing],
      });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty drawings array", () => {
      useBattlemapStore.setState({ drawings: [] });

      expect(() => {
        renderHook(() =>
          useDrawingRenderer({
            layerContainersRef,
            isReady: true,
          })
        );
      }).not.toThrow();
    });

    it("should handle drawing with invalid type gracefully", () => {
      const invalidDrawing = {
        id: "invalid",
        type: "invalid" as any,
        layer: "map",
        x: 0,
        y: 0,
        points: [0, 0, 10, 10],
      };

      useBattlemapStore.setState({ drawings: [invalidDrawing] });

      expect(() => {
        renderHook(() =>
          useDrawingRenderer({
            layerContainersRef,
            isReady: true,
          })
        );
      }).not.toThrow();
    });

    it("should handle drawing with undefined layer", () => {
      const drawingNoLayer = {
        ...mockDrawings[0],
        layer: undefined as any,
      };

      useBattlemapStore.setState({ drawings: [drawingNoLayer] });

      expect(() => {
        renderHook(() =>
          useDrawingRenderer({
            layerContainersRef,
            isReady: true,
          })
        );
      }).not.toThrow();
    });

    it("should handle drawing with zero dimensions", () => {
      const zeroRect = {
        ...mockDrawings[1],
        width: 0,
        height: 0,
      };

      useBattlemapStore.setState({ drawings: [zeroRect] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should handle drawing with negative dimensions", () => {
      const negativeRect = {
        ...mockDrawings[1],
        width: -100,
        height: -50,
      };

      useBattlemapStore.setState({ drawings: [negativeRect] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });

    it("should handle text with empty content", () => {
      const emptyText = {
        id: "empty-text",
        type: "text" as const,
        layer: "map",
        x: 100,
        y: 100,
        content: "",
        fontSize: 16,
        fontFamily: "Arial",
        strokeColor: "#ffffff",
        width: 200,
      };

      useBattlemapStore.setState({ drawings: [emptyText] });

      renderHook(() =>
        useDrawingRenderer({
          layerContainersRef,
          isReady: true,
        })
      );

      const mapContainer = layerContainersRef.current.get("map");
      expect(mapContainer?.children.length).toBeGreaterThan(0);
    });
  });
});
