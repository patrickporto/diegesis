import { Application } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useEffect, useRef, useState } from "react";

interface UsePixiAppProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fileId: string;
}

export function usePixiApp({ containerRef, fileId }: UsePixiAppProps) {
  const appRef = useRef<Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [viewportState, setViewportState] = useState({
    x: 0,
    y: 0,
    scale: 1,
    worldWidth: 0,
    worldHeight: 0,
    screenWidth: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let app: Application | null = null;
    let viewport: Viewport | null = null;

    const initApp = async () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      const newApp = new Application();
      await newApp.init({
        // preference: "webgl",
        background: "#1a1a2e",
        width,
        height,
        // antialias: true,
        hello: true,
      });

      if (!isMounted) {
        newApp.destroy({ removeView: true });
        return;
      }

      app = newApp;
      container.appendChild(app.canvas);
      appRef.current = app;

      // Create Viewport
      viewport = new Viewport({
        screenWidth: width,
        screenHeight: height,
        worldWidth: width,
        worldHeight: height,
        events: app.renderer.events,
      });

      viewport
        .drag({
          mouseButtons: "left", // Pan tool will now control availability
          wheel: false,
        })
        .pinch() // Two-finger pinch on touch devices
        .decelerate()
        .clampZoom({ minScale: 0.8, maxScale: 4 });

      // SMOOTH NAVIGATION SYSTEM
      // We accept wheel inputs -> accumulate velocity -> apply in ticker with friction

      const velocity = { x: 0, y: 0, zoom: 0 };
      const friction = 0.85; // 0.0 - 1.0 (Higher = more slide)
      const stopThreshold = 0.01;

      // Sensitivity (Adjusted by user preference)
      const ZOOM_SENSITIVITY = 0.005; // Lower because velocity accumulates
      const PAN_SENSITIVITY = 0.1;

      // Custom Wheel Handling for Trackpad Panning vs Zooming
      // Standard behavior in design tools:
      // - Wheel: Pan (Scroll)
      // - Ctrl + Wheel: Zoom
      // - Pinch (Trackpad): Detected as Ctrl+Wheel by browsers usually
      const canvas = app.canvas as HTMLCanvasElement;

      const onWheel = (e: WheelEvent) => {
        if (!viewport) return;
        e.preventDefault();

        // 1. Zooming (Ctrl Key or Pinch)
        if (e.ctrlKey) {
          // Accumulate zoom velocity
          velocity.zoom += -e.deltaY * ZOOM_SENSITIVITY;
        }
        // 2. Panning (Regular Scroll)
        else {
          // Accumulate pan velocity
          velocity.x += e.deltaX * PAN_SENSITIVITY;
          velocity.y += e.deltaY * PAN_SENSITIVITY;
        }
      };

      const onTick = () => {
        if (!viewport) return;

        // Apply Zoom Velocity
        if (Math.abs(velocity.zoom) > 0.0001) {
          viewport.zoomPercent(velocity.zoom, false);
          velocity.zoom *= friction;
          if (Math.abs(velocity.zoom) < 0.0001) velocity.zoom = 0;
        }

        // Apply Pan Velocity
        if (
          Math.abs(velocity.x) > stopThreshold ||
          Math.abs(velocity.y) > stopThreshold
        ) {
          // Scale pan by current zoom level so it feels consistent
          const currentScale = viewport.scale.x;
          viewport.moveCenter(
            viewport.center.x + velocity.x / currentScale,
            viewport.center.y + velocity.y / currentScale
          );
          velocity.x *= friction;
          velocity.y *= friction;

          if (Math.abs(velocity.x) < stopThreshold) velocity.x = 0;
          if (Math.abs(velocity.y) < stopThreshold) velocity.y = 0;
        }
      };

      canvas.addEventListener("wheel", onWheel, { passive: false });
      app.ticker.add(onTick);

      app.stage.addChild(viewport);
      viewportRef.current = viewport;

      // Handle resize
      const handleResize = () => {
        if (app && container) {
          app.renderer.resize(container.clientWidth, container.clientHeight);
          viewport?.resize(container.clientWidth, container.clientHeight);
        }
      };

      const updateViewportState = () => {
        if (viewport) {
          setViewportState({
            x: viewport.x,
            y: viewport.y,
            scale: viewport.scale.x,
            worldWidth: viewport.worldWidth,
            worldHeight: viewport.worldHeight,
            screenWidth: viewport.screenWidth,
            screenHeight: viewport.screenHeight,
          });
        }
      };

      viewport.on("moved", updateViewportState);
      viewport.on("zoomed", updateViewportState);

      window.addEventListener("resize", handleResize);
      setIsReady(true);

      return () => {
        window.removeEventListener("resize", handleResize);
        canvas.removeEventListener("wheel", onWheel); // Cleanup wheel
        app?.ticker.remove(onTick);
      };
    };

    let cleanupResize: (() => void) | undefined;

    initApp().then((cleanup) => {
      cleanupResize = cleanup;
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      if (app) {
        try {
          app.destroy(
            { removeView: true },
            { children: true, texture: true, textureSource: true }
          );
        } catch (e) {
          // Ignore destroy errors
        }
      }
      appRef.current = null;
      viewportRef.current = null;
      setIsReady(false);
    };
  }, [fileId, containerRef]);

  return {
    app: appRef.current,
    viewport: viewportRef.current,
    isReady,
    viewportState,
    appRef,
    viewportRef,
  };
}
