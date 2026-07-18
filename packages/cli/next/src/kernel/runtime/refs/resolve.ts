/**
 * Resolve a {@link PackageRef} to its pinned revision and RDF source contents.
 *
 * `file` reads the local path in place; `npm` resolves the installed package
 * from the project's `node_modules`; `git` clones/fetches into the ref cache
 * (or, under `--frozen`, checks out exactly the lock's pinned commit and never
 * advances). Each package contributes its `definitions/**` and `data/**` TTL
 * files, labelled by a stable `pkg/relative-path` so the pack's content hash is
 * machine-independent. Reached only from the `sources update` Task body.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { PragmaError } from "../../error/PragmaError.js";
import { refsCacheDir } from "../paths.js";
import { checkoutCommit, cloneRef, fetchRef, headCommit } from "./gitOps.js";
import type { PackageRef } from "./parseRef.js";

/** A resolved package: its pinned revision and labelled RDF sources. */
export interface ResolvedPackage {
  readonly name: string;
  /** The config `packages` source ref, verbatim. */
  readonly source: string;
  /** The resolved commit / version / absolute path. */
  readonly resolved: string;
  /** The labelled RDF sources (path label + content). */
  readonly sources: { readonly path: string; readonly content: string }[];
}

/** Options for a resolution: whether to honour a pinned commit (`--frozen`). */
export interface ResolveOptions {
  readonly cwd: string;
  readonly frozen: boolean;
  /** The lock's pinned revision for this package (used under `--frozen`). */
  readonly pinned?: string;
}

/** The package subdirectories scanned for `.ttl` sources. */
const TTL_DIRS = ["definitions", "data"];

/** Sanitize a ref for use as a cache path segment. */
const sanitize = (value: string): string => value.replace(/[/\\:*?"<>|]/g, "_");

/** Recursively collect `*.ttl` files under a directory (a manual walk — the
 * compiled binary's node:fs globSync mishandles `**`, so we avoid it). */
function walkTtl(
  dir: string,
  base: string,
  label: string,
  out: { path: string; content: string }[],
): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTtl(full, base, label, out);
    } else if (entry.isFile() && entry.name.endsWith(".ttl")) {
      out.push({
        path: `${label}/${relative(base, full)}`,
        content: readFileSync(full, "utf-8"),
      });
    }
  }
}

/** Read a package's `definitions/**` and `data/**` TTL, with stable labels. */
function readTtlSources(
  rootDir: string,
  label: string,
): { path: string; content: string }[] {
  const sources: { path: string; content: string }[] = [];
  for (const sub of TTL_DIRS) {
    walkTtl(join(rootDir, sub), rootDir, label, sources);
  }
  sources.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sources;
}

/**
 * Resolve a package reference to its revision and RDF sources.
 *
 * @param ref - The parsed package reference.
 * @param options - The cwd, frozen flag, and any pinned revision.
 * @returns The resolved package.
 * @throws PragmaError on a missing file path or unresolvable npm package.
 * @note Impure — may clone/fetch git, reads TTL from disk.
 */
export async function resolvePackage(
  ref: PackageRef,
  options: ResolveOptions,
): Promise<ResolvedPackage> {
  switch (ref.kind) {
    case "file": {
      if (!existsSync(ref.path)) {
        throw PragmaError.configError(
          `Package "${ref.pkg}" path not found: ${ref.path}.`,
        );
      }
      return {
        name: ref.pkg,
        source: ref.source,
        resolved: ref.path,
        sources: readTtlSources(ref.path, ref.pkg),
      };
    }

    case "npm": {
      const require = createRequire(join(options.cwd, "noop.js"));
      let pkgJsonPath: string;
      try {
        pkgJsonPath = require.resolve(`${ref.pkg}/package.json`);
      } catch {
        throw PragmaError.configError(
          `Package "${ref.pkg}" is not installed. Add it to the project.`,
        );
      }
      const dir = dirname(pkgJsonPath);
      const version =
        (JSON.parse(readFileSync(pkgJsonPath, "utf-8")).version as string) ??
        "0.0.0";
      return {
        name: ref.pkg,
        source: ref.source,
        resolved: version,
        sources: readTtlSources(dir, ref.pkg),
      };
    }

    case "git": {
      const useCommit = options.frozen && options.pinned;
      const dir = join(
        refsCacheDir(),
        sanitize(ref.pkg),
        sanitize(useCommit ? (options.pinned as string) : ref.ref),
      );
      let resolved: string;
      if (useCommit) {
        checkoutCommit(ref.url, options.pinned as string, dir);
        resolved = options.pinned as string;
      } else if (existsSync(dir)) {
        resolved = fetchRef(ref.url, ref.ref, dir).newHead;
      } else {
        cloneRef(ref.url, ref.ref, dir);
        resolved = headCommit(dir);
      }
      return {
        name: ref.pkg,
        source: ref.source,
        resolved,
        sources: readTtlSources(dir, ref.pkg),
      };
    }
  }
}
