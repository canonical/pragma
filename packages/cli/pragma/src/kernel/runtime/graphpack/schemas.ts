/**
 * The zod schemas validating a pack's persisted artifacts.
 *
 * They live HERE, apart from the contracts in `types.ts`, for one reason: zod is
 * a value dependency, and `types.ts` is reachable from the storeless fast path.
 * `capabilities/index.ts` → `resolveSources` → `packIsComplete` → `readManifest`
 * put `manifest.json`'s schema on the graph `bin.ts` evaluates for `__complete`,
 * costing ~3–4 ms of a ~30 ms budget to build a validator for a ~1 KB file the
 * boot decision only needs to look at. `readManifest` now validates that file
 * structurally, by hand, and this module is imported only by the two readers
 * that are already off the fast path (`read.ts` boots the store; `embedded.ts`
 * materializes the 1.9 MB embedded pack).
 *
 * The schemas remain the EXECUTABLE SPECIFICATION of what a valid artifact is:
 * `graphpack.test.ts` pins `readManifest`'s hand validator to accept exactly
 * what {@link manifestSchema} accepts, in both directions, so the two cannot
 * drift. Change a rule here and that test fails until the hand validator
 * follows. `capabilities/lazy.test.ts` pins the other half — that NO module on
 * the storeless graph imports zod at all — so this split cannot silently close.
 *
 * Each schema is annotated `z.ZodType<T>` against the hand-written contract it
 * validates, so a field added to one and not the other is a type error here
 * rather than a runtime surprise at a read.
 */

import { z } from "zod";
import type { Manifest, PackIndex, PackIndexEntity } from "./types.js";

/** zod schema validating a persisted {@link PackIndexEntity}. */
export const packIndexEntitySchema: z.ZodType<PackIndexEntity> = z.object({
  name: z.string(),
  type: z.string(),
  uri: z.string().optional(),
  prefixed: z.string().optional(),
  types: z.array(z.string()).optional(),
  label: z.string().nullable().optional(),
  altNames: z.array(z.string()).optional(),
  box: z.enum(["tbox", "abox"]).optional(),
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
export const manifestSchema: z.ZodType<Manifest> = z.object({
  name: z.string(),
  version: z.string(),
  /** The config `packs` ref this pack was built from (verbatim), or a label. */
  sourceRef: z.string(),
  contentHash: z.string(),
  prefixes: z.record(z.string(), z.string()),
  createdAt: z.string(),
  /**
   * The store's triple count at build time. Cross-checked against the booted
   * store so a truncated-but-non-empty `data.nq` (a partial graph that passes
   * the mere size>0 completeness gate) surfaces as STORE_UNAVAILABLE rather
   * than being served silently (A9). Optional — packs built before this field
   * skip the check.
   */
  tripleCount: z.number().optional(),
  /**
   * The distinct abox entity count (matches `entityTotal`). Lets
   * `sources status` report the figure without parsing the whole `index.json`
   * (A10). Optional — packs built before this field fall back to the index read.
   */
  entityCount: z.number().optional(),
});
