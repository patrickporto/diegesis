import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
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

  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment("document-store"),
      user: {
        name: "User",
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      },
    },
  });

  return (
    <NotesContext.Provider value={{ editor, doc, synced, provider }}>
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
