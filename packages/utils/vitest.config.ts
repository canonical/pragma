import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    // include vite globals for terser test code
    globals: true,
    include: ["src/**/*.tests.ts", "src/**/*.tests.tsx"],
  },
})