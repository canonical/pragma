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
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Everything the compiled binary is built FROM, relative to the package root. */
const INPUTS = ["src", "scripts", "pragma.conf.ts", "package.json"];

/**
 * The newest modification time under `path`, or 0 when it does not exist.
 *
 * @param path - A file or directory.
 * @returns Epoch milliseconds of the newest entry beneath it.
 * @note Impure — stats the source tree.
 */
function newestMtime(path: string): number {
  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(path);
  } catch {
    return 0;
  }
  if (!stats.isDirectory()) return stats.mtimeMs;
  let newest = stats.mtimeMs;
  for (const entry of readdirSync(path)) {
    newest = Math.max(newest, newestMtime(join(path, entry)));
  }
  return newest;
}

export default function setup(): void {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const built = newestMtime(join(root, "dist", "pragma"));
  const fresh =
    built > 0 &&
    INPUTS.every((input) => newestMtime(join(root, input)) < built);
  if (fresh) return;

  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("perf globalSetup: failed to build dist/pragma");
  }
}
