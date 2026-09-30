import { reactTestConfig } from "@canonical/vitest-config-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: reactTestConfig({
    glob: "tests",
    environment: "node",
    coverage: {
      include: ["src/lib/**/*.ts"],
    },
  }),
});
