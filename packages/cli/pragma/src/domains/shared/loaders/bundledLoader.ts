/**
 * Bundled package loader for compiled binaries.
 *
 * Resolves semantic content from `Bun.embeddedFiles` — TTL and skill
 * files embedded into the compiled binary via the build command.
 *
 * Blob names are hashed by bun (e.g. `button-a1b2c3d4.ttl`), losing
 * directory and package association. The loader therefore returns a
 * single SemanticPackage containing ALL embedded TTL content. RDF
 * stores deduplicate triples, so this is safe when combined with
 * higher-precedence loaders that resolve individual packages.
 *
 * @note Impure — reads embedded blobs.
 */

import type { PackageRef } from "../../refs/operations/parseRef.js";
import type {
  GraphContent,
  PackageLoader,
  SemanticPackage,
} from "../semanticPackage.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Cached result — embedded content is immutable, no need to re-read. */
let cached: SemanticPackage | undefined;

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
      if (graphs.length === 0) return undefined;

      const version = await readEmbeddedVersion(blobs);

      cached = {
        name: "(bundled)",
        version,
        source: "bundled",
        graphs,
        skills: [],
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
    } catch {
      continue;
    }
  }

  return graphs;
}

// ---------------------------------------------------------------------------
// Version reading
// ---------------------------------------------------------------------------

async function readEmbeddedVersion(
  blobs: ReadonlyArray<Blob & { name: string }>,
): Promise<string> {
  for (const blob of blobs) {
    if (!blob.name.includes("package") || !blob.name.endsWith(".json"))
      continue;

    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      continue;
    }
  }

  return "0.0.0";
}
