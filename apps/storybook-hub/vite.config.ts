import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        "../../packages/react/ds-global/tsconfig.json",
        "../../packages/react/ds-global-form/tsconfig.json",
        "../../packages/react/ds-app/tsconfig.json",
        "../../packages/react/ds-app-anbox/tsconfig.json",
        "../../packages/react/ds-app-landscape/tsconfig.json",
        "../../packages/react/ds-app-launchpad/tsconfig.json",
        "../../packages/react/ds-app-lxd/tsconfig.json",
        "../../packages/react/ds-app-portal/tsconfig.json",
        "../../packages/react/tokens/tsconfig.json",
      ],
    }),
  ],
});
