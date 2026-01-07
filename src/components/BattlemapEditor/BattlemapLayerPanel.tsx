import { useState } from "react";
import { uuidv7 } from "uuidv7";

import { Layer } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayers: (layers: Layer[]) => void;
  onSetActiveLayer: (id: string) => void;
}

export function BattlemapLayerPanel({
  isOpen,
  onClose,
  layers,
  activeLayerId,
  onUpdateLayers,
  onSetActiveLayer,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!isOpen) return null;

  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: uuidv7(),
      name: "New Layer",
      type: "tokens", // Default type
      visible: true,
      locked: false,
      opacity: 1,
      sortOrder: layers.length,
    };
    onUpdateLayers([...layers, newLayer]);
    onSetActiveLayer(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
    // Prevent deleting the last layer?
    if (layers.length <= 1) return;
    const newLayers = layers.filter((l) => l.id !== id);
    onUpdateLayers(newLayers);
    if (activeLayerId === id) {
      onSetActiveLayer(newLayers[0].id);
    }
  };

  const handleToggleVisible = (id: string) => {
    const newLayers = layers.map((l) =>
      l.id === id ? { ...l, visible: !l.visible } : l
    );
    onUpdateLayers(newLayers);
  };

  const handleToggleLock = (id: string) => {
    const newLayers = layers.map((l) =>
      l.id === id ? { ...l, locked: !l.locked } : l
    );
    onUpdateLayers(newLayers);
  };

  const handleMoveLayer = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newLayers = [...layers];
      // Swap
      [newLayers[index], newLayers[index - 1]] = [
        newLayers[index - 1],
        newLayers[index],
      ];
      // Update sortOrder
      newLayers.forEach((l, i) => (l.sortOrder = i));
      onUpdateLayers(newLayers);
    } else if (direction === "down" && index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index + 1]] = [
        newLayers[index + 1],
        newLayers[index],
      ];
      newLayers.forEach((l, i) => (l.sortOrder = i));
      onUpdateLayers(newLayers);
    }
  };

  const startEditing = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const saveEditing = () => {
    if (editingId) {
      const newLayers = layers.map((l) =>
        l.id === editingId ? { ...l, name: editName } : l
      );
      onUpdateLayers(newLayers);
      setEditingId(null);
    }
  };

  // Sort layers by sortOrder (although usually they are stored sorted)
  const sortedLayers = [...layers]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .reverse(); // Render top-first

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-50 border-r border-slate-200 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Layers</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddLayer}
                className="text-sky-600 hover:text-sky-700 p-1 hover:bg-slate-100 rounded"
                title="Add Layer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {sortedLayers.map((layer) => {
            // Find original index for move handler
            const originalIndex = layers.findIndex((l) => l.id === layer.id);

            const isRestricted =
              layer.id === "background" || layer.id === "grid";

            return (
              <div
                key={layer.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                  activeLayerId === layer.id
                    ? "bg-sky-50 border-sky-200 shadow-sm"
                    : isRestricted
                    ? "bg-slate-50 border-transparent opacity-80"
                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                } ${!isRestricted ? "cursor-pointer group" : "cursor-default"}`}
                onClick={() => !isRestricted && onSetActiveLayer(layer.id)}
              >
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleVisible(layer.id);
                  }}
                  className={`p-1 rounded ${
                    layer.visible ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {layer.visible ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243"
                      />
                    )}
                    {layer.visible && (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    )}
                  </svg>
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    if (layer.id === "background" || layer.id === "grid")
                      return;
                    e.stopPropagation();
                    handleToggleLock(layer.id);
                  }}
                  disabled={layer.id === "background" || layer.id === "grid"}
                  className={`p-1 rounded ${
                    layer.locked
                      ? "text-amber-500"
                      : "text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100"
                  } ${
                    layer.id === "background" || layer.id === "grid"
                      ? "cursor-default"
                      : ""
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {layer.locked ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      />
                    )}
                  </svg>
                </button>

                {/* Name */}
                <div
                  className="flex-1 text-sm truncate cursor-pointer"
                  onDoubleClick={() => startEditing(layer)}
                >
                  {editingId === layer.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={saveEditing}
                      onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                      autoFocus
                      className="w-full px-1 py-0.5 border rounded text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={
                        layer.visible
                          ? "text-slate-700"
                          : "text-slate-400 italic"
                      }
                    >
                      {layer.name}
                    </span>
                  )}
                </div>

                {/* Reorder / Delete Actions */}
                {!isRestricted && (
                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(originalIndex, "down");
                      }}
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <button
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveLayer(originalIndex, "up");
                      }}
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
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {!(layer.id === "background" || layer.id === "grid") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                  >
                    <svg
                      className="w-4 h-4"
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
