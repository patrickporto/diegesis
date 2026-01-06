import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useFileSystem } from "@/contexts/FileSystemContext";
import { useRealm } from "@/contexts/RealmContext";

export function URLSync() {
  const { realmSlug, documentSlug } = useParams<{
    realmSlug?: string;
    documentSlug?: string;
  }>();
  const navigate = useNavigate();

  const { getRealmBySlug, activeRealm, setActiveRealmId, realms } = useRealm();
  const { getFileBySlug, setActiveFileId, fileTree } = useFileSystem();

  // Track if we're currently processing a navigation to avoid loops
  const isNavigating = useRef(false);

  // Sync URL -> State
  useEffect(() => {
    // Prevent re-entry during navigation
    if (isNavigating.current) return;

    // If no realm slug in URL, redirect to active realm
    if (!realmSlug) {
      if (activeRealm) {
        isNavigating.current = true;
        navigate(`/${activeRealm.slug}`, { replace: true });
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }
      return;
    }

    // Resolve realm slug to ID
    const realm = getRealmBySlug(realmSlug);
    if (!realm) {
      // Invalid realm slug - redirect to first realm
      if (realms.length > 0) {
        isNavigating.current = true;
        navigate(`/${realms[0].slug}`, { replace: true });
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }
      return;
    }

    // Set active realm if different (but don't redirect!)
    if (realm.id !== activeRealm?.id) {
      setActiveRealmId(realm.id);
      localStorage.setItem("diegesis_active_realm", realm.id);
      // Don't return here - continue to handle document
    }

    // Handle document slug
    if (documentSlug) {
      const file = getFileBySlug(documentSlug);
      if (file) {
        setActiveFileId(file.id);
      } else {
        // Invalid document slug - redirect to realm root
        isNavigating.current = true;
        navigate(`/${realmSlug}`, { replace: true });
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }
    } else {
      // No document in URL - select first file if available
      const firstFile = fileTree.find((f) => f.type !== "folder");
      if (firstFile) {
        isNavigating.current = true;
        navigate(`/${realmSlug}/${firstFile.slug}`, { replace: true });
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      } else {
        setActiveFileId(null);
      }
    }
  }, [
    realmSlug,
    documentSlug,
    getRealmBySlug,
    getFileBySlug,
    setActiveFileId,
    setActiveRealmId,
    realms,
    fileTree,
    navigate,
    activeRealm,
  ]);

  return null;
}
