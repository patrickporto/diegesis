import { BlockNoteEditor } from "@blocknote/core";
import { createContext, ReactNode, useContext, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import { useYjs } from "@/hooks/useYjs";

interface NotesContextType {
  editor: BlockNoteEditor | null;
  setEditor: (editor: BlockNoteEditor | null) => void;
  doc: Y.Doc;
  synced: boolean;
  provider: IndexeddbPersistence | null;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const { doc, provider, synced } = useYjs();
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);

  return (
    <NotesContext.Provider value={{ editor, setEditor, doc, synced, provider }}>
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
