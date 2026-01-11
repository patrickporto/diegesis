import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose?: () => void;
  className?: string;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f9ca24",
  "#6c5ce7",
  "#a29bfe",
  "#fd79a8",
  "#fab1a0",
];

// Helper functions for color conversion
function hexToHsv(hex: string) {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToHex(h: number, s: number, v: number) {
  h /= 360;
  s /= 100;
  v /= 100;
  let r = 0,
    g = 0,
    b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ColorPicker({
  value,
  onChange,
  onClose,
  className,
  anchorRef,
}: ColorPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);
  const [customColors, setCustomColors] = useState<string[]>(() => {
    const saved = localStorage.getItem("colorPicker:custom");
    return saved ? JSON.parse(saved) : [];
  });

  const popupRef = useRef<HTMLDivElement>(null);
  const svPanelRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    setHexInput(value);
    setHsv(hexToHsv(value));
  }, [value]);

  useLayoutEffect(() => {
    if (anchorRef?.current && popupRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();

      // Ensure it stays within viewport
      let left = rect.left;
      if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 20;
      }

      setPosition({
        top: rect.bottom + 8,
        left: Math.max(20, left),
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleColorSelect = (color: string) => {
    onChange(color);
  };

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hex = hexInput.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      handleColorSelect(hex);
    }
  };

  const handleAddCustom = () => {
    if (!customColors.includes(value)) {
      const updated = [...customColors, value];
      setCustomColors(updated);
      localStorage.setItem("colorPicker:custom", JSON.stringify(updated));
    }
  };

  const handleSVPointer = (e: React.PointerEvent) => {
    if (!svPanelRef.current) return;
    const rect = svPanelRef.current.getBoundingClientRect();
    const s = Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const v = Math.min(
      100,
      Math.max(0, (1 - (e.clientY - rect.top) / rect.height) * 100)
    );
    const newHsv = { ...hsv, s, v };
    setHsv(newHsv);
    handleColorSelect(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const handleHuePointer = (e: React.PointerEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const h = Math.min(
      360,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 360)
    );
    const newHsv = { ...hsv, h };
    setHsv(newHsv);
    handleColorSelect(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  };

  const content = (
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      className={`bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 w-72 animate-fade-in-up flex flex-col gap-4 ${
        className || ""
      }`}
    >
      {/* Preview and Hex Input */}
      <div className="flex gap-3 items-end">
        <div
          className="w-12 h-12 rounded border border-slate-600 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <form onSubmit={handleHexSubmit} className="flex-1">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
            HEX Color
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm font-mono"
              placeholder="#000000"
            />
          </div>
        </form>
      </div>

      {/* Visual Pickers */}
      <div className="space-y-3">
        {/* SV Box */}
        <div
          ref={svPanelRef}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            handleSVPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) handleSVPointer(e);
          }}
          className="relative h-32 rounded cursor-crosshair overflow-hidden"
          style={{ backgroundColor: hsvToHex(hsv.h, 100, 100) }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div
            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg pointer-events-none -translate-x-1/2 translate-y-1/2"
            style={{
              left: `${hsv.s}%`,
              bottom: `${hsv.v}%`,
              backgroundColor: value,
            }}
          />
        </div>

        {/* Hue Slider */}
        <div
          ref={hueSliderRef}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            handleHuePointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) handleHuePointer(e);
          }}
          className="relative h-4 rounded cursor-pointer"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        >
          <div
            className="absolute w-2 h-full bg-white border border-slate-400 rounded shadow-sm -translate-x-1/2"
            style={{ left: `${(hsv.h / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="border-t border-slate-700 my-1" />

      {/* Preset & Recent & Custom */}
      <div className="space-y-4">
        {/* Preset Colors */}
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
            Presets
          </label>
          <div className="grid grid-cols-8 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-6 h-6 rounded-sm border transition-all hover:scale-110 ${
                  value === color
                    ? "border-white scale-110 z-10"
                    : "border-slate-700"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Custom Palette */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Custom Palette
            </label>
            <button
              onClick={handleAddCustom}
              disabled={customColors.includes(value)}
              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold uppercase disabled:opacity-0 transition-opacity"
            >
              + Add Current
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1.5 min-h-[1.5rem]">
            {customColors.map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                onClick={() => handleColorSelect(color)}
                className={`w-6 h-6 rounded-sm border transition-all hover:scale-110 ${
                  value === color
                    ? "border-white scale-110 z-10"
                    : "border-slate-700"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            {customColors.length === 0 && (
              <div className="col-span-8 text-[10px] text-slate-500 italic py-1">
                No custom colors saved
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (anchorRef) {
    return createPortal(content, document.body);
  }

  return (
    <div
      ref={popupRef}
      className={`bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 w-72 z-[200] ${
        className || ""
      }`}
    >
      {content}
    </div>
  );
}
