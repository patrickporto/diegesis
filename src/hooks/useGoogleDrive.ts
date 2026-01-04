import { gapi } from "gapi-script";
import { useCallback, useEffect, useState } from "react";

// Client ID and API Key from the Developer Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Array of API discovery doc URLs for APIs
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export interface GoogleUser {
  name: string;
  email: string;
  imageUrl: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "expired";

export const useGoogleDrive = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

  const updateUserInfo = useCallback(() => {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance?.isSignedIn.get()) {
      const currentUser = authInstance.currentUser.get();
      const profile = currentUser.getBasicProfile();
      const authResponse = currentUser.getAuthResponse(true);

      setUser({
        name: profile.getName(),
        email: profile.getEmail(),
        imageUrl: profile.getImageUrl(),
      });
      setTokenExpiresAt(authResponse.expires_at);
      setIsSignedIn(true);
    } else {
      setUser(null);
      setTokenExpiresAt(null);
      setIsSignedIn(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const authInstance = gapi.auth2.getAuthInstance();
      const currentUser = authInstance.currentUser.get();
      await currentUser.reloadAuthResponse();
      updateUserInfo();
      return true;
    } catch (error) {
      console.error("Failed to refresh token", error);
      setSyncStatus("expired");
      return false;
    }
  }, [updateUserInfo]);

  const checkTokenValidity = useCallback(async () => {
    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance?.isSignedIn.get()) return false;

    const currentUser = authInstance.currentUser.get();
    const authResponse = currentUser.getAuthResponse(true);
    const expiresAt = authResponse.expires_at;

    // Refresh if less than 5 minutes remains
    const buffer = 5 * 60 * 1000;
    if (Date.now() + buffer > expiresAt) {
      console.log("Token expiring soon, refreshing...");
      return await refreshToken();
    }
    return true;
  }, [refreshToken]);

  useEffect(() => {
    const start = () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        })
        .then(() => {
          const authInstance = gapi.auth2.getAuthInstance();

          updateUserInfo();
          authInstance.isSignedIn.listen(updateUserInfo);

          setIsInitialized(true);
        })
        .catch((e: unknown) => {
          console.error("Error initializing Google API", e);
        });
    };

    gapi.load("client:auth2", start);
  }, [updateUserInfo]);

  // Periodic check for token expiration
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(() => {
      checkTokenValidity();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isSignedIn, checkTokenValidity]);

  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn({
      prompt: "select_account",
      ux_mode: "popup",
    });
  };

  const handleSignOutClick = () => {
    gapi.auth2.getAuthInstance().signOut();
  };

  // Sync Logic
  const syncWithDrive = useCallback(async () => {
    if (!isSignedIn || !isInitialized) return;

    const isValid = await checkTokenValidity();
    if (!isValid) {
      setSyncStatus("expired");
      return;
    }

    setSyncStatus("syncing");
    try {
      // 1. Check if file exists
      const response = await gapi.client.drive.files.list({
        pageSize: 1,
        fields: "nextPageToken, files(id, name)",
        q: "name = 'diegesis-notes.yjs' and trashed = false",
      });

      const files = response.result.files;
      let currentFileId = fileId;

      if (files && files.length > 0) {
        currentFileId = files[0].id;
        setFileId(currentFileId);

        // 2. Download content and apply
        const fileContent = await gapi.client.drive.files.get({
          fileId: currentFileId,
          alt: "media",
        });

        console.log("Found file, syncing...", fileContent);
        // Y.applyUpdate(doc, ...);
      } else {
        // Create file if not exists
        // ...
      }

      setLastSyncTime(new Date());
      setSyncStatus("synced");
      // Reset to idle after 3 seconds
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err: unknown) {
      console.error("Error syncing with Drive", err);
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        err.status === 401
      ) {
        setSyncStatus("expired");
      } else {
        setSyncStatus("error");
      }
    }
  }, [isSignedIn, isInitialized, fileId, checkTokenValidity]);

  return {
    isSignedIn,
    isInitialized,
    user,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    lastSyncTime,
    syncStatus,
    tokenExpiresAt,
  };
};
