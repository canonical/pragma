/** Block domain return types. */

import type { URI } from "@canonical/ke";
import type { StandardRef } from "./standard.js";
import type { TokenRef } from "./token.js";

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

/** Recursive subcomponent entry used in block detailed views. */
export interface BlockSubcomponent {
  /** Full RDF URI of the subcomponent. */
  readonly uri: URI;
  /** Human-readable subcomponent name. */
  readonly name: string;
  /** Nested subcomponents owned by this subcomponent. */
  readonly children: readonly BlockSubcomponent[];
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
  readonly subcomponents: readonly BlockSubcomponent[];
  /** File paths to framework-specific implementations. */
  readonly implementationPaths: readonly { framework: string; path: string }[];
  /** Design tokens referenced by this block. */
  readonly tokens: readonly TokenRef[];
  /** Standards (guidelines/rules) that apply to this block. */
  readonly standards: readonly StandardRef[];
}
