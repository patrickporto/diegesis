import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import { BattlemapSettings } from "../types";

interface UseBackgroundRendererProps {
  settings: BattlemapSettings;
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  app: Application | null;
  getFileBlob: (fileId: string) => Promise<Blob>;
  isReady: boolean;
  updateSettings: (updates: Partial<BattlemapSettings>) => void;
}

export function useBackgroundRenderer({
  settings,
  layerContainersRef,
  app,
  getFileBlob,
  isReady,
  updateSettings,
}: UseBackgroundRendererProps) {
  const currentBgIdRef = useRef<string | null>(null);

  useEffect(() => {
    const bgLayer = layerContainersRef.current.get("background");
    if (!bgLayer || !isReady || !app) return;

    const loadBackground = async () => {
      const bgSource = settings.backgroundImage;

      // If no background or changed, clear previous
      if (!bgSource) {
        bgLayer.removeChildren();
        currentBgIdRef.current = null;
        return;
      }

      if (currentBgIdRef.current === bgSource) return; // Already loaded

      try {
        bgLayer.removeChildren();
        let texture: Texture;

        if (bgSource.startsWith("drive://")) {
          const fileId = bgSource.replace("drive://", "");
          const blob = await getFileBlob(fileId);
          const url = URL.createObjectURL(blob);
          texture = await Assets.load(url);
          // Clean up object URL after load? Pixi caches it by URL usually.
        } else {
          texture = await Assets.load(bgSource);
        }

        const sprite = new Sprite(texture);
        sprite.label = "background-image";
        bgLayer.addChild(sprite);
        currentBgIdRef.current = bgSource;

        // Update map dimensions based on background image
        const textureWidth = texture.width;
        const textureHeight = texture.height;
        if (
          settings.mapWidth !== textureWidth ||
          settings.mapHeight !== textureHeight
        ) {
          updateSettings({
            mapWidth: textureWidth,
            mapHeight: textureHeight,
          });
        }
      } catch (error) {
        console.error("Failed to load background:", error);
      }
    };

    loadBackground();
  }, [
    settings.backgroundImage,
    settings.mapWidth,
    settings.mapHeight,
    isReady,
    app,
    getFileBlob,
    layerContainersRef,
    updateSettings,
  ]);
}
