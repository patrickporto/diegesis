import { useState } from "react";

import { FogRoom } from "./types";

interface RoomListPanelProps {
  rooms: FogRoom[];
  onRoomToggle: (roomId: string) => void;
  onRoomRename: (roomId: string, newName: string) => void;
  onRoomDelete: (roomId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function RoomListPanel({
  rooms,
  onRoomToggle,
  onRoomRename,
  onRoomDelete,
  isOpen = true,
  onClose,
}: RoomListPanelProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!isOpen) return null;

  const handleStartEdit = (room: FogRoom) => {
    setEditingRoomId(room.id);
    setEditName(room.name);
  };

  const handleSaveEdit = (roomId: string) => {
    if (editName.trim()) {
      onRoomRename(roomId, editName.trim());
    }
    setEditingRoomId(null);
  };

  const handleCancelEdit = () => {
    setEditingRoomId(null);
    setEditName("");
  };

  return (
    <div className="absolute top-20 left-4 z-[100] bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl w-64 max-h-[60vh] overflow-hidden animate-fade-in flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Rooms</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-2">
        {rooms.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">
            No rooms detected yet.
            <br />
            Use fog fill tool to create rooms.
          </div>
        ) : (
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`p-2 rounded transition-colors ${
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
                      className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  /* Display Mode */
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-200 font-medium truncate">
                        {room.name}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(room)}
                          className="p-1 text-slate-400 hover:text-white transition-colors"
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
                          onClick={() => onRoomDelete(room.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
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
                      onClick={() => onRoomToggle(room.id)}
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
  );
}
