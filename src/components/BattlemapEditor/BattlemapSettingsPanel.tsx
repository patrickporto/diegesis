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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute top-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">
            Configurações do Mapa
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
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

        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Background Image */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
                className="flex-1 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Carregar Imagem
              </button>
              {settings.backgroundImage && (
                <button
                  onClick={onBackgroundClear}
                  className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Grid Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tipo de Grid
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {gridTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onSettingsChange({ gridType: type.id })}
                  className={`px-3 py-2 text-sm rounded-lg transition-all ${
                    settings.gridType === type.id
                      ? "bg-sky-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Line Width */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
              className="w-full accent-sky-500"
            />
          </div>

          {/* Grid Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Cor do Grid
            </label>
            <div className="flex gap-2">
              {gridColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => onSettingsChange({ gridColor: color.id })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    settings.gridColor === color.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs text-slate-600">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid Opacity */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
              className="w-full accent-sky-500"
            />
          </div>

          {/* Grid Cell Size */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Snap to Grid */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700">
              Snap de Tokens no Grid
            </label>
            <button
              onClick={() =>
                onSettingsChange({ snapToGrid: !settings.snapToGrid })
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.snapToGrid ? "bg-sky-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  settings.snapToGrid ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Fog Opacity */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Opacidade do Fog of War (
              {Math.round((settings.fogOpacity ?? 0.85) * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={settings.fogOpacity ?? 0.85}
              onChange={(e) =>
                onSettingsChange({ fogOpacity: Number(e.target.value) })
              }
              className="w-full accent-sky-500"
            />
          </div>
        </div>
      </div>
    </>
  );
}
