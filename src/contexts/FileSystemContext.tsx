import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { useNotes } from "@/contexts/NotesContext";
import { generateUniqueSlug } from "@/utils/slug";

export interface FileNode {
  id: string;
  name: string;
  slug: string;
  type: "folder" | "text" | "table" | "battlemap" | string;
  parentId: string | null;
  index: number;
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
  createTable: (name: string, parentId?: string | null) => string;
  createBattlemap: (name: string, parentId?: string | null) => string;
  deleteItem: (id: string) => void;
  renameItem: (id: string, newName: string) => void;
  moveItem: (id: string, newParentId: string | null) => void;
  reorderItem: (id: string, afterId: string | null) => void;
  setFileTags: (id: string, tags: string[]) => void;
  updateTagName: (color: string, newName: string) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  getFileBySlug: (slug: string) => FileNode | undefined;
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
      const nodesToMigrate: FileNode[] = [];

      fileMap.forEach((node) => {
        let needsLocalMigration = false;
        const migratedNode = { ...node };

        // Migration: Add slug
        if (!migratedNode.slug) {
          migratedNode.slug = generateUniqueSlug(migratedNode.name);
          needsLocalMigration = true;
        }

        // Migration: type "file" -> "text"
        if (migratedNode.type === "file") {
          migratedNode.type = "text";
          needsLocalMigration = true;
        }

        // Migration: Add index if missing
        if (migratedNode.index === undefined) {
          migratedNode.index = nodes.length; // Temporary index
          needsLocalMigration = true;
        }

        if (needsLocalMigration) {
          nodes.push(migratedNode);
          nodesToMigrate.push(migratedNode);
        } else {
          nodes.push(node);
        }
      });

      // Apply migrations if any
      if (nodesToMigrate.length > 0) {
        doc.transact(() => {
          nodesToMigrate.forEach((node) => {
            fileMap.set(node.id, node);
          });
        });
      }

      // Sort by parent then by index
      nodes.sort((a, b) => {
        if (a.parentId === b.parentId) {
          // Both in same folder, sort by index
          return (a.index ?? 0) - (b.index ?? 0);
        }
        // Different parents, sorting doesn't matter much here as we rebuild tree in UI
        // but let's keep it stable
        return (a.parentId || "").localeCompare(b.parentId || "");
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
    // Only trigger if synced AND the map is truly empty.
    const WELCOME_NOTE_CREATED_KEY = "diegesis_welcome_note_created";
    const hasAlreadyCreatedWelcome =
      localStorage.getItem(WELCOME_NOTE_CREATED_KEY) === "true";

    if (synced && fileMap.size === 0 && !hasAlreadyCreatedWelcome) {
      // Create a Welcome file if the system is empty for the first time.
      const welcomeId = uuidv7();
      const welcomeNode: FileNode = {
        id: welcomeId,
        name: "Welcome / Migrated Note",
        slug: "welcome",
        type: "text",
        parentId: null,
        index: 0,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      doc.transact(() => {
        fileMap.set(welcomeId, welcomeNode);
        localStorage.setItem(WELCOME_NOTE_CREATED_KEY, "true");
      });

      setActiveFileId(welcomeId);
    }

    return () => {
      fileMap.unobserve(observer);
      tagDefsMap.unobserve(tagObserver);
    };
  }, [fileMap, tagDefsMap, synced, doc]);

  const getNextIndex = (parentId: string | null) => {
    const siblings = Array.from(fileMap.values()).filter(
      (n) => n.parentId === parentId
    );
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map((s) => s.index ?? 0)) + 1;
  };

  const createFile = (name: string, parentId: string | null = null) => {
    const id = uuidv7();
    const newNode: FileNode = {
      id,
      name,
      slug: generateUniqueSlug(name),
      type: "text",
      parentId,
      index: getNextIndex(parentId),
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fileMap.set(id, newNode);
    return id;
  };

  const createTable = (name: string, parentId: string | null = null) => {
    const id = uuidv7();
    const newNode: FileNode = {
      id,
      name,
      slug: generateUniqueSlug(name),
      type: "table",
      parentId,
      index: getNextIndex(parentId),
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
      slug: generateUniqueSlug(name),
      type: "folder",
      parentId,
      index: getNextIndex(parentId),
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fileMap.set(id, newNode);
    return id;
  };

  const createBattlemap = (name: string, parentId: string | null = null) => {
    const id = uuidv7();
    const newNode: FileNode = {
      id,
      name,
      slug: generateUniqueSlug(name),
      type: "battlemap",
      parentId,
      index: getNextIndex(parentId),
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
      if (node.parentId === newParentId) return; // Already there

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
        index: getNextIndex(newParentId),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const reorderItem = (id: string, afterId: string | null) => {
    const node = fileMap.get(id);
    if (!node) return;

    // Use siblings for reordering
    const siblings = Array.from(fileMap.values())
      .filter((n) => n.parentId === node.parentId && n.id !== id)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    let newIndex: number;
    if (afterId === null) {
      newIndex = siblings.length > 0 ? (siblings[0].index ?? 0) - 1 : 0;
    } else {
      const afterNode = fileMap.get(afterId);
      if (!afterNode) return;

      const afterIdxInSiblings = siblings.findIndex((s) => s.id === afterId);

      if (afterIdxInSiblings === siblings.length - 1) {
        newIndex = (afterNode.index ?? 0) + 1;
      } else {
        newIndex =
          ((afterNode.index ?? 0) +
            (siblings[afterIdxInSiblings + 1].index ?? 0)) /
          2;
      }
    }

    fileMap.set(id, {
      ...node,
      index: newIndex,
      updatedAt: new Date().toISOString(),
    });
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

  const getFileBySlug = useCallback(
    (slug: string): FileNode | undefined => {
      return Array.from(fileMap.values()).find((node) => node.slug === slug);
    },
    [fileMap]
  );

  return (
    <FileSystemContext.Provider
      value={{
        fileMap,
        createFile,
        createFolder,
        createTable,
        createBattlemap,
        deleteItem,
        renameItem,
        moveItem,
        reorderItem,
        setFileTags,
        updateTagName,
        fileTree,
        tagDefs,
        activeFileId,
        setActiveFileId,
        getFileBySlug,
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
