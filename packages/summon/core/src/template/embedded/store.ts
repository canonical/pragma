/**
 * The embedded-template store: ONE core-level manifest serving every generator
 * package, injected by a compiled-binary host before the generators evaluate.
 *
 * Reads are disk-first: a source run (or test) reads the real file and the
 * manifest is inert; a compiled binary's `/$bunfs/…` source paths never exist
 * on disk, so every read falls through to the manifest, keyed by the shared
 * {@link qualifiedKey} scheme. A total miss is a HARD error naming the key —
 * callers do not guard against empty content, and a silent `""` would write
 * blank files.
 *
 * `loadTemplateSync` is deliberately synchronous (both branches are), so a
 * generator can load its templates LAZILY inside its synchronous
 * `generate(answers)` call — never at module eval, which is what keeps READ
 * commands template-free in a compiled binary regardless of bundler layout.
 */

import { readFileSync } from "node:fs";
import qualifiedKey from "./keyScheme.js";

/**
 * The virtual-filesystem prefix a `bun build --compile` binary serves its
 * bundled modules from: `import.meta.url` inside such a host resolves under
 * `file:///$bunfs/…`, so a module-anchored path starts with this prefix.
 *
 * The ONE spelling of that fact: both version walks (summon-application's
 * `findInstalledVersion`, summon-package's `findOwnVersion`) refuse to walk
 * from an anchor under this prefix — the parent chain LEAVES the virtual
 * filesystem into the REAL `/`, where a host-level manifest could hijack the
 * resolution — and are served by {@link embeddedPackageVersion} instead. The
 * prefix itself is pinned against a real compiled probe
 * (cli/pragma's `bunfsPrefix.subprocess.test.ts`), so a bun release that
 * changes the virtual prefix reddens the suite instead of silently disarming
 * every guard that tests it.
 */
export const BUNFS_PREFIX = "/$bunfs";

/** A loaded template: its source id (for diagnostics) and its content. */
export interface LoadedTemplate {
  /** Original source path (for diagnostics and dry-run display). */
  readonly source: string;
  /** Template content string (may legitimately be empty — `.gitkeep`). */
  readonly content: string;
}

/**
 * The injected manifest: qualified key → content. Empty in a source run;
 * populated by the compiled-binary host BEFORE any generator loads a template.
 */
let embeddedTemplates: Readonly<Record<string, string>> = {};

/**
 * Inject the embedded-template manifest — the compiled-binary fallback.
 * Called once by the host before the generators are imported. Passing an
 * empty map (the default) restores pure disk loading.
 *
 * @param manifest - Qualified key → template content.
 */
export function setEmbeddedTemplates(
  manifest: Readonly<Record<string, string>>,
): void {
  embeddedTemplates = manifest;
}

/**
 * Whether a host has injected a (non-empty) embedded manifest — the "embedded
 * context" fact `template()` uses to refuse silent disk fallbacks.
 *
 * @returns True when the manifest holds at least one entry.
 */
export function hasEmbeddedTemplates(): boolean {
  return Object.keys(embeddedTemplates).length > 0;
}

/**
 * Host-injected package versions (package name → version) — the compiled
 * binary's answer to a generator resolving its OWN version. A source or
 * installed run walks the disk for its `package.json` (layout-proof, never
 * stale); a `bun build --compile` binary has no `package.json` anywhere under
 * `/$bunfs`, so the host captures each declared generator package's version
 * at BUILD time — from the same manifest the disk walk would find — and
 * injects it here alongside the template manifest.
 */
let embeddedPackageVersions: Readonly<Record<string, string>> = {};

/**
 * Inject the embedded package-version map (compiled-binary host duty).
 *
 * @param versions - Package name → version, captured at build time.
 */
export function setEmbeddedPackageVersions(
  versions: Readonly<Record<string, string>>,
): void {
  embeddedPackageVersions = versions;
}

/**
 * The host-injected version for a package, when one was injected.
 *
 * @param name - The package name (e.g. `@canonical/summon-package`).
 * @returns The injected version, or `undefined` outside a compiled host.
 */
export function embeddedPackageVersion(name: string): string | undefined {
  return embeddedPackageVersions[name];
}

/**
 * Load a template from disk, or — when the disk read fails (a compiled
 * binary) — from the injected manifest. SYNCHRONOUS.
 *
 * @param prefix - The command-path prefix of the owning generator root.
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 * @throws If the template is neither on disk nor in the embedded manifest.
 */
export function loadTemplateSync(
  prefix: string,
  source: string,
): LoadedTemplate {
  // Filesystem first (source runs / tests).
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch {
    // Not on disk — fall through to the embedded manifest (compiled binary).
  }

  const key = qualifiedKey(prefix, source);
  if (key !== undefined) {
    const content = embeddedTemplates[key];
    if (content !== undefined) return { source, content };
  }

  throw new Error(
    `Template not found: ${source} (not on disk, and no embedded template for ${
      key === undefined ? "this path" : `'${key}'`
    }).`,
  );
}

/**
 * Async wrapper over {@link loadTemplateSync}, kept for callers that await a
 * template load. The body is fully synchronous.
 *
 * @param prefix - The command-path prefix of the owning generator root.
 * @param source - Absolute path to the template file.
 * @returns Loaded template with path and content.
 */
export async function loadTemplate(
  prefix: string,
  source: string,
): Promise<LoadedTemplate> {
  return loadTemplateSync(prefix, source);
}
