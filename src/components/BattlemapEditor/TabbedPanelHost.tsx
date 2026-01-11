import React from "react";

import { DraggablePanel } from "./DraggablePanel";

interface TabbedPanelHostProps {
  panelIds: string[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  renderPanelContent: (
    id: string,
    orientation: "vertical" | "horizontal"
  ) => React.ReactNode;
  getPanelTitle: (id: string) => string;
  orientation?: "vertical" | "horizontal";
}

export function TabbedPanelHost({
  panelIds,
  activeId,
  onSelect,
  onClose,
  renderPanelContent,
  getPanelTitle,
  orientation = "vertical",
}: TabbedPanelHostProps) {
  // If no panels, render nothing
  if (panelIds.length === 0) return null;

  // Title is a Tab Bar
  const titleContent = (
    <div
      className="flex items-center gap-1 overflow-x-auto no-scrollbar"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {panelIds.map((id) => (
        <button
          key={id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(id);
          }}
          className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded transition-colors whitespace-nowrap ${
            id === activeId
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
          }`}
        >
          {getPanelTitle(id)}
        </button>
      ))}
    </div>
  );

  return (
    <DraggablePanel
      id={activeId}
      title={titleContent}
      onClose={() => onClose(activeId)}
    >
      {renderPanelContent(activeId, orientation)}
    </DraggablePanel>
  );
}
