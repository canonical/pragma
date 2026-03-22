/**
 * Test runtime factory — creates a `PragmaRuntime` backed by the
 * canonical fixture and a temporary config directory.
 *
 * Each call creates an independent runtime. The caller owns disposal.
 * Uses the real `bootPragma()` to exercise the actual boot path.
 *
 * @note Impure — creates temp directory, reads fixture files, boots ke store.
 */

import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PragmaRuntime } from "../../domains/shared/runtime.js";
import { bootPragma } from "../../domains/shared/runtime.js";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;
const CANONICAL_TTL = join(FIXTURES_DIR, "canonical.ttl");

type ConfigName = "canonical-config.json" | "filtered-config.json";

/**
 * Create a PragmaRuntime backed by the canonical test fixture.
 *
 * Stages the selected config as `pragma.config.json` in a temp directory
 * and calls the real `bootPragma()` with a sources override pointing at
 * `testing/fixtures/canonical.ttl`. No mocks.
 *
 * @param options.config - Config file name within the fixtures directory.
 *   Defaults to `"canonical-config.json"` (tier=global, channel=normal).
 *   Use `"filtered-config.json"` for tier-filtering tests (apps/lxd).
 *
 * @example
 * const rt = await createTestRuntime();
 * const components = await listComponents(rt.store, rt.config);
 * expect(components.some((c) => c.name === "Button")).toBe(true);
 * rt.dispose();
 *
 * @example
 * const rt = await createTestRuntime({ config: "filtered-config.json" });
 * expect(rt.config.tier).toBe("apps/lxd");
 * rt.dispose();
 */
export default async function createTestRuntime(options?: {
  config?: ConfigName;
}): Promise<PragmaRuntime> {
  const configFile = options?.config ?? "canonical-config.json";

  // Stage a temp directory with pragma.config.json so bootPragma's
  // readConfig() finds it via the real config lookup path.
  const tmpDir = mkdtempSync(join(tmpdir(), "pragma-test-"));
  copyFileSync(
    join(FIXTURES_DIR, configFile),
    join(tmpDir, "pragma.config.json"),
  );

  const runtime = await bootPragma({
    cwd: tmpDir,
    sources: [CANONICAL_TTL],
  });

  // Wrap dispose to also clean up the temp directory.
  const originalDispose = runtime.dispose.bind(runtime);
  return {
    ...runtime,
    dispose: () => {
      originalDispose();
      rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}
