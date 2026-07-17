/**
 * Spec kernel barrel — the grammar and its zod-free projections.
 *
 * `validate.ts` (zod) is intentionally NOT re-exported here: it is imported
 * directly, and lazily, by the registration seams so this barrel — and the
 * `--help`/`__complete` path that reaches it — stays free of zod.
 */

export type {
  EmittedSurface,
  EmittedVerb,
} from "./emitSurface.js";
export {
  emitSurface,
  emitVerb,
  FIXED_SURFACE,
  kebabCase,
  toolName,
  verbLabel,
} from "./emitSurface.js";
export type { Covenant } from "./surfaceConformance.js";
export { assertConforms, deepEqual } from "./surfaceConformance.js";
export type {
  Capability,
  CapabilityModule,
  DisclosureSpec,
  Example,
  Formatters,
  McpAnnotations,
  ParamComplete,
  ParamSpec,
  VerbSpec,
} from "./types.js";
