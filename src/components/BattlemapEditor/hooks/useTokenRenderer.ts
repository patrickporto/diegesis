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
  const selectedTokenIds = useBattlemapStore((s) => s.selectedTokenIds);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const currentIds = new Set(tokens.map((t) => t.id));
    const tokenContainers = tokenContainersRef.current;

    // 1. Cleanup removed tokens
    for (const [id, container] of tokenContainers) {
      if (!currentIds.has(id)) {
        container.destroy({ children: true });
        tokenContainers.delete(id);
      }
    }

    // 2. Process all current tokens
    tokens.forEach((token) => {
      let container = tokenContainers.get(token.id) as DraggableContainer;
      const size = token.size * settings.gridCellSize;

      if (!container) {
        container = new Container() as DraggableContainer;
        container.label = "token";
        container.eventMode = "dynamic";
        container.interactive = true;
        container.isDragging = false;

        const selectionGraphics = new Graphics();
        selectionGraphics.label = "selection";
        selectionGraphics.eventMode = "none";
        container.addChild(selectionGraphics);

        const contentContainer = new Container();
        container.addChild(contentContainer);

        // Placeholder/Image logic
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

        tokenContainers.set(token.id, container);
      }

      // 3. Update Listeners (Clear and re-add to ensure latest logic/closures)
      container.removeAllListeners();

      let dragOffset = { x: 0, y: 0 };

      container.on("pointerdown", (e) => {
        const state = useBattlemapStore.getState();
        console.log("Token Interaction - PointerDown:", {
          id: token.id,
          tool: state.activeTool,
          button: e.button,
        });

        if (e.button !== 0 || state.activeTool !== "select") return;
        e.stopPropagation();

        // Multi-selection logic
        const isShift = e.shiftKey;
        const currentSelected = state.selectedTokenIds;
        const isCurrentlySelected = currentSelected.includes(token.id);

        if (isShift) {
          if (isCurrentlySelected) {
            state.setSelectedTokens(
              currentSelected.filter((id) => id !== token.id)
            );
          } else {
            state.setSelectedTokens([...currentSelected, token.id]);
          }
        } else if (!isCurrentlySelected) {
          state.setSelectedTokens([token.id]);
        }

        if (!viewport) return;
        container.isDragging = true;
        state.setIsDraggingToken(true);
        container.cursor = "grabbing";

        const worldPos = viewport.toLocal(e.global);
        dragOffset = {
          x: worldPos.x - (container.x + size / 2),
          y: worldPos.y - (container.y + size / 2),
        };
        console.log("Token Dragging Started");
      });

      container.on("globalpointermove", (e) => {
        if (!container.isDragging || !viewport) return;

        const worldPos = viewport.toLocal(e.global);
        const currentSettings = settingsRef.current;
        let centerX = worldPos.x - dragOffset.x;
        let centerY = worldPos.y - dragOffset.y;

        if (currentSettings.snapToGrid) {
          const snapped = GridRenderer.snapToGrid(
            centerX,
            centerY,
            currentSettings.gridType,
            currentSettings.gridCellSize,
            currentSettings.gridOffsetX || 0,
            currentSettings.gridOffsetY || 0
          );
          centerX = snapped.x;
          centerY = snapped.y;
        }

        container.x = centerX - size / 2;
        container.y = centerY - size / 2;
      });

      const finalizeDrag = () => {
        if (!container.isDragging) return;
        console.log("Token Dragging Finished");
        container.isDragging = false;
        container.cursor = "grab";

        const state = useBattlemapStore.getState();
        state.setIsDraggingToken(false);

        // Sync to Yjs
        const idx = tokensArray.toArray().findIndex((t) => t.id === token.id);
        if (idx !== -1) {
          doc.transact(() => {
            const tokenData = tokensArray.get(idx);
            const updated = {
              ...tokenData,
              x: container.x + size / 2,
              y: container.y + size / 2,
            };
            tokensArray.delete(idx, 1);
            tokensArray.insert(idx, [updated]);
          });
        }
      };

      container.on("pointerup", finalizeDrag);
      container.on("pointerupoutside", finalizeDrag);

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

      // 4. Update Visual State
      const isSelected = selectedTokenIds.includes(token.id);
      const selection = container.getChildByLabel("selection") as Graphics;
      if (selection) {
        selection.clear();
        if (isSelected) {
          selection.circle(size / 2, size / 2, size / 2 + 4);
          selection.stroke({ color: 0xf59e0b, width: 3, alpha: 0.8 });
          selection.fill({ color: 0xf59e0b, alpha: 0.1 });
        }
      }

      // Sync Layer
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
    doc,
    layerContainersRef,
    setContextMenu,
    tokensArray,
    viewport,
    getFileBlob,
    isSignedIn,
    selectedTokenIds,
  ]);

  // Global Cursor update
  useEffect(() => {
    const isSelect = activeTool === "select";
    tokenContainersRef.current.forEach((c) => {
      c.cursor = isSelect ? "grab" : "default";
    });
  }, [activeTool]);

  // Cleanup all on unmount
  useEffect(() => {
    const list = tokenContainersRef.current;
    return () => {
      list.forEach((c) => c.destroy({ children: true }));
    };
  }, []);
}
