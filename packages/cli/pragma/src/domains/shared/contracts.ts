/**
 * Shared command and entity-display contracts.
 *
 * These types provide the structural common ground for CLI and MCP surfaces.
 */

import type { FilterConfig } from "./types.js";

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
