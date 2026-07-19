import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Detect whether a directory would be claimed as a member of an enclosing bun
 * workspace, walking up from the directory and matching each ancestor's
 * `workspaces` globs against the relative path.
 *
 * Why this matters for scaffolding: bun resolves `patchedDependencies` paths
 * from the WORKSPACE ROOT, not from the member package. An app-local
 * `patchedDependencies` block inside a workspace makes `bun install` abort
 * ("Couldn't find patch file") and leaves the entire workspace's node_modules
 * unlinked — so the generator must emit patches only for standalone apps.
 *
 * Semantics mirror bun/npm workspace resolution:
 * - The nearest ancestor whose `workspaces` globs cover the directory wins.
 * - Ancestor package.json files without a matching `workspaces` field do not
 *   stop the walk (an intermediate plain package does not detach the app from
 *   an outer workspace root for patch resolution).
 * - The directory itself is never its own enclosing root — an app that IS a
 *   workspace root resolves patches from itself, which is the standalone case.
 * - Both the array form (`"workspaces": [...]`) and the object form
 *   (`"workspaces": { "packages": [...] }`) are accepted.
 * - Globs support `*`/`?` within a path segment and `**` across segments —
 *   the subset bun and npm document for workspace member patterns. Negation
 *   patterns are not interpreted.
 */

/**
 * Read the `workspaces` member globs from a package.json, accepting both the
 * array form (`"workspaces": [...]`) and the object form
 * (`"workspaces": { "packages": [...] }`). Returns `null` when the file is
 * unreadable, is not valid JSON, or declares no workspaces — a malformed
 * manifest somewhere up the tree must not break scaffolding. The parsed JSON
 * is validated structurally rather than trusted via a cast.
 *
 * @note Impure — reads the filesystem.
 */
function readWorkspaceGlobs(manifestPath: string): readonly string[] | null {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
  if (typeof manifest !== "object" || manifest === null) return null;
  const workspaces: unknown = (manifest as { workspaces?: unknown }).workspaces;
  const globs: unknown = Array.isArray(workspaces)
    ? workspaces
    : typeof workspaces === "object" && workspaces !== null
      ? (workspaces as { packages?: unknown }).packages
      : undefined;
  if (!Array.isArray(globs)) return null;
  const patterns = globs.filter(
    (glob): glob is string => typeof glob === "string" && glob.length > 0,
  );
  return patterns.length > 0 ? patterns : null;
}

/** Escape a literal glob segment for regex use, keeping `*`/`?` wildcards. */
function compileGlobSegment(segment: string): string {
  return segment
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");
}

/**
 * Compile one workspace glob to a regular expression over a `/`-separated
 * relative path: `**` matches zero or more whole segments, `*` and `?` match
 * within one segment.
 */
function compileWorkspaceGlob(glob: string): RegExp {
  const segments = glob.split("/");
  let pattern = "";
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    if (segment === "**") {
      // Globstar: zero or more whole segments. In the middle it contributes
      // `segment/` repetitions; at the end it swallows any remaining depth
      // (including none — `apps/**` covers `apps` itself).
      pattern = isLast
        ? pattern === ""
          ? ".*"
          : `${pattern.replace(/\/$/, "")}(?:/.*)?`
        : `${pattern}(?:[^/]+/)*`;
      return;
    }
    pattern += compileGlobSegment(segment);
    if (!isLast) pattern += "/";
  });
  return new RegExp(`^${pattern}$`);
}

/** Whether any workspace glob covers the given `/`-separated relative path. */
function coversRelativePath(
  globs: readonly string[],
  relativePath: string,
): boolean {
  return globs.some((glob) => compileWorkspaceGlob(glob).test(relativePath));
}

/**
 * Find the nearest ancestor directory whose package.json `workspaces` globs
 * cover `appDirectory` — i.e. the bun workspace root that would claim the app
 * as a member and own its dependency patching. Returns `null` when no
 * enclosing workspace covers the path (the standalone case).
 *
 * The app directory does not need to exist yet; only ancestors are probed.
 *
 * @note Impure — walks the filesystem upward from the app directory.
 */
export function findEnclosingWorkspaceRoot(
  appDirectory: string,
): string | null {
  const target = path.resolve(appDirectory);
  let current = path.dirname(target);
  while (true) {
    const manifestPath = path.join(current, "package.json");
    if (existsSync(manifestPath)) {
      const globs = readWorkspaceGlobs(manifestPath);
      if (globs !== null) {
        const relativePath = path
          .relative(current, target)
          .split(path.sep)
          .join("/");
        if (coversRelativePath(globs, relativePath)) return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
