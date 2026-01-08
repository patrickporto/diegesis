import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useEffect, useRef } from "react";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import { GridRenderer } from "../GridRenderer";
import { BattlemapSettings, ContextMenuAction, Token } from "../types";

interface DraggableContainer extends Container {
  isDragging?: boolean;
}

interface UseTokenRendererProps {
  tokens: Token[];
  settings: BattlemapSettings;
  layerContainersRef: React.MutableRefObject<Map<string, Container>>;
  doc: Y.Doc;
  tokensArray: Y.Array<Token>;
  viewport: Viewport | null;
  app: Application | null;
  isSignedIn: boolean;
  getFileBlob: (fileId: string) => Promise<Blob>;
  setContextMenu: (
    menu: { x: number; y: number; actions: ContextMenuAction[] } | null
  ) => void;
}

export function useTokenRenderer({
  tokens,
  settings,
  layerContainersRef,
  doc,
  tokensArray,
  viewport,
  isSignedIn,
  getFileBlob,
  setContextMenu,
}: UseTokenRendererProps) {
  const tokenContainersRef = useRef(new Map<string, DraggableContainer>());
  const activeTool = useBattlemapStore((s) => s.activeTool);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    const currentIds = new Set(tokens.map((t) => t.id));
    const tokenContainers = tokenContainersRef.current;

    // Cleanup removed
    for (const [id, container] of tokenContainers) {
      if (!currentIds.has(id)) {
        container.destroy({ children: true });
        tokenContainers.delete(id);
      }
    }

    tokens.forEach((token) => {
      let container = tokenContainers.get(token.id);
      const size = token.size * settings.gridCellSize;

      if (!container) {
        container = new Container();
        container.label = "token";
        container.eventMode = "static";
        container.cursor = "grab";

        const contentContainer = new Container();
        container.addChild(contentContainer);

        // Setup content (Image or Placeholder)
        if (token.imageUrl) {
          const sprite = new Sprite(Texture.WHITE);
          sprite.label = "sprite";
          sprite.width = size;
          sprite.height = size;

          const mask = new Graphics();
          mask.circle(size / 2, size / 2, size / 2);
          mask.fill(0xffffff);

          sprite.mask = mask;
          contentContainer.addChild(mask);
          contentContainer.addChild(sprite);

          const loadTexture = async () => {
            if (token.imageUrl.startsWith("drive://")) {
              if (!isSignedIn) return;
              try {
                const id = token.imageUrl.replace("drive://", "");
                const blob = await getFileBlob(id);
                const url = URL.createObjectURL(blob);
                const texture = await Assets.load(url);
                if (container && !container.destroyed) sprite.texture = texture;
              } catch (e) {
                console.error("Failed to load drive token", e);
              }
            } else {
              const texture = await Assets.load(token.imageUrl);
              if (container && !container.destroyed) sprite.texture = texture;
            }
          };
          loadTexture();
        } else {
          const circle = new Graphics();
          circle.circle(size / 2, size / 2, size / 2);
          circle.fill({ color: 0x4a90d9, alpha: 0.8 });
          contentContainer.addChild(circle);
        }

        // Interaction Logic
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        container.on("pointerdown", (e) => {
          if (e.button !== 0 || activeToolRef.current !== "select") return;
          e.stopPropagation();
          if (!viewport || !container) return;
          isDragging = true;
          container.isDragging = true;
          container.cursor = "grabbing";

          const worldPos = viewport.toLocal(e.global);
          const currentSize = token.size * settingsRef.current.gridCellSize;
          dragOffset = {
            x: worldPos.x - (container.x + currentSize / 2),
            y: worldPos.y - (container.y + currentSize / 2),
          };
        });

        container.on("globalpointermove", (e) => {
          if (!isDragging || !viewport || !container) return;
          const worldPos = viewport.toLocal(e.global);
          const currentSettings = settingsRef.current;
          let centerX = worldPos.x - dragOffset.x;
          let centerY = worldPos.y - dragOffset.y;

          if (currentSettings.snapToGrid) {
            const snapped = GridRenderer.snapToGrid(
              centerX,
              centerY,
              currentSettings.gridType,
              currentSettings.gridCellSize
            );
            centerX = snapped.x;
            centerY = snapped.y;
          }

          const currentSize = token.size * currentSettings.gridCellSize;
          container.x = centerX - currentSize / 2;
          container.y = centerY - currentSize / 2;
        });

        container.on("pointerup", () => {
          if (!isDragging || !container) return;
          isDragging = false;
          container.isDragging = false;
          container.cursor = "grab";

          // Capture the specific container to avoid TS 'possibly undefined' in nested callbacks
          const currentContainer = container;

          // Update Yjs
          const idx = tokensArray.toArray().findIndex((t) => t.id === token.id);
          if (idx !== -1) {
            doc.transact(() => {
              const updated = {
                ...tokensArray.get(idx),
                x: currentContainer.x + size / 2,
                y: currentContainer.y + size / 2,
              };
              tokensArray.delete(idx, 1);
              tokensArray.insert(idx, [updated]);
            });
          }
        });

        container.on("rightup", (e) => {
          setContextMenu({
            x: e.client.x,
            y: e.client.y,
            actions: [
              {
                id: "delete-token",
                label: "Delete Token",
                onClick: () => {
                  const idx = tokensArray
                    .toArray()
                    .findIndex((t) => t.id === token.id);
                  if (idx !== -1) {
                    doc.transact(() => {
                      tokensArray.delete(idx, 1);
                    });
                  }
                  setContextMenu(null);
                },
                danger: true,
              },
            ],
          });
        });

        tokenContainers.set(token.id, container);
      }

      // Layer Management
      const layerId = token.layer || "tokens";
      const targetLayer = layerContainersRef.current.get(layerId);
      if (targetLayer && container.parent !== targetLayer) {
        targetLayer.addChild(container);
      }

      // Sync Position (if not dragging)
      if (!container.isDragging) {
        container.x = token.x - size / 2;
        container.y = token.y - size / 2;
      }
    });
  }, [
    tokens,
    settings,
    activeTool,
    doc,
    layerContainersRef,
    setContextMenu,
    tokensArray,
    viewport,
    getFileBlob,
    isSignedIn,
  ]);

  // Cleanup
  useEffect(() => {
    const containers = tokenContainersRef.current;
    return () => {
      containers.forEach((c) => c.destroy({ children: true }));
    };
  }, []);
}
