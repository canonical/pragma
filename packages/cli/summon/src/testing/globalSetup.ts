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
 * every root ALWAYS enters {@link buildUnderLock}, which takes an O_EXCL
 * lockfile at the root's top level — OUTSIDE every tree the freshness
 * rules stat — and judges freshness only UNDER it: a second process
 * finding the lock waits for release and RE-STATS instead of
 * double-building (two in-place `tsc` rewrites truncating one dist under
 * a live importer). A pre-lock freshness skip existed once and let a
 * contender bless another process's mid-flight emit (the entry lands
 * before `tsc` can fail — measured live), proceeding with no lock
 * against an artifact about to be destroyed; deleting it is what makes
 * one consistent pre-worker generation true. A lock that never clears
 * fails loudly after a timeout instead of forever.
 */

import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeSync,
} from "node:fs";
import { join, sep } from "node:path";
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
 * Serialize one root's rebuild across PROCESSES with an `O_EXCL` lockfile
 * at `<root>/.dist-build.lock` — the root's top level, deliberately
 * OUTSIDE every tree the freshness rules stat. The lock's own
 * create/unlink is a directory mutation, and a lock kept beside the
 * served artifact inside `dist/**` bumped a directory the sibling gate's
 * `DEP_INPUTS` watches on EVERY entry, so a fully fresh tree re-judged
 * `dist/pragma` stale and rebuilt the binary on every vitest invocation
 * (measured); the root's own mtime, by contrast, is watched by nothing —
 * only its named children are. The file must also stay UNTRACKED: the
 * root-level home sits outside the ignored `dist/`, so `.dist-build.lock`
 * has its own root `.gitignore` rule — a committed lock (crash residue
 * swept into a `git add -A`) would block every clone's every run for the
 * full timeout, with a "delete the file" remedy git keeps undoing. The
 * next relocation must keep BOTH properties: outside every watched tree,
 * and inside an ignore rule. One root serves ONE dist artifact, so
 * root-scoped is artifact-scoped, and both sibling gates compute the
 * same path for the same root — contention still meets contention.
 * Freshness is decided ONLY under the lock: callers enter
 * unconditionally, with no pre-lock fast path — a stat taken outside the
 * lock can land inside another process's emit-to-exit window (`tsc`
 * emits the entry before it can fail) and bless a mid-flight artifact
 * without waiting on anything. The holder stats after acquiring and
 * builds only if stale, so an uncontended fresh root pays one
 * open/unlink and nothing else; a contender waits for release and then
 * RE-STATS instead of building — looping back to contend when the dist
 * is still stale, which a FAILED holder guarantees: a `build` callback
 * whose build RAN and failed destroys the served artifact before
 * rethrowing, because a failed build can still EMIT it (nothing sets
 * `noEmitOnError`, so `tsc` writes output and exits nonzero, and the
 * two-step builds' first step writes the entry before the second can
 * fail) — mtime alone cannot tell a failed build from a clean one —
 * while a spawn failure with NO child (`error` set and `signal == null`)
 * leaves the artifact alone: no builder ever ran, nothing was emitted,
 * and the dist on disk is still the previous good generation, stale by
 * the same stats that sent the holder in. A
 * lockfile that never clears (a killed builder) fails loudly after
 * {@link LOCK_TIMEOUT_MS} naming the file, rather than double-building
 * or waiting forever. RESIDUAL, accepted: since every entry takes the
 * lock, crash residue blocks EVERY later run for the full timeout until
 * the file is removed (pre-existing wait semantics — no stale-lock
 * reclaim is attempted).
 *
 * TWIN: cli/pragma's perf globalSetup carries the same helper — the two
 * gates are deliberate SIBLINGS with no import edge (see the file
 * docblock); keep the copies in step.
 *
 * @param root - The package root the lock scopes (one served dist each).
 * @param isFresh - Re-stats the artifact against its inputs.
 * @param build - Rebuilds the artifact (throws loudly on failure).
 * @note Impure — creates and removes `<root>/.dist-build.lock`; blocks
 *   while waiting.
 */
function buildUnderLock(
  root: string,
  isFresh: () => boolean,
  build: () => void,
): void {
  const lockPath = join(root, ".dist-build.lock");
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
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
 * so both are watched. The repo-root template copier is a build input too —
 * see {@link TEMPLATE_COPIER}, statted separately because no
 * `join(root, input)` path can reach it. RESIDUAL, accepted: the shared
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
 * The repo-root template copier — the SECOND build step of four gated dists
 * (`bun ../../../scripts/copy-templates.ts` in summon-component/-package/
 * -application and cli/summon): a ROOT-OWNED build input (the r12-F4 class,
 * one directory up) that {@link DIST_INPUTS}' root-relative paths can never
 * reach, so an edit to the copier's glob or filter left every dist judged
 * FRESH and the suites green against copies the OLD copier produced. It is
 * statted as one absolute constant, UNCONDITIONALLY for every dep root (a
 * cheap single stat; roots whose build never runs it just carry a harmless
 * extra input).
 */
const TEMPLATE_COPIER = fileURLToPath(
  new URL("../../../../../scripts/copy-templates.ts", import.meta.url),
);

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

/** The slice of `spawnSync`'s result the build wrapper judges. */
interface BuildResult {
  status: number | null | undefined;
  /**
   * The never-started/ran-then-killed discriminator: spawnSync's
   * `NodeJS.Signals | null` — `null` when no child ever ran, a signal
   * (e.g. `SIGTERM`) when spawnSync KILLED a running child itself
   * (maxBuffer/timeout — `error` is set in BOTH cases). Bun may leave it
   * `undefined` on a spawn failure; judged `== null` either way.
   */
  signal: NodeJS.Signals | null | undefined;
  stdout: string | null;
  stderr: string | null;
  error?: Error | undefined;
}

/** Runs one root's build and reports the spawn result. */
type BuildRunner = (root: string) => BuildResult;

/** The real runner: the package's own `bun run build`, streams captured. */
function runBuild(root: string): BuildResult {
  return spawnSync("bun", ["run", "build"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf-8",
    // Uncapped: at the 1 MiB default a diagnostic FLOOD had spawnSync
    // kill a child that had already emitted (ENOBUFS), instead of the
    // flood reaching the nonzero arm intact.
    maxBuffer: Number.POSITIVE_INFINITY,
  });
}

/**
 * Build one root's served dist under the cross-process lock, destroying the
 * artifact only when the build RAN and failed.
 *
 * The per-root build-or-destroy rule, extracted and EXPORTED so a unit cell
 * can drive it with an injected runner (globalSetup.test.ts, beside this
 * file): this wrapper is the loop's one confirmed false-green producer
 * (round 12), and unexported it was pinned by nothing — a dropped rmSync or
 * a restored destroy-on-spawn-error stayed green until a real CI build
 * failed. Three shapes:
 * - spawn failure with NO child (`result.error` with `signal == null` —
 *   ENOENT/EACCES): throw naming the error, artifact PRESERVED (no child
 *   ever ran, so nothing was emitted; the dist on disk is the previous
 *   good generation). `error` ALONE does not mean this — spawnSync also
 *   sets it when it KILLS a build that ran (maxBuffer/timeout), and
 *   there `signal` carries the evidence.
 * - nonzero exit / signal kill — spawnSync's own mid-run kills included
 *   (`error` set WITH a signal: the child RAN and can have emitted
 *   before dying): destroy the artifact (a failed build can still have
 *   EMITTED it — see {@link buildUnderLock}), then throw naming the
 *   root, the kill when there was one, and both captured streams.
 * - success: the artifact is left as built, the lock released.
 *
 * TWIN: cli/pragma's perf globalSetup carries the same function; keep in
 * step.
 *
 * @param root - The workspace package being built (the lock lives at its
 *   top level, outside the watched trees).
 * @param artifact - Its served dist entry.
 * @param isFresh - Re-stats the artifact against its inputs (under the lock).
 * @param runner - The build runner ({@link runBuild}; injectable for tests).
 * @note Impure — takes the lock, builds, and may remove the artifact.
 */
export function buildDistOrDestroy(
  root: string,
  artifact: string,
  isFresh: () => boolean,
  runner: BuildRunner = runBuild,
): void {
  buildUnderLock(root, isFresh, () => {
    const result = runner(root);
    if (result.error && result.signal == null) {
      // A spawn failure with NO child (ENOENT/EACCES — no signal, and
      // `status` unset): nothing can have been emitted, so the artifact
      // on disk is still the previous good generation — preserve it,
      // and name the failure's only carrier. `error` with a SIGNAL is
      // the opposite case: spawnSync killed a build that RAN
      // (maxBuffer/timeout) — that shape falls through to the destroy
      // arm below.
      throw new Error(
        `summon globalSetup: failed to RUN the build for ${root}: ${result.error.message}`,
      );
    }
    if (result.status !== 0) {
      // The build RAN and failed — a nonzero exit, or a kill after the
      // child started — and it can still have EMITTED the artifact (see
      // buildUnderLock's docblock): destroy the evidence so the
      // contender's re-stat and every later run see STALE instead of a
      // fresh-looking dist compiled from erroring sources.
      rmSync(artifact, { force: true });
      const killed = result.error
        ? ` (killed mid-run: ${result.error.message})`
        : "";
      throw new Error(
        `summon globalSetup: failed to build ${root}'s dist:${killed}\n${result.stdout}${result.stderr}`,
      );
    }
  });
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
        newestMtime(TEMPLATE_COPIER) < built &&
        DIST_INPUTS.every((input) => newestMtime(join(root, input)) < built)
      );
    };
    // No pre-lock isFresh() skip: freshness is decided UNDER the lock —
    // a fresh-looking artifact out here can be another process's
    // mid-flight emit (see buildUnderLock's docblock).
    buildDistOrDestroy(root, artifact, isFresh);
  }
}

export default function setup(): void {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  buildStaleDepDists(root);
}
