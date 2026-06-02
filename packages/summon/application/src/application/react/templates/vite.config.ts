import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Path aliases (#lib, #domains, #styles) are declared as Node subpath imports
// in package.json "imports" and resolved natively by Vite — no resolver plugin.
export default defineConfig({
  plugins: [react()],
});
