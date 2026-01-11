import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { ContextMenuAction } from "../BattlemapEditor/types";

interface ContextMenuPortalProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
  isMobile?: boolean;
}

export function ContextMenuPortal({
  x,
  y,
  actions,
  onClose,
  isMobile = false,
}: ContextMenuPortalProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("wheel", onClose);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("wheel", onClose);
    };
  }, [onClose]);

  // Mobile: Bottom drawer style
  if (isMobile) {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-[200] animate-in fade-in duration-150"
          onClick={onClose}
        />

        {/* Drawer */}
        <div
          ref={menuRef}
          className="fixed bottom-0 left-0 right-0 z-[201] bg-slate-800 rounded-t-2xl shadow-2xl border-t border-slate-700 animate-in slide-in-from-bottom duration-200"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1 bg-slate-600 rounded-full" />
          </div>

          {/* Actions */}
          <div className="pb-4 px-4 space-y-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 text-base rounded-lg transition-colors ${
                  action.danger
                    ? "text-red-400 hover:bg-red-900/20"
                    : "text-slate-200 hover:bg-slate-700"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Safe area for mobile */}
          <div className="h-safe-area-inset-bottom" />
        </div>
      </>,
      document.body
    );
  }

  // Desktop: Popup style
  const menuStyle: React.CSSProperties = {
    left: x,
    top: y,
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={menuStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action) => (
        <ContextMenuItem key={action.id} action={action} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}

function ContextMenuItem({
  action,
  onClose,
}: {
  action: ContextMenuAction;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (action.children) {
      setIsOpen(!isOpen);
    } else {
      action.onClick();
      onClose();
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => action.children && setIsOpen(true)}
      onMouseLeave={() => action.children && setIsOpen(false)}
    >
      <button
        onClick={handleClick}
        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
          action.danger
            ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
            : "text-slate-200 hover:bg-slate-700"
        }`}
      >
        <span>{action.label}</span>
        {action.children && (
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </button>

      {action.children && isOpen && (
        <div className="absolute left-full top-0 ml-1 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 py-1 min-w-[160px] z-10">
          {action.children.map((child) => (
            <ContextMenuItem key={child.id} action={child} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

// Need to import useState
import { useState } from "react";
