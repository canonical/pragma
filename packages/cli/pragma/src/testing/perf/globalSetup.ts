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
 * STALENESS INCLUDES THE EMBEDDED WORKSPACE DEPS. The binary bundles every
 * `@canonical/*` workspace package it (transitively) imports — task, summon-*,
 * ke, … — so an edit to `packages/runtime/task` is a change to what
 * `dist/pragma` runs, yet this package's own `src` never moves. The gate
 * therefore also watches each workspace-linked dependency (found by following
 * the `node_modules/<name>` symlinks, transitively) — its `src` (the authored
 * source), `dist` (what the bundler actually embeds, per the dep's export map)
 * and `package.json`. Registry deps resolve into a `node_modules` store path
 * and are skipped: their content only changes with a lockfile change, which
 * `bun install` surfaces as a fresh symlink mtime anyway. Content hashing of
 * the build inputs was considered and DECLINED (PR7 ruling R5): an mtime
 * comparison is a handful of stats, needs no state file to compare against,
 * and the failure mode of a false "stale" is one redundant 10 s build — while
 * hashing every input on every suite start costs more than the rebuild it
 * avoids. CI is fresh-checkout either way; this gate exists for developer
 * boxes that have built before.
 */

import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Everything the compiled binary is built FROM, relative to the package root. */
const INPUTS = ["src", "scripts", "pragma.conf.ts", "package.json"];

/**
 * What feeds the binary inside one workspace dependency: its authored source,
 * the compiled output the bundler embeds, and its manifest. Deliberately NOT
 * the whole package dir — that would watch `coverage/` and `node_modules/`,
 * whose mtimes move on every test run and would force a rebuild loop.
 */
const DEP_INPUTS = ["src", "dist", "package.json"];

/**
 * The newest modification time under `path`, or 0 when it does not exist.
 * A nested `node_modules` is never descended into (a dep's own deps are
 * enumerated as roots of their own by {@link workspaceDepRoots}).
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
    if (entry === "node_modules") continue;
    newest = Math.max(newest, newestMtime(join(path, entry)));
  }
  return newest;
}

/**
 * Every workspace package the binary can embed, transitively: follow each
 * `node_modules/<name>` symlink whose target lives OUTSIDE any `node_modules`
 * store (that is what distinguishes a workspace link from a registry install),
 * then repeat from the target's own `node_modules`. Cycles are cut by the
 * visited set.
 *
 * @param pkgRoot - This package's root directory.
 * @returns Absolute real paths of the linked workspace dependency roots.
 * @note Impure — reads `node_modules` link farms.
 */
function workspaceDepRoots(pkgRoot: string): string[] {
  const visited = new Set<string>([realpathSync(pkgRoot)]);
  const queue = [realpathSync(pkgRoot)];
  while (queue.length > 0) {
    const dir = queue.pop() as string;
    const nm = join(dir, "node_modules");
    let entries: string[];
    try {
      entries = readdirSync(nm);
    } catch {
      continue;
    }
    const links = entries.flatMap((entry) => {
      if (!entry.startsWith("@")) return [join(nm, entry)];
      try {
        return readdirSync(join(nm, entry)).map((e) => join(nm, entry, e));
      } catch {
        return [];
      }
    });
    for (const link of links) {
      let real: string;
      try {
        if (!lstatSync(link).isSymbolicLink()) continue;
        real = realpathSync(link);
      } catch {
        continue;
      }
      if (real.split(sep).includes("node_modules")) continue;
      if (visited.has(real)) continue;
      visited.add(real);
      queue.push(real);
    }
  }
  const root = realpathSync(pkgRoot);
  return [...visited].filter((dir) => dir !== root);
}

export default function setup(): void {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const built = newestMtime(join(root, "dist", "pragma"));
  const fresh =
    built > 0 &&
    INPUTS.every((input) => newestMtime(join(root, input)) < built) &&
    workspaceDepRoots(root).every((dep) =>
      DEP_INPUTS.every((input) => newestMtime(join(dep, input)) < built),
    );
  if (fresh) return;

  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("perf globalSetup: failed to build dist/pragma");
  }
}
