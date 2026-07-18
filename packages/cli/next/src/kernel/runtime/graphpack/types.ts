/**
 * Graphpack artifact contracts — the four files a built pack directory holds
 * and the zod schemas that keep them honest on read.
 *
 * A pack is the content-addressed, boot-ready form of a set of RDF sources:
 * `data.nq` (the store's n-quads dump — boots via ke's cache path, no TTL
 * parse), `schema.json` (the serialized ke-graphql extraction — boots via
 * `compileFromExtraction`, no live 7-pass compile), `index.json` (the storeless
 * entity index the completion tier and reads consume), and `manifest.json`
 * (provenance + the prefixes the store was built with). A directory missing
 * `manifest.json` is treated as absent (a torn build), so writes are always
 * temp-dir + atomic rename.
 *
 * This module is reached only behind a dynamic import (pack build / read /
 * store boot), so its zod dependency never lands on the storeless fast path.
 */

import { z } from "zod";

/** The n-quads store dump — ke boots it via `createStore({ cache })`. */
export const DATA_FILE = "data.nq";
/** The serialized ke-graphql extraction — boots via `compileFromExtraction`. */
export const SCHEMA_FILE = "schema.json";
/** The storeless entity index (PR-C's dynamic-completion contract). */
export const INDEX_FILE = "index.json";
/** Provenance + prefixes; its presence marks a pack directory as complete. */
export const MANIFEST_FILE = "manifest.json";

/**
 * One indexed entity. The `{ name, type }` pair is the FROZEN minimum the
 * dynamic-completion tier (and PR-C's read verbs) rely on; every other field is
 * enrichment a later PR may add without breaking the contract.
 */
export interface PackIndexEntity {
  /** Completion token — the prefixed name a user types (e.g. `ds:Button`). */
  readonly name: string;
  /** Prefixed primary `rdf:type` — the completion filter key (e.g. `ds:UIBlock`). */
  readonly type: string;
  /** Full subject URI. */
  readonly uri?: string;
  /** Prefixed subject (same value as `name`, kept explicit for readers). */
  readonly prefixed?: string;
  /** All prefixed `rdf:type` values asserted on the subject. */
  readonly types?: readonly string[];
  /** Human label (rdfs:label / skos:prefLabel / dcterms:title / schema:name). */
  readonly label?: string | null;
  /** Schema (`tbox`) vs individual (`abox`). */
  readonly box?: "tbox" | "abox";
  /** Fine-grained kind (v2 enrichment) — for the resource browser. */
  readonly category?: "class" | "property" | "individual";
  /** Prefixed primary domain class of an individual (`null` for schema). */
  readonly primaryType?: string | null;
  /** Human label of the primary type (the type's local name when unlabelled). */
  readonly primaryTypeLabel?: string | null;
  /** Short description (rdfs:comment / dcterms:description / skos:definition). */
  readonly description?: string | null;
}

/**
 * The storeless entity index a pack ships as `index.json`.
 *
 * `version` is `2` for packs built by this kernel (the v2 enrichment fields on
 * each entity + the resource browser depend on it); `1` is a legacy artifact
 * whose enrichment is absent — the resources provider degrades to a "run
 * `pragma sources update`" hint rather than a live re-index.
 */
export interface PackIndex {
  readonly version: 1 | 2;
  /** The pack's content hash (matches its cache directory name). */
  readonly contentHash: string;
  readonly prefixes: Readonly<Record<string, string>>;
  readonly entities: readonly PackIndexEntity[];
  /** Full-type-URI → count of asserted instances. */
  readonly instanceCountByType: Readonly<Record<string, number>>;
}

/** zod schema validating a persisted {@link PackIndexEntity}. */
export const packIndexEntitySchema: z.ZodType<PackIndexEntity> = z.object({
  name: z.string(),
  type: z.string(),
  uri: z.string().optional(),
  prefixed: z.string().optional(),
  types: z.array(z.string()).optional(),
  label: z.string().nullable().optional(),
  box: z.enum(["tbox", "abox"]).optional(),
  category: z.enum(["class", "property", "individual"]).optional(),
  primaryType: z.string().nullable().optional(),
  primaryTypeLabel: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

/** zod schema validating a persisted {@link PackIndex}. */
export const packIndexSchema: z.ZodType<PackIndex> = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  contentHash: z.string(),
  prefixes: z.record(z.string(), z.string()),
  entities: z.array(packIndexEntitySchema),
  instanceCountByType: z.record(z.string(), z.number()),
});

/** zod schema validating a persisted `manifest.json`. */
export const manifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  /** The config `packages` ref this pack was built from (verbatim), or a label. */
  sourceRef: z.string(),
  contentHash: z.string(),
  prefixes: z.record(z.string(), z.string()),
  createdAt: z.string(),
});

/** Pack provenance and the prefixes the store was built with. */
export type Manifest = z.infer<typeof manifestSchema>;
