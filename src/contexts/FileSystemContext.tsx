import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useNotes } from "@/contexts/NotesContext";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  tags: string[]; // hex codes
  createdAt: string;
  updatedAt: string;
}

export interface TagDefinition {
  color: string;
  name: string;
}

// Default tags constant moved to context for initialization
export const DEFAULT_TAGS: TagDefinition[] = [
  { color: "#ef4444", name: "Red" },
  { color: "#f97316", name: "Orange" },
  { color: "#eab308", name: "Yellow" },
  { color: "#22c55e", name: "Green" },
  { color: "#06b6d4", name: "Cyan" },
  { color: "#3b82f6", name: "Blue" },
  { color: "#8b5cf6", name: "Purple" },
  { color: "#ec4899", name: "Pink" },
  { color: "#64748b", name: "Gray" },
];

export interface FileSystemContextType {
  fileMap: Y.Map<FileNode>;
  fileTree: FileNode[];
  tagDefs: TagDefinition[];
  createFile: (name: string, parentId?: string | null) => string;
  createFolder: (name: string, parentId?: string | null) => string;
  deleteItem: (id: string) => void;
  renameItem: (id: string, newName: string) => void;
  moveItem: (id: string, newParentId: string | null) => void;
  setFileTags: (id: string, tags: string[]) => void;
  updateTagName: (color: string, newName: string) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  doc: Y.Doc;
}

const FileSystemContext = createContext<FileSystemContextType | null>(null);

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const { doc, synced } = useNotes();
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [tagDefs, setTagDefs] = useState<TagDefinition[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // The main map storing all file metadata
  const fileMap = doc.getMap<FileNode>("file_system");
  // Map for storing tag names: color -> name
  const tagDefsMap = doc.getMap<string>("tag_definitions");

  useEffect(() => {
    if (!synced) return;

    // Observer to update local state when Yjs map changes
    const observer = () => {
      const nodes: FileNode[] = [];
      fileMap.forEach((node) => {
        nodes.push(node);
      });
      // Sort by type (folder first) then name
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
      });
      setFileTree(nodes);
    };

    fileMap.observe(observer);

    // Observer for tags
    const tagObserver = () => {
      // If empty, we might want to ensure defaults exist.
      // But we can just read what's there.
      // If completely empty, we initialize.
      if (tagDefsMap.size === 0) {
        // Initialize defaults
        DEFAULT_TAGS.forEach((t) => tagDefsMap.set(t.color, t.name));
      }

      // We explicitly order them by our DEFAULT_TAGS order if possible, or just by color?
      // Let's use the DEFAULT_TAGS order for consistent UI, but check if they exist in map.
      // Any new custom colors (if we add that feature) would go at the end.

      const mapEntries = new Map<string, string>();
      tagDefsMap.forEach((name, color) => {
        mapEntries.set(color, name);
      });

      const orderedTags: TagDefinition[] = [];
      // First, add known defaults in order
      DEFAULT_TAGS.forEach((def) => {
        if (mapEntries.has(def.color)) {
          orderedTags.push({
            color: def.color,
            name: mapEntries.get(def.color) ?? "",
          });
          mapEntries.delete(def.color);
        }
      });
      // Then add any others (future proofing)
      mapEntries.forEach((name, color) => {
        orderedTags.push({ color, name });
      });

      setTagDefs(orderedTags);
    };

    tagDefsMap.observe(tagObserver);

    observer(); // Initial load files
    tagObserver(); // Initial load tags

    // Migration Logic: If empty but old content exists
    if (fileMap.size === 0) {
      // We can check if "document-store" fragment has content, but for simplicity
      // let's just create a Welcome file if the system is empty.
      // In a real migration we would move the content.
      const welcomeId = uuidv7();
      const welcomeNode: FileNode = {
        id: welcomeId,
        name: "Welcome / Migrated Note",
        type: "file",
        parentId: null,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fileMap.set(welcomeId, welcomeNode);

      // "Migrate" content by aliasing or just initing as active.
      // Note: The actual content migration (moving XML fragments) is complex in Yjs
      // without low-level updates. For now, we point the new welcome file
      // to use the "document-store" if we wanted, but our logic uses "content-${id}".
      // So the old content is technically "orphaned" unless we manually copy it.
      // Strategy: We will treat "document-store" as a legacy fragment and user starts fresh
      // OR we just use the new system.
      setActiveFileId(welcomeId);
    }

    return () => {
      fileMap.unobserve(observer);
      tagDefsMap.unobserve(tagObserver);
    };
  }, [fileMap, tagDefsMap, synced]);

  const createFile = (name: string, parentId: string | null = null) => {
    const id = uuidv7();
    const newNode: FileNode = {
      id,
      name,
      type: "file",
      parentId,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fileMap.set(id, newNode);
    return id;
  };

  const createFolder = (name: string, parentId: string | null = null) => {
    const id = uuidv7();
    const newNode: FileNode = {
      id,
      name,
      type: "folder",
      parentId,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fileMap.set(id, newNode);
    return id;
  };

  const deleteItem = (id: string) => {
    // Recursive delete for folders would go here
    // For now simple delete (if folder has children they become orphaned in UI or we filter them)
    // Better: Helper to find children
    const children = Array.from(fileMap.values()).filter(
      (n) => n.parentId === id
    );
    children.forEach((child) => deleteItem(child.id));

    fileMap.delete(id);
    if (activeFileId === id) setActiveFileId(null);
  };

  const renameItem = (id: string, newName: string) => {
    const node = fileMap.get(id);
    if (node) {
      fileMap.set(id, {
        ...node,
        name: newName,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const moveItem = (id: string, newParentId: string | null) => {
    const node = fileMap.get(id);
    if (node) {
      if (id === newParentId) return; // Can't move into self

      // Circular check: traverse up from newParentId
      let currentId = newParentId;
      while (currentId) {
        if (currentId === id) return; // Target is descendant of source
        const parent = fileMap.get(currentId);
        currentId = parent?.parentId || null;
      }

      fileMap.set(id, {
        ...node,
        parentId: newParentId,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const setFileTags = (id: string, tags: string[]) => {
    const node = fileMap.get(id);
    if (node) {
      fileMap.set(id, { ...node, tags, updatedAt: new Date().toISOString() });
    }
  };

  const updateTagName = (color: string, newName: string) => {
    tagDefsMap.set(color, newName);
  };

  return (
    <FileSystemContext.Provider
      value={{
        fileMap,
        createFile,
        createFolder,
        deleteItem,
        renameItem,
        moveItem,
        setFileTags,
        updateTagName,
        fileTree,
        tagDefs,
        activeFileId,
        setActiveFileId,
        doc,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error("useFileSystem must be used within a FileSystemProvider");
  }
  return context;
}
