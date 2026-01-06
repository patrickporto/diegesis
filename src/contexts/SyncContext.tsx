import { createContext, ReactNode, useContext } from "react";

import { useNotes } from "@/contexts/NotesContext";
import { GoogleUser, SyncStatus, useGoogleDrive } from "@/hooks/useGoogleDrive";

export interface SyncContextType {
  isSignedIn: boolean;
  isInitialized: boolean;
  user: GoogleUser | null;
  handleAuthClick: () => void;
  handleSignOutClick: () => void;
  syncWithDrive: () => Promise<void>;
  lastSyncTime: Date | null;
  syncStatus: SyncStatus;
  accessToken: string | null;
  hasPendingChanges: boolean;
  flushPendingChanges: () => Promise<void>;
  uploadFile: (
    file: File
  ) => Promise<{ id: string; webViewLink: string; thumbnailLink: string }>;
  getFileBlob: (fileId: string) => Promise<Blob>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};

export const OfflineSyncProvider = ({ children }: { children: ReactNode }) => {
  const value: SyncContextType = {
    isSignedIn: false,
    isInitialized: true,
    user: null,
    handleAuthClick: () => console.warn("Auth not available in offline mode"),
    handleSignOutClick: () => {
      console.warn("Sign out not applicable in offline mode");
    },
    syncWithDrive: async () => {
      console.warn("Sync with Drive not available in offline mode");
    },
    lastSyncTime: null,
    syncStatus: "unavailable",
    accessToken: null,
    hasPendingChanges: false,
    flushPendingChanges: async () => {
      // Nothing to flush in offline mode
    },
    uploadFile: async () => {
      throw new Error("Upload not available in offline mode");
    },
    getFileBlob: async () => {
      throw new Error("File fetch not available in offline mode");
    },
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

import { useRealm } from "@/contexts/RealmContext";

export const GoogleSyncProvider = ({ children }: { children: ReactNode }) => {
  const { doc } = useNotes();
  const { activeRealmId } = useRealm();
  const fileName =
    activeRealmId === "default"
      ? "diegesis-notes.yjs"
      : `diegesis-realm-${activeRealmId}.yjs`;

  // Safe to call useGoogleDrive here because this provider will only be rendered
  // inside GoogleOAuthProvider
  const drive = useGoogleDrive(doc, fileName);

  return <SyncContext.Provider value={drive}>{children}</SyncContext.Provider>;
};
