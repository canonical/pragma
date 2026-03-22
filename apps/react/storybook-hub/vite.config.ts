import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const reactPackages = [
  "ds-global",
  "ds-global-form",
  "ds-app",
  "ds-app-anbox",
  "ds-app-landscape",
  "ds-app-launchpad",
  "ds-app-lxd",
  "ds-app-portal",
  "tokens",
];

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: reactPackages.map(
        (pkg) => `../../../packages/react/${pkg}/tsconfig.json`,
      ),
    }),
  ],
});
