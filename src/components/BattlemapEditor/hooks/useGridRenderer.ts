import { Application, Container, Graphics } from "pixi.js";
import { useEffect } from "react";

import { GridRenderer } from "../GridRenderer";
import { BattlemapSettings } from "../types";

interface UseGridRendererProps {
  settings: BattlemapSettings;
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  app: Application | null;
  isReady: boolean;
}

export function useGridRenderer({
  settings,
  layerContainersRef,
  app,
  isReady,
}: UseGridRendererProps) {
  useEffect(() => {
    // Grid is a special case in the current implementation, sometimes handled by GridRenderer helper
    // or typically drawn into the 'grid' layer container.
    const gridLayer = layerContainersRef.current.get("grid");
    if (!gridLayer || !isReady || !app) return;

    if (gridLayer instanceof Graphics) {
      gridLayer.clear();
      GridRenderer.render(
        gridLayer,
        3000,
        3000, // Width/Height should ideally come from viewport / expanded world size
        settings.gridType,
        settings.gridCellSize,
        {
          color: settings.gridColor,
          alpha: settings.gridOpacity,
          width: settings.gridLineWidth,
        }
      );
      // Note: In original code, grid was re-drawn on viewport move? Or static big grid?
      // Original code: "viewport.addChild(grid)" and re-drew it.
      // Here we assume static big grid for simplicity or need to listen to resize.
    }
  }, [settings, isReady, app, layerContainersRef]); // Re-draw when settings change
}
