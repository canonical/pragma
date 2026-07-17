/**
 * Hash-gated `schema.graphql` artifact.
 *
 * pragma keeps one compiled GraphQL schema per data set so downstream
 * tooling (codegen, IDEs, `graphql serve` clients) always has a current
 * SDL without anyone running `pragma graphql build` by hand:
 *
 * - **Location** — next to the project's `pragma.config.json`
 *   (`<projectRoot>/.pragma/schema.graphql`) when one is in tree, else the
 *   XDG data dir (`$XDG_DATA_HOME/pragma/schema.graphql`).
 * - **Emission** — on first use of pragma (any command that boots the
 *   runtime) the artifact is generated if missing.
 * - **Renewal** — the artifact's first line records the hash of the TTL
 *   sources it was compiled from (`# pragma:sources <hash>`); it is
 *   recompiled only when the resolved sources no longer match that hash.
 *
 * Failure is never fatal: a schema that does not compile leaves the
 * previous artifact in place and the boot proceeds with a warning.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createStore, definePlugin, type InlineSource } from "@canonical/ke";
import { hashSources } from "@canonical/ke-graphql";
import { findProjectConfigPath } from "#config";
import { dataRoot } from "../../refs/operations/paths.js";
import type { PragmaRuntime } from "../../shared/runtime.js";
import compileSchema from "./compileSchema.js";

/** First-line marker carrying the source fingerprint. */
const HASH_HEADER = "# pragma:sources ";

/** Environment kill-switch (CI, tests, air-gapped boots). */
const DISABLE_ENV = "PRAGMA_SCHEMA_ARTIFACT";

export interface SchemaArtifactResult {
  /** Absolute path of the artifact. */
  readonly path: string;
  /**
   * What happened: `fresh` (hash matched, nothing to do), `written`
   * (compiled and saved), `failed` (compilation failed, artifact left
   * as-is), `skipped` (no sources, or disabled via env).
   */
  readonly status: "fresh" | "written" | "failed" | "skipped";
}

/**
 * Where the schema artifact lives for a working directory: project-local
 * (`.pragma/` beside the nearest `pragma.config.json`) when the project is
 * configured, global XDG data dir otherwise.
 */
export function resolveSchemaArtifactPath(cwd: string): string {
  const configPath = findProjectConfigPath(cwd);
  return configPath
    ? join(dirname(configPath), ".pragma", "schema.graphql")
    : join(dataRoot(), "schema.graphql");
}

/**
 * Ensure the schema artifact exists and matches the runtime's resolved
 * TTL sources, recompiling only on hash mismatch.
 *
 * @note Impure — reads and writes the artifact; compiles via a throwaway
 *   ke store when stale.
 */
export default async function ensureSchemaArtifact(
  runtime: Pick<PragmaRuntime, "cwd" | "packages" | "store">,
): Promise<SchemaArtifactResult> {
  const path = resolveSchemaArtifactPath(runtime.cwd);

  if (process.env[DISABLE_ENV] === "off") {
    return { path, status: "skipped" };
  }

  // Sort by provenance path so the fingerprint is stable across boots
  // regardless of package resolution order.
  const sources: InlineSource[] = runtime.packages
    .flatMap((pkg) =>
      pkg.graphs.map((graph) => ({
        content: graph.content,
        format: "turtle" as const,
        path: graph.path,
      })),
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  if (sources.length === 0) {
    return { path, status: "skipped" };
  }

  const hash = hashSources(sources.map((source) => source.content));

  if (existsSync(path)) {
    const firstLine = readFileSync(path, "utf-8").split("\n", 1)[0];
    if (firstLine === `${HASH_HEADER}${hash}`) {
      return { path, status: "fresh" };
    }
  }

  // Mirror boot's "one bad file cannot break boot": compile from the
  // parseable sources only. The runtime already warned about any malformed
  // graph while booting the main store, so the filter here is silent.
  // The fingerprint above covers ALL sources, so fixing a malformed file
  // changes the hash and triggers recompilation.
  const parseable = await filterParseableSources(sources);
  if (parseable.length === 0) {
    return { path, status: "failed" };
  }

  const outcome = await compileSchema({
    sources: parseable,
    prefixes: runtime.store.prefixes,
    cwd: runtime.cwd,
  });

  if (outcome.status === "failed" || !outcome.compiled) {
    return { path, status: "failed" };
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${HASH_HEADER}${hash}\n${outcome.compiled.sdl}`,
    "utf-8",
  );

  return { path, status: "written" };
}

/**
 * Drop sources the Turtle parser rejects, keeping the rest — the same
 * tolerance the main store's graph loader applies at boot. Probes with a
 * throwaway store so the strict `graphql check` semantics of
 * {@link compileSchema} stay untouched.
 */
async function filterParseableSources(
  sources: readonly InlineSource[],
): Promise<InlineSource[]> {
  const parseable: InlineSource[] = [];
  const probe = definePlugin({
    name: "pragma-schema-artifact-probe",
    onReady(ctx) {
      for (const source of sources) {
        try {
          ctx.load(source.content, { format: source.format });
          parseable.push(source);
        } catch {
          // Already warned at boot by the main store's graph loader.
        }
      }
    },
  });

  const store = await createStore({ sources: [], plugins: [probe] });
  store.dispose();
  return parseable;
}
