import { useRef, useState } from "react";

import { ColorPicker } from "../ui/ColorPicker";

interface DrawingPropertiesPanelProps {
  activeTool: string;
  drawTool: string;
  properties: {
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    fillAlpha: number;
    blur: number;
    opacity: number;
  };
  onPropertiesChange: (
    updates: Partial<DrawingPropertiesPanelProps["properties"]>
  ) => void;
}

export function DrawingPropertiesPanel({
  activeTool,
  drawTool,
  properties,
  onPropertiesChange,
}: DrawingPropertiesPanelProps) {
  const [showStrokePicker, setShowStrokePicker] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);

  const strokeButtonRef = useRef<HTMLButtonElement>(null);
  const fillButtonRef = useRef<HTMLButtonElement>(null);

  if (activeTool !== "draw") return null;

  const showFill =
    drawTool === "rect" || drawTool === "ellipse" || drawTool === "polygon";

  return (
    <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-200">
          Drawing Properties
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stroke Color */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Stroke Color
          </label>
          <div className="relative">
            <button
              ref={strokeButtonRef}
              onClick={() => setShowStrokePicker(!showStrokePicker)}
              className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded hover:border-slate-600 transition-colors"
            >
              <div
                className="w-6 h-6 rounded border border-slate-600"
                style={{ backgroundColor: properties.strokeColor }}
              />
              <span className="text-xs text-slate-300 font-mono flex-1 text-left">
                {properties.strokeColor}
              </span>
            </button>
            {showStrokePicker && (
              <ColorPicker
                value={properties.strokeColor}
                onChange={(color) => {
                  onPropertiesChange({ strokeColor: color });
                  setShowStrokePicker(false);
                }}
                onClose={() => setShowStrokePicker(false)}
                anchorRef={
                  strokeButtonRef as React.RefObject<HTMLElement | null>
                }
              />
            )}
          </div>
        </div>
        {/* Stroke Width */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Stroke Width ({properties.strokeWidth}px)
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={properties.strokeWidth}
            onChange={(e) =>
              onPropertiesChange({ strokeWidth: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>1px</span>
            <span>20px</span>
          </div>
        </div>
        {/* Fill Color (for shapes) */}
        {showFill && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                    style={{ backgroundColor: properties.fillColor }}
                  />
                  <span className="text-xs text-slate-300 font-mono flex-1 text-left">
                    {properties.fillColor}
                  </span>
                </button>
                {showFillPicker && (
                  <ColorPicker
                    value={properties.fillColor}
                    onChange={(color) => {
                      onPropertiesChange({ fillColor: color });
                      setShowFillPicker(false);
                    }}
                    onClose={() => setShowFillPicker(false)}
                    anchorRef={
                      fillButtonRef as React.RefObject<HTMLElement | null>
                    }
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Fill Opacity ({(properties.fillAlpha * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={properties.fillAlpha}
                onChange={(e) =>
                  onPropertiesChange({ fillAlpha: Number(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </>
        )}

        {/* Blur & Opacity (Always shown for all tools) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Blur ({properties.blur}px)
          </label>
          <input
            type="range"
            min="0"
            max="20"
            value={properties.blur}
            onChange={(e) =>
              onPropertiesChange({ blur: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0px</span>
            <span>20px</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Opacity ({(properties.opacity * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={properties.opacity}
            onChange={(e) =>
              onPropertiesChange({ opacity: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
