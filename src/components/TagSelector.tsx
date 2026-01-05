import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useFileSystem } from "@/contexts/FileSystemContext";

export function TagSelector({ fileId }: { fileId: string }) {
  const { fileMap, setFileTags, tagDefs, updateTagName } = useFileSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const node = fileMap.get(fileId);
  if (!node) return null;

  const currentTags = node.tags || [];

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // On desktop, we want it below the button, but not overflowing the right
      const left = Math.min(rect.left, window.innerWidth - 300); // 300 is roughly panel width + margin
      setCoords({
        top: rect.bottom + 8,
        left: Math.max(8, left),
      });
    }
    setIsOpen(!isOpen);
    setIsManageMode(false);
  };

  const toggleTag = (color: string) => {
    if (currentTags.includes(color)) {
      setFileTags(
        fileId,
        currentTags.filter((t) => t !== color)
      );
    } else {
      setFileTags(fileId, [...currentTags, color]);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          toggleOpen();
        }}
        className="p-1.5 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors group"
        title="Manage Tags"
      >
        <div className="flex gap-0.5">
          {currentTags.slice(0, 3).map((color) => (
            <div
              key={color}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
          {currentTags.length > 3 && (
            <div className="w-2 h-2 rounded-full bg-slate-200" />
          )}
          {currentTags.length === 0 && (
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          )}
        </div>
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[60] bg-slate-900/10 backdrop-blur-[1px] transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            ></div>

            {/* Tag Panel - Adaptive Positioning */}
            <div
              style={{
                top: window.innerWidth >= 768 ? coords.top : "auto",
                left: window.innerWidth >= 768 ? coords.left : 0,
              }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:right-auto z-[70] bg-white border border-slate-200 shadow-2xl rounded-t-2xl md:rounded-xl p-4 w-full md:w-72 flex flex-col gap-4 animate-in slide-in-from-bottom md:slide-in-from-top duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grabber for mobile */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto md:hidden mb-1" />

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">
                  {isManageMode ? "Customize Tags" : "Assign Tags"}
                </h3>
                <button
                  onClick={() => setIsManageMode(!isManageMode)}
                  className="text-xs font-semibold px-2 py-1 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-md transition-colors"
                >
                  {isManageMode ? "Done" : "Manage"}
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {isManageMode ? (
                  <div className="flex flex-col gap-3">
                    {tagDefs.map((tag) => (
                      <div
                        key={tag.color}
                        className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 shadow-sm border border-black/5"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <input
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 placeholder:text-slate-400"
                          value={tag.name}
                          onChange={(e) =>
                            updateTagName(tag.color, e.target.value)
                          }
                          placeholder="Unnamed Tag"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {tagDefs.map((tag) => {
                      const isSelected = currentTags.includes(tag.color);
                      return (
                        <button
                          key={tag.color}
                          onClick={() => toggleTag(tag.color)}
                          className={`group flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "bg-white border-slate-300 shadow-sm ring-1 ring-slate-200"
                              : "bg-slate-50 border-transparent hover:bg-slate-100"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-transform ${
                              isSelected ? "scale-110 shadow-sm" : "scale-100"
                            }`}
                            style={{ backgroundColor: tag.color }}
                          >
                            {isSelected && (
                              <svg
                                className="w-3.5 h-3.5 text-white drop-shadow-sm"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={4}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium truncate ${
                              isSelected ? "text-slate-900" : "text-slate-500"
                            }`}
                          >
                            {tag.name || "Unnamed"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close button for mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm md:hidden mt-2 active:scale-95 transition-transform"
              >
                Close
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
