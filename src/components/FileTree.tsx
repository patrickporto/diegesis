import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmModal } from "@/components/ConfirmModal";
import { ContextMenu } from "@/components/ContextMenu";
import { CreateItemModal } from "@/components/CreateItemModal";
import { TagSelector } from "@/components/TagSelector";
import { FileNode, useFileSystem } from "@/contexts/FileSystemContext";
import { useRealm } from "@/contexts/RealmContext";

type ItemType = "text" | "table" | "folder" | "battlemap";

interface FileTreeProps {
  className?: string;
}

export function FileTree({ className }: FileTreeProps) {
  const {
    fileTree,
    createFolder,
    createFile,
    createTable,
    createBattlemap,
    moveItem,
  } = useFileSystem();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ItemType>("text");

  const openCreateModal = (
    parentId: string | null,
    type: ItemType = "text"
  ) => {
    setModalParentId(parentId);
    setModalType(type);
    setModalOpen(true);
  };

  const handleCreateItem = (name: string, type: ItemType) => {
    if (type === "folder") {
      createFolder(name, modalParentId);
    } else if (type === "table") {
      createTable(name, modalParentId);
    } else if (type === "battlemap") {
      createBattlemap(name, modalParentId);
    } else {
      createFile(name, modalParentId);
    }
  };

  const rootItems = fileTree.filter((node) => node.parentId === null);

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.id) {
        moveItem(data.id, targetId);
      }
    } catch (err) {
      console.error("Failed to parse drag data", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  return (
    <div className={`p-2 ${className}`}>
      <CreateItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreateItem}
        initialType={modalType}
      />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Explorer
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => openCreateModal(null, "text")}
            title="New Item"
            className="p-1 hover:bg-slate-200 rounded flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 text-slate-600"
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
        </div>
      </div>
      <div
        className="space-y-0.5 min-h-[100px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
      >
        {rootItems.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            onCreateItem={openCreateModal}
          />
        ))}
        {rootItems.length === 0 && (
          <div className="text-xs text-slate-400 italic px-2">
            No files (Drop here to move to root)
          </div>
        )}
      </div>
    </div>
  );
}

function FileTreeNode({
  node,
  onCreateItem,
}: {
  node: FileNode;
  onCreateItem: (
    parentId: string | null,
    type: "text" | "table" | "folder"
  ) => void;
}) {
  const {
    fileTree,
    activeFileId,
    deleteItem,
    renameItem,
    moveItem,
    reorderItem,
  } = useFileSystem();
  const { activeRealm } = useRealm();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<
    "top" | "bottom" | "inside" | null
  >(null);

  const children = fileTree.filter((n) => n.parentId === node.id);

  const handleClick = () => {
    if (node.type === "folder") {
      setIsOpen(!isOpen);
    } else if (activeRealm) {
      navigate(`/${activeRealm.slug}/${node.slug}`);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== node.name) {
      renameItem(node.id, editName);
    } else {
      setEditName(node.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
    setContextMenu(null);
  };

  const handleConfirmDelete = () => {
    deleteItem(node.id);
    setShowDeleteConfirm(false);
  };

  const getContextMenuOptions = () => {
    const options = [
      { label: "Rename", action: () => setIsEditing(true) },
      {
        label: "Delete",
        action: handleDeleteRequest,
        className: "text-rose-500 font-medium",
      },
    ];
    if (node.type === "folder") {
      options.unshift({
        label: "New Item",
        action: () => {
          setIsOpen(true);
          onCreateItem(node.id, "text");
        },
      });
    }
    return options;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: node.id }));
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    if (node.type === "folder") {
      if (y < rect.height * 0.25) {
        setDropIndicator("top");
      } else if (y > rect.height * 0.75) {
        setDropIndicator("bottom");
      } else {
        setDropIndicator("inside");
      }
    } else {
      if (y < rect.height * 0.5) {
        setDropIndicator("top");
      } else {
        setDropIndicator("bottom");
      }
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const indicator = dropIndicator;
    setDropIndicator(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (!data || !data.id || data.id === node.id) return;

      if (indicator === "inside" && node.type === "folder") {
        moveItem(data.id, node.id);
        setIsOpen(true);
      } else if (indicator === "top") {
        const siblings = fileTree
          .filter((n) => n.parentId === node.parentId)
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const selfIdx = siblings.findIndex((s) => s.id === node.id);
        const afterId = selfIdx > 0 ? siblings[selfIdx - 1].id : null;

        moveItem(data.id, node.parentId);
        reorderItem(data.id, afterId);
      } else if (indicator === "bottom") {
        moveItem(data.id, node.parentId);
        reorderItem(data.id, node.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`Delete ${node.type === "folder" ? "Folder" : "File"}`}
        message={`Are you sure you want to delete "${node.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={getContextMenuOptions()}
          onClose={() => setContextMenu(null)}
        />
      )}
      <div
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
        className="relative"
      >
        {/* Drop Indicators */}
        {dropIndicator === "top" && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 z-10" />
        )}
        {dropIndicator === "bottom" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 z-10" />
        )}

        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer select-none transition-colors
        ${
          activeFileId === node.id
            ? "bg-indigo-100 text-indigo-700 font-medium"
            : "hover:bg-slate-100 text-slate-700"
        }
        ${
          dropIndicator === "inside"
            ? "bg-indigo-50 ring-1 ring-indigo-200"
            : ""
        }
        `}
          onClick={handleClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {/* Indent / Icon */}
          <span className="text-slate-400 shrink-0">
            {node.type === "folder" ? (
              <svg
                className={`w-4 h-4 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
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
                  d={
                    node.type === "table"
                      ? "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      : "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  }
                />
              </svg>
            )}
          </span>

          {/* Name */}
          {isEditing ? (
            <input
              autoFocus
              className="flex-1 min-w-0 bg-white border border-sky-300 rounded px-1 text-sm outline-none py-0.5"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate text-sm flex items-center gap-2 py-0.5">
              {node.name}
              {node.tags.length > 0 && (
                <div className="flex -space-x-1">
                  {node.tags.map((tag) => (
                    <div
                      key={tag}
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-white"
                      style={{ backgroundColor: tag }}
                    ></div>
                  ))}
                </div>
              )}
            </span>
          )}

          {/* Actions - Keep Mobile Friendly */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TagSelector fileId={node.id} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest();
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-500 transition-colors"
                title="Delete"
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
            </div>
          )}
        </div>

        {isOpen && node.type === "folder" && (
          <div className="pl-4 border-l border-slate-100 ml-2.5">
            {children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                onCreateItem={onCreateItem}
              />
            ))}
            {/* Drop zone for empty folder */}
            {children.length === 0 && (
              <div className="text-xs text-slate-300 py-1 pl-2">Empty</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
