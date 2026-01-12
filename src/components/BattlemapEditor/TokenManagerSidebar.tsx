import React, { useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useSync } from "@/contexts/SyncContext";

import { ContextMenu } from "./ContextMenu";
import { CropImageModal } from "./CropImageModal";
import { ContextMenuAction } from "./types";

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

interface TokenManagerSidebarProps {
  doc: Y.Doc;
  onClose: () => void;
  orientation?: "vertical" | "horizontal";
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
  onClose,
  orientation = "vertical",
}: TokenManagerSidebarProps) {
  const [tokens, setTokens] = useState<TokenLibraryItem[]>([]);
  const [folders, setFolders] = useState<TokenFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  // Creation States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Editing States
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

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
    const observer = () => setTokens(libraryArray.toArray());
    libraryArray.observe(observer);
    observer();
    return () => libraryArray.unobserve(observer);
  }, [libraryArray]);

  useEffect(() => {
    const observer = () => setFolders(foldersArray.toArray());
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
    if (searchQuery) return [];
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
    // reset
    e.target.value = "";
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

  const handleCreateFolder = (name: string) => {
    if (!name.trim()) {
      setIsCreatingFolder(false);
      setNewFolderName("");
      return;
    }
    doc.transact(() => {
      foldersArray.push([
        {
          id: uuidv7(),
          name: name.trim(),
          parentId: activeFolderId ?? undefined,
        },
      ]);
    });
    setIsCreatingFolder(false);
    setNewFolderName("");
  };

  const handleRenameFolder = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const index = folders.findIndex((f) => f.id === id);
    if (index === -1) return;
    doc.transact(() => {
      const folder = foldersArray.get(index);
      foldersArray.delete(index, 1);
      foldersArray.insert(index, [{ ...folder, name: newName.trim() }]);
    });
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (id: string) => {
    if (!confirm("Delete this folder and all its contents?")) return;
    doc.transact(() => {
      const folderIndex = folders.findIndex((f) => f.id === id);
      if (folderIndex !== -1) foldersArray.delete(folderIndex, 1);

      const tokensToDelete: number[] = [];
      tokens.forEach((t, i) => {
        if (t.folderId === id) tokensToDelete.push(i);
      });
      // Delete in reverse order to preserve indices
      tokensToDelete.reverse().forEach((i) => libraryArray.delete(i, 1));
    });
  };

  const handleFolderContextMenu = (
    e: React.MouseEvent,
    folder: TokenFolder
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      actions: [
        {
          id: "rename",
          label: "Rename",
          onClick: () => {
            setEditingFolderId(folder.id);
            setEditingFolderName(folder.name);
          },
        },
        {
          id: "delete",
          label: "Delete",
          danger: true,
          onClick: () => handleDeleteFolder(folder.id),
        },
      ],
    });
  };

  const handleFolderDoubleClick = (folder: TokenFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const tokenData = e.dataTransfer.getData("application/json");
      if (!tokenData) return;

      const token = JSON.parse(tokenData) as TokenLibraryItem;
      const index = tokens.findIndex((t) => t.id === token.id);

      if (index === -1) return;

      doc.transact(() => {
        const currentToken = libraryArray.get(index);
        libraryArray.delete(index, 1);
        libraryArray.insert(index, [
          { ...currentToken, folderId: targetFolderId },
        ]);
      });
    } catch (err) {
      console.error("Failed to drop token into folder:", err);
    }
  };

  const handleRenameToken = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return;
    doc.transact(() => {
      const token = libraryArray.get(index);
      libraryArray.delete(index, 1);
      libraryArray.insert(index, [{ ...token, label: newName.trim() }]);
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
    e.stopPropagation();
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

  const isHorizontal = orientation === "horizontal";

  return (
    <>
      <div
        className={`h-full flex ${
          isHorizontal ? "flex-row" : "flex-col"
        } bg-slate-800 text-slate-100`}
      >
        {/* Header / Sidebar Controls */}
        <div
          className={`
            border-slate-700 bg-slate-900/50
            ${
              isHorizontal
                ? "w-48 border-r flex flex-col p-3 gap-3 min-w-[12rem] shrink-0"
                : "border-b p-3 space-y-3"
            }
          `}
        >
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Library
            </h3>
            {!isHorizontal && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
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
            )}
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-200"
          />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">
              Zoom
            </span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-md hover:shadow-lg"
            >
              <svg
                className="w-3.5 h-3.5"
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
              <span>New</span>
              <svg
                className={`w-3 h-3 ml-auto transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
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

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-20 flex flex-col py-1 overflow-hidden">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors text-left"
                  >
                    <svg
                      className="w-4 h-4 text-sky-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-medium">Upload Token</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingFolder(true);
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors text-left"
                  >
                    <svg
                      className="w-4 h-4 text-amber-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="font-medium">New Folder</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col bg-slate-800">
          {/* Breadcrumb if inside folder */}
          {activeFolderId && (
            <div
              className={`px-3 py-2 bg-slate-900/30 border-b border-slate-700 flex items-center gap-2 text-xs text-slate-400 sticky top-0 z-10 backdrop-blur-sm`}
            >
              <button
                onClick={() => setActiveFolderId(null)}
                className="hover:text-sky-400 transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Library
              </button>
              <svg
                className="w-3 h-3 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {folders.find((f) => f.id === activeFolderId)?.name}
              </span>
            </div>
          )}

          <div className="p-3">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: isHorizontal
                  ? `repeat(auto-fill, minmax(${60 * zoomLevel}px, 1fr))`
                  : `repeat(auto-fill, minmax(${80 * zoomLevel}px, 1fr))`,
              }}
            >
              {/* Folder Creation Input */}
              {isCreatingFolder && (
                <div className="aspect-square flex flex-col items-center justify-center bg-slate-700/50 border border-sky-500 rounded-lg p-1 animate-pulse-light">
                  <svg
                    className="w-8 h-8 text-amber-400 mb-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <input
                    type="text"
                    autoFocus
                    className="w-full bg-slate-900/90 text-[10px] text-center rounded px-1 text-white border border-sky-500 focus:outline-none"
                    placeholder="Name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={() => handleCreateFolder(newFolderName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder(newFolderName);
                      if (e.key === "Escape") setIsCreatingFolder(false);
                    }}
                  />
                </div>
              )}

              {/* Folders */}
              {filteredFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="relative group"
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                  onDragOver={(e) => handleFolderDragOver(e)}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                >
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    onDoubleClick={() => handleFolderDoubleClick(folder)}
                    className="w-full aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-xl hover:border-amber-400/60 hover:from-slate-700 hover:to-slate-800 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-amber-500/10 relative overflow-hidden"
                  >
                    {/* Folder Icon with Enhanced Styling */}
                    <div className="relative">
                      <svg
                        className="w-12 h-12 text-amber-500/90 group-hover:text-amber-400 group-hover:scale-110 transition-all duration-200 drop-shadow-lg"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                      </svg>
                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />
                    </div>

                    {editingFolderId === folder.id ? (
                      <input
                        type="text"
                        className="w-[90%] bg-slate-900 border border-sky-500 text-[10px] text-center rounded px-0.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-400 z-10 mt-1"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={() =>
                          handleRenameFolder(folder.id, editingFolderName)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleRenameFolder(folder.id, editingFolderName);
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold truncate w-full px-2 text-center group-hover:text-slate-100 transition-colors mt-1">
                        {folder.name}
                      </span>
                    )}

                    {/* Drop indicator */}
                    <div className="absolute inset-0 border-2 border-sky-400 rounded-xl opacity-0 group-hover:opacity-0 pointer-events-none" />
                  </button>
                </div>
              ))}

              {/* Tokens */}
              {filteredTokens.map((token) => (
                <div
                  key={token.id}
                  className="relative group aspect-square"
                  draggable
                  onDragStart={(e) => handleDragStart(e, token)}
                  onContextMenu={(e) => handleContextMenu(e, token)}
                >
                  <div className="w-full h-full p-1 rounded-lg border border-transparent hover:border-sky-500 hover:bg-slate-700/30 cursor-grab active:cursor-grabbing transition-all flex flex-col items-center">
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
                        className="w-full bg-slate-800 text-[10px] text-center border border-sky-500 rounded px-0.5 mt-1 text-white focus:outline-none"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRenameToken(token.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleRenameToken(token.id, editingName);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 truncate w-full text-center mt-1 px-1 group-hover:text-slate-200">
                        {token.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredFolders.length === 0 &&
              filteredTokens.length === 0 &&
              !isCreatingFolder && (
                <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2 opacity-50">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <div className="text-xs italic">Folder is empty</div>
                </div>
              )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <CropImageModal
          imageSrc={selectedFile || ""}
          isOpen={isCropOpen}
          onClose={() => setIsCropOpen(false)}
          onSave={handleCropSave}
        />
      </div>

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
