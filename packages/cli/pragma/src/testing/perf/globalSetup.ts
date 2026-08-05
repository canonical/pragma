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
 * MTIME, not a content hash — decided in PR7 with the numbers. Walking the 454
 * declared input entries costs **3.5 ms**; content-hashing the same set costs
 * **24.9 ms**, dominated by `graphpack/embedded/pack.generated.ts` (1.87 MB) and
 * `pack.index.generated.ts` (181 KB), and it would need the digest persisted
 * somewhere that is neither committed nor stale — a new artefact to gitignore
 * and to get wrong. What hashing buys is immunity to "the bytes came back but
 * the clock moved forward", and git does not produce that case: `git checkout`
 * and `git switch` stamp mtime at checkout time, so moving between branches
 * always makes sources newer than the binary and forces the rebuild. Seven
 * times the cost on every vitest start, for a case the VCS does not generate,
 * is not a trade.
 *
 * The hole that WAS open is a different bug from mtime granularity, and it is
 * closed here: `INPUTS` listed only this package's own tree, while
 * `scripts/build.ts#generateTemplateManifest` also reads every `.ejs` under the
 * declared generators' `src/templates` and INLINES them into the binary. Those
 * roots resolve through this package's `node_modules`, which bun links to the
 * sibling workspace directory — so editing a linked generator's template
 * changed the binary's contents and invalidated nothing. They are derived from
 * `CREATE_GENERATORS[*].readsEmbeddedTemplates`, the same source of truth
 * `build.ts` derives `TEMPLATE_ROOTS` from, rather than hardcoded: a hardcoded
 * path would be a second writing of the thing that just went wrong. The import
 * costs 3.6 ms once per vitest start.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CREATE_GENERATORS } from "../../capabilities/create/constants.js";

/** Everything the compiled binary is built FROM, relative to the package root. */
const INPUTS = [
  "src",
  "scripts",
  "pragma.conf.ts",
  "package.json",
  // The linked generators' template roots, inlined by `generateTemplateManifest`.
  ...Object.values(CREATE_GENERATORS).flatMap((binding) =>
    binding.readsEmbeddedTemplates
      ? [join("node_modules", binding.name, "src", "templates")]
      : [],
  ),
];

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
