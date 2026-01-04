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

export const useGoogleDrive = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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
          setIsSignedIn(authInstance.isSignedIn.get());
          authInstance.isSignedIn.listen(setIsSignedIn);
          setIsInitialized(true);
        })
        .catch((e: unknown) => {
          console.error("Error initializing Google API", e);
        });
    };

    gapi.load("client:auth2", start);
  }, []);

  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  const handleSignOutClick = () => {
    gapi.auth2.getAuthInstance().signOut();
  };

  // Sync Logic
  const syncWithDrive = useCallback(async () => {
    if (!isSignedIn || !isInitialized) return;

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

        // Assuming content is base64 encoded string or raw bytes.
        // GDrive API might return JSON if not careful, but 'media' should be raw.
        // For simplicity, we might store updates as JSON or base64 blobs.
        // For real Yjs sync, we typically exchange updates.
        // Here we implement a simple "Download -> Apply -> Upload" for MVP.

        // This part needs careful implementation of Yjs binary handling.
        // Since gapi client returns body string, we might need a workaround for binary.
        // We will skip full binary sync implementation details here and use a placeholder.
        console.log("Found file, syncing...", fileContent);
        // Y.applyUpdate(doc, ...);
      } else {
        // Create file if not exists
        // ...
      }

      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Error syncing with Drive", err);
    }
  }, [isSignedIn, isInitialized, fileId]);

  return {
    isSignedIn,
    isInitialized,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    lastSyncTime,
  };
};
