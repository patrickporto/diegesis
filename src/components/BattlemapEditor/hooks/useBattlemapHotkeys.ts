import { useEffect } from "react";

import { useBattlemapStore } from "../../../stores/useBattlemapStore";

interface UseBattlemapHotkeysProps {
  setShowHelp?: (show: boolean) => void;
}

export function useBattlemapHotkeys({
  setShowHelp,
}: UseBattlemapHotkeysProps = {}) {
  const {
    activeTool,
    setActiveTool,
    fogMode,
    setFogMode,
    enableTemporaryPan,
    disableTemporaryPan,
  } = useBattlemapStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Tool shortcuts (no modifiers)
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select");
            e.preventDefault();
            break;
          case "h":
            setActiveTool("pan");
            e.preventDefault();
            break;
          case "d":
            setActiveTool("draw");
            e.preventDefault();
            break;
          case "f":
            setActiveTool("fog");
            e.preventDefault();
            break;
          case "w":
            setActiveTool("wall");
            e.preventDefault();
            break;
          case "t":
            setActiveTool("token");
            e.preventDefault();
            break;
          case "r":
            if (activeTool === "fog") {
              setFogMode(fogMode === "hide" ? "reveal" : "hide");
              e.preventDefault();
            }
            break;
          case "?":
            if (setShowHelp) {
              setShowHelp(true);
              e.preventDefault();
            }
            break;
        }
      }

      // Space for temporary pan
      if (e.key === " " && !e.repeat) {
        enableTemporaryPan();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release space
      if (e.key === " ") {
        disableTemporaryPan();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    activeTool,
    fogMode,
    setActiveTool,
    setFogMode,
    enableTemporaryPan,
    disableTemporaryPan,
    setShowHelp,
  ]);
}
