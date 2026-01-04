import { useGoogleLogin } from "@react-oauth/google";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

export interface GoogleUser {
  name: string;
  email: string;
  imageUrl: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "expired";

export const useGoogleDrive = (doc?: Y.Doc) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const saveTimeoutRef = useRef<number | null>(null);

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

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Login success, token received:", tokenResponse);
      const token = tokenResponse.access_token;
      setAccessToken(token);
      localStorage.setItem("google_access_token", token);
      setIsSignedIn(true);

      // Fetch user info
      try {
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userInfo = await userInfoResponse.json();
        console.log("User info fetched:", userInfo);
        setUser({
          name: userInfo.name,
          email: userInfo.email,
          imageUrl: userInfo.picture,
        });
      } catch (error) {
        console.error("Failed to fetch user info:", error);
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      setSyncStatus("error");
    },
    onNonOAuthError: (error) => {
      console.error("Non-OAuth error:", error);
    },
    scope: "openid profile email https://www.googleapis.com/auth/drive.file",
  });

  const handleAuthClick = () => {
    login();
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
        const blob = new Blob([update], { type: "application/octet-stream" });

        const metadata = {
          name: "diegesis-notes.yjs",
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
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 3000);
      } catch (err) {
        console.error("Error saving to Drive:", err);
        setSyncStatus("error");
      }
    },
    []
  );

  // Setup auto-save listener
  useEffect(() => {
    if (!doc || !fileId || !accessToken || !isSignedIn) return;

    const handleUpdate = () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      setSyncStatus("idle"); // or 'dirty' if we had that state
      // Debounce save (e.g., 5 seconds)
      saveTimeoutRef.current = window.setTimeout(() => {
        saveToDrive(accessToken, fileId, doc);
      }, 5000);
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
        "https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id,name)&q=name='diegesis-notes.yjs' and trashed=false",
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
          name: "diegesis-notes.yjs",
          mimeType: "application/octet-stream",
        };

        // Initial state
        const update = Y.encodeStateAsUpdate(doc);
        const blob = new Blob([update], { type: "application/octet-stream" });

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
  }, [isSignedIn, accessToken, doc]);

  // Auto-sync on sign-in
  useEffect(() => {
    if (isSignedIn && accessToken && !fileId && doc) {
      syncWithDrive();
    }
  }, [isSignedIn, accessToken, fileId, doc, syncWithDrive]);

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
  };
};
