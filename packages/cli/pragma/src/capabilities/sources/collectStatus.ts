/**
 * Collect the `sources status` payload — storeless.
 *
 * Reports the store's readiness without booting it. The `store` field IS the
 * boot decision ({@link resolveSources}) — status never re-derives which pack
 * answers reads, so it can never disagree with what the next read actually
 * loads. Everything else is provenance read straight off that pack's manifest
 * (a plain `JSON.parse`, no store, no oxigraph). This is the capability that
 * must stay off the store factory (the storeless-guarantee spy covers it), and
 * it is where the store summary is reported — `info` shows one total instead.
 */

import type { PackDeclaration } from "../../kernel/config/types.js";
import { embeddedManifest } from "../../kernel/runtime/graphpack/embedded.js";
import { readManifest } from "../../kernel/runtime/graphpack/manifest.js";
import { resolveSources } from "../../kernel/runtime/resolveSources.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { SourcesStatusData } from "./types.js";

const entryName = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : entry.name;
const entrySource = (entry: PackDeclaration): string =>
  typeof entry === "string" ? entry : (entry.source ?? entry.name);

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
        // Read straight from the manifest — no index parse. The fallback that
        // used to sit here re-counted the index's abox subjects for a "legacy"
        // pack whose manifest predated the field. `buildPack` has written
        // `entityCount` on every manifest since, the embedded snapshot carries
        // it (550), and no test ever reached the fallback: it was ~25 lines
        // answering for a pack shape this tree cannot produce. A manifest
        // genuinely missing it now reports `null`, which the renderers already
        // print as `?`.
        entityCount: manifest?.entityCount ?? null,
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
