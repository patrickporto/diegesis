import { BlockNoteEditor } from "@blocknote/core";
import { createContext, ReactNode, useContext } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { useYjs } from "@/hooks/useYjs";

interface NotesContextType {
  editor: BlockNoteEditor | null;
  doc: Y.Doc;
  synced: boolean;
  provider: IndexeddbPersistence | null;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const { doc, provider, synced } = useYjs();
  // We need to access FileSystemContext to know which file is active
  // But circular dependency might be an issue if we nest them wrong.
  // Ideally NotesProvider is INSIDE FileSystemProvider.

  // We'll read the ID from a prop or we refactor this context to generic EditorContext
  // For now, let's assume we pass activeId as a prop or context is composed.
  // Actually, let's make NotesProvider consume FileSystemContext if possible,
  // OR just expose a way to get an editor for a specific fragment.

  // Refactor: We will use a separate component "ActiveEditor" that calls useCreateBlockNote
  // So NotesContext might become just a data provider for Yjs doc.
  // But for minimal breakage, let's keep it but make it flexible.

  // TEMPORARY: This context now just provides the doc/provider.
  // The Editor component will be responsible for initializing the BlockNote instance
  // based on the specific file it is rendering.

  // However, useNotes is used widely. Let's make it throw or return null if no file is active?
  // No, let's keep it providing the *root* doc stuff, but maybe `editor` is null if no file selected.

  return (
    <NotesContext.Provider value={{ editor: null, doc, synced, provider }}>
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
