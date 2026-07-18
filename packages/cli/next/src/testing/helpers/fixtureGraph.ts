/**
 * Test helper: boot a store-backed {@link PragmaRuntime} at a REAL `cwd` whose
 * `pragma.lock.json` points at a built fixture pack.
 *
 * This is distinct from (and complements) `packRuntime.ts#buildFixtureRuntime`:
 * that helper hands back an in-process runtime wired to a custom `LazyStore`,
 * perfect for calling `verb.run()` directly against ONE surface. This helper
 * generalizes the `runtimeFor` + `buildUpdateTask` pattern proven in
 * `capabilities/sources/sources.test.ts`: it writes an actual
 * `pragma.config.ts` + package directory, runs the REAL `sources update` Task
 * (resolve → build → lock), and returns a `cwd`. Because the lock is a real
 * file, EVERY independent runtime construction that resolves config from that
 * `cwd` — `bootRuntime(flags, cwd)` (CLI dispatch), `projectMcp(modules, cwd)`
 * (MCP), and `runCli(args, { cwd })` (spawn) — boots the SAME cached pack. That
 * is the property PR4's cross-surface parity tests need and PR3's single-surface
 * parity tests did not: proof that CLI-json and MCP-json agree over a graph
 * built the same way `sources update` builds one for a real project.
 *
 * Hermetic: the pack cache lives under the isolated `$XDG_CACHE_HOME`
 * `setupXdgIsolation` installs; `dispose()` removes the temp directories (the
 * shared content-addressed pack cache itself is left for reuse/cleanup by the
 * isolation teardown).
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTask } from "@canonical/task/node";
import { buildUpdateTask } from "../../capabilities/sources/runUpdate.js";
import { VERSION } from "../../constants.js";
import type {
  ConfigLayers,
  PackageEntry,
  PragmaConfig,
} from "../../kernel/config/types.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { createQueryFacade } from "../../kernel/runtime/facade.js";
import { createLazyStore } from "../../kernel/runtime/store.js";
import type { GlobalFlags, PragmaRuntime } from "../../kernel/runtime/types.js";

/** Neutral flags for a plain-text, non-agent fixture invocation. */
const FIXTURE_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};

/** Options for {@link bootFixtureRuntime}. */
export interface FixtureGraphOptions {
  /** Inline TTL for the fixture graph (ontology + individuals). */
  readonly ttl: string;
  /**
   * Config fields to bake into the written `pragma.config.ts`, e.g.
   * `{ tier: "apps/lxd", channel: "prerelease" }`. `packages` is always set by
   * this helper (to the fixture package) — do not override it here.
   */
  readonly config?: Omit<Partial<PragmaConfig>, "packages">;
}

/** A booted fixture runtime plus its `cwd` (usable by any surface) and disposal. */
export interface FixtureGraph {
  /** A REAL `bootRuntime` at {@link cwd} — the same one CLI dispatch uses. */
  readonly runtime: PragmaRuntime;
  /** The project directory whose `pragma.lock.json`/`pragma.config.ts` were written. */
  readonly cwd: string;
  /** Remove the temp directories and dispose the store session, if booted. */
  dispose(): Promise<void>;
}

/** A synthetic runtime with an IN-MEMORY config — used only to drive the build Task. */
function builderRuntime(cwd: string, packages: PackageEntry[]): PragmaRuntime {
  const layers: ConfigLayers = {
    config: { channel: "normal", packages },
    origins: {
      tier: "default",
      channel: "default",
      detail: "default",
      packages: "project",
      stories: "default",
      prefixes: "default",
      prompts: "default",
    },
    global: { path: "/nonexistent", exists: false },
    project: { exists: false },
  };
  const loadConfig = async (): Promise<ConfigLayers> => layers;
  const store = createLazyStore({ cwd, loadConfig });
  return {
    cwd,
    version: VERSION,
    globalFlags: FIXTURE_FLAGS,
    loadConfig,
    store,
    query: createQueryFacade(store),
  };
}

/** Serialize a config value as a `pragma.config.ts` field assignment. */
function configField(key: string, value: unknown): string {
  return `  ${key}: ${JSON.stringify(value)},`;
}

/**
 * Build a store-backed runtime whose `cwd` carries a real lock file — the ONE
 * shared store-backed fixture path for cross-surface (CLI/MCP/spawn) tests.
 *
 * @param options - The fixture graph TTL and any config overrides.
 * @returns The runtime, its cwd, and a disposer.
 * @note Impure — writes a package + project config, builds and caches a pack.
 */
export async function bootFixtureRuntime(
  options: FixtureGraphOptions,
): Promise<FixtureGraph> {
  const cwd = mkdtempSync(join(tmpdir(), "pragma2-fixture-proj-"));
  const pkgDir = mkdtempSync(join(tmpdir(), "pragma2-fixture-pkg-"));
  mkdirSync(join(pkgDir, "definitions"), { recursive: true });
  writeFileSync(join(pkgDir, "definitions", "fixture.ttl"), options.ttl);

  const packages: PackageEntry[] = [
    { name: "fixture", source: `file://${pkgDir}` },
  ];
  const fields = [configField("packages", packages)];
  for (const [key, value] of Object.entries(options.config ?? {})) {
    fields.push(configField(key, value));
  }
  writeFileSync(
    join(cwd, "pragma.config.ts"),
    `export default {\n${fields.join("\n")}\n};\n`,
  );

  await runTask(await buildUpdateTask(builderRuntime(cwd, packages), false));

  const runtime = bootRuntime(FIXTURE_FLAGS, cwd);

  return {
    runtime,
    cwd,
    async dispose() {
      if (runtime.store.booted) {
        const session = await runtime.store.get();
        session.store.dispose();
      }
      rmSync(cwd, { recursive: true, force: true });
      rmSync(pkgDir, { recursive: true, force: true });
    },
  };
}
