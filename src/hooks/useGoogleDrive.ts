import { useGoogleLogin } from "@react-oauth/google";
import { useCallback, useEffect, useState } from "react";

export interface GoogleUser {
  name: string;
  email: string;
  imageUrl: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "expired";

export const useGoogleDrive = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [, setFileId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

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

  const syncWithDrive = useCallback(async () => {
    if (!isSignedIn || !accessToken) return;

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

        console.log("Found file, syncing...", await fileResponse.text());
        // Y.applyUpdate(doc, ...);
      } else {
        // Create file if not exists
        // ...
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
        err.status === 401
      ) {
        setSyncStatus("expired");
        localStorage.removeItem("google_access_token");
        setIsSignedIn(false);
        setAccessToken(null);
      } else {
        setSyncStatus("error");
      }
    }
  }, [isSignedIn, accessToken]);

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
