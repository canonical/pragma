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
 * The holes that WERE open are a different bug from mtime granularity, and both
 * are closed here. Both had the same shape: `INPUTS` said "everything the binary
 * is built from" while listing only this package's own tree, and everything the
 * BUNDLER pulls in through `node_modules` was outside it.
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
 *    measured: 479 entries / 6.7 ms → 1470 / 19.8 ms, against the 24.9 ms
 *    content-hashing rejected below.
 *
 * What is still NOT covered, because it is a different build: a BUILT workspace
 * dependency's own `dist` going stale against its own `src`. This setup rebuilds
 * `dist/pragma`, not its dependencies — it watches whichever of the two that
 * dependency actually ships from, so an edit under a shipping `src` IS seen while
 * an unbuilt edit under a built package's `src` is not. A monorepo dev loop that
 * edits `packages/runtime/task/src` must run that package's build; what it no
 * longer has to remember is to rebuild the binary afterwards.
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
 * @param root - The package root.
 * @returns Package-root-relative paths, or `[]` when nothing resolves.
 * @note Impure — reads `package.json` files and resolves symlinks.
 */
function workspaceDependencyRoots(root: string): string[] {
  const manifest = JSON.parse(
    readFileSync(join(root, "package.json"), "utf-8"),
  ) as { dependencies?: Record<string, string> };
  const monorepo = resolve(root, "..", "..", "..");
  return Object.keys(manifest.dependencies ?? {}).flatMap((name) => {
    let resolved: string;
    try {
      resolved = realpathSync(join(root, "node_modules", name));
    } catch {
      return [];
    }
    if (!resolved.startsWith(`${monorepo}/packages/`)) return [];
    return [relative(root, join(resolved, entryRoot(resolved)))];
  });
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
