import { Container, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useEffect, useRef } from "react";

import { Layer } from "../types";

interface UseBattlemapLayersProps {
  viewport: Viewport | null;
  layers: Layer[] | undefined;
  isReady: boolean;
}

export function useBattlemapLayers({
  viewport,
  layers,
  isReady,
}: UseBattlemapLayersProps) {
  const layerContainersRef = useRef<Map<string, Container>>(new Map());

  // Initialize and Sync Layers
  useEffect(() => {
    if (!viewport || !layers) return;

    // Create missing containers
    layers.forEach((layer) => {
      if (!layerContainersRef.current.has(layer.id)) {
        let container: Container;

        if (layer.id === "grid") {
          const grid = new Graphics();
          grid.label = "grid";
          container = grid;
        } else {
          container = new Container();
          container.label = layer.id;
        }

        container.zIndex = layer.sortOrder;

        if (layer.id === "grid") {
          viewport.addChild(container);
        } else {
          viewport.addChild(container);
        }

        layerContainersRef.current.set(layer.id, container);
      }
    });

    // Remove deleted layers
    for (const [id, container] of layerContainersRef.current) {
      if (!layers.some((l) => l.id === id)) {
        container.destroy({ children: true });
        layerContainersRef.current.delete(id);
      }
    }

    // Update properties and sort
    layers.forEach((layer) => {
      const container = layerContainersRef.current.get(layer.id);
      if (container) {
        container.visible = layer.visible;
        container.alpha = layer.opacity;
        container.zIndex = layer.id === "grid" ? 1000 : layer.sortOrder;
      }
    });

    viewport.sortChildren();
  }, [layers, isReady, viewport]);

  const getLayer = (id: string) => layerContainersRef.current.get(id);

  return {
    layerContainers: layerContainersRef.current,
    getLayer,
    layerContainersRef,
  };
}
