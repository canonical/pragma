/**
 * Vitest global setup: rebuild every STALE workspace dependency dist before
 * any worker starts.
 *
 * The subprocess suites spawn the REAL bin (`bun src/bin.tsx`), which
 * resolves `@canonical/summon-core` and `@canonical/task` through their
 * `exports` maps into `dist/esm/…` — and the interaction fixtures hard-code
 * those same dist entry files — so a projection edit in summon-core's `src`
 * is invisible to every spawned cell until that dist is rebuilt. Without
 * this gate the two hosts of the parity PR could return opposite verdicts
 * on one change: cli/pragma's suites rebuild their dep dists in their own
 * globalSetup while this package's cells stayed green against the previous
 * generation of the very file under edit.
 *
 * This is cli/pragma's gate (src/testing/perf/globalSetup.ts) minus its
 * compiled-binary half — a faithful SIBLING rather than an import: pulling
 * the shared helpers from `@canonical/pragma-cli` would point a dependency
 * edge summon → pragma-cli, closing a cycle with pragma-cli's declared
 * devDependency on this package. Same honest mtime staleness rule, same
 * main-process-before-any-worker placement (a `beforeAll` inside a worker
 * would race sibling workers importing the same in-place-rewritten files),
 * same loud topo-cycle throw, same cross-process build lock. Runs for full
 * suites and single-file `vitest run <file>` invocations alike.
 *
 * The main-process placement serializes only THIS process's workers. The
 * sibling gate rebuilds four of the same dists (task, ds-types, utils,
 * summon-core) from ITS process, and nothing orders the two suites — so
 * each per-root rebuild also takes an O_EXCL lockfile beside the served
 * artifact ({@link buildUnderLock}): a second process finding the lock
 * waits for release and RE-STATS instead of double-building (two in-place
 * `tsc` rewrites truncating one dist under a live importer), and a lock
 * that never clears fails loudly after a timeout instead of forever.
 */

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeSync,
} from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** How long a contender waits on another process's build lock (ms). */
const LOCK_TIMEOUT_MS = 120_000;

/** Contention poll interval (ms). */
const LOCK_POLL_MS = 200;

/** Synchronous sleep — the gate is sync, in the main process, pre-worker. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Serialize one artifact's rebuild across PROCESSES with an `O_EXCL`
 * lockfile beside the served artifact — the same lock path every gate that
 * serves this dist computes, so contention meets contention. The holder
 * re-checks freshness UNDER the lock (a release between the caller's stat
 * and the acquire means the dist was just built) and builds only if still
 * stale; a contender waits for release and then RE-STATS instead of
 * building — looping back to contend when the dist is still stale, which
 * a FAILED holder guarantees: every `build` callback destroys the served
 * artifact before rethrowing, because a failed build can still EMIT it
 * (nothing sets `noEmitOnError`, so `tsc` writes output and exits
 * nonzero, and the two-step builds' first step writes the entry before
 * the second can fail) — mtime alone cannot tell a failed build from a
 * clean one. A lockfile that never clears (a killed
 * builder) fails loudly after {@link LOCK_TIMEOUT_MS} naming the file,
 * rather than double-building or waiting forever.
 *
 * TWIN: cli/pragma's perf globalSetup carries the same helper — the two
 * gates are deliberate SIBLINGS with no import edge (see the file
 * docblock); keep the copies in step.
 *
 * @param artifact - The served dist artifact the lock guards.
 * @param isFresh - Re-stats the artifact against its inputs.
 * @param build - Rebuilds the artifact (throws loudly on failure).
 * @note Impure — creates and removes `<artifact>.lock`; blocks while waiting.
 */
function buildUnderLock(
  artifact: string,
  isFresh: () => boolean,
  build: () => void,
): void {
  const lockPath = `${artifact}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  // A never-built package has no dist dir yet; the lock needs its parent.
  mkdirSync(dirname(lockPath), { recursive: true });
  for (;;) {
    let fd: number;
    try {
      fd = openSync(lockPath, "wx");
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
      if (Date.now() >= deadline) {
        throw new Error(
          `summon globalSetup: build lock ${lockPath} still held after ` +
            `${LOCK_TIMEOUT_MS}ms — a killed build may have left it behind; ` +
            "delete the file and re-run",
        );
      }
      sleepSync(LOCK_POLL_MS);
      if (!existsSync(lockPath) && isFresh()) return;
      continue;
    }
    try {
      writeSync(fd, `${process.pid}\n`);
      if (!isFresh()) build();
      return;
    } finally {
      closeSync(fd);
      rmSync(lockPath, { force: true });
    }
  }
}

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
 * Every workspace package this one links, transitively: follow each
 * `node_modules/<name>` symlink whose target lives OUTSIDE any
 * `node_modules` store (what distinguishes a workspace link from a registry
 * install), then repeat from the target's own `node_modules`. Cycles are
 * cut by the visited set.
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

/**
 * What one dep's dist is built from (a missing entry stats 0). Every
 * `tsconfig.build.json` here is a thin override extending the package's own
 * `tsconfig.json`, which supplies the compiler options that shape the emit —
 * so both are watched. RESIDUAL, accepted: the shared
 * `@canonical/typescript-config` base those extend is NOT watched — the
 * packages reach it inconsistently (most via their own `node_modules` link,
 * summon-application by relative path), so no one entry covers it; an edit
 * there without a per-package tsconfig change can leave a dist judged fresh.
 */
const DIST_INPUTS = [
  "src",
  "generators",
  "package.json",
  "tsconfig.build.json",
  "tsconfig.json",
];

/**
 * The served entry artifact of one workspace package (`module` ?? `main`),
 * absolute — or undefined for a package that serves no compiled dist (no
 * `build` script, or an entry outside `dist/`, e.g. a source-served
 * config package), which the gate skips.
 */
function servedDistArtifact(root: string): string | undefined {
  let manifest: {
    module?: string;
    main?: string;
    scripts?: Record<string, string>;
  };
  try {
    manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
  } catch {
    return undefined;
  }
  const entry = manifest.module ?? manifest.main;
  if (!entry?.startsWith("dist") || !manifest.scripts?.build) {
    return undefined;
  }
  return join(root, entry);
}

/**
 * Rebuild every STALE workspace dep dist, dependencies before dependents.
 * Staleness is the honest per-package mtime rule: the served entry artifact
 * must be newer than every {@link DIST_INPUTS} entry.
 *
 * @param pkgRoot - This package's root directory (the closure's seed).
 * @note Impure — stats and rebuilds workspace dists.
 */
function buildStaleDepDists(pkgRoot: string): void {
  const deps = workspaceDepRoots(pkgRoot);
  // Dependencies before dependents. `workspaceDepRoots` follows
  // devDependency links too, so a future dev-edge cycle is an ordinary
  // event — it must throw with its members named, never spin the
  // synchronous loop forever.
  const depsOf = new Map(
    deps.map((root) => [root, new Set(workspaceDepRoots(root))] as const),
  );
  const remaining = new Set(deps);
  const ordered: string[] = [];
  while (remaining.size > 0) {
    const next = [...remaining].find((root) =>
      [...(depsOf.get(root) ?? [])].every((dep) => !remaining.has(dep)),
    );
    if (next === undefined) {
      throw new Error(
        `summon globalSetup: dependency cycle among ${[...remaining].join(", ")}`,
      );
    }
    ordered.push(next);
    remaining.delete(next);
  }
  for (const root of ordered) {
    const artifact = servedDistArtifact(root);
    if (!artifact) continue;
    const isFresh = (): boolean => {
      const built = newestMtime(artifact);
      return (
        built > 0 &&
        DIST_INPUTS.every((input) => newestMtime(join(root, input)) < built)
      );
    };
    if (isFresh()) continue;
    buildUnderLock(artifact, isFresh, () => {
      const result = spawnSync("bun", ["run", "build"], {
        cwd: root,
        stdio: "pipe",
        encoding: "utf-8",
      });
      if (result.status !== 0) {
        // A failed build can still have EMITTED the artifact (see
        // buildUnderLock's docblock) — destroy the evidence so the
        // contender's re-stat and every later run see STALE instead of
        // a fresh-looking dist compiled from erroring sources.
        rmSync(artifact, { force: true });
        throw new Error(
          `summon globalSetup: failed to build ${root}'s dist:\n${result.stdout}${result.stderr}`,
        );
      }
    });
  }
}

export default function setup(): void {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  buildStaleDepDists(root);
}
