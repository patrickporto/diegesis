import { useEffect, useRef, useState } from "react";

type ItemType = "text" | "table" | "folder" | "battlemap";

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: ItemType) => void;
  initialType?: ItemType;
}

export function CreateItemModal({
  isOpen,
  onClose,
  onCreate,
  initialType = "text",
}: CreateItemModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>(initialType);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setName("");
      setType(initialType);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialType]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onCreate(name, type);
    onClose();
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-200 relative z-10 ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3
              id="create-modal-title"
              className="text-lg font-semibold text-slate-900 mb-4"
            >
              Create New Item
            </h3>

            <div className="space-y-4">
              {/* Name Input */}
              <div className="space-y-1">
                <label
                  htmlFor="item-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Name
                </label>
                <input
                  ref={inputRef}
                  id="item-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Project"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-shadow"
                  autoComplete="off"
                />
              </div>

              {/* Type Selection */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <TypeOption
                    label="Note"
                    selected={type === "text"}
                    onClick={() => setType("text")}
                    icon={
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  />
                  <TypeOption
                    label="Table"
                    selected={type === "table"}
                    onClick={() => setType("table")}
                    icon={
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
                          d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  />
                  <TypeOption
                    label="Battlemap"
                    selected={type === "battlemap"}
                    onClick={() => setType("battlemap")}
                    icon={
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
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    }
                  />
                  <TypeOption
                    label="Folder"
                    selected={type === "folder"}
                    onClick={() => setType("folder")}
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="currentColor" // Filled for folder
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TypeOption({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
        selected
          ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500"
          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className={selected ? "text-sky-500" : "text-slate-400"}>{icon}</div>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
