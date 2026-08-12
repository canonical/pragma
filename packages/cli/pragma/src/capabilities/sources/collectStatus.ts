/**
 * Collect the `sources status` payload — storeless.
 *
 * Reports the store's readiness without booting it. The `store` field IS the
 * boot decision ({@link resolveSources}) — status never re-derives which pack
 * answers reads, so it can never disagree with what the next read actually
 * loads. Everything else is provenance read straight off that pack's manifest
 * (a plain `JSON.parse`, no store, no oxigraph). This is the capability that
 * must stay off the store factory (the storeless-guarantee spy covers it). It
 * absorbs the v1 `info store` summary.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackDeclaration } from "../../kernel/config/types.js";
import { embeddedManifest } from "../../kernel/runtime/graphpack/embedded.js";
import { readManifest } from "../../kernel/runtime/graphpack/manifest.js";
import { INDEX_FILE } from "../../kernel/runtime/graphpack/types.js";
import { resolveSources } from "../../kernel/runtime/resolveSources.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { SourcesStatusData } from "./types.js";

const entryName = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : entry.name;
const entrySource = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : (entry.source ?? entry.name);

/**
 * The distinct-abox entity count from a built pack's index.json (storeless).
 *
 * Only reached for LEGACY packs whose manifest predates the persisted
 * `entityCount` (A10) — a current pack's count is read straight from the
 * manifest, no index parse. Counts distinct abox subjects so the figure matches
 * both the manifest count and `info`'s `entityTotal` (A1).
 */
function indexEntityCount(dir: string): number | null {
  const path = join(dir, INDEX_FILE);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
      entities?: { box?: string; uri?: string; name?: string }[];
    };
    if (!Array.isArray(parsed.entities)) return null;
    const subjects = new Set<string>();
    for (const entity of parsed.entities) {
      if (entity.box === "abox") subjects.add(entity.uri ?? entity.name ?? "");
    }
    return subjects.size;
  } catch {
    return null;
  }
}

/**
 * Assemble the `sources status` payload for the runtime's cwd.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless status payload.
 * @note Impure — reads config, the active-pack pointer, and the pack cache.
 */
export async function collectStatus(
  runtime: PragmaRuntime,
): Promise<SourcesStatusData> {
  const layers = await runtime.loadConfig();
  const sources = (layers.config.packs ?? []).map((entry) => ({
    name: entryName(entry),
    ref: entrySource(entry),
  }));
  const decision = resolveSources(layers, runtime.cwd);
  const base = { cwd: runtime.cwd, sources };

  switch (decision.kind) {
    case "embedded": {
      const manifest = embeddedManifest();
      return {
        ...base,
        store: "embedded",
        contentHash: manifest.contentHash,
        sourceRef: manifest.sourceRef,
        builtAt: manifest.createdAt,
        entityCount: manifest.entityCount ?? null,
      };
    }
    case "pack": {
      const manifest = readManifest(decision.dir);
      return {
        ...base,
        store: "built",
        contentHash: decision.contentHash,
        sourceRef: manifest?.sourceRef ?? null,
        builtAt: manifest?.createdAt ?? null,
        // Prefer the manifest's persisted count (no index parse); a legacy pack
        // without it falls back to counting the index's abox subjects (A10).
        entityCount: manifest?.entityCount ?? indexEntityCount(decision.dir),
      };
    }
    case "unavailable":
      return {
        ...base,
        store: "unavailable",
        contentHash: null,
        sourceRef: null,
        builtAt: null,
        entityCount: null,
      };
  }
}
