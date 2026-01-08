import React, { useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useSync } from "@/contexts/SyncContext";

import { ContextMenu } from "./ContextMenu";
import { CropImageModal } from "./CropImageModal";
import { ContextMenuAction, Layer } from "./types";

export interface TokenLibraryItem {
  id: string;
  imageUrl: string;
  label: string;
  folderId?: string;
  width?: number; // In grid cells, default 1
  height?: number; // In grid cells, default 1
}

interface TokenFolder {
  id: string;
  name: string;
  parentId?: string; // For nesting, if needed later
}

type SidebarTab = "tokens" | "layers";

interface TokenManagerSidebarProps {
  doc: Y.Doc;
  isOpen: boolean;
  onClose: () => void;
  // Layer management props
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayers: (layers: Layer[]) => void;
  onSetActiveLayer: (id: string) => void;
}

const TokenImage = ({
  src,
  alt,
  isSignedIn,
  getFileBlob,
}: {
  src: string;
  alt: string;
  isSignedIn: boolean;
  getFileBlob: (id: string) => Promise<Blob>;
}) => {
  const [imgSrc, setImgSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      if (src.startsWith("drive://")) {
        if (!isSignedIn) return;
        try {
          const id = src.replace("drive://", "");
          const blob = await getFileBlob(id);
          objectUrl = URL.createObjectURL(blob);
          if (active) setImgSrc(objectUrl);
        } catch (e) {
          console.error("Failed to load token image", e);
        }
      } else {
        setImgSrc(src);
      }
    };
    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, isSignedIn, getFileBlob]);

  if (!imgSrc)
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse rounded-lg" />
    );

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="w-full h-full object-cover rounded-lg pointer-events-none border-2 border-slate-200 shadow-sm"
    />
  );
};

export function TokenManagerSidebar({
  doc,
  isOpen,
  onClose,
  layers,
  activeLayerId,
  onUpdateLayers,
  onSetActiveLayer,
}: TokenManagerSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("tokens");
  const [tokens, setTokens] = useState<TokenLibraryItem[]>([]);
  const [folders, setFolders] = useState<TokenFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = root
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

  // Layer editing state
  const [layerEditingId, setLayerEditingId] = useState<string | null>(null);
  const [layerEditName, setLayerEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, getFileBlob, isSignedIn } = useSync();

  // Yjs Arrays
  const libraryArray = useMemo(
    () => doc.getArray<TokenLibraryItem>("realm-token-library"),
    [doc]
  );
  const foldersArray = useMemo(
    () => doc.getArray<TokenFolder>("realm-token-folders"),
    [doc]
  );

  useEffect(() => {
    const observer = () => {
      setTokens(libraryArray.toArray());
    };
    libraryArray.observe(observer);
    observer();
    return () => libraryArray.unobserve(observer);
  }, [libraryArray]);

  useEffect(() => {
    const observer = () => {
      setFolders(foldersArray.toArray());
    };
    foldersArray.observe(observer);
    observer();
    return () => foldersArray.unobserve(observer);
  }, [foldersArray]);

  // Filtering
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const matchesSearch = t.label
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFolder = t.folderId === (activeFolderId ?? undefined);
      return matchesSearch && matchesFolder;
    });
  }, [tokens, searchQuery, activeFolderId]);

  const filteredFolders = useMemo(() => {
    if (searchQuery) return []; // Hide folders when searching (flat view)? Or show matches? Let's hide for now.
    return folders.filter((f) => f.parentId === (activeFolderId ?? undefined));
  }, [folders, searchQuery, activeFolderId]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedFile(result);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropSave = async (blob: Blob) => {
    let imageUrl = "";
    if (!isSignedIn) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          imageUrl = e.target?.result as string;
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } else {
      try {
        const file = new File([blob], `token-${uuidv7()}.webp`, {
          type: "image/webp",
        });
        const { id } = await uploadFile(file);
        imageUrl = `drive://${id}`;
      } catch (error) {
        console.error("Failed to upload token:", error);
        return;
      }
    }

    if (imageUrl) {
      doc.transact(() => {
        libraryArray.push([
          {
            id: uuidv7(),
            imageUrl,
            label: "New Token",
            folderId: activeFolderId ?? undefined,
          },
        ]);
      });
    }
  };

  const handleCreateFolder = () => {
    const name = prompt("Folder Name:");
    if (!name) return;
    doc.transact(() => {
      foldersArray.push([
        {
          id: uuidv7(),
          name,
          parentId: activeFolderId ?? undefined,
        },
      ]);
    });
  };

  const handleRenameToken = (id: string, newName: string) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    doc.transact(() => {
      const token = libraryArray.get(index);
      libraryArray.delete(index, 1);
      libraryArray.insert(index, [{ ...token, label: newName }]);
    });
    setEditingTokenId(null);
  };

  const handleDeleteToken = (id: string) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    if (confirm("Are you sure you want to delete this token?")) {
      doc.transact(() => {
        libraryArray.delete(index, 1);
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, token: TokenLibraryItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      actions: [
        {
          id: "edit",
          label: "Rename",
          onClick: () => {
            setEditingTokenId(token.id);
            setEditingName(token.label);
          },
        },
        // TODO: Move to folder action
        {
          id: "delete",
          label: "Delete",
          danger: true,
          onClick: () => handleDeleteToken(token.id),
        },
      ],
    });
  };

  const handleDragStart = (e: React.DragEvent, token: TokenLibraryItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(token));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Layer handlers
  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: uuidv7(),
      name: "New Layer",
      type: "tokens",
      visible: true,
      locked: false,
      opacity: 1,
      sortOrder: layers.length,
    };
    onUpdateLayers([...layers, newLayer]);
    onSetActiveLayer(newLayer.id);
  };

  const handleDeleteLayer = (id: string) => {
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
    const sortedLayers = [...layers].sort((a, b) => a.sortOrder - b.sortOrder);
    if (direction === "up" && index > 0) {
      [sortedLayers[index], sortedLayers[index - 1]] = [
        sortedLayers[index - 1],
        sortedLayers[index],
      ];
      sortedLayers.forEach((l, i) => (l.sortOrder = i));
      onUpdateLayers(sortedLayers);
    } else if (direction === "down" && index < layers.length - 1) {
      [sortedLayers[index], sortedLayers[index + 1]] = [
        sortedLayers[index + 1],
        sortedLayers[index],
      ];
      sortedLayers.forEach((l, i) => (l.sortOrder = i));
      onUpdateLayers(sortedLayers);
    }
  };

  const startLayerEditing = (layer: Layer) => {
    setLayerEditingId(layer.id);
    setLayerEditName(layer.name);
  };

  const saveLayerEditing = () => {
    if (layerEditingId) {
      const newLayers = layers.map((l) =>
        l.id === layerEditingId ? { ...l, name: layerEditName } : l
      );
      onUpdateLayers(newLayers);
      setLayerEditingId(null);
    }
  };

  const sortedLayers = [...layers]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .reverse();

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-40 w-80 bg-slate-50 border-l border-slate-200 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with Tabs */}
        <div className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between p-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("tokens")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "tokens"
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                Tokens
              </button>
              <button
                onClick={() => setActiveTab("layers")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "layers"
                    ? "bg-sky-100 text-sky-700"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                Layers
              </button>
            </div>
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

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Zoom</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 text-xs font-medium bg-sky-500 hover:bg-sky-600 text-white rounded flex items-center justify-center gap-1"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Token
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 py-1.5 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center justify-center gap-1"
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
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                Folder
              </button>
            </div>
          </div>
        </div>

        {/* Tokens Tab Content */}
        {activeTab === "tokens" && (
          <>
            {/* Breadcrumb if inside folder */}
            {activeFolderId && (
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-sm text-slate-600">
                <button
                  onClick={() => setActiveFolderId(null)}
                  className="hover:text-sky-500"
                >
                  Root
                </button>
                <span>/</span>
                <span className="font-medium text-slate-800">
                  {folders.find((f) => f.id === activeFolderId)?.name}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 content-start">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${
                    60 * zoomLevel
                  }px, 1fr))`,
                }}
              >
                {filteredFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="aspect-square flex flex-col items-center justify-center bg-slate-100 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-white transition-all group"
                  >
                    <svg
                      className="w-1/2 h-1/2 text-slate-400 group-hover:text-sky-500 mb-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="text-[10px] text-slate-600 font-medium truncate w-full px-2 text-center">
                      {folder.name}
                    </span>
                  </button>
                ))}

                {filteredTokens.map((token) => (
                  <div
                    key={token.id}
                    className="relative group aspect-square"
                    draggable
                    onDragStart={(e) => handleDragStart(e, token)}
                    onContextMenu={(e) => handleContextMenu(e, token)}
                  >
                    <div className="w-full h-full p-1 rounded-lg border border-transparent hover:border-sky-500 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-all flex flex-col items-center">
                      <div className="flex-1 w-full relative min-h-0">
                        <TokenImage
                          src={token.imageUrl}
                          alt={token.label}
                          isSignedIn={isSignedIn}
                          getFileBlob={getFileBlob}
                        />
                      </div>
                      {editingTokenId === token.id ? (
                        <input
                          type="text"
                          className="w-full text-xs text-center border rounded px-0.5 mt-1"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() =>
                            handleRenameToken(token.id, editingName)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleRenameToken(token.id, editingName);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-[10px] text-slate-600 truncate w-full text-center mt-1 px-1">
                          {token.label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {filteredFolders.length === 0 && filteredTokens.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-8">
                  No items found
                </div>
              )}
            </div>
          </>
        )}

        {/* Layers Tab Content */}
        {activeTab === "layers" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleAddLayer}
                className="text-sky-600 hover:text-sky-700 p-1.5 hover:bg-slate-100 rounded text-sm flex items-center gap-1"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Layer
              </button>
            </div>
            {sortedLayers.map((layer) => {
              const originalIndex = layers
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .findIndex((l) => l.id === layer.id);
              const isRestricted =
                layer.id === "background" ||
                layer.id === "grid" ||
                layer.id === "fog";

              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    activeLayerId === layer.id
                      ? "bg-sky-50 border-sky-200 shadow-sm"
                      : isRestricted
                      ? "bg-slate-50 border-transparent opacity-80"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  } ${
                    !isRestricted ? "cursor-pointer group" : "cursor-default"
                  }`}
                  onClick={() => !isRestricted && onSetActiveLayer(layer.id)}
                >
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
                        <>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </>
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l18 18"
                        />
                      )}
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      if (!isRestricted) {
                        e.stopPropagation();
                        handleToggleLock(layer.id);
                      }
                    }}
                    disabled={isRestricted}
                    className={`p-1 rounded ${
                      layer.locked
                        ? "text-amber-500"
                        : "text-slate-300 hover:text-slate-400 opacity-0 group-hover:opacity-100"
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

                  <div
                    className="flex-1 text-sm truncate"
                    onDoubleClick={() =>
                      !isRestricted && startLayerEditing(layer)
                    }
                  >
                    {layerEditingId === layer.id ? (
                      <input
                        type="text"
                        value={layerEditName}
                        onChange={(e) => setLayerEditName(e.target.value)}
                        onBlur={saveLayerEditing}
                        onKeyDown={(e) =>
                          e.key === "Enter" && saveLayerEditing()
                        }
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

                  {!isRestricted && (
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
        )}

        {/* Hidden Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <CropImageModal
        imageSrc={selectedFile || ""}
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        onSave={handleCropSave}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenu.actions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
