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
 * zod is a WATCHED dependency here (`capabilities/lazy.test.ts` asserts the
 * command-tree graph reaches none of it, `config/schema.ts`'s docblock lists
 * the sanctioned seams). Adding an importer to this directory is a decision,
 * not a convenience.
 */

import { z } from "zod";
import type { PackIndex, PackIndexEntity } from "./types.js";

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
