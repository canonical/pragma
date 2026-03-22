/**
 * Shared operation return types.
 *
 * Contract between the operations layer (D3) and CLI/MCP adapters.
 * Same data, different presentations.
 */

import type { URI } from "@canonical/ke";

// =============================================================================
// Block
// =============================================================================

export interface BlockSummary {
  readonly uri: URI;
  readonly name: string;
  readonly tier: string;
  readonly modifiers: readonly string[];
  readonly implementations: readonly {
    framework: string;
    available: boolean;
  }[];
  readonly nodeCount: number;
  readonly tokenCount: number;
}

export interface AnatomyNode {
  readonly name: string;
  readonly type: "named" | "anonymous";
  readonly children: readonly AnatomyNode[];
  readonly slot?: string;
}

export interface AnatomyTree {
  readonly root: AnatomyNode;
}

export interface BlockDetailed extends BlockSummary {
  readonly anatomy: AnatomyTree | null;
  readonly modifierValues: readonly {
    family: string;
    values: readonly string[];
  }[];
  readonly implementationPaths: readonly { framework: string; path: string }[];
  readonly tokens: readonly TokenRef[];
  readonly standards: readonly StandardRef[];
}

// =============================================================================
// Standard
// =============================================================================

export interface StandardSummary {
  readonly uri: URI;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly extends?: string;
}

export interface CodeBlock {
  readonly language: string;
  readonly code: string;
  readonly caption?: string;
}

export interface StandardDetailed extends StandardSummary {
  readonly dos: readonly CodeBlock[];
  readonly donts: readonly CodeBlock[];
}

export interface CategorySummary {
  readonly name: string;
  readonly standardCount: number;
}

export interface StandardListFilters {
  readonly category?: string;
  readonly search?: string;
}

// =============================================================================
// Modifier
// =============================================================================

export interface ModifierFamily {
  readonly uri: URI;
  readonly name: string;
  readonly values: readonly string[];
}

// =============================================================================
// Token
// =============================================================================

export interface TokenSummary {
  readonly uri: URI;
  readonly name: string;
  readonly category: string;
}

export interface TokenDetailed extends TokenSummary {
  readonly values: readonly { theme: string; value: string }[];
}

export interface TokenRef {
  readonly name: string;
  readonly uri: URI;
}

// =============================================================================
// Standard cross-reference
// =============================================================================

export interface StandardRef {
  readonly name: string;
  readonly uri: URI;
  readonly category: string;
}

// =============================================================================
// Tier
// =============================================================================

export interface TierEntry {
  readonly uri: URI;
  readonly path: string;
  readonly parent?: string;
  readonly depth: number;
}

// =============================================================================
// Graph
// =============================================================================

/** A predicate group from `graph inspect`: one predicate with all its objects. */
export interface PredicateGroup {
  readonly predicate: string;
  readonly objects: readonly string[];
}

/** Result of `graph inspect <uri>`: all triples where URI is subject. */
export interface InspectResult {
  readonly uri: string;
  readonly groups: readonly PredicateGroup[];
}

// =============================================================================
// Ontology
// =============================================================================

/** Summary of a loaded ontology namespace from `ontology list`. */
export interface OntologySummary {
  readonly prefix: string;
  readonly namespace: string;
  readonly classCount: number;
  readonly propertyCount: number;
}

/** A class in an ontology's class hierarchy. */
export interface OntologyClass {
  readonly uri: string;
  readonly label: string;
  readonly superclass?: string;
}

/** A property in an ontology namespace. */
export interface OntologyProperty {
  readonly uri: string;
  readonly label: string;
  readonly domain?: string;
  readonly range?: string;
  readonly type: "object" | "datatype";
}

/** Detailed view of a single ontology namespace from `ontology show`. */
export interface OntologyDetailed {
  readonly prefix: string;
  readonly namespace: string;
  readonly classes: readonly OntologyClass[];
  readonly properties: readonly OntologyProperty[];
}

// =============================================================================
// Filter configuration
// =============================================================================

export interface FilterConfig {
  readonly tier: string | undefined;
  readonly channel: "normal" | "experimental" | "prerelease";
}

// =============================================================================
// Disclosure
// =============================================================================

export type Disclosure =
  | { readonly level: "summary" }
  | { readonly level: "digest"; readonly maxExampleLength?: number }
  | { readonly level: "detailed" };

// =============================================================================
// Batch
// =============================================================================

export interface BatchResult<T> {
  readonly results: readonly T[];
  readonly errors: readonly {
    name: string;
    code: string;
    message: string;
  }[];
}
