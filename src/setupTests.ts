import "@testing-library/jest-dom";

// Simple mock for indexedDB to avoid ReferenceError
if (typeof window !== "undefined" && !window.indexedDB) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).indexedDB = {
    open: () =>
      ({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
  };
}
