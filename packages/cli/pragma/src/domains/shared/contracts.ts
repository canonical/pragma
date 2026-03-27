/**
 * Shared command and entity-display contracts.
 *
 * These types provide the structural common ground for CLI and MCP surfaces.
 */

import type { FilterConfig } from "./types/index.js";

export interface ColumnDef<T> {
  readonly key: keyof T & string;
  readonly label: string;
  readonly format?: (value: unknown) => string;
  readonly showWhenEmpty?: boolean;
}

export type SectionKind =
  | "field"
  | "code"
  | "list"
  | "table"
  | "nested-table"
  | "tree";

export interface SectionDef<T> {
  readonly key: keyof T & string;
  readonly heading: string;
  readonly kind: SectionKind;
  readonly showWhenEmpty?: boolean;
}

export interface ListParams {
  readonly allTiers?: boolean;
  readonly digest?: boolean;
  readonly detailed?: boolean;
  readonly condensed?: boolean;
}

export interface LookupParams {
  readonly names: readonly string[];
  readonly detailed?: boolean;
  readonly condensed?: boolean;
}

export interface ListResult<T> {
  readonly items: readonly T[];
  readonly filters: FilterConfig;
  readonly disclosure:
    | { readonly level: "summary" }
    | { readonly level: "digest"; readonly maxExampleLength?: number }
    | { readonly level: "detailed" };
}

export interface LookupResult<T> {
  readonly results: readonly T[];
  readonly errors: readonly {
    query: string;
    code: string;
    message: string;
  }[];
}

export interface ShowContract<T> {
  readonly result: T;
}

export interface MutateContract<TParams, TResult> {
  readonly params: TParams;
  readonly result: TResult;
  readonly confirmation: string;
}

export interface ListContract<
  TSummary,
  TDigest extends TSummary,
  TDetailed extends TDigest,
> {
  readonly params: ListParams;
  readonly result: ListResult<TSummary | TDigest | TDetailed>;
}

export interface LookupContract<TDetailed> {
  readonly params: LookupParams;
  readonly result: LookupResult<TDetailed>;
}

// ---------------------------------------------------------------------------
// Renderer contracts
// ---------------------------------------------------------------------------

/** A single inline field rendered in a lookup heading block. */
export interface LookupField<T> {
  readonly label: string;
  readonly value: (entity: T) => unknown;
}

/** Per-mode override callbacks for a lookup section. */
export interface LookupSectionOverride<T> {
  readonly plain?: (entity: T, section: SectionDef<T>) => string | null;
  readonly llm?: (entity: T, section: SectionDef<T>) => string | null;
}

/** Options controlling the generic list renderer. */
export interface RenderListOptions<T> {
  readonly heading: string;
  readonly columns: readonly ColumnDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
}

/** Options controlling the generic lookup renderer. */
export interface RenderLookupOptions<T> {
  readonly title: (entity: T) => string;
  readonly fields: readonly LookupField<T>[];
  readonly sections: readonly SectionDef<T>[];
  readonly prefixes?: Readonly<Record<string, string>>;
  readonly sectionOverrides?: Partial<
    Record<keyof T & string, LookupSectionOverride<T>>
  >;
  readonly codeLanguage?: (section: SectionDef<T>, value: unknown) => string;
}

// ---------------------------------------------------------------------------
// Entity display configuration
// ---------------------------------------------------------------------------

export interface EntityDisplayConfig<
  TSummary,
  TDigest extends TSummary,
  TDetailed extends TDigest,
> {
  readonly domain: string;
  readonly entityName: string;
  readonly rdfTypes: readonly string[];
  readonly listColumns: readonly ColumnDef<TSummary>[];
  readonly digestColumns: readonly ColumnDef<TDigest>[];
  readonly lookupSections: readonly SectionDef<TDetailed>[];
  readonly emptyRecovery: (filters: FilterConfig) => {
    readonly message: string;
    readonly cli?: string;
    readonly mcp?: {
      readonly tool: string;
      readonly params?: Record<string, unknown>;
    };
  };
  readonly notFoundRecovery: (query: string) => {
    readonly message: string;
    readonly cli?: string;
    readonly mcp?: {
      readonly tool: string;
      readonly params?: Record<string, unknown>;
    };
  };
}
