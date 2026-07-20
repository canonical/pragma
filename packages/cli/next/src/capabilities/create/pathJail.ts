/**
 * SEC-2 path jail: an independent guard that a `create` output path stays inside
 * the workspace, run BEFORE any effect. It rejects an absolute path, a `..`
 * escape, and — via `realpath` on the nearest existing ancestor — a symlink that
 * points out of the tree. This is defence in depth: the generators' own
 * `validateComponentPath` already rejects absolute/`..`, but the jail is the
 * kernel-level backstop that also catches symlink escapes and covers every
 * create noun uniformly.
 */

import { existsSync, realpathSync } from "node:fs";
import * as path from "node:path";
import { PragmaError } from "../../kernel/error/PragmaError.js";

/** Walk up from `p` to the nearest ancestor that exists on disk. */
function nearestExisting(p: string): string {
  let current = p;
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current; // filesystem root
    current = parent;
  }
  return current;
}

/** Whether `rel` (a `path.relative` result) points at or above its base. */
const escapes = (rel: string): boolean =>
  rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);

/**
 * Reject a create output path that would escape the workspace root (`cwd`).
 *
 * @param field - The param name being jailed (for the error message).
 * @param value - The path value (skipped when absent — the generator's own safe
 *   default is used instead).
 * @param cwd - The workspace root the path must stay within.
 * @throws PragmaError INVALID_INPUT when the path escapes the workspace.
 * @note Impure — reads the filesystem (`existsSync`/`realpathSync`).
 */
export function assertInsideWorkspace(
  field: string,
  value: unknown,
  cwd: string,
): void {
  if (typeof value !== "string" || value === "") return;

  if (path.isAbsolute(value)) {
    throw PragmaError.invalidInput(field, value, {
      recovery: { message: "Use a path relative to the current directory." },
    });
  }

  const root = path.resolve(cwd);
  const resolved = path.resolve(root, value);
  if (escapes(path.relative(root, resolved))) {
    throw PragmaError.invalidInput(field, value, {
      recovery: { message: "The path must stay inside the workspace." },
    });
  }

  // Symlink escape: the nearest existing ancestor, resolved through symlinks,
  // must still sit within the resolved workspace root.
  const realRoot = realpathSync(root);
  const realAncestor = realpathSync(nearestExisting(resolved));
  if (
    realAncestor !== realRoot &&
    escapes(path.relative(realRoot, realAncestor))
  ) {
    throw PragmaError.invalidInput(field, value, {
      recovery: { message: "The path resolves outside the workspace." },
    });
  }
}
