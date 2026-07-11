// Testing posture: Standard — pure parsing/analysis logic and the registry
// task (via mocked effects) are unit-tested; the CLIs are exercised end-to-end
// by the consumer-smoke CI jobs.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
