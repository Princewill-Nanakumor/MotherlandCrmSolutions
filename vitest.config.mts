import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/tests/setup.ts"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
});
