/**
 * Public, types-only API surface for `@canonical/pragma-next`.
 *
 * Per the tool-ts convention this barrel exports types only — no runtime
 * values cross the package boundary. Consumers (and the surface emitter's
 * golden) depend on the grammar and cross-cutting shapes, never on internal
 * command builders, projectors, or infrastructure.
 *
 * @module
 */

export type {
  Capability,
  CapabilityModule,
  DetailLevel,
  DisclosureSpec,
  Example,
  Formatters,
  McpAnnotations,
  OutputFormat,
  ParamComplete,
  ParamSpec,
  VerbSpec,
} from "./types.js";
