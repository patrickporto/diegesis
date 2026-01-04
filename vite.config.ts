/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const reactCompilerConfig = {
  /* ... */
};

// https://vitejs.dev/config/
export default defineConfig({
  base: "/diegesis/",
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", reactCompilerConfig]],
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/setupTests.ts",
    coverage: {
      provider: "v8",
      reporter: ["html", "lcov"],
    },
  },
});
