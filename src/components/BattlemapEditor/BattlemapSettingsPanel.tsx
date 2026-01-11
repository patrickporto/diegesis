import { useRef } from "react";

import { BattlemapSettings, GridColor, GridType } from "./types";

interface BattlemapSettingsPanelProps {
  settings: BattlemapSettings;
  onSettingsChange: (updates: Partial<BattlemapSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
  onBackgroundUpload: (file: File) => void;
  onBackgroundClear: () => void;
}

const gridTypes: { id: GridType; label: string }[] = [
  { id: "none", label: "Sem Grid" },
  { id: "square", label: "Quadriculado" },
  { id: "hex-vertical", label: "Hex Vertical" },
  { id: "hex-horizontal", label: "Hex Horizontal" },
  { id: "isometric", label: "Isométrico" },
];

const gridColors: { id: GridColor; label: string; hex: string }[] = [
  { id: "black", label: "Preto", hex: "#000000" },
  { id: "white", label: "Branco", hex: "#ffffff" },
  { id: "orange", label: "Laranja", hex: "#ff6600" },
];

export function BattlemapSettingsPanel({
  settings,
  onSettingsChange,
  isOpen,
  onClose,
  onBackgroundUpload,
  onBackgroundClear,
}: BattlemapSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onBackgroundUpload(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-200">
          Configurações do Mapa
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded"
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

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Background Image */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Imagem de Fundo
          </label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2 text-sm bg-slate-900 hover:bg-slate-700 text-slate-300 rounded transition-colors border border-slate-600"
            >
              Carregar Imagem
            </button>
            {settings.backgroundImage && (
              <button
                onClick={onBackgroundClear}
                className="px-3 py-2 text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 rounded transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Grid Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Tipo de Grid
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {gridTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onSettingsChange({ gridType: type.id })}
                className={`px-2 py-1.5 text-xs rounded transition-all ${
                  settings.gridType === type.id
                    ? "bg-sky-600 text-white shadow-sm ring-1 ring-sky-500"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Line Width */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Espessura da Linha ({settings.gridLineWidth}px)
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={settings.gridLineWidth}
            onChange={(e) =>
              onSettingsChange({ gridLineWidth: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Grid Color */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Cor do Grid
          </label>
          <div className="flex gap-2">
            {gridColors.map((color) => (
              <button
                key={color.id}
                onClick={() => onSettingsChange({ gridColor: color.id })}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded border transition-all ${
                  settings.gridColor === color.id
                    ? "border-sky-500 bg-slate-700"
                    : "border-slate-600 hover:border-slate-500 bg-slate-900"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full border border-slate-500"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs text-slate-300">{color.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid Opacity */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Opacidade do Grid ({Math.round(settings.gridOpacity * 100)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.gridOpacity}
            onChange={(e) =>
              onSettingsChange({ gridOpacity: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Grid Cell Size */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Tamanho da Célula (px)
          </label>
          <input
            type="number"
            min="20"
            max="200"
            step="10"
            value={settings.gridCellSize}
            onChange={(e) =>
              onSettingsChange({ gridCellSize: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Grid Offset X */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Grid Offset X ({settings.gridOffsetX || 0}px)
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={settings.gridOffsetX || 0}
            onChange={(e) =>
              onSettingsChange({ gridOffsetX: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Grid Offset Y */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Grid Offset Y ({settings.gridOffsetY || 0}px)
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={settings.gridOffsetY || 0}
            onChange={(e) =>
              onSettingsChange({ gridOffsetY: Number(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Snap to Grid */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">
            Snap de Tokens no Grid
          </label>
          <button
            onClick={() =>
              onSettingsChange({ snapToGrid: !settings.snapToGrid })
            }
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.snapToGrid ? "bg-sky-600" : "bg-slate-600"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.snapToGrid ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
