import { Viewport } from "pixi-viewport";
import React, { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import { useBattlemapStore } from "../../stores/useBattlemapStore";
import { DrawingPath, DrawingText } from "./types";

interface TextInputOverlayProps {
  viewport: Viewport | null;
  drawingsArray: Y.Array<DrawingPath>;
  doc: Y.Doc;
}

export const TextInputOverlay: React.FC<TextInputOverlayProps> = ({
  viewport,
  drawingsArray,
  doc,
}) => {
  const editingItemId = useBattlemapStore((s) => s.editingItemId);
  const setEditingItemId = useBattlemapStore((s) => s.setEditingItemId);
  const drawings = useBattlemapStore((s) => s.drawings);
  const [localValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Find the item being edited
  const editingItem = drawings.find(
    (d) => d.id === editingItemId && d.type === "text"
  ) as DrawingText | undefined;

  // Initialize local value when starting edit
  useEffect(() => {
    if (editingItem) {
      setLocalValue(editingItem.content);
      // Focus input on next tick
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [editingItemId, editingItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!viewport || !editingItem || !editingItemId) return null;

  // Calculate screen position
  const screenPos = viewport.toGlobal({ x: editingItem.x, y: editingItem.y });
  const zoom = viewport.scaled;

  const handleCommit = () => {
    if (localValue !== editingItem.content) {
      doc.transact(() => {
        // Find index in Y.Array
        // Note: Yjs arrays can be tricky to update by ID directly without index.
        // We find the index in the prop array (assuming it matches YArray order? Not guaranteed if filtered/sorted).
        // Better: Iterate YArray to find index.
        let index = -1;
        // This is inefficient for large arrays but safe
        for (let i = 0; i < drawingsArray.length; i++) {
          const item = drawingsArray.get(i);
          if (item.id === editingItemId) {
            index = i;
            break;
          }
        }

        if (index !== -1) {
          const newItem = {
            ...editingItem,
            content: localValue,
          };
          drawingsArray.delete(index, 1);
          drawingsArray.insert(index, [newItem]);
        }
      });
    }
    setEditingItemId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent map shortcuts
    if (e.key === "Enter" && !e.shiftKey) {
      handleCommit();
    } else if (e.key === "Escape") {
      setEditingItemId(null); // Cancel
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    // basic auto-height if needed, or just let it scroll/fixed size
  };

  return (
    <textarea
      ref={inputRef}
      value={localValue}
      onChange={handleInput}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute",
        left: screenPos.x,
        top: screenPos.y,
        transform: "translate(0, -50%)",
        fontSize: `${editingItem.fontSize * zoom}px`,
        color: editingItem.strokeColor || "#ffffff",
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: "4px",
        padding: "4px",
        outline: "none",
        minWidth: "100px",
        minHeight: "1.5em",
        zIndex: 100,
        fontFamily: editingItem.fontFamily || "Arial",
        resize: "both",
        overflow: "hidden",
      }}
    />
  );
};
