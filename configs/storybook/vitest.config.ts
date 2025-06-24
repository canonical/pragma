import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    // use JS DOM for browser-like test environment
    environment: "jsdom",
    // include vite globals for terser test code
    globals: true,
    include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
  },
})