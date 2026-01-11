/// <reference types="vitest" />

import { defineConfig } from "vitest/config";

export default defineConfig({
  include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
  exclude: ["**/e2e/**", "**/node_modules/**"],
});
