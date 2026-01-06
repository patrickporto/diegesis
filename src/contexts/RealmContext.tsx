import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { uuidv7 } from "uuidv7";

export interface Realm {
  id: string;
  name: string;
}

export interface RealmContextType {
  realms: Realm[];
  activeRealmId: string;
  createRealm: (name: string) => void;
  updateRealm: (id: string, name: string) => void;
  deleteRealm: (id: string) => void;
  switchRealm: (id: string) => void;
}

const RealmContext = createContext<RealmContextType | null>(null);

const STORAGE_KEY_REALMS = "diegesis_realms";
const STORAGE_KEY_ACTIVE_REALM = "diegesis_active_realm";

export function RealmProvider({ children }: { children: ReactNode }) {
  const [realms, setRealms] = useState<Realm[]>([]);
  const [activeRealmId, setActiveRealmId] = useState<string>("");

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

    // Migration / Initialization
    if (parsedRealms.length === 0) {
      const defaultRealm: Realm = {
        id: "default",
        name: "Default Realm",
      };
      parsedRealms = [defaultRealm];
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

  const createRealm = (name: string) => {
    const newRealm: Realm = {
      id: uuidv7(),
      name,
    };
    saveRealms([...realms, newRealm]);
    switchRealm(newRealm.id);
  };

  const updateRealm = (id: string, name: string) => {
    const newRealms = realms.map((r) => (r.id === id ? { ...r, name } : r));
    saveRealms(newRealms);
  };

  const deleteRealm = (id: string) => {
    if (realms.length <= 1) {
      console.warn("Cannot delete the last realm");
      return;
    }
    const newRealms = realms.filter((r) => r.id !== id);
    saveRealms(newRealms);

    if (activeRealmId === id) {
      switchRealm(newRealms[0].id);
    }
  };

  const switchRealm = (id: string) => {
    setActiveRealmId(id);
    localStorage.setItem(STORAGE_KEY_ACTIVE_REALM, id);
    // Force reload to clear URL and state cleanly by navigating to root
    window.location.assign("/");
  };

  if (!activeRealmId) return null; // Wait for init

  return (
    <RealmContext.Provider
      value={{
        realms,
        activeRealmId,
        createRealm,
        updateRealm,
        deleteRealm,
        switchRealm,
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
