/**
 * Narrowing assertions for test bodies that read a field straight off a value
 * the types call optional — above all a GraphQL `ExecutionResult["data"]`,
 * which stays `| null | undefined` even for a query the test has just asserted
 * produced no errors.
 *
 * Casting over the optional chain (`result.data?.thing as Thing`) asserts the
 * value is present without checking it: when it is absent the test dies on a
 * `TypeError` about a property of `undefined`, several reads away from the
 * cause. Asserting first fails at the cause, names it, and lets the rest of
 * the test read the value without optional chaining.
 *
 * Internal test support only: excluded from the build, never shipped in dist.
 *
 * @module testing/assertPresent
 */

/** The part of an execution result — or of a Relay payload — these need. */
interface ResultLike {
  readonly data?: Record<string, unknown> | null;
  readonly errors?: readonly unknown[] | null;
}

/**
 * Throws unless `value` is neither `null` nor `undefined`, narrowing it for
 * the rest of the enclosing scope.
 *
 * @param value - the possibly-absent value
 * @param what - what was expected, named in the failure message
 */
export function assertPresent<T>(
  value: T,
  what: string,
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${what} to be present, got ${String(value)}.`);
  }
}

/** Best-effort message for whatever an execution result put in `errors`. */
function describeError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Throws unless `result` carried data, narrowing `result.data` for the rest of
 * the enclosing scope. Reports the result's errors, which are what explains an
 * absent `data` nine times in ten.
 *
 * @param result - the execution result the test is about to read fields from
 */
export function assertData<T extends ResultLike>(
  result: T,
): asserts result is T & { data: NonNullable<T["data"]> } {
  if (result.data === null || result.data === undefined) {
    const errors = result.errors ?? [];
    const detail =
      errors.length > 0
        ? `errors: ${errors.map(describeError).join("; ")}`
        : "no errors were reported.";
    throw new Error(
      `Expected the execution result to carry data, got ${String(
        result.data,
      )}. ${detail}`,
    );
  }
}
