import "@testing-library/jest-dom";
import "vitest-webgl-canvas-mock";

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

// Mock document global for tests that need document.createElement
if (typeof document === "undefined") {
  // @ts-expect-error - global.document doesn't exist in Node.js types, but we're mocking it for tests
  global.document = {
    createElement: (tagName: string) => {
      const el = {
        tagName: tagName.toUpperCase(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return el as any;
    },
  };
}
