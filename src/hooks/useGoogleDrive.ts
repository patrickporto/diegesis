import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

export interface GoogleUser {
  name: string;
  email: string;
  imageUrl: string;
}

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "expired"
  | "pending"
  | "unavailable";

export const useGoogleDrive = (doc: Y.Doc | undefined, fileName: string) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const pendingDocRef = useRef<Y.Doc | null>(null);
  const pendingTokenRef = useRef<string | null>(null);
  const pendingFileIdRef = useRef<string | null>(null);

  // Load token from storage on mount and validate it
  useEffect(() => {
    const storedToken = localStorage.getItem("google_access_token");
    if (storedToken) {
      setAccessToken(storedToken);
      // Validate by fetching user info
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid");
          return res.json();
        })
        .then((userInfo) => {
          setUser({
            name: userInfo.name,
            email: userInfo.email,
            imageUrl: userInfo.picture,
          });
          setIsSignedIn(true);
        })
        .catch(() => {
          // If validation fails, clear storage
          localStorage.removeItem("google_access_token");
          setAccessToken(null);
          setIsSignedIn(false);
        });
    }
  }, []);

  // This hook will throw if GoogleOAuthProvider is not present
  // We need to wrap the entire component in a try-catch at render time
  // which React doesn't support for hooks. Instead, we'll make this hook
  // only usable when GoogleOAuthProvider is present, and create a "dummy" version for offline mode.
  // Get the current origin and pathname for redirect URI
  // This ensures the redirect works on both localhost and production (GitHub Pages)
  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "";

  // No longer using useGoogleLogin for the trigger because it doesn't support
  // ux_mode: 'redirect' for implicit flow (TokenClient) in the new GSI SDK.
  // We'll use a manual redirect instead, and the existing useEffect will handle the return.

  // Handle redirect callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1)); // remove #
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
        localStorage.setItem("google_access_token", token);
        setIsSignedIn(true);
        // Clear hash to clean up URL
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );

        // Fetch user info immediately
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((userInfo) => {
            setUser({
              name: userInfo.name,
              email: userInfo.email,
              imageUrl: userInfo.picture,
            });
            console.log("User info fetched from redirect:", userInfo);
          })
          .catch((err) =>
            console.error("Failed to fetch user info after redirect:", err)
          );
      }
    }
  }, []);

  const handleAuthClick = () => {
    // Manually trigger redirect for implicit flow
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const scopes =
      "openid profile email https://www.googleapis.com/auth/drive.file";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent(scopes)}&state=main`;

    window.location.assign(authUrl);
  };

  const handleSignOutClick = () => {
    localStorage.removeItem("google_access_token");
    setIsSignedIn(false);
    setAccessToken(null);
    setUser(null);
    setFileId(null);
  };

  const saveToDrive = useCallback(
    async (
      currentAccessToken: string,
      currentFileId: string,
      currentDoc: Y.Doc
    ) => {
      console.log("Saving to Drive...");
      setSyncStatus("syncing");
      try {
        const update = Y.encodeStateAsUpdate(currentDoc);
        const blob = new Blob([update.buffer as ArrayBuffer], {
          type: "application/octet-stream",
        });

        const metadata = {
          name: fileName,
          mimeType: "application/octet-stream",
        };

        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        const response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${currentFileId}?uploadType=multipart`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${currentAccessToken}` },
            body: form,
          }
        );

        if (!response.ok) throw new Error("Failed to save to Drive");

        setLastSyncTime(new Date());
        setHasPendingChanges(false);
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch (err) {
        console.error("Error saving to Drive:", err);
        setSyncStatus("error");
      }
    },
    [fileName]
  );

  // Setup auto-save listener
  useEffect(() => {
    if (!doc || !fileId || !accessToken || !isSignedIn) return;

    const handleUpdate = () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      // Track pending changes for beforeunload
      setHasPendingChanges(true);
      setSyncStatus("pending");
      pendingDocRef.current = doc;
      pendingTokenRef.current = accessToken;
      pendingFileIdRef.current = fileId;

      // Debounce save (2 seconds for faster perceived sync)
      saveTimeoutRef.current = window.setTimeout(() => {
        saveToDrive(accessToken, fileId, doc);
      }, 2000);
    };

    doc.on("update", handleUpdate);

    return () => {
      doc.off("update", handleUpdate);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [doc, fileId, accessToken, isSignedIn, saveToDrive]);

  const syncWithDrive = useCallback(async () => {
    if (!isSignedIn || !accessToken) return;
    if (!doc) {
      console.warn("No doc available to sync");
      return;
    }

    setSyncStatus("syncing");
    try {
      // List files
      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id,name)&q=name='${fileName}' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (listResponse.status === 401) {
        throw { status: 401 };
      }

      const listData = await listResponse.json();
      const files = listData.files;

      if (files && files.length > 0) {
        const currentFileId = files[0].id;
        setFileId(currentFileId);

        // Download file content
        const fileResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${currentFileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (fileResponse.status === 401) {
          throw { status: 401 };
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
          Y.applyUpdate(doc, new Uint8Array(arrayBuffer));
          console.log("Document updated from Drive content");
        } else {
          console.log("Drive file empty, skipping applyUpdate");
        }
      } else {
        // Create file if not exists
        console.log("Creating new file on Drive...");
        const metadata = {
          name: fileName,
          mimeType: "application/octet-stream",
        };

        const update = Y.encodeStateAsUpdate(doc);
        const blob = new Blob([update.buffer as ArrayBuffer], {
          type: "application/octet-stream",
        });

        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        const createResponse = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          }
        );

        if (createResponse.ok) {
          const data = await createResponse.json();
          setFileId(data.id);
          console.log("Created file with ID:", data.id);
        } else {
          throw new Error("Failed to create file");
        }
      }

      setLastSyncTime(new Date());
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (err: unknown) {
      console.error("Error syncing with Drive", err);
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status: number }).status === 401
      ) {
        setSyncStatus("expired");
        localStorage.removeItem("google_access_token");
        setIsSignedIn(false);
        setAccessToken(null);
      } else {
        setSyncStatus("error");
      }
    }
  }, [isSignedIn, accessToken, doc, fileName]);

  // Auto-sync on sign-in
  useEffect(() => {
    if (isSignedIn && accessToken && !fileId && doc) {
      syncWithDrive();
    }
  }, [isSignedIn, accessToken, fileId, doc, syncWithDrive]);

  // Flush pending changes immediately (for beforeunload)
  const flushPendingChanges = useCallback(async () => {
    if (
      hasPendingChanges &&
      pendingDocRef.current &&
      pendingTokenRef.current &&
      pendingFileIdRef.current
    ) {
      // Cancel debounced save
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      await saveToDrive(
        pendingTokenRef.current,
        pendingFileIdRef.current,
        pendingDocRef.current
      );
    }
  }, [hasPendingChanges, saveToDrive]);

  // Prevent closing browser with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
        // Try to save immediately
        flushPendingChanges();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingChanges, flushPendingChanges]);

  const uploadFile = useCallback(
    async (
      file: File
    ): Promise<{ id: string; webViewLink: string; thumbnailLink: string }> => {
      if (!accessToken) throw new Error("Not signed in");

      const metadata = {
        name: file.name,
        mimeType: file.type,
      };

      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", file);

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      return await response.json();
    },
    [accessToken]
  );

  const getFileBlob = useCallback(
    async (fileId: string): Promise<Blob> => {
      if (!accessToken) throw new Error("Not signed in");

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch file");
      }

      return await response.blob();
    },
    [accessToken]
  );

  return {
    isSignedIn,
    isInitialized: true,
    user,
    handleAuthClick,
    handleSignOutClick,
    syncWithDrive,
    lastSyncTime,
    syncStatus,
    accessToken,
    hasPendingChanges,
    flushPendingChanges,
    uploadFile,
    getFileBlob,
  };
};
