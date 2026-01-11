import { useState } from "react";

export function HotkeysHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const hotkeys = [
    { key: "V", description: "Select tool" },
    { key: "H", description: "Pan tool" },
    { key: "D", description: "Draw tool" },
    { key: "F", description: "Fog tool" },
    { key: "W", description: "Wall tool" },
    { key: "T", description: "Token tool" },
    { key: "R", description: "Toggle fog mode (when fog tool active)" },
    { key: "Space", description: "Hold for temporary pan" },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[200] bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full p-2 shadow-lg transition-colors"
        title="Keyboard Shortcuts"
      >
        <svg
          className="w-5 h-5 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 animate-in fade-in duration-150">
          <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-6 max-w-md w-full mx-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
              <h2 className="text-lg font-semibold text-slate-200">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
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

            <div className="space-y-2">
              {hotkeys.map((hotkey) => (
                <div
                  key={hotkey.key}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-sm text-slate-300">
                    {hotkey.description}
                  </span>
                  <kbd className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono text-slate-200">
                    {hotkey.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-xs">
                  ?
                </kbd>{" "}
                anytime to show this help
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
