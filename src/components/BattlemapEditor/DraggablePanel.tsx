import { ReactNode } from "react";

interface DraggablePanelProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

export function DraggablePanel({
  id,
  title,
  children,
  onClose,
}: DraggablePanelProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 border-x border-slate-700 overflow-hidden shadow-xl">
      {/* Draggable Header */}
      <div
        draggable
        onDragStart={handleDragStart}
        className="flex items-center justify-between p-2 pl-3 bg-slate-800 border-b border-slate-700 cursor-move hover:bg-slate-700/50 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-3 h-3 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-600 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
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
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
