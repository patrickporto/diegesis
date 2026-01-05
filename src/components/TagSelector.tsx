import { useState } from "react";

import { useFileSystem } from "@/contexts/FileSystemContext";

export function TagSelector({ fileId }: { fileId: string }) {
  const { fileMap, setFileTags, tagDefs, updateTagName } = useFileSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);

  const node = fileMap.get(fileId);
  if (!node) return null;

  const currentTags = node.tags || [];

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
        onClick={() => {
          setIsOpen(!isOpen);
          setIsManageMode(false);
        }}
        className="p-1 hover:bg-slate-100 rounded-full flex items-center gap-1"
        title="Manage Tags"
      >
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
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-64 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold border-b pb-1 mb-1">
              <span>{isManageMode ? "Manage Tags" : "Select Tags"}</span>
              <button
                onClick={() => setIsManageMode(!isManageMode)}
                className="text-sky-600 hover:text-sky-700 hover:underline px-1 py-0.5"
              >
                {isManageMode ? "Done" : "Edit Names"}
              </button>
            </div>

            {isManageMode ? (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {tagDefs.map((tag) => (
                  <div key={tag.color} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <input
                      className="flex-1 min-w-0 border-b border-transparent focus:border-sky-300 outline-none text-sm py-0.5 px-1"
                      value={tag.name}
                      onChange={(e) => updateTagName(tag.color, e.target.value)}
                      placeholder="Tag Name"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {tagDefs.map((tag) => (
                  <button
                    key={tag.color}
                    onClick={() => toggleTag(tag.color)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                      currentTags.includes(tag.color)
                        ? "border-slate-500 scale-105"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: tag.color }}
                    title={tag.name}
                  >
                    {currentTags.includes(tag.color) && (
                      <svg
                        className="w-5 h-5 text-white drop-shadow-sm"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
