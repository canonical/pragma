// =============================================================================
// Shared types for the execution domain: the graphql v17 incremental
// delivery payload shapes and the Relay legacy payload they translate to.
// Grouped here because executeLocal, the drain-and-merge fallback, the Relay
// adapter, and the HTTP handler all exchange these shapes.
//
// The structural types mirror the v17 RC shapes rather than importing them:
// the RC type surface is still settling, and this module is the single
// place that would absorb a format change.
// =============================================================================

import type { ExecutionResult } from "graphql";

/** A pending entry announcing a deferred fragment or stream (2023 format). */
export interface PendingEntry {
  id: string;
  path: ReadonlyArray<string | number>;
  label?: string;
}

/** One incremental delivery: deferred data or streamed items for a pending id. */
export interface IncrementalEntry {
  id: string;
  data?: Record<string, unknown> | null;
  items?: ReadonlyArray<unknown>;
  subPath?: ReadonlyArray<string | number>;
  errors?: ReadonlyArray<unknown>;
}

/** A completion notice for a pending id, with errors when the fragment failed. */
export interface CompletedEntry {
  id: string;
  errors?: ReadonlyArray<unknown>;
}

/** The initial result of an incremental execution (data + pending list). */
export interface InitialIncrementalResult extends ExecutionResult {
  pending?: ReadonlyArray<PendingEntry>;
  hasNext?: boolean;
}

/** A subsequent incremental payload (2023 format). */
export interface SubsequentIncrementalResult {
  pending?: ReadonlyArray<PendingEntry>;
  incremental?: ReadonlyArray<IncrementalEntry>;
  completed?: ReadonlyArray<CompletedEntry>;
  hasNext: boolean;
}

/** An incremental execution: the initial result plus the payload stream. */
export interface IncrementalResults {
  initialResult: InitialIncrementalResult;
  subsequentResults: AsyncGenerator<SubsequentIncrementalResult, void, void>;
}

/** What executeLocal returns: a plain result or an incremental stream. */
export type LocalExecutionResult = ExecutionResult | IncrementalResults;

/** A payload in Relay's legacy incremental shape (path/label, is_final). */
export interface RelayLegacyPayload {
  data?: Record<string, unknown> | null;
  errors?: ReadonlyArray<unknown>;
  path?: ReadonlyArray<string | number>;
  label?: string;
  extensions?: Record<string, unknown>;
}
