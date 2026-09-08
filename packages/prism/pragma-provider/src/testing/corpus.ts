/**
 * The hermetic corpus's roots, resolved from this file's own location.
 *
 * Every test in this package runs against `src/testing/__fixtures__/corpus` rather than
 * against a populated refs cache, because no CI leg and no fresh clone has one.
 * See that directory's README for what each file makes falsifiable.
 *
 * Test infrastructure: excluded from the build (tsconfig.build.json) and from
 * coverage (vitest.config.ts).
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The fixtures sit beside this file, under `src/testing/`. */
const CORPUS_ROOT: string = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./__fixtures__/corpus",
);

/** The corpus's refs cache — the shape `~/.cache/pragma/refs/@canonical` has. */
export const CORPUS_REFS_ROOT: string = join(CORPUS_ROOT, "refs/@canonical");

/** The corpus's semantics tree — the shape `~/code/cn/semantics` has. */
export const CORPUS_SEM_ROOT: string = join(CORPUS_ROOT, "sem");

/** A directory that exists but holds no `.ttl` — the empty-cache case. */
export const CORPUS_EMPTY_REFS_ROOT: string = join(CORPUS_ROOT, "refs");

/**
 * A directory that EXISTS but is not a semantics tree: neither expected
 * package sits under it. The `PRAGMA_SEM_DIR` points somewhere wrong case,
 * which an existence check on the root cannot tell from a healthy one.
 *
 * Deliberately the same path as {@link CORPUS_EMPTY_REFS_ROOT}: one directory
 * answers both descriptions, and inventing a second empty tree to say so would
 * add a fixture nobody reads.
 */
export const CORPUS_WRONG_SEM_ROOT: string = join(CORPUS_ROOT, "refs");

/** A path guaranteed absent — the missing-cache case. */
export const MISSING_ROOT: string = join(CORPUS_ROOT, "no-such-root");
