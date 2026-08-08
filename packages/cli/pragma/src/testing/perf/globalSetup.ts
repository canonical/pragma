/**
 * Vitest global setup: build the compiled `dist/pragma` once, before the suite,
 * if it is missing OR older than the sources it was built from.
 *
 * Shared by both configs, because two suites spawn the binary: the perf budgets
 * (src/testing/perf/**, `test:perf`) and the storeless-guarantee guards in
 * src/kernel/completion/safety.test.ts (the main `test:vitest` pass). Wiring it
 * into both means `bun run test` on a clean checkout provisions the binary with
 * no manual build step — neither suite may assume it is pre-built.
 *
 * STALENESS, not mere existence. `existsSync` alone meant every spawned-binary
 * guard ran against whatever binary happened to be on disk: a mutation to
 * `bin.ts` making the storeless `__complete` path write to `$HOME` and boot the
 * store — precisely what `safety.test.ts` is PROTECTED to forbid — was live
 * when run from source and invisible through the gate. The guard whose own
 * docblock warns that an unreachable bundle "would leave the whole suite green"
 * was itself green against a binary that predated the change under test.
 *
 * AND THE SAME ARGUMENT REACHES PAST THIS PACKAGE. The binary is bundled from
 * the DECLARED generator packages and their 108 harvested template files, none
 * of which lives under `src/`, `scripts/`, `pragma.conf.ts` or `package.json`.
 * Measured: touching `@canonical/summon-package`'s generator entry left
 * `fresh = true`, the create suite ran, and `dist/pragma` was never rebuilt —
 * so the PROTECTED compiled-binary create guards went green against a binary
 * predating the summon source they exist to prove. The declared packages are
 * watched here for exactly that reason, and they are READ FROM THE DECLARATION
 * so a fork's own generator package invalidates the binary for free.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import conf from "../../../pragma.conf.js";

/**
 * Packages the binary links whatever the declaration says: summon-core is the
 * generation layer and the embedded-file registry every generator reads
 * through, and `@canonical/task` is the effect interpreter every mutation runs
 * on. Not a distribution fact — this CLI depends on both regardless of which
 * generators it ships.
 */
const INFRASTRUCTURE = ["@canonical/summon-core", "@canonical/task"];

/**
 * Everything the compiled binary is built FROM, relative to the package root.
 *
 * The workspace links `node_modules/<name>` to the sibling package directory,
 * so stating the package name is enough — `newestMtime` follows the symlink.
 */
const INPUTS = [
  "src",
  "scripts",
  "pragma.conf.ts",
  "package.json",
  ...[
    ...conf.generators.map((generator) => generator.name),
    ...INFRASTRUCTURE,
  ].map((name) => join("node_modules", name, "src")),
];

/**
 * Paths under an INPUT that are NOT inputs to this binary.
 *
 * The fork fixture is a SECOND distribution's declaration plus the modules and
 * binary `scripts/build.ts --fork` derives from it. None of it is bundled into
 * `dist/pragma` — but it sits under `src/`, and the fork proof rewrites it
 * mid-suite, which made an untracked build artifact the mtime high-water mark
 * of the whole freshness check and forced a redundant recompile on every fresh
 * machine.
 */
const EXCLUDED = ["src/testing/fixtures/fork"];

/**
 * The newest modification time under `path`, or 0 when it does not exist.
 *
 * @param path - A file or directory.
 * @param excluded - Absolute paths to skip whole.
 * @returns Epoch milliseconds of the newest entry beneath it.
 * @note Impure — stats the source tree.
 */
function newestMtime(path: string, excluded: ReadonlySet<string>): number {
  if (excluded.has(path)) return 0;
  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(path);
  } catch {
    return 0;
  }
  if (!stats.isDirectory()) return stats.mtimeMs;
  let newest = stats.mtimeMs;
  for (const entry of readdirSync(path)) {
    newest = Math.max(newest, newestMtime(join(path, entry), excluded));
  }
  return newest;
}

export default function setup(): void {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const excluded = new Set(EXCLUDED.map((path) => join(root, path)));
  const built = newestMtime(join(root, "dist", "pragma"), excluded);
  const fresh =
    built > 0 &&
    INPUTS.every((input) => newestMtime(join(root, input), excluded) < built);
  if (fresh) return;

  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("perf globalSetup: failed to build dist/pragma");
  }
}
