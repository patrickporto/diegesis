import React from "react";

import {
  DrawingType,
  FogToolMode,
  FogToolType,
  ToolType,
  WallToolType,
} from "./types";

interface BattlemapToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;

  // Fog Specific
  fogMode?: FogToolMode;
  onFogModeChange?: (mode: FogToolMode) => void;
  fogTool?: FogToolType;
  onFogToolChange?: (tool: FogToolType) => void;
  brushSize?: number;
  onBrushSizeChange?: (size: number) => void;

  // Wall Specific
  wallTool?: WallToolType;
  onWallToolChange?: (tool: WallToolType) => void;

  // Draw Specific
  drawTool?: DrawingType;
  onDrawToolChange?: (tool: DrawingType) => void;
}

const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  {
    id: "pan",
    label: "Pan (Hand)",
    icon: (
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
          d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
        />
      </svg>
    ),
  },
  {
    id: "select",
    label: "Select",
    icon: (
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
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </svg>
    ),
  },

  {
    id: "draw",
    label: "Draw",
    icon: (
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
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    id: "fog",
    label: "Fog of War",
    icon: (
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
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
        />
      </svg>
    ),
  },
  {
    id: "wall",
    label: "Walls",
    icon: (
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
          d="M4 5h16M4 5v14M4 19h16M20 5v14M9 5v14M14 5v14"
        />
      </svg>
    ),
  },
];

const fogSubTools: { id: FogToolType; label: string; icon: React.ReactNode }[] =
  [
    {
      id: "brush",
      label: "Brush",
      icon: (
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
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      ),
    },
    {
      id: "rect",
      label: "Rectangle",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            ry="2"
            strokeWidth={2}
          />
        </svg>
      ),
    },
    {
      id: "ellipse",
      label: "Ellipse",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <ellipse cx="12" cy="12" rx="9" ry="6" strokeWidth={2} />
        </svg>
      ),
    },
    {
      id: "polygon",
      label: "Polygon",
      icon: (
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
            d="M12 2l9 17H3l9-17z" // Simplified poly representation
          />
        </svg>
      ),
    },
    {
      id: "grid",
      label: "Grid Cell",
      icon: (
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
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      id: "fill",
      label: "Fill All",
      icon: (
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
  ];

const wallSubTools: {
  id: WallToolType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "polygon",
    label: "Polygon Wall",
    icon: (
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
          d="M4 6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2-4-2V6z"
        />
      </svg>
    ),
  },
  {
    id: "rect",
    label: "Rectangle Wall",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect x="3" y="3" width="18" height="18" rx="1" strokeWidth={2} />
      </svg>
    ),
  },
  {
    id: "ellipse",
    label: "Ellipse Wall",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <ellipse cx="12" cy="12" rx="9" ry="7" strokeWidth={2} />
      </svg>
    ),
  },

  {
    id: "door",
    label: "Door",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect x="5" y="2" width="14" height="20" rx="1" strokeWidth={2} />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

const drawSubTools: {
  id: DrawingType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "brush",
    label: "Brush",
    icon: (
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
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    id: "text",
    label: "Text",
    icon: (
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
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    id: "rect",
    label: "Rectangle",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          ry="2"
          strokeWidth={2}
        />
      </svg>
    ),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <ellipse cx="12" cy="12" rx="9" ry="6" strokeWidth={2} />
      </svg>
    ),
  },
  {
    id: "polygon",
    label: "Polygon",
    icon: (
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
          d="M12 2l9 17H3l9-17z"
        />
      </svg>
    ),
  },
];

export function BattlemapToolbar({
  activeTool,
  onToolChange,
  fogMode,
  onFogModeChange,
  fogTool,
  onFogToolChange,
  wallTool,
  onWallToolChange,
  drawTool,
  onDrawToolChange,
}: BattlemapToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {/* Draw Sub-Toolbar */}
      {activeTool === "draw" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-xl shadow-xl animate-fade-in-up">
          <div className="flex gap-1">
            {drawSubTools.map((t) => (
              <button
                key={t.id}
                onClick={() => onDrawToolChange?.(t.id)}
                title={t.label}
                className={`p-1.5 rounded-md transition-colors ${
                  drawTool === t.id
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {(drawTool === "brush" || drawTool === "text") && (
            // Placeholder for text settings or brush size if distinct from fog brush size
            // For now reusing brushSize or generic settings could go here
            <>
              <div className="w-px h-5 bg-slate-700 mx-1" />
              {/* Add dedicated settings later */}
            </>
          )}
        </div>
      )}
      {/* Fog Sub-Toolbar */}
      {activeTool === "fog" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-xl shadow-xl animate-fade-in-up">
          <div className="flex gap-1">
            {fogSubTools.map((t) => (
              <button
                key={t.id}
                onClick={() => onFogToolChange?.(t.id)}
                title={t.label}
                className={`p-1.5 rounded-md transition-colors ${
                  fogTool === t.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          {/* Mode Toggle */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
            {(["hide", "reveal"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onFogModeChange?.(m)}
                className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                  fogMode === m
                    ? m === "hide"
                      ? "bg-slate-700 text-white"
                      : "bg-sky-600 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wall Sub-Toolbar */}
      {activeTool === "wall" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-xl shadow-xl animate-fade-in-up">
          {/* Wall Drawing Tools */}
          <div className="flex gap-1">
            {wallSubTools.map((t) => (
              <button
                key={t.id}
                onClick={() => onWallToolChange?.(t.id)}
                title={t.label}
                className={`p-1.5 rounded-md transition-colors ${
                  wallTool === t.id
                    ? "bg-amber-600 text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/90 backdrop-blur-lg border border-slate-200 rounded-xl shadow-xl">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={`p-2.5 rounded-lg transition-all ${
              activeTool === tool.id
                ? "bg-sky-500 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
