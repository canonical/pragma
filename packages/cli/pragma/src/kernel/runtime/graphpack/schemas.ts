/**
 * The zod schemas for the pack artifacts that are NOT on the boot decision.
 *
 * They live apart from `types.ts` for one measured reason: `types.ts` is
 * reached — through `manifest.ts`, `packIsComplete` and `resolveSources` — from
 * `capabilities/index.ts`, i.e. from building the command tree, `__complete`
 * and `--help` included. While the schemas lived there, zod was evaluated on
 * every invocation of the storeless fast path. Only `read.ts` needs a validator
 * (it parses `index.json` while booting a store), and `read.ts` already pulls
 * `@canonical/ke` and `oxigraph`, so it is nowhere near that path.
 *
 * `manifest.json` deliberately has NO schema here. It is the one artifact the
 * boot decision reads, so it is validated by `manifest.ts#parseManifest`, a
 * hand-written structural check — one reader, zero drift surface. A hand
 * validator kept beside a retained zod schema would be two writings of the same
 * grammar, which is the shape of defect this programme keeps finding.
 *
 * zod is a WATCHED dependency here. This module is the FIFTH of the sanctioned
 * seams `config/schema.ts`'s docblock enumerates — that list is the register,
 * and it undercounted by one (this one) until PR7's fix-fold. Nothing enforces
 * the count: `capabilities/lazy.test.ts` asserts an exact EMPTY set on the
 * command-tree graph, and this module is deliberately off that graph, so the
 * enumeration is the only record there is. Adding an importer to this directory
 * is a decision, not a convenience. Take the census with
 * `grep -E 'from "zod(/[^"]*)?"'` — the bare form alone misses a subpath import.
 *
 * ONE export, for one importer. `packIndexEntitySchema` is module-private
 * because nothing outside this file has ever referenced it — it was already a
 * dead export in `graphpack/types.ts`, and the move that created this module
 * carried the deadness along rather than dropping it while the file was open.
 */

import { z } from "zod";
import type { PackIndex, PackIndexEntity } from "./types.js";

/** zod schema validating a persisted {@link PackIndexEntity}. */
const packIndexEntitySchema: z.ZodType<PackIndexEntity> = z.object({
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
