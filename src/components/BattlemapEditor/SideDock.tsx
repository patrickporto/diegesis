import React from "react";

interface SideDockProps {
  position: "left" | "right" | "top" | "bottom";
  panels: Array<{
    id: string;
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
  }>;
  onToggle: (id: string) => void;
}

export function SideDock({ position, panels, onToggle }: SideDockProps) {
  if (panels.length === 0) return null;

  const isHorizontal = position === "top" || position === "bottom";

  const positionClasses = {
    left: "left-0 top-0 bottom-0 w-12 flex-col border-r",
    right: "right-0 top-0 bottom-0 w-12 flex-col border-l",
    top: "top-0 left-0 right-0 h-12 flex-row border-b",
    bottom: "bottom-0 left-0 right-0 h-12 flex-row border-t",
  };

  return (
    <div
      className={`absolute bg-slate-900/90 backdrop-blur-md border-slate-800 flex items-center justify-center ${
        isHorizontal ? "px-4" : "py-4"
      } z-40 transition-all ${positionClasses[position]}`}
    >
      {/* Panel Icons */}
      <div
        className={`flex ${isHorizontal ? "flex-row gap-2" : "flex-col gap-3"}`}
      >
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => onToggle(panel.id)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              panel.isOpen
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title={panel.title}
          >
            {panel.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
