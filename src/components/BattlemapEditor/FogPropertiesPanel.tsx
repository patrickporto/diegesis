import { useState } from "react";
import { uuidv7 } from "uuidv7"; // Imported
import * as Y from "yjs";

import { useBattlemapStore } from "../../stores/useBattlemapStore";
import { FogRoom } from "./types";

interface FogPropertiesPanelProps {
  activeTool: string;
  doc: Y.Doc;
}

export function FogPropertiesPanel({
  activeTool,
  doc,
}: FogPropertiesPanelProps) {
  const {
    fogMode,
    setFogMode,
    fogTool,
    brushSize,
    setBrushSize,
    rooms,
    toggleRoom,
    renameRoom,
    deleteRoom,
    activeRoomId,
    setActiveRoomId,
    settings,
    syncSettings,
  } = useBattlemapStore();

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (activeTool !== "fog") return null;

  const roomsArray = doc.getArray("rooms") as Y.Array<FogRoom>;

  const handleStartEdit = (roomId: string, currentName: string) => {
    setEditingRoomId(roomId);
    setEditName(currentName);
  };

  const handleSaveEdit = (roomId: string) => {
    if (editName.trim()) {
      renameRoom(roomId, editName.trim(), roomsArray, doc);
    }
    setEditingRoomId(null);
  };

  const handleCancelEdit = () => {
    setEditingRoomId(null);
    setEditName("");
  };

  const handleCreateRoom = () => {
    const id = uuidv7();
    const newRoom: FogRoom = {
      id,
      name: `Room ${rooms.length + 1}`,
      color: "#3b82f6",
      shapeIds: [],
      bounds: [],
      visible: true,
      isRevealed: false, // Created manually, hidden by default? Or revealed?
    };
    roomsArray.push([newRoom]);
    setActiveRoomId(id);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-200">Fog of War</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Fog Tools */}
        {/* Fog Tools removed - moved to toolbar */}

        {/* Mode Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setFogMode("hide")}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors border ${
                fogMode === "hide"
                  ? "bg-slate-700 text-white border-slate-600 ring-1 ring-slate-500"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Hide
            </button>
            <button
              onClick={() => setFogMode("reveal")}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors border ${
                fogMode === "reveal"
                  ? "bg-sky-600 text-white border-sky-500 ring-1 ring-sky-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Reveal
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {fogMode === "hide"
              ? "Add fog to obscure areas"
              : "Remove fog to reveal areas"}
          </p>
        </div>

        {/* Global Fog Opacity */}
        <div className="space-y-2 pb-4 border-b border-slate-700">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Global Fog Opacity (
            {Math.round((settings.fogOpacity ?? 0.85) * 100)}%)
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={settings.fogOpacity ?? 0.85}
            onChange={(e) =>
              syncSettings({ ...settings, fogOpacity: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <p className="text-[10px] text-slate-500 italic">
            Note: This affects the visual opacity of the entire Fog of War layer
            for all players.
          </p>
        </div>

        {/* Brush Size (for brush tool only) */}
        {fogTool === "brush" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Brush Size ({brushSize}px)
            </label>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>10px</span>
              <span>200px</span>
            </div>
          </div>
        )}

        {/* Fill Tool Info (for fill tool only) */}
        {fogTool === "fill" && (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Fill Behavior
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <p>
                  <span className="text-slate-300 font-medium">Default:</span>{" "}
                  Fill is bounded by walls
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <p>
                  <span className="text-slate-300 font-medium">
                    Alt + Click:
                  </span>{" "}
                  Unbounded fill
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Polygon Tool Info */}
        {fogTool === "polygon" && (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Polygon Tool
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <p>Click to add points</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <p>Double-click to finish</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <p>Esc to cancel</p>
              </div>
            </div>
          </div>
        )}

        {/* Rooms Section */}
        <div className="pt-4 border-t border-slate-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Rooms ({rooms.length})
              </label>
              <button
                onClick={handleCreateRoom}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded"
              >
                + New
              </button>
            </div>
            {rooms.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-xs bg-slate-900/30 rounded">
                No rooms detected yet.
                <br />
                Use fog fill tool to create rooms.
              </div>
            ) : (
              <div className="space-y-1.5">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() =>
                      setActiveRoomId(room.id === activeRoomId ? null : room.id)
                    }
                    className={`p-2 rounded transition-all cursor-pointer ${
                      room.id === activeRoomId
                        ? "ring-2 ring-sky-500 bg-slate-700"
                        : ""
                    } ${
                      room.isRevealed
                        ? "bg-sky-900/30 border border-sky-700/50"
                        : "bg-slate-900/50 border border-slate-700"
                    }`}
                  >
                    {editingRoomId === room.id ? (
                      /* Edit Mode */
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(room.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-sky-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(room.id)}
                          className="px-2 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      /* Display Mode */
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-slate-200 font-medium truncate">
                            {room.name}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleStartEdit(room.id, room.name)
                              }
                              className="p-0.5 text-slate-400 hover:text-white transition-colors"
                              title="Rename"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                deleteRoom(room.id, roomsArray, doc)
                              }
                              className="p-0.5 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRoom(room.id, roomsArray, doc)}
                          className={`w-full px-2 py-1 text-xs rounded transition-colors ${
                            room.isRevealed
                              ? "bg-sky-600 hover:bg-sky-700 text-white"
                              : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                          }`}
                        >
                          {room.isRevealed ? "Hide Room" : "Reveal Room"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
