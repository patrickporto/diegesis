import { useEffect, useState } from "react";
import * as Y from "yjs";

import { useBattlemapStore } from "../../stores/useBattlemapStore";
import { DrawingShape } from "./types";

interface PropertyEditorProps {
  drawingsArray: Y.Array<DrawingShape>;
}

export function PropertyEditor({ drawingsArray }: PropertyEditorProps) {
  const selectedDrawingIds = useBattlemapStore((s) => s.selectedDrawingIds);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingShape | null>(
    null
  );

  // Sync with Yjs array finding the selected item
  useEffect(() => {
    if (selectedDrawingIds.length === 0) {
      setSelectedDrawing(null);
      return;
    }

    // Just show value of the last selected item
    const lastId = selectedDrawingIds[selectedDrawingIds.length - 1];
    const item = drawingsArray.toArray().find((d) => d.id === lastId);
    if (item) {
      setSelectedDrawing(item);
    } else {
      setSelectedDrawing(null);
    }
  }, [selectedDrawingIds, drawingsArray]);

  // Subscribe to Yjs changes to update the editor if remote change happens?
  // Ideally yes, but for now simple local state update on selection is okay.
  // Actually, if we edit, we update Yjs, which updates drawingsArray, which triggers this useEffect?
  // drawingsArray.toArray() creates a new array.
  // So we need to be careful not to loop updates if local state matches remote.
  // But Yjs array observation is separate in BattlemapData.
  // Here we just re-read when dependencies change. `drawingsArray` prop usually doesn't change ref unless parent re-renders.
  // We might want `useBattlemapData`'s `drawings` map instead for faster lookup?
  // But `drawingsArray` is what we observe for changes in parent.
  // Let's rely on parent passing stable drawingsArray ref and maybe an observer trigger if needed.
  // For now, let's just use the `drawingsArray` directly for writes.

  if (!selectedDrawing) return null;

  const handleChange = (key: string, value: string | number) => {
    // Optimistic update
    setSelectedDrawing((prev) => (prev ? { ...prev, [key]: value } : null));

    // Yjs update - Iterate all selected IDs
    drawingsArray.doc?.transact(() => {
      const items = drawingsArray.toArray();
      selectedDrawingIds.forEach((id) => {
        const index = items.findIndex((d) => d.id === id);
        if (index !== -1) {
          const item = drawingsArray.get(index);
          const newItem = { ...item, [key]: value };
          drawingsArray.delete(index, 1);
          drawingsArray.insert(index, [newItem as DrawingShape]);
        }
      });
    });
  };

  return (
    <div className="absolute top-4 right-4 z-[100] bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl p-4 w-64 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
        <h3 className="text-sm font-semibold text-slate-200">
          Edit Properties{" "}
          {selectedDrawingIds.length > 1 && `(${selectedDrawingIds.length})`}
        </h3>
        <button
          onClick={() => useBattlemapStore.getState().setSelectedDrawingIds([])}
          className="text-slate-400 hover:text-white"
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
      </div>

      <div className="space-y-3">
        {/* Stroke Color */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Stroke Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={selectedDrawing.strokeColor || "#ff0000"}
              onChange={(e) => handleChange("strokeColor", e.target.value)}
              className="h-8 w-12 rounded bg-slate-700 cursor-pointer"
            />
            <span className="text-xs text-slate-300 font-mono">
              {selectedDrawing.strokeColor || "#ff0000"}
            </span>
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">
            Stroke Width ({selectedDrawing.strokeWidth || 2}px)
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={selectedDrawing.strokeWidth || 2}
            onChange={(e) =>
              handleChange("strokeWidth", Number(e.target.value))
            }
            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Fill Color */}
        {(selectedDrawing.type === "rect" ||
          selectedDrawing.type === "ellipse" ||
          selectedDrawing.type === "polygon") && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Fill Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selectedDrawing.fillColor || "#ffffff"}
                  onChange={(e) => handleChange("fillColor", e.target.value)}
                  className="h-8 w-12 rounded bg-slate-700 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-mono">
                  {selectedDrawing.fillColor || "#ffffff"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Fill Opacity ({selectedDrawing.fillAlpha ?? 0})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedDrawing.fillAlpha ?? 0}
                onChange={(e) =>
                  handleChange("fillAlpha", Number(e.target.value))
                }
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </>
        )}

        {/* Text Specifics */}
        {selectedDrawing.type === "text" && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Font Size</label>
              <input
                type="number"
                value={selectedDrawing.fontSize || 16}
                onChange={(e) =>
                  handleChange("fontSize", Number(e.target.value))
                }
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
