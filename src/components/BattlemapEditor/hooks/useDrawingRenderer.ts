import { Container, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

import { DrawingPath } from "../types";

interface UseDrawingRendererProps {
  drawings: DrawingPath[];
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  isReady: boolean;
}

export function useDrawingRenderer({
  drawings,
  layerContainersRef,
  isReady,
}: UseDrawingRendererProps) {
  const drawingGraphicsRef = useRef(new Map<string, Graphics>());

  useEffect(() => {
    if (!isReady) return;

    const currentIds = new Set(drawings.map((d) => d.id));
    const graphicsMap = drawingGraphicsRef.current;

    // Cleanup
    for (const [id, g] of graphicsMap) {
      if (!currentIds.has(id)) {
        g.destroy();
        graphicsMap.delete(id);
      }
    }

    drawings.forEach((drawing) => {
      let g = graphicsMap.get(drawing.id);
      const layerId = drawing.layer || "map";
      const container = layerContainersRef.current.get(layerId);

      if (!container) return; // Layer missing?

      if (!g) {
        g = new Graphics();
        g.label = `drawing-${drawing.id}`;
        graphicsMap.set(drawing.id, g);
        container.addChild(g);

        // Draw once strictly? Or check if dirty?
        // For now, draw:
        if (drawing.points && drawing.points.length >= 4) {
          g.moveTo(drawing.points[0], drawing.points[1]);
          for (let i = 2; i < drawing.points.length; i += 2) {
            g.lineTo(drawing.points[i], drawing.points[i + 1]);
          }
          g.stroke({
            width: drawing.width || 2,
            color: drawing.color || 0xff0000,
            cap: "round",
            join: "round",
          });
        }
      } else if (g.parent !== container) {
        // Moved layers
        container.addChild(g);
      }
    });

    return () => {
      // cleanup on unmount?
      // We handle cleanup via ID check primarily.
    };
  }, [drawings, isReady, layerContainersRef]);
}
