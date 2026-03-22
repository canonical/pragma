/**
 * Test runtime factory — creates a `PragmaRuntime` backed by the
 * canonical fixture and a temporary config directory.
 *
 * Each call creates an independent runtime. The caller owns disposal.
 * Uses the real `bootPragma()` — no mocks.
 *
 * @note Impure — creates temp directory, reads fixture files, boots ke store.
 */

import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PragmaRuntime } from "../../src/domains/shared/runtime.js";
import { bootPragma } from "../../src/domains/shared/runtime.js";
import { DS_ALL_TTL } from "../dsFixtures.js";
import { createTestStore } from "../store.js";

const FIXTURES_DIR = new URL("../fixtures/", import.meta.url).pathname;

type ConfigName = "canonical-config.json" | "filtered-config.json";

/**
 * Create a PragmaRuntime backed by the canonical test fixture.
 *
 * @param options.config - Config file name within the fixtures directory.
 *   Defaults to `"canonical-config.json"` (no tier, normal channel).
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

  // Stage a temp directory with pragma.config.json so bootPragma's
  // readConfig() finds it via the real config lookup path.
  const tmpDir = mkdtempSync(join(tmpdir(), "pragma-test-"));
  copyFileSync(
    join(FIXTURES_DIR, configFile),
    join(tmpDir, "pragma.config.json"),
  );

  const { store, cleanup } = await createTestStore({ ttl: DS_ALL_TTL });

  const runtime: PragmaRuntime = {
    store,
    config: (await import("../../src/config.js")).readConfig(tmpDir),
    cwd: tmpDir,
    dispose: () => {
      cleanup();
      rmSync(tmpDir, { recursive: true, force: true });
    },
  };

  return runtime;
}
