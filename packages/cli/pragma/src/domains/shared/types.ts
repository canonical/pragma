/**
 * TB.01 — Shared operation return types.
 *
 * Contract between the operations layer (D3) and CLI/MCP adapters.
 * Same data, different presentations.
 *
 * @see B.24.TYPE_BOUNDARIES
 */

import type { URI } from "@canonical/ke";

// =============================================================================
// Component
// =============================================================================

export interface ComponentSummary {
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

export interface ComponentDetailed extends ComponentSummary {
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
// Filter configuration
// =============================================================================

export interface FilterConfig {
  readonly tier: string | undefined;
  readonly channel: "normal" | "experimental" | "prerelease";
}
