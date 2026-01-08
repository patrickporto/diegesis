import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  Sprite,
} from "pixi.js";
import { useCallback, useEffect, useRef } from "react";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { BattlemapSettings, FogShape } from "../types";

interface UseFogRendererProps {
  fogShapes: FogShape[];
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  app: Application | null;
  isReady: boolean;
  settings: BattlemapSettings;
}

const FOG_SIZE = 2048;

export function useFogRenderer({
  fogShapes,
  layerContainersRef,
  app,
  isReady,
  settings,
}: UseFogRendererProps) {
  const maskTextureRef = useRef<RenderTexture | null>(null);
  const fogTextureRef = useRef<RenderTexture | null>(null);
  const fogSpriteRef = useRef<Sprite | null>(null);
  const maskSpriteRef = useRef<Sprite | null>(null);

  // Callback to update fog opacity
  const updateFogOpacity = useCallback(
    (opacity: number) => {
      const fogTexture = fogTextureRef.current;
      if (!app || !app.renderer || !fogTexture) return;

      const fogGraphics = new Graphics();
      fogGraphics.rect(0, 0, FOG_SIZE, FOG_SIZE);
      fogGraphics.fill({ color: 0x000000, alpha: opacity });

      if (fogTexture.width > 0 && fogTexture.height > 0) {
        app.renderer.render({
          container: fogGraphics,
          target: fogTexture,
          clear: true,
        });
      }
    },
    [app]
  );

  // Initialize fog layer with mask-based approach
  useEffect(() => {
    const fogLayer = layerContainersRef.current.get("fog");
    if (!app || !app.renderer || !fogLayer || !isReady) return;

    // Clean up existing fog elements
    fogLayer.removeChildren();

    // Create the RenderTexture for the mask
    // White areas = fog visible, Black/Transparent = fog invisible (revealed)
    const maskTexture = RenderTexture.create({
      width: Math.max(1, FOG_SIZE),
      height: Math.max(1, FOG_SIZE),
    });
    maskTextureRef.current = maskTexture;

    // Create the fog overlay sprite with default opacity
    // The opacity update effect will set the correct value immediately after init
    const fogGraphics = new Graphics();
    fogGraphics.rect(0, 0, FOG_SIZE, FOG_SIZE);
    fogGraphics.fill({ color: 0x000000, alpha: 0.85 }); // Fixed default value
    fogGraphics.label = "fog-base";

    // Render fog graphics to a texture for the fog sprite
    const fogTexture = RenderTexture.create({
      width: Math.max(1, FOG_SIZE),
      height: Math.max(1, FOG_SIZE),
    });
    fogTextureRef.current = fogTexture;
    app.renderer.render({
      container: fogGraphics,
      target: fogTexture,
      clear: true,
    });

    const fogSprite = new Sprite(fogTexture);
    fogSprite.label = "fog-sprite";
    fogSpriteRef.current = fogSprite;

    // Create the mask sprite from the mask texture
    const maskSprite = new Sprite(maskTexture);
    maskSprite.label = "fog-mask";
    maskSpriteRef.current = maskSprite;

    // Apply the mask to the fog sprite
    // In PixiJS, mask works as: visible where mask is opaque
    fogSprite.mask = maskSprite;

    // Add both to fog layer - mask needs to be in scene graph for some renderers
    fogLayer.addChild(maskSprite);
    fogLayer.addChild(fogSprite);

    return () => {
      maskTexture.destroy(true);
      fogTexture.destroy(true);
      maskTextureRef.current = null;
      fogTextureRef.current = null;
      fogSpriteRef.current = null;
      maskSpriteRef.current = null;
    };
  }, [isReady, app, layerContainersRef]);

  // Update fog opacity when settings change
  useEffect(() => {
    // Only update if textures are already initialized
    if (!fogTextureRef.current) return;

    const fogOpacity = settings.fogOpacity ?? 0.85;
    updateFogOpacity(fogOpacity);
  }, [settings.fogOpacity, updateFogOpacity]);

  // Update the mask texture when fog shapes change
  useEffect(() => {
    const maskTexture = maskTextureRef.current;
    if (!app || !app.renderer || !maskTexture) return;

    // Create a container to draw all fog shapes into the mask
    const maskContainer = new Container();
    maskContainer.label = "mask-render-container";

    // Start with a transparent background (no fog by default)
    // Then process shapes in ORDER to allow hide after reveal
    const baseFog = new Graphics();
    baseFog.rect(0, 0, FOG_SIZE, FOG_SIZE);
    baseFog.fill(0x000000); // Black = transparent mask = no fog initially
    maskContainer.addChild(baseFog);

    // Process fog shapes IN ORDER (preserving sequence)
    // This allows "hide" to work after "reveal" by respecting the operation order
    fogShapes.forEach((shape) => {
      const g = new Graphics();
      if (shape.operation === "add") {
        // "add" = add fog (draw white = fog visible)
        g.blendMode = "normal";
        drawFogShape(g, shape, 0xffffff);
      } else {
        // "sub" = reveal/remove fog (erase = make transparent)
        g.blendMode = "erase";
        drawFogShape(g, shape, 0xffffff);
      }
      maskContainer.addChild(g);
    });

    // Render the mask container to the mask texture
    if (maskTexture.width > 0 && maskTexture.height > 0) {
      app.renderer.render({
        container: maskContainer,
        target: maskTexture,
        clear: true,
      });
    }

    // Clean up the temporary container
    maskContainer.destroy({ children: true });
  }, [fogShapes, app]);

  // Handle interactivity of fog layer - only active when using fog tool
  const activeTool = useBattlemapStore((s) => s.activeTool);
  useEffect(() => {
    const fogLayer = layerContainersRef.current.get("fog");
    if (fogLayer) {
      fogLayer.eventMode = activeTool === "fog" ? "static" : "none";
    }
  }, [activeTool, layerContainersRef]);
}

function drawFogShape(g: Graphics, shape: FogShape, color: number) {
  if (shape.type === "brush" && shape.data.length >= 4) {
    g.moveTo(shape.data[0], shape.data[1]);
    for (let i = 2; i < shape.data.length; i += 2) {
      g.lineTo(shape.data[i], shape.data[i + 1]);
    }
    g.stroke({
      width: shape.width || 50,
      color,
      cap: "round",
      join: "round",
    });
  } else if (shape.type === "rect") {
    g.rect(shape.data[0], shape.data[1], shape.data[2], shape.data[3]);
    g.fill(color);
  } else if (shape.type === "ellipse") {
    const [x, y, w, h] = shape.data;
    g.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2));
    g.fill(color);
  } else if (shape.type === "poly") {
    g.moveTo(shape.data[0], shape.data[1]);
    for (let i = 2; i < shape.data.length; i += 2) {
      g.lineTo(shape.data[i], shape.data[i + 1]);
    }
    g.closePath();
    g.fill(color);
  }
}
