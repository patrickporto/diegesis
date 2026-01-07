import { Application } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useEffect, useRef, useState } from "react";

interface UsePixiAppProps {
  containerRef: React.RefObject<HTMLDivElement>;
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
        preference: "webgl",
        background: "#1a1a2e",
        width,
        height,
        antialias: true,
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
          mouseButtons: "left-middle",
          wheel: false,
        })
        .pinch()
        .wheel()
        .decelerate();

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
