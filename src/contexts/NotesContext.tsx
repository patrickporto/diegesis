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

import { useRealm } from "@/contexts/RealmContext";

export function NotesProvider({ children }: { children: ReactNode }) {
  const { activeRealmId } = useRealm();

  return (
    <SyncedNotesProvider key={activeRealmId} activeRealmId={activeRealmId}>
      {children}
    </SyncedNotesProvider>
  );
}

function SyncedNotesProvider({
  children,
  activeRealmId,
}: {
  children: ReactNode;
  activeRealmId: string;
}) {
  const roomName =
    activeRealmId === "default"
      ? "diegesis-notes"
      : `diegesis-realm-${activeRealmId}`;

  const { doc, provider, synced } = useYjs(roomName);
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
