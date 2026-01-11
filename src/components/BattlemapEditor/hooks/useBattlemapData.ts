import { useEffect, useMemo, useRef, useState } from "react";
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

export function useBattlemapData({ doc, fileId }: UseBattlemapDataProps) {
  // Yjs Structures
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

  // Local React State
  const [settings, setSettings] = useState<BattlemapSettings>(DEFAULT_SETTINGS);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [texts, setTexts] = useState<TextAnnotation[]>([]);
  const [fogShapes, setFogShapes] = useState<FogShape[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [rooms, setRooms] = useState<FogRoom[]>([]);

  // Refs for current values (to avoid stale closures in effects if needed)
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Sync Logics
  useEffect(() => {
    const loadSettings = () => {
      const loaded: Partial<BattlemapSettings> = {};
      settingsMap.forEach((value, key) => {
        (loaded as Record<string, unknown>)[key] = value;
      });
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
    };

    settingsMap.observe(loadSettings);
    loadSettings();
    return () => settingsMap.unobserve(loadSettings);
  }, [settingsMap]);

  useEffect(() => {
    const observer = () => setTokens(tokensArray.toArray());
    tokensArray.observe(observer);
    observer();
    return () => tokensArray.unobserve(observer);
  }, [tokensArray]);

  useEffect(() => {
    const observer = () => setDrawings(drawingsArray.toArray());
    drawingsArray.observe(observer);
    observer();
    return () => drawingsArray.unobserve(observer);
  }, [drawingsArray]);

  useEffect(() => {
    const observer = () => setTexts(textsArray.toArray());
    textsArray.observe(observer);
    observer();
    return () => textsArray.unobserve(observer);
  }, [textsArray]);

  useEffect(() => {
    const observer = () => setFogShapes(fogArray.toArray());
    fogArray.observe(observer);
    observer();
    return () => fogArray.unobserve(observer);
  }, [fogArray]);

  useEffect(() => {
    const { syncWalls } = useBattlemapStore.getState();
    const observer = () => {
      const currentWalls = wallsArray.toArray();
      setWalls(currentWalls);
      syncWalls(currentWalls); // Sync to Zustand store for global access
    };
    wallsArray.observe(observer);
    observer();
    return () => wallsArray.unobserve(observer);
  }, [wallsArray]);

  useEffect(() => {
    const { syncRooms } = useBattlemapStore.getState();
    const observer = () => {
      const currentRooms = roomsArray.toArray();
      setRooms(currentRooms);
      syncRooms(currentRooms); // Sync to Zustand store for global access
    };
    roomsArray.observe(observer);
    observer();
    return () => roomsArray.unobserve(observer);
  }, [roomsArray]);

  // Actions
  const updateSettings = (updates: Partial<BattlemapSettings>) => {
    doc.transact(() => {
      Object.entries(updates).forEach(([key, value]) => {
        settingsMap.set(key, value);
      });
    });
  };

  return {
    settings,
    tokens,
    drawings,
    texts,
    fogShapes,
    walls,
    rooms,
    fogArray, // Return raw Y.Array for fog since it needs transactional updates often handled by tools
    tokensArray,
    drawingsArray,
    textsArray,
    wallsArray,
    roomsArray,
    updateSettings,
    settingsRef,
  };
}
