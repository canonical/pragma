/** Standard domain return types. */

import type { URI } from "@canonical/ke";

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

/** Digest view of a standard for generic list contracts. */
export type StandardDigest = StandardSummary;

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

/** Lightweight reference to a standard, used in block cross-references. */
export interface StandardRef {
  /** Human-readable standard name. */
  readonly name: string;
  /** Full RDF URI of the referenced standard. */
  readonly uri: URI;
  /** Category the referenced standard belongs to. */
  readonly category: string;
}
