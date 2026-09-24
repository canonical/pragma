import { reactTestConfig } from "@canonical/vitest-config-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: reactTestConfig({
    glob: "tests",
    environment: "node",
    coverage: {
      include: ["src/lib/**/*.ts"],
      // constants.ts holds only literals; excluding it keeps the 100%
      // threshold meaningful.
      exclude: ["**/constants.ts"],
    },
  }),
});
