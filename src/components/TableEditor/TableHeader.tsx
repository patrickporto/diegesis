import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ColumnSchema, ColumnType } from "./types";

interface TableHeaderProps {
  column: ColumnSchema;
  onUpdate: (updates: Partial<ColumnSchema>) => void;
  onDelete: () => void;
  isFirst?: boolean;
}

export function TableHeader({
  column,
  onUpdate,
  onDelete,
  isFirst,
}: TableHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 220);
      setCoords({
        top: rect.bottom + 4,
        left: Math.max(8, left),
      });
    }
    setIsOpen(!isOpen);
  };

  const getIcon = (type: ColumnType) => {
    switch (type) {
      case "text":
        return (
          <span className="font-serif text-slate-400 font-medium text-[10px]">
            Aa
          </span>
        );
      case "number":
        return (
          <span className="text-slate-400 font-medium text-[10px]">#</span>
        );
      case "select":
        return (
          <svg
            className="w-3 h-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        );
      case "date":
        return (
          <svg
            className="w-3 h-3 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case "formula":
        return (
          <span className="text-slate-400 font-medium text-[10px] italic">
            ƒ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors group ${
          isFirst ? "sticky left-0 bg-slate-50 z-20" : ""
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="shrink-0 w-4 h-4 flex items-center justify-center">
            {getIcon(column.type)}
          </div>
          <span className="truncate">{column.name}</span>
        </div>
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                top: coords.top,
                left: coords.left,
              }}
              className="fixed z-[70] bg-white border border-slate-200 shadow-xl rounded-lg w-56 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                className="w-full px-3 py-2 text-sm border-b border-slate-100 outline-none"
                value={column.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Column Name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsOpen(false);
                }}
              />

              <div className="p-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Type
                </div>
                {["text", "number", "select", "date", "formula"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      onUpdate({ type: t as ColumnType });
                      if (t !== "formula") setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left ${
                      column.type === t
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-5 flex justify-center">
                      {getIcon(t as ColumnType)}
                    </div>
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>

              {column.type === "formula" && (
                <div className="p-2 border-t border-slate-100 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">
                    Formula Expression
                  </div>
                  <input
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white font-mono"
                    value={column.formula || ""}
                    onChange={(e) => onUpdate({ formula: e.target.value })}
                    placeholder="e.g. prop('Price') * 2"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Variables corresponds to column names (case-insensitive).
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 p-1 mt-1">
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left text-red-600 hover:bg-red-50"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Column
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
