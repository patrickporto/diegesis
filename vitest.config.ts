/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
    ],
    exclude: ["**/e2e/**", "**/node_modules/**"],
    environment: "happy-dom",
    isolate: false,
    pool: "threads",
    // Skip slow deps
    deps: {
      optimizer: {
        web: { enabled: true },
      },
    },
    coverage: {
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
      },
    },
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
