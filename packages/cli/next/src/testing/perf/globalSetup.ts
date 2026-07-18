/**
 * Vitest global setup for the perf suite.
 *
 * The budget tests spawn the compiled `dist/pragma`. Build it once, before the
 * suite, if it is missing — so `bun run test` on a clean checkout still
 * exercises the protected perf budgets without a manual build step.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default function setup(): void {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const binary = fileURLToPath(
    new URL("../../../dist/pragma", import.meta.url),
  );
  if (existsSync(binary)) return;

  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("perf globalSetup: failed to build dist/pragma");
  }
}
