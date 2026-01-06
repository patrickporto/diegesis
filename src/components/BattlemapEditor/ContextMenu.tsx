import React, { useEffect, useRef } from "react";

export interface ContextMenuAction {
  id: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
  children?: ContextMenuAction[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("wheel", onClose);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("wheel", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action) => (
        <ContextMenuItem key={action.id} action={action} onClose={onClose} />
      ))}
    </div>
  );
}

function ContextMenuItem({
  action,
  onClose,
}: {
  action: ContextMenuAction;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

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
        className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-slate-50 ${
          action.danger
            ? "text-red-600 hover:text-red-700 hover:bg-red-50"
            : "text-slate-700"
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
        <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px]">
          {action.children.map((child) => (
            <ContextMenuItem key={child.id} action={child} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}
