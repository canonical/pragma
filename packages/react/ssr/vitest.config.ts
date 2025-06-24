import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    // use JS DOM for browser-like test environment
    environment: "jsdom",
    // include vite globals for terser test code
    globals: true,
    // Defines files that perform extra vitest configuration
    // Currently, this is used to extend vitest matchers and cleanup the DOM after each test
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
  },
})