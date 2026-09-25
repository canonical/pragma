import { reactTestConfig } from "@canonical/vitest-config-react";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// biome-ignore lint/suspicious/noExplicitAny: Vite 8 plugin types are incompatible with vitest's Vite 7 re-exports
const plugins: any[] = [react()];

export default defineConfig({
  plugins,
  resolve: {
    tsconfigPaths: true,
  },
  test: reactTestConfig({
    glob: "test",
    // Isolation is load-bearing here: the router announces route changes
    // through an aria-live element appended to document.body, which outlives
    // unmount, so a shared worker document collides its own and other files'
    // announcers with the probe spans the tests query.
    isolate: true,
    ssr: true,
    coverage: true,
    setupFiles: ["./vitest.setup.ts"],
    plugins,
  }),
});
