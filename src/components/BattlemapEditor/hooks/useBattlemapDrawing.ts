// DEPRECATED: This file has been removed as part of refactoring.
// The wrapper hook added no value - useBattlemapInteractions is used directly.
// This file is kept for backwards compatibility only and will be removed.
import { useBattlemapInteractions } from "./useBattlemapInteractions";

export function useBattlemapDrawing(props: any) {
  // Direct delegation to useBattlemapInteractions
  return useBattlemapInteractions(props);
}
