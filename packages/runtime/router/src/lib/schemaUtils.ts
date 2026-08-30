/**
 * Shared Standard-Schema execution for route `params` and `search` validation.
 *
 * Accepts Standard Schema v1 validators (Zod ≥3.24, Valibot, ArkType — see
 * https://standardschema.dev). The router matches synchronously, so
 * validators that resolve to a `Promise` are rejected loudly instead of
 * being silently ignored, and a validator returning anything other than a
 * spec-shaped `{ value }` / `{ issues }` result throws.
 */

import type { StandardSchemaIssue, StandardSchemaV1 } from "./types.js";

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
  return issues.map((issue) => issue.message).join(", ");
}

/**
 * Run a schema's validator against a value and normalize the result.
 *
 * - A Standard Schema failure (`{ issues }`) becomes a `SchemaFailure`.
 * - A Standard Schema success (`{ value }`) unwraps to its `value`.
 * - A `Promise` result throws: the router matches synchronously.
 * - Any other result throws: the validator does not implement the spec.
 */
export function runSchema(
  schema: StandardSchemaV1,
  value: unknown,
  context: string,
): SchemaOutcome {
  const result = schema["~standard"].validate(value);

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

  throw new Error(
    `${context}: schema validator returned neither { value } nor { issues } — not a Standard Schema v1 result.`,
  );
}
