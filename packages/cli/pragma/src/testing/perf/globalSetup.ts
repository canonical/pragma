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
 *
 * `src` IS NOT ENOUGH, AND THAT IS THE SECOND CORRECTION. What `Bun.build`
 * consumes is each package's RESOLVED ENTRY, and this workspace publishes two
 * ways: `@canonical/summon-package` and `@canonical/summon-monorepo` resolve to
 * `src/index.ts`, while `@canonical/summon-core`, `@canonical/summon-component`,
 * `@canonical/summon-application` and `@canonical/task` resolve to
 * `dist/esm/index.js`. Measured on the four that publish `dist`: editing the
 * live string in `component/dist/esm/react/generator.js` and rebuilding put it
 * IN the binary (`grep -c` → 1), while touching that same `dist` left
 * `fresh = true`; and editing the corresponding `src` rebuilt a binary that did
 * NOT contain the change. So a `src`-only watch was wrong in both directions at
 * once — it missed the input that is bundled and rebuilt on one that is not.
 * Both trees are watched: `src` is what the TEMPLATE HARVEST reads, `dist` is
 * what the BUNDLER reads, and a package that has only one of them contributes 0
 * from the other. Measured cost of adding `dist` on this box: 6.7 ms → 12.4 ms
 * of `stat` walk, once per suite.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import conf from "../../../pragma.conf.js";

/**
 * Packages the binary links whatever the declaration says. Not a distribution
 * fact — this CLI depends on every one of them regardless of which generators
 * it ships, and each is a WORKSPACE SIBLING (`node_modules/@canonical/<name>`
 * is a symlink into `packages/`), so each is editable and each can invalidate
 * the binary between two test runs.
 *
 * THE LIST IS EVERY LINKED SIBLING, and that completeness is the correction.
 * It started as summon-core (the generation layer and embedded-file registry)
 * plus `@canonical/task` (the effect interpreter every mutation runs on), which
 * left three more out — and one of the guards this file provisions,
 * `kernel/completion/safety.test.ts`, is a claim about `@canonical/ke`'s
 * laziness specifically. Measured that all five reach the binary by grepping
 * `dist/pragma` for string literals unique to each package's `dist/esm`: ke 5
 * of 6 sampled literals present, ke-graphql 8 of 17, harnesses 2 of 4 —
 * including `writeMcpConfigTargets: at least one target is required`, which
 * exists nowhere else in this tree. Then, on a freshly built binary with
 * `harnesses/dist/esm/index.js` touched: `fresh` was `true` with the old two
 * (no rebuild — the guards would have run against the stale binary) and `false`
 * with all five. Cost: 32 ms to evaluate BOTH input sets end to end, so the
 * three additions are a rounding error against the ten trees already walked.
 */
const INFRASTRUCTURE = [
  "@canonical/summon-core",
  "@canonical/task",
  "@canonical/ke",
  "@canonical/ke-graphql",
  "@canonical/harnesses",
];

/**
 * The two trees a linked package can contribute to the binary: its sources (the
 * template harvest reads `src/**` /templates) and its build output (what the
 * bundler resolves, for a package that publishes `dist`). A package missing
 * either returns 0 from `newestMtime`, so naming both is free.
 */
const LINKED_TREES = ["src", "dist"];

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
  ].flatMap((name) =>
    LINKED_TREES.map((tree) => join("node_modules", name, tree)),
  ),
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
