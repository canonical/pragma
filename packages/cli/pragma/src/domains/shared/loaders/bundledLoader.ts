/**
 * Bundled package loader for compiled binaries.
 *
 * Resolves semantic content from `Bun.embeddedFiles` — the TTL graphs
 * and story-pack JSON embedded into the compiled binary via the build
 * command. Skills are not embedded; this loader reports `skills: []`.
 *
 * Blob names are hashed by bun (e.g. `button-a1b2c3d4.ttl`), losing
 * directory and package association. The loader therefore returns a
 * single SemanticPackage containing ALL embedded TTL and story content,
 * and the same cached package is returned for every ref this loader
 * resolves.
 * Note that repeated loads are NOT fully deduplicated by the store:
 * Oxigraph applies set semantics to ground triples, but blank nodes are
 * re-minted on every parse, so content loaded both here and by a
 * higher-precedence loader can produce duplicated blank-node subgraphs.
 * The orchestrator's first-loader-wins precedence (local > git >
 * bundled) is what keeps individual packages from double-loading.
 *
 * @note Impure — reads embedded blobs.
 */

import { basename } from "node:path";
import type { PackageRef } from "../../refs/operations/parseRef.js";
import type {
  GraphContent,
  PackageLoader,
  SemanticPackage,
  StoryFileEntry,
} from "../semanticPackage.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Cached result — embedded content is immutable, no need to re-read. */
let cached: SemanticPackage | undefined;

/**
 * Reset the module-level cache. Test-only: lets suites exercise the loader
 * against different `Bun.embeddedFiles` fixtures without module isolation.
 */
export function resetBundledLoaderCache(): void {
  cached = undefined;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Embedded package manifest basename: exactly `package.json`, or
 * `package-<hash>.json` where `<hash>` is bun's content hash suffix.
 */
const PACKAGE_MANIFEST_PATTERN = /^package(?:-[0-9a-f]{6,64})?\.json$/i;

/**
 * Semver 2.0.0 validation (semver.org's suggested pattern).
 */
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Whether a blob name is an embedded package manifest — strict basename
 * match, so unrelated JSON blobs (e.g. `mypackage.json`) are not misread.
 */
function isPackageManifest(name: string): boolean {
  return PACKAGE_MANIFEST_PATTERN.test(basename(name));
}

/**
 * Emit a loader warning on stderr (safe for both CLI and MCP stdio use).
 */
function warn(message: string): void {
  process.stderr.write(`Warning: bundled loader: ${message}\n`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export default function createBundledLoader(): PackageLoader {
  return {
    name: "bundled",
    async resolve(_ref: PackageRef): Promise<SemanticPackage | undefined> {
      if (cached) return cached;

      if (typeof globalThis.Bun === "undefined") return undefined;
      // Bun.embeddedFiles blobs have a .name property at runtime
      const blobs = (globalThis.Bun as { embeddedFiles?: readonly Blob[] })
        .embeddedFiles as ReadonlyArray<Blob & { name: string }> | undefined;
      if (!blobs?.length) return undefined;

      const graphs = await readEmbeddedGraphs(blobs);
      const stories = await readEmbeddedStories(blobs);
      if (graphs.length === 0 && stories.length === 0) return undefined;

      const version = await readEmbeddedVersion(blobs);

      cached = {
        name: "(bundled)",
        version,
        source: "bundled",
        graphs,
        skills: [],
        stories,
      };

      return cached;
    },
  };
}

// ---------------------------------------------------------------------------
// Graph reading
// ---------------------------------------------------------------------------

async function readEmbeddedGraphs(
  blobs: ReadonlyArray<Blob & { name: string }>,
): Promise<GraphContent[]> {
  const graphs: GraphContent[] = [];

  for (const blob of blobs) {
    if (!blob.name.endsWith(".ttl")) continue;

    try {
      const content = await blob.text();
      graphs.push({
        path: `(bundled)/${blob.name}`,
        content,
        format: "turtle",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warn(`skipping unreadable embedded graph "${blob.name}": ${reason}`);
    }
  }

  return graphs;
}

// ---------------------------------------------------------------------------
// Story reading
// ---------------------------------------------------------------------------

/**
 * Read story-pack definitions from embedded `.json` blobs.
 *
 * The build's story-assets plugin makes `stories/*.json` the only JSON
 * embedded as file assets (see storyAssetsPlugin.ts), so every `.json`
 * blob not named like a package manifest is a story file. Mirrors the
 * local loader: a blob that cannot be read or parsed warns on stderr
 * and is skipped — one bad file cannot break boot. Definitions are
 * shape-validated later by the story-pack compiler.
 */
async function readEmbeddedStories(
  blobs: ReadonlyArray<Blob & { name: string }>,
): Promise<StoryFileEntry[]> {
  const stories: StoryFileEntry[] = [];

  for (const blob of blobs) {
    if (!blob.name.endsWith(".json") || isPackageManifest(blob.name)) continue;

    try {
      stories.push({
        path: `(bundled)/${blob.name}`,
        definition: JSON.parse(await blob.text()),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warn(`skipping invalid embedded story "${blob.name}": ${reason}`);
    }
  }

  return stories;
}

// ---------------------------------------------------------------------------
// Version reading
// ---------------------------------------------------------------------------

async function readEmbeddedVersion(
  blobs: ReadonlyArray<Blob & { name: string }>,
): Promise<string> {
  for (const blob of blobs) {
    if (!isPackageManifest(blob.name)) continue;

    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { version?: unknown };
      if (typeof parsed.version !== "string") continue;
      if (!SEMVER_PATTERN.test(parsed.version)) {
        warn(
          `ignoring invalid semver "${parsed.version}" in embedded manifest "${blob.name}"`,
        );
        continue;
      }
      return parsed.version;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warn(`skipping corrupt embedded manifest "${blob.name}": ${reason}`);
    }
  }

  return "0.0.0";
}
