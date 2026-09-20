import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { dsIcons } from "./vite-plugin-ds-icons.js";

export default defineConfig({
  // dsIcons() serves the @canonical/ds-assets icons at /icons in dev and
  // copies them into the client build output — design-system components
  // fetch glyphs at runtime from `/icons/<name>.svg#<name>`, and an
  // unserved icon renders empty with no error.
  plugins: [dsIcons(), react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5174,
  },
});
