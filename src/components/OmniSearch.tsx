import { useEffect, useState } from "react";

import { useFileSystem } from "@/contexts/FileSystemContext";
import { useNotes } from "@/contexts/NotesContext";

export function OmniSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { fileTree, setActiveFileId } = useFileSystem();
  const { doc } = useNotes();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    {
      id: string;
      name: string;
      type: "folder" | "text" | string;
      matchType: "name" | "content";
      snippet?: string;
    }[]
  >([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const searchResults: typeof results = [];

    // 1. Search Metadata (Names)
    fileTree.forEach((node) => {
      if (node.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: node.id,
          name: node.name,
          type: node.type,
          matchType: "name",
        });
      }
    });

    // 2. Search Content (Basic Text Scan of Yjs Fragments)
    // Note: This is computationally expensive if done naively on the main thread for large docs.
    // For now, we iterate all files and get their fragment text.
    // Ideally we index this or do it async.
    fileTree.forEach((node) => {
      if (node.type === "text") {
        const fragment = doc.getXmlFragment(`content-${node.id}`);
        const textContent = fragment.toString(); // Gets basic text content
        if (textContent.toLowerCase().includes(lowerQuery)) {
          // Check if already added by name match
          if (!searchResults.find((r) => r.id === node.id)) {
            const index = textContent.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, index - 10);
            const end = Math.min(textContent.length, index + query.length + 20);
            const snippet = "..." + textContent.slice(start, end) + "...";

            searchResults.push({
              id: node.id,
              name: node.name,
              type: node.type,
              matchType: "content",
              snippet,
            });
          }
        }
      }
    });

    setResults(searchResults);
  }, [query, fileTree, doc, isOpen]);

  const handleSelect = (id: string, type: "folder" | "text" | string) => {
    if (type !== "folder") {
      setActiveFileId(id);
      onClose();
    } else {
      // Folder selection logic (maybe expand in tree?)
      // For now just close
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            autoFocus
            placeholder="Search files and content..."
            className="flex-1 text-lg outline-none text-slate-700 placeholder-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
            ESC
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && query ? (
            <div className="p-8 text-center text-slate-400">
              No results found
            </div>
          ) : results.length === 0 && !query ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Type to search...
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-l-4 border-transparent hover:border-sky-500 flex flex-col gap-1 transition-colors"
                  onClick={() => handleSelect(result.id, result.type)}
                >
                  <div className="flex items-center gap-2">
                    {result.type === "folder" ? (
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
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                    ) : (
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
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                    <span className="font-medium text-slate-700">
                      {result.name}
                    </span>
                    {result.matchType === "content" && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">
                        Content
                      </span>
                    )}
                  </div>
                  {result.snippet && (
                    <p className="text-xs text-slate-500 pl-6 font-mono">
                      {result.snippet}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
