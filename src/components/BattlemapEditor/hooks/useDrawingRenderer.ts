import { BlurFilter, Container, Graphics, Text, TextStyle } from "pixi.js";
import { useEffect, useRef } from "react";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";

interface UseDrawingRendererProps {
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  isReady: boolean;
}

export function useDrawingRenderer({
  layerContainersRef,
  isReady,
}: UseDrawingRendererProps) {
  const drawings = useBattlemapStore((s) => s.drawings);
  const selectedDrawingIds = useBattlemapStore((s) => s.selectedDrawingIds);
  const drawingGraphicsRef = useRef<Map<string, Graphics>>(new Map());
  const selectionGraphicsRef = useRef<Map<string, Graphics>>(new Map());

  useEffect(() => {
    if (!isReady) return;

    const currentIds = new Set(drawings.map((d) => d.id));
    const graphicsMap = drawingGraphicsRef.current;
    const selectionMap = selectionGraphicsRef.current;

    // Cleanup
    for (const [id, g] of graphicsMap) {
      if (!currentIds.has(id)) {
        g.destroy({ children: true });
        graphicsMap.delete(id);
      }
    }
    for (const [id, g] of selectionMap) {
      if (!currentIds.has(id)) {
        g.destroy({ children: true });
        selectionMap.delete(id);
      }
    }

    // Clean up selection graphics for drawings that are no longer selected
    for (const [id, g] of selectionMap) {
      if (!selectedDrawingIds.includes(id)) {
        g.destroy({ children: true });
        selectionMap.delete(id);
      }
    }

    drawings.forEach((drawing) => {
      let g = graphicsMap.get(drawing.id);
      let selectionG = selectionMap.get(drawing.id);
      const layerId = drawing.layer || "map";
      const container = layerContainersRef.current.get(layerId);

      if (!container) return;

      if (!g) {
        g = new Graphics();
        g.label = `drawing-${drawing.id}`;
        graphicsMap.set(drawing.id, g);
        container.addChild(g);
      } else if (g.parent !== container) {
        container.addChild(g);
      }

      const isSelected = selectedDrawingIds.includes(drawing.id);

      // Only create/keep selection graphics if drawing is selected
      if (isSelected) {
        if (!selectionG) {
          selectionG = new Graphics();
          selectionG.label = `selection-${drawing.id}`;
          selectionMap.set(drawing.id, selectionG);
          container.addChild(selectionG);
        } else if (selectionG.parent !== container) {
          container.addChild(selectionG);
        }
      }

      // Always clear and redraw to support updates (position, modifications, selection)
      g.clear();
      g.removeChildren();
      if (selectionG) {
        selectionG.clear();
      }

      // Apply shared properties to content graphics only
      g.alpha = drawing.opacity ?? 1;
      if (drawing.blur && drawing.blur > 0) {
        const blurFilter = new BlurFilter();
        blurFilter.blur = drawing.blur;
        g.filters = [blurFilter];
      } else {
        g.filters = null;
      }

      // Selection graphics never has blur filters
      if (selectionG) {
        selectionG.filters = null;
      }

      if (drawing.type === "brush" && drawing.points.length >= 4) {
        g.moveTo(drawing.points[0], drawing.points[1]);
        for (let i = 2; i < drawing.points.length; i += 2) {
          g.lineTo(drawing.points[i], drawing.points[i + 1]);
        }

        g.stroke({
          width: drawing.strokeWidth || 2,
          color: drawing.strokeColor || 0xff0000,
          cap: "round",
          join: "round",
        });
      } else if (drawing.type === "rect") {
        g.rect(drawing.x, drawing.y, drawing.width, drawing.height);
        if (drawing.fillColor) {
          g.fill({
            color: drawing.fillColor,
            alpha: drawing.fillAlpha ?? 1,
          });
        }
        if (drawing.strokeColor) {
          g.stroke({
            width: drawing.strokeWidth || 2,
            color: drawing.strokeColor,
          });
        }
      } else if (drawing.type === "ellipse") {
        const radiusX = drawing.width / 2;
        const radiusY = drawing.height / 2;
        g.ellipse(drawing.x + radiusX, drawing.y + radiusY, radiusX, radiusY);
        if (drawing.fillColor) {
          g.fill({
            color: drawing.fillColor,
            alpha: drawing.fillAlpha ?? 1,
          });
        }
        if (drawing.strokeColor) {
          g.stroke({
            width: drawing.strokeWidth || 2,
            color: drawing.strokeColor,
          });
        }
      } else if (drawing.type === "polygon") {
        g.poly(drawing.points);
        if (drawing.fillColor) {
          g.fill({
            color: drawing.fillColor,
            alpha: drawing.fillAlpha ?? 1,
          });
        }
        if (drawing.strokeColor) {
          g.stroke({
            width: drawing.strokeWidth || 2,
            color: drawing.strokeColor,
          });
        }
      } else if (drawing.type === "text") {
        const style = new TextStyle({
          fontSize: drawing.fontSize || 16,
          fill: drawing.strokeColor || "#ffffff",
          fontFamily: drawing.fontFamily || "Arial",
          wordWrap: true,
          wordWrapWidth: drawing.width || 400,
        });
        const text = new Text({ text: drawing.content, style });
        text.x = drawing.x;
        text.y = drawing.y;
        g.addChild(text);
      }

      // Selection Highlight
      if (isSelected) {
        // Draw a bounding box or outline
        // We can use g.getLocalBounds() if we already drew content
        // BUT for Text, the content is a child. `g.getLocalBounds()` should include children.
        // Wait, `g.getBounds()` or `g.getSize()`?
        // Let's manually draw a highlight box based on known props for stable rendering

        let bounds = { x: 0, y: 0, width: 0, height: 0 };
        if (drawing.type === "rect" || drawing.type === "ellipse") {
          bounds = {
            x: drawing.x,
            y: drawing.y,
            width: drawing.width,
            height: drawing.height,
          };
        } else if (drawing.type === "text") {
          // We can estimate or rely on Text logic.
          // Since we just created text, we can get its bounds?
          // Accessing bounds immediately might be inaccurate before first render in some Pixi versions, but usually ok.
          // Simplest is to assume text flow or just use a generic box if width is known.
          // Text doesn't always have width prop set accurately for flow.
          // Let's use `g.getLocalBounds()` from the children.
          const local = g.getLocalBounds();
          bounds = {
            x: local.x,
            y: local.y,
            width: local.width,
            height: local.height,
          };
          // If text was just added, local bounds should be correct.
        } else if (drawing.type === "polygon" || drawing.type === "brush") {
          // Calculate bounds from points
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          const pts =
            drawing.type === "polygon" ? drawing.points : drawing.points;
          if (pts) {
            for (let i = 0; i < pts.length; i += 2) {
              const px = pts[i];
              const py = pts[i + 1];
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            }
            bounds = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            };
          }
        }

        // Draw selection box on separate Graphics object (without blur)
        selectionG!.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        selectionG!.stroke({
          color: 0x00ffff, // Cyan highlight
          width: 1,
          alpha: 0.8,
          alignment: 1, // outer stroke
        });

        // Add corner handles? (Visual only for now)
        // Only show handles if single selection for now? Or mostly for rects?
        // User probably expects handles always, but maybe too cluttered if many selected.
        // Let's show handles always for now.
        const handleSize = 6;
        selectionG!.rect(
          bounds.x - handleSize / 2,
          bounds.y - handleSize / 2,
          handleSize,
          handleSize
        );
        selectionG!.rect(
          bounds.x + bounds.width - handleSize / 2,
          bounds.y + bounds.height - handleSize / 2,
          handleSize,
          handleSize
        );
        selectionG!.fill({ color: 0x00ffff });
      }
    });

    return () => {
      // cleanup on unmount?
    };
  }, [drawings, isReady, layerContainersRef, selectedDrawingIds]);
}
