import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // use JS DOM for browser-like test environment
    environment: "jsdom",
    // include vite globals for terser test code
    globals: true,
    // extend matchers and clean up the DOM after each test
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
  },
});
