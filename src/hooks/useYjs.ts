import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export const useYjs = (roomName: string) => {
  const [doc, setDoc] = useState<Y.Doc>(() => new Y.Doc());
  const [provider, setProvider] = useState<IndexeddbPersistence | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // Clean up old doc/provider if they exist
    // Actually, we're creating a new one on every roomName change,
    // so we need to dispose the previous one.
    // NOTE: React strict mode might cause double init, so we need careful cleanup.

    const newDoc = new Y.Doc();
    const newProvider = new IndexeddbPersistence(roomName, newDoc);

    setSynced(false);
    newProvider.on("synced", () => {
      setSynced(true);
    });

    setDoc(newDoc);
    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      newDoc.destroy();
    };
  }, [roomName]);

  return { doc, provider, synced };
};
