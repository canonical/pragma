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
import { RECOVERY_CLI_PREFIX } from "../../../constants.js";
import { PragmaError } from "../../error/PragmaError.js";
import { cliRecovery } from "../../error/recovery.js";
import { refsCacheDir } from "../paths.js";
import { checkoutCommit, cloneRef, fetchRef, headCommit } from "./gitOps.js";
import { type PackageRef, redactUrl } from "./parseRef.js";

/** A resolved package: its pinned revision and labelled RDF sources. */
export interface ResolvedPackage {
  readonly name: string;
  /** The config `packages` source ref, verbatim. */
  readonly source: string;
  /** The resolved commit / version / absolute path. */
  readonly resolved: string;
  /**
   * The package's on-disk root — the local `file:` path, the npm install dir, or
   * the git clone dir. Everything the package ships lives under it, so
   * `sources update` can also discover a package's `skills/` (U10) from here.
   */
  readonly root: string;
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

/** A concise reason from a thrown subprocess/parse error: prefer captured
 * stderr (git writes the real reason there under `stdio: "pipe"`), else the
 * message. Used to name WHY a resolve failed without dumping a raw stack. */
function errorDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const { stderr, message } = error as {
      stderr?: unknown;
      message?: unknown;
    };
    if (stderr != null) {
      const text = String(stderr).trim();
      if (text) return text;
    }
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return String(error);
}

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
    // Skip hidden entries (dot-prefixed): editor/partial/generated artifacts
    // like `.modifier.dark.ttl`, and tooling dirs like `.git`, are never
    // intended graph sources — and ingesting them ships malformed RDF into the
    // build (a `.`-prefixed Turtle local name isn't even valid).
    if (entry.name.startsWith(".")) continue;
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
 * A Turtle/SPARQL prefix prologue declaration: `@prefix ex: <iri> .` or the
 * keyword-form `PREFIX ex: <iri>`. Both are legal in Turtle 1.1; the keyword is
 * case-insensitive and the leading `@` is optional, so `@?prefix` with the `i`
 * flag covers every spelling. The label group requires at least one character,
 * so the default-namespace form (`@prefix : <iri>`) is skipped — its `:local`
 * tokens are not the named-prefix contract the index freezes.
 */
const PREFIX_DECL = /(?:^|\s)@?prefix\s+([^\s:]+):\s*<([^>]*)>/gi;

/**
 * Harvest a package's own `@prefix` / `PREFIX` declarations from its TTL text.
 *
 * ke's `createStore` does NOT fold parsed-Turtle prefixes into `store.prefixes`
 * (TTL `@prefix` applies only within a file during parsing), so a package's
 * namespaces are invisible to the index unless we lift them out of the source
 * ourselves. The returned map (label → namespace IRI) is merged BELOW config
 * precedence so the pack's own names compact to `pfx:Local` in the index.
 *
 * @param sources - The package's labelled RDF sources.
 * @returns A prefix map of every named declaration found (last wins on clash).
 */
export function harvestPrefixes(
  sources: readonly { readonly content: string }[],
): Record<string, string> {
  const prefixes: Record<string, string> = {};
  for (const { content } of sources) {
    for (const match of content.matchAll(PREFIX_DECL)) {
      const [, label, iri] = match;
      if (label !== undefined && iri !== undefined) prefixes[label] = iri;
    }
  }
  return prefixes;
}

/**
 * Locate a package's `package.json` from the project.
 *
 * The direct `require.resolve("<pkg>/package.json")` throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` for a package whose `exports` map does not
 * expose `./package.json` (common with modern packages) — which would be
 * misreported as "not installed". So on failure it falls back to resolving the
 * package entry and walking up to the `package.json` whose `name` matches.
 *
 * @param require - A `createRequire` bound to the project directory.
 * @param pkg - The package name.
 * @returns The absolute `package.json` path, or `undefined` when not installed.
 */
export function resolvePackageJson(
  require: ReturnType<typeof createRequire>,
  pkg: string,
): string | undefined {
  try {
    return require.resolve(`${pkg}/package.json`);
  } catch {
    // `exports` may not expose ./package.json — resolve the entry and walk up.
  }
  let current: string;
  try {
    current = dirname(require.resolve(pkg));
  } catch {
    return undefined;
  }
  for (let depth = 0; depth < 64; depth++) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, "utf-8")) as {
          name?: unknown;
        };
        if (parsed.name === pkg) return candidate;
      } catch {
        // Unreadable or non-JSON — keep walking up.
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return undefined;
}

/**
 * Resolve a package reference to its revision and RDF sources.
 *
 * @param ref - The parsed package reference.
 * @param options - The cwd, frozen flag, and any pinned revision.
 * @returns The resolved package.
 * @throws PragmaError on a missing file path or unresolvable npm package.
 * @throws PragmaError under `--frozen` when the package has no lock entry.
 * @note Impure — may clone/fetch git, reads TTL from disk.
 */
export async function resolvePackage(
  ref: PackageRef,
  options: ResolveOptions,
): Promise<ResolvedPackage> {
  // `--frozen` means "reproduce the locked state exactly". A configured package
  // with no lock entry has nothing to reproduce, so refuse rather than silently
  // resolving it fresh (which would advance the very state the lock pins).
  if (options.frozen && options.pinned === undefined) {
    throw PragmaError.configError(
      `Cannot resolve "${ref.pkg}" under --frozen: it has no entry in the lock.`,
      {
        recovery: cliRecovery(
          `${RECOVERY_CLI_PREFIX}sources update`,
          "Update the lock without --frozen, then commit it.",
        ),
      },
    );
  }

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
        root: ref.path,
        sources: readTtlSources(ref.path, ref.pkg),
      };
    }

    case "npm": {
      const require = createRequire(join(options.cwd, "noop.js"));
      const pkgJsonPath = resolvePackageJson(require, ref.pkg);
      if (pkgJsonPath === undefined) {
        throw PragmaError.configError(
          `Package "${ref.pkg}" is not installed. Add it to the project.`,
        );
      }
      const dir = dirname(pkgJsonPath);
      let version: string;
      try {
        version =
          (JSON.parse(readFileSync(pkgJsonPath, "utf-8")).version as string) ??
          "0.0.0";
      } catch (error) {
        // A malformed `package.json` for an otherwise-installed package: name it
        // as a data error, not an INTERNAL_ERROR "please report this issue".
        throw PragmaError.configError(
          `Package "${ref.pkg}" has an invalid package.json (${pkgJsonPath}): ${errorDetail(error)}`,
        );
      }
      return {
        name: ref.pkg,
        source: ref.source,
        resolved: version,
        root: dir,
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
      try {
        if (useCommit) {
          checkoutCommit(ref.url, options.pinned as string, dir);
          resolved = options.pinned as string;
        } else if (existsSync(dir)) {
          resolved = fetchRef(ref.url, ref.ref, dir);
        } else {
          cloneRef(ref.url, ref.ref, dir);
          resolved = headCommit(dir);
        }
      } catch (error) {
        // A git clone/fetch/checkout failed — an unreachable remote, a moved or
        // deleted ref, an auth/credential problem, or (under --frozen) a pinned
        // commit that is gone. Name the package + ref with git's own reason so
        // it reads as a fixable data/reproducibility error, not INTERNAL_ERROR.
        throw useCommit
          ? PragmaError.configError(
              `Cannot reproduce "${ref.pkg}" under --frozen: commit ${options.pinned} could not be checked out from ${redactUrl(ref.url)}. ${errorDetail(error)}`,
              {
                recovery: {
                  message:
                    "The pinned commit may have been force-pushed away or the remote is unreachable. Restore access to it, or re-run `pragma sources update` without --frozen to re-pin.",
                },
              },
            )
          : PragmaError.configError(
              `Cannot resolve "${ref.pkg}" from ${redactUrl(ref.url)}#${ref.ref}: ${errorDetail(error)}`,
              {
                recovery: {
                  message:
                    "Check the git URL and ref, your network, and your git credentials, then re-run the update.",
                },
              },
            );
      }
      return {
        name: ref.pkg,
        source: ref.source,
        resolved,
        root: dir,
        sources: readTtlSources(dir, ref.pkg),
      };
    }
  }
}
