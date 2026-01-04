import { useEffect, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

export const useYjs = () => {
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<IndexeddbPersistence | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const indexeddbProvider = new IndexeddbPersistence("diegesis-notes", doc);

    indexeddbProvider.on("synced", () => {
      console.log("IndexedDB content loaded");
      setSynced(true);
    });

    setProvider(indexeddbProvider);

    return () => {
      indexeddbProvider.destroy();
    };
  }, [doc]);

  return { doc, provider, synced };
};
