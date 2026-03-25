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

/** Summary view of a design-system block (component, pattern, or primitive). */
export interface BlockSummary {
  /** Full RDF URI identifying this block in the ke store. */
  readonly uri: URI;
  /** Human-readable name (local name extracted from URI). */
  readonly name: string;
  /** Normalized ontology type for the block. */
  readonly type: "component" | "pattern" | "layout" | "subcomponent";
  /** Tier path this block belongs to (e.g., `"global"`, `"apps/lxd"`). */
  readonly tier: string;
  /** Active modifier names applied to this block. */
  readonly modifiers: readonly string[];
  /** Framework implementations declared for this block, with availability flags. */
  readonly implementations: readonly {
    framework: string;
    available: boolean;
  }[];
  /** Number of anatomy nodes (DOM elements) in this block's anatomy tree. */
  readonly nodeCount: number;
  /** Number of design tokens referenced by this block. */
  readonly tokenCount: number;
}

/** Digest view of a block for richer summary displays. */
export interface BlockDigest extends BlockSummary {
  /** Summary guidance when present in the graph. */
  readonly summary: string | null;
}

/** Single node in a block's anatomy tree (recursive). */
export interface AnatomyNode {
  /** Element name (e.g., `"trigger"`, `"panel"`). */
  readonly name: string;
  /** Whether the node is explicitly named or inferred as anonymous. */
  readonly type: "named" | "anonymous";
  /** Child nodes nested under this element. */
  readonly children: readonly AnatomyNode[];
  /** Named slot this node exposes, if any. */
  readonly slot?: string;
}

/** Wrapper around the root of a block's anatomy tree. */
export interface AnatomyTree {
  /** Top-level anatomy node from which all children descend. */
  readonly root: AnatomyNode;
}

/** Detailed view of a block, extending the digest with anatomy, tokens, and standards. */
export interface BlockDetailed extends BlockDigest {
  /** Guidance on when the block should be used. */
  readonly whenToUse: string | null;
  /** Guidance on when the block should not be used. */
  readonly whenNotToUse: string | null;
  /** Additional usage guidance. */
  readonly guidelines: string | null;
  /** YAML anatomy DSL payload when present. */
  readonly anatomyDsl: string | null;
  /** Legacy anatomy payload when present. */
  readonly anatomyClassic: string | null;
  /** Figma reference link when present. */
  readonly figmaLink: string | null;
  /** Full anatomy tree, or `null` if the block declares no anatomy. */
  readonly anatomy: AnatomyTree | null;
  /** Modifier families with their allowed values. */
  readonly modifierValues: readonly {
    family: string;
    values: readonly string[];
  }[];
  /** Modifier families resolved as richer objects. */
  readonly modifierFamilies: readonly {
    uri: URI;
    name: string;
    values: readonly string[];
  }[];
  /** Property metadata resolved from blank nodes. */
  readonly properties: readonly {
    name: string;
    propertyType: string;
    optional: boolean;
    defaultValue: string | null;
    constraints: string | null;
  }[];
  /** Direct subcomponents of the block. */
  readonly subcomponents: readonly {
    uri: URI;
    name: string;
  }[];
  /** File paths to framework-specific implementations. */
  readonly implementationPaths: readonly { framework: string; path: string }[];
  /** Design tokens referenced by this block. */
  readonly tokens: readonly TokenRef[];
  /** Standards (guidelines/rules) that apply to this block. */
  readonly standards: readonly StandardRef[];
}

// =============================================================================
// Standard
// =============================================================================

/** Summary view of a design-system standard (guideline or rule). */
export interface StandardSummary {
  /** Full RDF URI identifying this standard in the ke store. */
  readonly uri: URI;
  /** Human-readable name of the standard. */
  readonly name: string;
  /** Category grouping (e.g., `"accessibility"`, `"layout"`). */
  readonly category: string;
  /** Brief prose description of what the standard prescribes. */
  readonly description: string;
  /** URI of the parent standard this one extends, if any. */
  readonly extends?: string;
}

/** Fenced code block used in standard do/don't examples. */
export interface CodeBlock {
  /** Programming language identifier for syntax highlighting. */
  readonly language: string;
  /** Source code content of the example. */
  readonly code: string;
  /** Optional explanatory caption displayed alongside the code. */
  readonly caption?: string;
}

/** Detailed view of a standard, extending the summary with code examples. */
export interface StandardDetailed extends StandardSummary {
  /** Positive examples demonstrating correct usage. */
  readonly dos: readonly CodeBlock[];
  /** Negative examples demonstrating incorrect usage. */
  readonly donts: readonly CodeBlock[];
}

/** Summary of a standards category with its member count. */
export interface CategorySummary {
  /** Category name (e.g., `"accessibility"`, `"layout"`). */
  readonly name: string;
  /** Number of standards belonging to this category. */
  readonly standardCount: number;
}

/** Optional filters for narrowing the standards list. */
export interface StandardListFilters {
  /** Restrict results to a single category name. */
  readonly category?: string;
  /** Free-text search term matched against standard names and descriptions. */
  readonly search?: string;
}

// =============================================================================
// Modifier
// =============================================================================

/** A modifier family (e.g., "size", "variant") with its allowed values. */
export interface ModifierFamily {
  /** Full RDF URI identifying this modifier family. */
  readonly uri: URI;
  /** Human-readable family name. */
  readonly name: string;
  /** Allowed values within this family (e.g., `["small", "medium", "large"]`). */
  readonly values: readonly string[];
}

// =============================================================================
// Token
// =============================================================================

/** Summary view of a design token. */
export interface TokenSummary {
  /** Full RDF URI identifying this token in the ke store. */
  readonly uri: URI;
  /** Human-readable token name (e.g., `"color-primary"`). */
  readonly name: string;
  /** Token category (e.g., `"color"`, `"spacing"`, `"typography"`). */
  readonly category: string;
}

/** Detailed view of a token, extending the summary with per-theme resolved values. */
export interface TokenDetailed extends TokenSummary {
  /** Resolved values keyed by theme (e.g., `{ theme: "dark", value: "#fff" }`). */
  readonly values: readonly { theme: string; value: string }[];
}

/** Lightweight reference to a token (name + URI), used in cross-references. */
export interface TokenRef {
  /** Human-readable token name. */
  readonly name: string;
  /** Full RDF URI of the referenced token. */
  readonly uri: URI;
}

// =============================================================================
// Standard cross-reference
// =============================================================================

/** Lightweight reference to a standard, used in block cross-references. */
export interface StandardRef {
  /** Human-readable standard name. */
  readonly name: string;
  /** Full RDF URI of the referenced standard. */
  readonly uri: URI;
  /** Category the referenced standard belongs to. */
  readonly category: string;
}

// =============================================================================
// Tier
// =============================================================================

/** A single entry in the tier hierarchy (e.g., `global`, `apps`, `apps/lxd`). */
export interface TierEntry {
  /** Full RDF URI identifying this tier in the ke store. */
  readonly uri: URI;
  /** Slash-separated tier path (e.g., `"apps/lxd"`). */
  readonly path: string;
  /** Path of the parent tier, if this is not the root. */
  readonly parent?: string;
  /** Nesting depth in the tier hierarchy (0 = root). */
  readonly depth: number;
}

// =============================================================================
// Graph
// =============================================================================

/** A predicate group from `graph inspect`: one predicate with all its objects. */
export interface PredicateGroup {
  /** RDF predicate URI (e.g., `"rdfs:label"`). */
  readonly predicate: string;
  /** Object values (URIs or literals) associated with this predicate. */
  readonly objects: readonly string[];
}

/** Result of `graph inspect <uri>`: all triples where URI is subject. */
export interface InspectResult {
  /** The inspected subject URI. */
  readonly uri: string;
  /** Predicate groups aggregating all outgoing triples. */
  readonly groups: readonly PredicateGroup[];
}

// =============================================================================
// Ontology
// =============================================================================

/** Summary of a loaded ontology namespace from `ontology list`. */
export interface OntologySummary {
  /** Short prefix alias (e.g., `"ds"`, `"cs"`). */
  readonly prefix: string;
  /** Full namespace URI the prefix expands to. */
  readonly namespace: string;
  /** Number of OWL/RDFS classes defined in this namespace. */
  readonly classCount: number;
  /** Number of properties (object + datatype) defined in this namespace. */
  readonly propertyCount: number;
  readonly anatomyCount: number;
}

/** A class in an ontology's class hierarchy. */
export interface OntologyClass {
  /** Full URI of the class. */
  readonly uri: string;
  /** Human-readable label (rdfs:label). */
  readonly label: string;
  /** URI of the direct superclass, if declared. */
  readonly superclass?: string;
}

/** A property in an ontology namespace. */
export interface OntologyProperty {
  /** Full URI of the property. */
  readonly uri: string;
  /** Human-readable label (rdfs:label). */
  readonly label: string;
  /** URI of the domain class this property applies to, if declared. */
  readonly domain?: string;
  /** URI of the range class or datatype, if declared. */
  readonly range?: string;
  /** Whether this is an object property (links classes) or datatype property (links to literals). */
  readonly type: "object" | "datatype";
}

/** Detailed view of a single ontology namespace from `ontology show`. */
export interface OntologyDetailed {
  /** Short prefix alias (e.g., `"ds"`). */
  readonly prefix: string;
  /** Full namespace URI the prefix expands to. */
  readonly namespace: string;
  /** All classes defined in this namespace. */
  readonly classes: readonly OntologyClass[];
  /** All properties defined in this namespace. */
  readonly properties: readonly OntologyProperty[];
}

// =============================================================================
// Filter configuration
// =============================================================================

/** Runtime filter settings controlling tier and channel visibility in queries. */
export interface FilterConfig {
  /** Active tier path, or `undefined` for all-tiers visibility. */
  readonly tier: string | undefined;
  /** Release channel determining which stability levels are visible. */
  readonly channel: "normal" | "experimental" | "prerelease";
}

// =============================================================================
// Disclosure
// =============================================================================

/**
 * Controls how much detail an operation returns.
 *
 * - `"summary"` — minimal fields (names and counts).
 * - `"digest"` — intermediate detail with optional example length cap.
 * - `"detailed"` — full content including code blocks and anatomy.
 */
export type Disclosure =
  | { readonly level: "summary" }
  | { readonly level: "digest"; readonly maxExampleLength?: number }
  | { readonly level: "detailed" };

// =============================================================================
// Batch
// =============================================================================

/** Outcome of a batch operation: successful results alongside per-item errors. */
export interface BatchResult<T> {
  /** Items that were processed successfully. */
  readonly results: readonly T[];
  /** Items that failed, each carrying the entity name, error code, and message. */
  readonly errors: readonly {
    name: string;
    code: string;
    message: string;
  }[];
}
