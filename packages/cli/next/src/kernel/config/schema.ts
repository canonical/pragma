/**
 * Zod validation for a config layer.
 *
 * One of the three sanctioned zod seams (validate.ts / mcp/registerVerb.ts /
 * config/schema.ts) — never reached from the `--help` or `__complete` fast
 * path, which are storeless and config-free. Validates the raw shape a global
 * JSON file or an evaluated `pragma.config.ts` declares; unknown keys are
 * stripped for forward compatibility, and only present keys survive so layer
 * merging keeps honest per-field provenance.
 */

import { z } from "zod";
import { PragmaError } from "../error/PragmaError.js";
import { CHANNELS, type RawConfig } from "./types.js";

const packageEntrySchema = z.union([
  z.string().min(1),
  z.object({ name: z.string().min(1), source: z.string().optional() }),
]);

const completionSchema = z.object({
  minChars: z.number().int().min(0).optional(),
  caseSensitive: z.boolean().optional(),
  families: z.record(z.string(), z.boolean()).optional(),
});

const rawConfigSchema = z.object({
  tier: z.string().optional(),
  channel: z.enum(CHANNELS).optional(),
  detail: z.string().optional(),
  packages: z.array(packageEntrySchema).optional(),
  stories: z.array(z.unknown()).optional(),
  prefixes: z.record(z.string(), z.string()).optional(),
  prompts: z.record(z.string(), z.unknown()).optional(),
  completion: completionSchema.optional(),
});

/**
 * Validate a raw config value into a {@link RawConfig}.
 *
 * @param value - The parsed JSON or evaluated module default.
 * @param source - The file path, used in error messages.
 * @returns The validated layer values (only the keys actually present).
 * @throws PragmaError with code `CONFIG_ERROR` on an invalid shape.
 */
export function parseRawConfig(value: unknown, source: string): RawConfig {
  const result = rawConfigSchema.safeParse(value ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "<root>";
    throw PragmaError.configError(
      `Invalid config in ${source} at ${path}: ${issue?.message ?? "unknown error"}.`,
    );
  }
  return result.data as RawConfig;
}
