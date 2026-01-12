import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import { useBattlemapStore } from "../../stores/useBattlemapStore";
import { ColorPicker } from "../ui/ColorPicker";
import { DrawingShape } from "./types";

interface PropertyEditorProps {
  drawingsArray: Y.Array<DrawingShape>;
}

export function PropertyEditor({ drawingsArray }: PropertyEditorProps) {
  // HOOKS MUST BE AT TOP LEVEL
  const strokeButtonRef = useRef<HTMLButtonElement>(null);
  const fillButtonRef = useRef<HTMLButtonElement>(null);

  const selectedDrawingIds = useBattlemapStore((s) => s.selectedDrawingIds);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingShape | null>(
    null
  );
  const [showStrokePicker, setShowStrokePicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);

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
    <div className="h-full w-full overflow-y-auto p-4 space-y-4">
      <div className="space-y-3">
        {/* Stroke Color */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {selectedDrawing.type === "text" ? "Text Color" : "Stroke Color"}
          </label>
          <div className="relative">
            <button
              ref={strokeButtonRef}
              onClick={() => setShowStrokePicker(!showStrokePicker)}
              className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded hover:border-slate-600 transition-colors"
            >
              <div
                className="w-6 h-6 rounded border border-slate-600"
                style={{
                  backgroundColor: selectedDrawing.strokeColor || "#ff0000",
                }}
              />
              <span className="text-xs text-slate-300 font-mono flex-1 text-left">
                {selectedDrawing.strokeColor || "#ff0000"}
              </span>
            </button>
            {showStrokePicker && (
              <ColorPicker
                value={selectedDrawing.strokeColor || "#ff0000"}
                onChange={(color) => {
                  handleChange("strokeColor", color);
                  setShowStrokePicker(false);
                }}
                onClose={() => setShowStrokePicker(false)}
                anchorRef={strokeButtonRef}
              />
            )}
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
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
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Fill Color
              </label>
              <div className="relative">
                <button
                  ref={fillButtonRef}
                  onClick={() => setShowFillPicker(!showFillPicker)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded hover:border-slate-600 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded border border-slate-600"
                    style={{
                      backgroundColor: selectedDrawing.fillColor || "#ffffff",
                    }}
                  />
                  <span className="text-xs text-slate-300 font-mono flex-1 text-left">
                    {selectedDrawing.fillColor || "#ffffff"}
                  </span>
                </button>
                {showFillPicker && (
                  <ColorPicker
                    value={selectedDrawing.fillColor || "#ffffff"}
                    onChange={(color) => {
                      handleChange("fillColor", color);
                      setShowFillPicker(false);
                    }}
                    onClose={() => setShowFillPicker(false)}
                    anchorRef={fillButtonRef}
                  />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Fill Opacity (
                {((selectedDrawing.fillAlpha ?? 0) * 100).toFixed(0)}%)
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

        {/* Blur */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Blur ({selectedDrawing.blur || 0}px)
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={selectedDrawing.blur || 0}
            onChange={(e) => handleChange("blur", Number(e.target.value))}
            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Global Opacity */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Opacity ({((selectedDrawing.opacity ?? 1) * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedDrawing.opacity ?? 1}
            onChange={(e) => handleChange("opacity", Number(e.target.value))}
            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Text Specifics */}
        {selectedDrawing.type === "text" && (
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Font Size
            </label>
            <input
              type="number"
              value={selectedDrawing.fontSize || 16}
              onChange={(e) => handleChange("fontSize", Number(e.target.value))}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
