/**
 * Shared Standard-Schema execution for route `params` and `search` validation.
 *
 * Accepts both real Standard Schema v1 validators (Zod, Valibot, ArkType — see
 * https://standardschema.dev) and the legacy hand-rolled
 * `{ "~standard": { output, validate } }` shape. The router matches
 * synchronously, so validators that resolve to a `Promise` are rejected
 * loudly instead of being silently ignored.
 */

import type { SchemaLike, StandardSchemaIssue } from "./types.js";

export interface SchemaSuccess {
  readonly issues: null;
  readonly value: unknown;
}

export interface SchemaFailure {
  readonly issues: ReadonlyArray<StandardSchemaIssue>;
  readonly value?: undefined;
}

export type SchemaOutcome = SchemaSuccess | SchemaFailure;

function isIssuesResult(
  result: unknown,
): result is { readonly issues: ReadonlyArray<StandardSchemaIssue> } {
  return (
    typeof result === "object" &&
    result !== null &&
    "issues" in result &&
    Array.isArray((result as { issues: unknown }).issues)
  );
}

function isValueResult(result: unknown): result is { readonly value: unknown } {
  return typeof result === "object" && result !== null && "value" in result;
}

/** Join issue messages for a human-readable validation error. */
export function formatIssues(
  issues: ReadonlyArray<StandardSchemaIssue>,
): string {
  return issues.map((issue) => issue.message ?? "Validation error").join(", ");
}

/**
 * Run a schema's validator against a value and normalize the result.
 *
 * - A Standard Schema failure (`{ issues }`) becomes a `SchemaFailure`.
 * - A Standard Schema success (`{ value }`) unwraps to its `value`.
 * - A legacy validator returning the parsed object directly passes through.
 * - A missing validator (legacy type-only schema) passes the input through.
 * - A `Promise` result throws: the router matches synchronously.
 */
export function runSchema(
  schema: SchemaLike<unknown>,
  value: unknown,
  context: string,
): SchemaOutcome {
  const validator = schema["~standard"].validate;

  if (!validator) {
    return { issues: null, value };
  }

  const result = validator(value);

  if (result instanceof Promise) {
    throw new Error(
      `${context}: async schema validation is not supported — the router matches synchronously.`,
    );
  }

  if (isIssuesResult(result)) {
    return { issues: result.issues };
  }

  if (isValueResult(result)) {
    return { issues: null, value: result.value };
  }

  return { issues: null, value: result };
}
