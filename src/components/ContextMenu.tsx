import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  options: {
    label: string;
    action: () => void;
    className?: string;
  }[];
  onClose: () => void;
}

export function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Adjust position if it goes off screen (basic)
  const style = {
    top: y,
    left: x,
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-slate-200 shadow-xl rounded-lg py-1 min-w-[150px] flex flex-col"
      style={style}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => {
            opt.action();
            onClose();
          }}
          className={`text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${
            opt.className || "text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
