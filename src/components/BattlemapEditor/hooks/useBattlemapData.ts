import { useEffect, useMemo } from "react";
import * as Y from "yjs";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";
import {
  BattlemapSettings,
  DEFAULT_SETTINGS,
  DrawingPath,
  FogRoom,
  FogShape,
  TextAnnotation,
  Token,
  Wall,
} from "../types";

interface UseBattlemapDataProps {
  doc: Y.Doc;
  fileId: string;
}

/**
 * Hook that manages Yjs data structures and syncs them to Zustand store.
 * This is the single source of truth for Yjs integration.
 * All state is managed in Zustand via sync actions.
 */
export function useBattlemapData({ doc, fileId }: UseBattlemapDataProps) {
  // Yjs Structures - these are stable references that persist for component lifetime
  const settingsMap = useMemo(
    () =>
      doc.getMap<BattlemapSettings[keyof BattlemapSettings]>(
        `battlemap-settings-${fileId}`
      ),
    [doc, fileId]
  );

  const tokensArray = useMemo(
    () => doc.getArray<Token>(`battlemap-tokens-${fileId}`),
    [doc, fileId]
  );

  const drawingsArray = useMemo(
    () => doc.getArray<DrawingPath>(`battlemap-drawings-${fileId}`),
    [doc, fileId]
  );

  const textsArray = useMemo(
    () => doc.getArray<TextAnnotation>(`battlemap-texts-${fileId}`),
    [doc, fileId]
  );

  const fogArray = useMemo(
    () => doc.getArray<FogShape>(`battlemap-fog-${fileId}`),
    [doc, fileId]
  );

  const wallsArray = useMemo(
    () => doc.getArray<Wall>(`battlemap-walls-${fileId}`),
    [doc, fileId]
  );

  const roomsArray = useMemo(
    () => doc.getArray<FogRoom>(`battlemap-rooms-${fileId}`),
    [doc, fileId]
  );

  // Sync Settings
  useEffect(() => {
    const { syncSettings } = useBattlemapStore.getState();
    const loadSettings = () => {
      const loaded: Partial<BattlemapSettings> = {};
      settingsMap.forEach((value, key) => {
        (loaded as Record<string, unknown>)[key] = value;
      });
      // Merge loaded settings with defaults to ensure all required fields are present
      syncSettings({ ...DEFAULT_SETTINGS, ...loaded } as BattlemapSettings);
    };

    settingsMap.observe(loadSettings);
    loadSettings();
    return () => settingsMap.unobserve(loadSettings);
  }, [settingsMap]);

  // Sync Tokens
  useEffect(() => {
    const { syncTokens } = useBattlemapStore.getState();
    const observer = () => syncTokens(tokensArray.toArray());
    tokensArray.observe(observer);
    observer();
    return () => tokensArray.unobserve(observer);
  }, [tokensArray]);

  // Sync Drawings
  useEffect(() => {
    const { syncDrawings } = useBattlemapStore.getState();
    const observer = () => syncDrawings(drawingsArray.toArray());
    drawingsArray.observe(observer);
    observer();
    return () => drawingsArray.unobserve(observer);
  }, [drawingsArray]);

  // Sync Texts
  useEffect(() => {
    const { syncTexts } = useBattlemapStore.getState();
    const observer = () => syncTexts(textsArray.toArray());
    textsArray.observe(observer);
    observer();
    return () => textsArray.unobserve(observer);
  }, [textsArray]);

  // Sync Fog Shapes
  useEffect(() => {
    const { syncFogShapes } = useBattlemapStore.getState();
    const observer = () => syncFogShapes(fogArray.toArray());
    fogArray.observe(observer);
    observer();
    return () => fogArray.unobserve(observer);
  }, [fogArray]);

  // Sync Walls
  useEffect(() => {
    const { syncWalls } = useBattlemapStore.getState();
    const observer = () => syncWalls(wallsArray.toArray());
    wallsArray.observe(observer);
    observer();
    return () => wallsArray.unobserve(observer);
  }, [wallsArray]);

  // Sync Rooms
  useEffect(() => {
    const { syncRooms } = useBattlemapStore.getState();
    const observer = () => syncRooms(roomsArray.toArray());
    roomsArray.observe(observer);
    observer();
    return () => roomsArray.unobserve(observer);
  }, [roomsArray]);

  // Update Settings Action
  const updateSettings = (updates: Partial<BattlemapSettings>) => {
    doc.transact(() => {
      Object.entries(updates).forEach(([key, value]) => {
        settingsMap.set(key, value);
      });
    });
  };

  return {
    // Raw Y.Arrays for direct access when needed (e.g., transactions)
    fogArray,
    tokensArray,
    drawingsArray,
    textsArray,
    wallsArray,
    roomsArray,
    settingsMap,
    // Settings action
    updateSettings,
  };
}
