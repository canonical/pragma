import * as path from "node:path";

/**
 * Validate the application directory path.
 *
 * Rejects an absolute path, or one that escapes the invocation directory via
 * `..` segments (either would write outside the tree the run was started in)
 * — the same guard `component/*`'s `validateComponentPath` applies, so an
 * escaping output path fails the SHARED prompt-validate gate in BOTH hosts
 * (the cross-CLI matrix). Pragma's SEC-2 jail stays the host-level backstop
 * behind this: its symlink-resolution check is the one class a value-only
 * validator cannot see.
 *
 * Everything else is deliberately left alone: nesting (`apps/my-app`), `.`
 * (scaffold into the current directory) and a degenerate basename are the
 * business of `generate()`'s own name derivation, and a non-string value is
 * skipped exactly as the jail skips it.
 */
export default function validateAppPath(value: unknown): true | string {
  if (typeof value !== "string") {
    return true;
  }
  if (path.isAbsolute(value)) {
    return "Application path must be relative to the project, not absolute";
  }
  if (value.split(/[/\\]/).includes("..")) {
    return "Application path must stay within the project (no '..' segments)";
  }
  return true;
}
