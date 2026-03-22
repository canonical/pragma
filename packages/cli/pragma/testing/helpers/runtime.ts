/**
 * Test runtime factory — creates a `PragmaRuntime` backed by the
 * canonical fixture and a temporary config directory.
 *
 * Each call creates an independent runtime. The caller owns disposal.
 * Uses the real `bootPragma()` to exercise the actual boot path.
 *
 * @note Impure — creates temp directory, writes fixture files, boots ke store.
 */

import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PragmaRuntime } from "../../src/domains/shared/runtime.js";
import { bootPragma } from "../../src/domains/shared/runtime.js";
import { DS_ALL_TTL } from "../dsFixtures.js";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

type ConfigName = "canonical-config.json" | "filtered-config.json";

/**
 * Create a PragmaRuntime backed by the canonical test fixture.
 *
 * Stages the selected config as `pragma.config.json` in a temp directory
 * and calls the real `bootPragma()` with a sources override pointing at
 * the canonical TTL fixture. No mocks.
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
export async function createTestRuntime(options?: {
  config?: ConfigName;
}): Promise<PragmaRuntime> {
  const configFile = options?.config ?? "canonical-config.json";

  // Stage a temp directory with pragma.config.json and the canonical
  // TTL fixture so bootPragma exercises the real config + store path.
  const tmpDir = mkdtempSync(join(tmpdir(), "pragma-test-"));
  copyFileSync(
    join(FIXTURES_DIR, configFile),
    join(tmpDir, "pragma.config.json"),
  );

  const ttlPath = join(tmpDir, "canonical.ttl");
  writeFileSync(ttlPath, DS_ALL_TTL);

  const runtime = await bootPragma({ cwd: tmpDir, sources: [ttlPath] });

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
