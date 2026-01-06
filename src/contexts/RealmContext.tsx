import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { uuidv7 } from "uuidv7";

import { generateUniqueSlug } from "@/utils/slug";

export interface Realm {
  id: string;
  name: string;
  slug: string;
}

export interface RealmContextType {
  realms: Realm[];
  activeRealmId: string;
  activeRealm: Realm | undefined;
  createRealm: (name: string) => void;
  updateRealm: (id: string, name: string) => void;
  deleteRealm: (id: string) => void;
  switchRealm: (id: string) => void;
  getRealmBySlug: (slug: string) => Realm | undefined;
  setActiveRealmId: (id: string) => void;
}

const RealmContext = createContext<RealmContextType | null>(null);

const STORAGE_KEY_REALMS = "diegesis_realms";
const STORAGE_KEY_ACTIVE_REALM = "diegesis_active_realm";

export function RealmProvider({ children }: { children: ReactNode }) {
  const [realms, setRealms] = useState<Realm[]>([]);
  const [activeRealmId, setActiveRealmId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Load from local storage
    const storedRealms = localStorage.getItem(STORAGE_KEY_REALMS);
    const storedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_REALM);

    let parsedRealms: Realm[] = [];
    if (storedRealms) {
      try {
        parsedRealms = JSON.parse(storedRealms);
      } catch (e) {
        console.error("Failed to parse realms", e);
      }
    }

    // Migration: Add slug to existing realms that don't have one
    let needsMigration = false;
    parsedRealms = parsedRealms.map((realm) => {
      if (!realm.slug) {
        needsMigration = true;
        return {
          ...realm,
          slug: generateUniqueSlug(realm.name),
        };
      }
      return realm;
    });

    // Initialization: Create default realm if none exist
    if (parsedRealms.length === 0) {
      const defaultRealm: Realm = {
        id: "default",
        name: "Default Realm",
        slug: "default",
      };
      parsedRealms = [defaultRealm];
      needsMigration = true;
    }

    if (needsMigration) {
      localStorage.setItem(STORAGE_KEY_REALMS, JSON.stringify(parsedRealms));
    }

    setRealms(parsedRealms);

    // Set active realm
    if (storedActiveId && parsedRealms.find((r) => r.id === storedActiveId)) {
      setActiveRealmId(storedActiveId);
    } else {
      setActiveRealmId(parsedRealms[0].id);
      localStorage.setItem(STORAGE_KEY_ACTIVE_REALM, parsedRealms[0].id);
    }
  }, []);

  const saveRealms = (newRealms: Realm[]) => {
    setRealms(newRealms);
    localStorage.setItem(STORAGE_KEY_REALMS, JSON.stringify(newRealms));
  };

  const createRealm = useCallback(
    (name: string) => {
      const newRealm: Realm = {
        id: uuidv7(),
        name,
        slug: generateUniqueSlug(name),
      };
      const newRealms = [...realms, newRealm];
      saveRealms(newRealms);

      // Switch to new realm
      setActiveRealmId(newRealm.id);
      localStorage.setItem(STORAGE_KEY_ACTIVE_REALM, newRealm.id);
      navigate(`/${newRealm.slug}`);
    },
    [realms, navigate]
  );

  const updateRealm = useCallback(
    (id: string, name: string) => {
      // PROTCTION: Cannot rename default realm
      if (id === "default") {
        console.warn("Cannot rename the default realm");
        return;
      }

      const newSlug = generateUniqueSlug(name);
      const newRealms = realms.map((r) =>
        r.id === id ? { ...r, name, slug: newSlug } : r
      );
      saveRealms(newRealms);

      // If renaming active realm, update URL
      if (activeRealmId === id) {
        navigate(`/${newSlug}`, { replace: true });
      }
    },
    [realms, activeRealmId, navigate]
  );

  const deleteRealm = useCallback(
    (id: string) => {
      // PROTECTION: Cannot delete default realm
      if (id === "default") {
        console.warn("Cannot delete the default realm");
        return;
      }

      if (realms.length <= 1) {
        console.warn("Cannot delete the last realm");
        return;
      }
      const newRealms = realms.filter((r) => r.id !== id);
      saveRealms(newRealms);

      if (activeRealmId === id) {
        const newActiveRealm = newRealms[0];
        setActiveRealmId(newActiveRealm.id);
        localStorage.setItem(STORAGE_KEY_ACTIVE_REALM, newActiveRealm.id);
        navigate(`/${newActiveRealm.slug}`);
      }
    },
    [realms, activeRealmId, navigate]
  );

  const switchRealm = useCallback(
    (id: string) => {
      const realm = realms.find((r) => r.id === id);
      if (!realm) return;

      setActiveRealmId(id);
      localStorage.setItem(STORAGE_KEY_ACTIVE_REALM, id);
      navigate(`/${realm.slug}`);
    },
    [realms, navigate]
  );

  const getRealmBySlug = useCallback(
    (slug: string) => {
      return realms.find((r) => r.slug === slug);
    },
    [realms]
  );

  const activeRealm = realms.find((r) => r.id === activeRealmId);

  if (!activeRealmId) return null; // Wait for init

  return (
    <RealmContext.Provider
      value={{
        realms,
        activeRealmId,
        activeRealm,
        createRealm,
        updateRealm,
        deleteRealm,
        switchRealm,
        getRealmBySlug,
        setActiveRealmId,
      }}
    >
      {children}
    </RealmContext.Provider>
  );
}

export function useRealm() {
  const context = useContext(RealmContext);
  if (!context) {
    throw new Error("useRealm must be used within a RealmProvider");
  }
  return context;
}
