/**
 * @module types
 *
 * Shared operation return types — contract between operations (D3) and
 * CLI/MCP adapters. Same data, different presentations.
 *
 * Per-domain files keep each concern isolated; this barrel re-exports
 * everything for consumers that import from `shared/types/index.js`.
 */

export type {
  AnatomyNode,
  AnatomyTree,
  BlockDetailed,
  BlockDigest,
  BlockSubcomponent,
  BlockSummary,
} from "./block.js";
export type { BatchResult, Disclosure, FilterConfig } from "./common.js";
export type { InspectResult, PredicateGroup } from "./graph.js";
export type {
  ModifierDetailed,
  ModifierDigest,
  ModifierFamily,
  ModifierSummary,
} from "./modifier.js";
export type {
  OntologyClass,
  OntologyClassFocus,
  OntologyConstraint,
  OntologyDetailed,
  OntologyMeta,
  OntologyProperty,
  OntologyQueryHint,
  OntologySummary,
} from "./ontology.js";
export type { PragmaGraphqlApi, PragmaRuntime } from "./runtime.js";
export type { SampleOutput, SampleResult } from "./sample.js";
export type { StandardRef } from "./standard.js";
export type { TierEntry } from "./tier.js";
export type {
  TokenDetailed,
  TokenDigest,
  TokenRef,
  TokenSummary,
} from "./token.js";
