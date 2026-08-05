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
 * MTIME, not a content hash. RE-MEASURED over the set this module declares
 * TODAY — the earlier writing of this paragraph quoted 454 entries / 3.5 ms
 * against 24.9 ms, which described this package's own tree before the two
 * dependency holes below were closed, and disagreed with a second count twenty
 * lines further down. The declared set is now `INPUTS` plus 10 workspace
 * dependency roots: **1716 entries**. Walking them with `newestMtime` costs
 * **16–25 ms** across six runs on this (noisy) box; SHA-256 over the same
 * entries costs **50–66 ms**, dominated by
 * `graphpack/embedded/pack.generated.ts` (1.87 MB) and
 * `pack.index.generated.ts` (181 KB) — roughly 3× — and it would need the
 * digest persisted somewhere that is neither committed nor stale, a new
 * artefact to gitignore and to get wrong. What hashing buys is immunity to "the
 * bytes came back but the clock moved forward", and git does not produce that
 * case: `git checkout` and `git switch` stamp mtime at checkout time, so moving
 * between branches always makes sources newer than the binary and forces the
 * rebuild. Three times the cost on every vitest start, for a case the VCS does
 * not generate, is not a trade — the ratio shrank when the input set grew, and
 * the conclusion did not change.
 *
 * The holes that WERE open are a different bug from mtime granularity, and all
 * three are closed here. All three had the same shape: `INPUTS` said
 * "everything the binary is built from" while naming a proper subset of it, and
 * everything the BUNDLER pulls in past that subset was invisible.
 *
 * 1. **Generator templates.** `scripts/build.ts#generateTemplateManifest` reads
 *    every `.ejs` under the declared generators' `src/templates` and INLINES
 *    them. Those roots are derived from
 *    `CREATE_GENERATORS[*].readsEmbeddedTemplates`, the same source of truth
 *    `build.ts` derives `TEMPLATE_ROOTS` from — a hardcoded path would be a
 *    second writing of the thing that just went wrong. The import costs 3.6 ms
 *    once per vitest start.
 * 2. **Workspace dependency code.** bun links `@canonical/*` to the sibling
 *    package directory and the bundler inlines whatever that package's entry
 *    resolves to — `dist` for the seven that build, `src` for the one that
 *    ships TypeScript — so a change to a workspace dependency changed the
 *    binary and invalidated nothing. Measured on this box before
 *    the fix: editing `@canonical/task`'s built `dry-run.js`,
 *    then calling `setup()`, returned in 3 ms with NO rebuild and a
 *    byte-identical binary; `touch src/bin.ts` rebuilt in 1410 ms and the edit
 *    appeared. Every spawned-binary guard — `completion/safety.test.ts`'s
 *    storeless PROTECTED cases, `create/compiledCreate.subprocess.test.ts` —
 *    was grading a binary that predated the change under test, and PR7's
 *    `--dry-run` correctness lives in `@canonical/task`. Cost of closing it,
 *    measured: 456 own-tree entries → 481 with the template roots → 1514 with
 *    the eight direct workspace deps.
 * 3. **TRANSITIVE workspace dependency code.** Closing (2) over this package's
 *    DIRECT `dependencies` left `packages/utils/dist` unwatched — it is a
 *    dependency of summon-core / -component / -application / -package, not of
 *    this package, and the bundler inlines it regardless. See
 *    {@link workspaceDependencyRoots} for the measurement. 1514 entries → 1716.
 *
 * What is still NOT covered, because it is a different build: a BUILT workspace
 * dependency's own `dist` going stale against its own `src`. This setup rebuilds
 * `dist/pragma`, not its dependencies — it watches whichever of the two that
 * dependency actually ships from, so an edit under a shipping `src` IS seen while
 * an unbuilt edit under a built package's `src` is not. A monorepo dev loop that
 * edits `packages/runtime/task/src` must run that package's build; what it no
 * longer has to remember is to rebuild the binary afterwards. That is now the
 * whole of the gap, which is the claim the previous writing of this paragraph
 * made while (3) was open.
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CREATE_GENERATORS } from "../../capabilities/create/constants.js";

/**
 * The code roots of this package's WORKSPACE-linked dependencies — the sibling
 * packages whose output the bundler inlines into `dist/pragma`.
 *
 * Derived, never listed: each `dependencies` key is resolved through
 * `node_modules` (bun links a workspace dep to its source directory), kept only
 * when it lands inside this monorepo, and then pointed at the top-level
 * directory of its own RESOLVED ENTRY. A hardcoded list would be a second
 * writing of the dependency manifest, and it is the writing that would go stale.
 *
 * The entry, not a hardcoded `dist`. Appending `dist` was the same class of hole
 * this function was added to close, one level down: seven of the eight workspace
 * deps resolve through `exports["."].import` → `dist/esm/index.js`, but
 * `@canonical/summon-package` declares `main: "src/index.ts"` and its `build`
 * script is literally an echo — there is no `dist` on this box or on a fresh CI
 * checkout, and there never will be. `create/pickGenerator.ts` value-imports it,
 * so the bundler inlines its TYPESCRIPT SOURCE (`grep -c "Skipping install
 * step" dist/pragma` = 1, a string that exists only in that package's
 * `src/package/index.ts`). Measured before this fix: `touch
 * packages/summon/package/src/index.ts` then `setup()` returned in 32.8 ms with
 * NO rebuild, while `touch packages/runtime/task/dist/esm/lib/plan.js` in the
 * same session rebuilt in 1684 ms. So the one generator behind `create package`
 * — the verb PRA-104's own repro used — was the one input every spawned-binary
 * guard could not see.
 *
 * TRANSITIVELY, which is the third iteration of this same hole and the reason
 * the walk is a closure rather than one `flatMap` over `dependencies`. The
 * bundler does not stop at the direct dependency: `@canonical/utils` is a
 * dependency of summon-core / -component / -application / -package, NOT of this
 * package, so `Object.keys(manifest.dependencies)` never reached it — while its
 * code is inlined into `dist/pragma` all the same. Measured on the emitted
 * source map for the same `Bun.build` options `scripts/build.ts` passes:
 * `packages/utils/dist/esm` contributes 12 modules to the bundle, and
 * `toKebabCase` — defined only in that package — appears in two emitted chunks.
 * `touch packages/utils/dist/**` left `fresh === true`, so every spawned-binary
 * guard graded a binary that predated the change under test: the same failure
 * mode the own-tree-only and hardcoded-`dist` iterations were spent closing.
 *
 * Cost of the closure, measured on this box: the watched set goes from 13 roots
 * / 1514 entries to 15 roots / 1706 entries (`packages/utils/dist` and
 * `packages/ds-types/dist`), and the walk from 8.4 ms to 9.2 ms.
 *
 * What is still NOT covered is stated at the module docblock, and the change
 * narrows it rather than closing it.
 *
 * @param root - The package root.
 * @returns Package-root-relative paths, or `[]` when nothing resolves.
 * @note Impure — reads `package.json` files and resolves symlinks.
 */
function workspaceDependencyRoots(root: string): string[] {
  const monorepo = resolve(root, "..", "..", "..");
  const roots: string[] = [];
  const visited = new Set<string>();

  // Bun links a workspace dep into the DEPENDENT's own `node_modules`, so
  // resolution restarts from each package as it is reached; the monorepo root
  // is the fallback for a hoisted link. Keyed on the realpath, so a package
  // reached through two dependents is walked once.
  const visit = (from: string): void => {
    let manifest: { dependencies?: Record<string, string> };
    try {
      manifest = JSON.parse(readFileSync(join(from, "package.json"), "utf-8"));
    } catch {
      return;
    }
    for (const name of Object.keys(manifest.dependencies ?? {})) {
      let resolved: string | undefined;
      for (const base of [from, monorepo]) {
        try {
          resolved = realpathSync(join(base, "node_modules", name));
          break;
        } catch {
          /* try the next base */
        }
      }
      if (resolved === undefined) continue;
      if (!resolved.startsWith(`${monorepo}/packages/`)) continue;
      if (visited.has(resolved)) continue;
      visited.add(resolved);
      roots.push(relative(root, join(resolved, entryRoot(resolved))));
      visit(resolved);
    }
  };

  visit(root);
  return roots;
}

/**
 * The top-level directory a linked package's own entry point lives under.
 *
 * Read from ITS manifest in the same precedence bun resolves with — the `.`
 * export condition first, then `module`, then `main` — and reduced to the first
 * path segment, which is the directory whose mtime answers "did this
 * dependency's code change". `dist` for a built package, `src` for one that
 * ships TypeScript. Falls back to `dist` only when a manifest declares no entry
 * at all, which is the shape the previous unconditional `dist` assumed.
 *
 * @param packageRoot - The resolved (real) directory of the linked package.
 * @returns One path segment, relative to that package's root.
 * @note Impure — reads the dependency's `package.json`.
 */
function entryRoot(packageRoot: string): string {
  let manifest: {
    exports?: Record<string, unknown>;
    module?: string;
    main?: string;
  };
  try {
    manifest = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf-8"),
    );
  } catch {
    return "dist";
  }
  // A condition value may itself be a nested condition object
  // (`{ import: { types, default } }`), so unwrap until a string or nothing —
  // reading `.replace` off an object would throw inside a global setup, which
  // fails the whole suite for a dependency that merely writes its exports map a
  // legal second way.
  const unwrap = (value: unknown, depth = 0): string | undefined => {
    if (typeof value === "string") return value;
    if (typeof value !== "object" || value === null || depth > 4)
      return undefined;
    const conditions = value as Record<string, unknown>;
    return (
      unwrap(conditions.import, depth + 1) ??
      unwrap(conditions.default, depth + 1)
    );
  };
  const entry =
    unwrap(manifest.exports?.["."]) ?? manifest.module ?? manifest.main;
  const segment =
    typeof entry === "string"
      ? entry.replace(/^\.\//, "").split("/")[0]
      : undefined;
  return segment && segment !== ".." && segment !== "" ? segment : "dist";
}

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
  const inputs = [...INPUTS, ...workspaceDependencyRoots(root)];
  const fresh =
    built > 0 &&
    inputs.every((input) => newestMtime(join(root, input)) < built);
  if (fresh) return;

  const result = spawnSync("bun", ["run", "scripts/build.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("perf globalSetup: failed to build dist/pragma");
  }
}
