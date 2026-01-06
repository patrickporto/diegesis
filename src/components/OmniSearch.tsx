import MiniSearch from "minisearch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";
import * as Y from "yjs";

import { useFileSystem } from "@/contexts/FileSystemContext";
import { useNotes } from "@/contexts/NotesContext";

import { CellValue } from "./TableEditor/types";

interface SearchResult {
  id: string;
  name: string;
  score: number;
  matchType: "name" | "content";
  snippet?: string;
  type?: string;
}

export function OmniSearch({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { fileTree } = useFileSystem();
  const navigate = useNavigate();
  const { doc } = useNotes();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // MiniSearch setup
  const miniSearch = useMemo(() => {
    return new MiniSearch({
      fields: ["name", "content"], // fields to index for full-text search
      storeFields: ["name", "type", "content"], // fields to return with search results
      searchOptions: {
        boost: { name: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }, []);

  // Sync MiniSearch with fileTree and doc
  useEffect(() => {
    const stripTags = (xml: string) => {
      return xml
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const documents = fileTree
      .filter((node) => node.type === "text" || node.type === "table")
      .map((node) => {
        let content = "";
        if (node.type === "text") {
          const fragment = doc.getXmlFragment(`content-${node.id}`);
          content = stripTags(fragment.toString());
        } else if (node.type === "table") {
          const rowsArray = doc.getArray(`rows-${node.id}`);
          content = rowsArray
            .toArray()
            .map((row) => {
              // Yjs Map toJSON problem
              const rowMap = row as Y.Map<CellValue>;
              const data =
                typeof rowMap.toJSON === "function"
                  ? (rowMap.toJSON() as Record<string, CellValue>)
                  : (row as Record<string, CellValue>);
              return Object.entries(data)
                .filter(([key, v]) => key !== "id" && v != null)
                .map(([, v]) => v)
                .join(" ");
            })
            .join(" ");
        }

        return {
          id: node.id,
          name: node.name,
          type: node.type,
          content,
        };
      });

    miniSearch.removeAll();
    miniSearch.addAll(documents);
  }, [miniSearch, fileTree, doc]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    // Focus input when opened
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchResults = miniSearch.search(query).map((result) => {
      // Find where the match occurred for matchType
      const matchType: "name" | "content" =
        Object.prototype.hasOwnProperty.call(result.match, "name")
          ? "name"
          : "content";

      // Simple snippet generation
      let snippet = "";
      if (result.content) {
        const content = result.content as string;
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        if (index !== -1) {
          const start = Math.max(0, index - 30);
          const end = Math.min(content.length, index + query.length + 50);
          snippet =
            (start > 0 ? "..." : "") +
            content.slice(start, end) +
            (end < content.length ? "..." : "");
        } else {
          snippet = content.slice(0, 80) + (content.length > 80 ? "..." : "");
        }
      }

      return {
        id: result.id,
        name: result.name,
        score: result.score,
        type: result.type,
        matchType,
        snippet,
      };
    });

    setResults(searchResults as SearchResult[]);
    setSelectedIndex(0);
  }, [query, miniSearch]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = resultRefs.current.get(selectedIndex);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/doc/${id}`);
      onClose();
    },
    [navigate, onClose]
  );

  // Keyboard navigation handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex].id);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  // Global hotkey for Escape
  useHotkeys(
    "escape",
    () => {
      if (isOpen) onClose();
    },
    { enabled: isOpen, enableOnFormTags: true },
    [isOpen, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
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
            ref={inputRef}
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
              {results.map((result, index) => (
                <button
                  key={result.id}
                  ref={(el) => {
                    if (el) resultRefs.current.set(index, el);
                  }}
                  className={`w-full text-left px-4 py-3 border-l-4 flex flex-col gap-1 transition-colors ${
                    index === selectedIndex
                      ? "bg-sky-50 border-sky-500"
                      : "border-transparent hover:bg-slate-50 hover:border-sky-500"
                  }`}
                  onClick={() => handleSelect(result.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center gap-2">
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
                        d={
                          result.type === "table"
                            ? "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            : result.type === "battlemap"
                            ? "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                            : "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        }
                      />
                    </svg>
                    <span className="font-medium text-slate-700">
                      {result.name}
                    </span>
                    {result.matchType === "content" && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">
                        Content
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-400">
                      {result.score.toFixed(1)}
                    </span>
                  </div>
                  {result.snippet && (
                    <p className="text-xs text-slate-500 pl-6 font-sans truncate">
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
          <span className="flex gap-2">
            <kbd className="bg-slate-200 px-1.5 rounded">↑</kbd>
            <kbd className="bg-slate-200 px-1.5 rounded">↓</kbd>
            <span>to navigate</span>
            <kbd className="bg-slate-200 px-1.5 rounded">↵</kbd>
            <span>to select</span>
          </span>
        </div>
      </div>
    </div>
  );
}
