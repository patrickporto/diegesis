import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useFileSystem } from "@/contexts/FileSystemContext";

export function URLSync() {
  const { id } = useParams<{ id: string }>();
  const { setActiveFileId } = useFileSystem();

  // One-way sync: URL -> State
  useEffect(() => {
    setActiveFileId(id || null);
  }, [id, setActiveFileId]);

  return null;
}
