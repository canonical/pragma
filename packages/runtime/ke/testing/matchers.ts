import { expect } from "vitest";
import type { ConstructResult, SelectResult, Triple } from "../src/types.js";

/**
 * Custom matcher: check if a ConstructResult contains a specific triple.
 */
function toContainTriple(received: ConstructResult, expected: Partial<Triple>) {
  const found = received.triples.some((triple) => {
    const subjectMatch =
      expected.subject === undefined || triple.subject === expected.subject;
    const predicateMatch =
      expected.predicate === undefined ||
      triple.predicate === expected.predicate;
    const objectMatch =
      expected.object === undefined || triple.object === expected.object;
    return subjectMatch && predicateMatch && objectMatch;
  });

  return {
    pass: found,
    message: () =>
      found
        ? `Expected result not to contain triple matching ${JSON.stringify(expected)}`
        : `Expected result to contain triple matching ${JSON.stringify(expected)}, but it was not found in ${JSON.stringify(received.triples, null, 2)}`,
  };
}

/**
 * Custom matcher: check if a SelectResult contains a binding with a specific value.
 */
function toContainBinding(
  received: SelectResult,
  variable: string,
  value: string,
) {
  const found = received.bindings.some(
    (binding) => binding[variable] === value,
  );

  return {
    pass: found,
    message: () =>
      found
        ? `Expected result not to contain binding ?${variable} = ${value}`
        : `Expected result to contain binding ?${variable} = ${value}, but it was not found`,
  };
}

/**
 * Register custom matchers with vitest.
 */
export function registerMatchers(): void {
  expect.extend({
    toContainTriple,
    toContainBinding,
  });
}

/**
 * Type augmentation for custom matchers.
 */
declare module "vitest" {
  interface Assertion {
    toContainTriple(expected: Partial<Triple>): void;
    toContainBinding(variable: string, value: string): void;
  }
  interface AsymmetricMatchersContaining {
    toContainTriple(expected: Partial<Triple>): void;
    toContainBinding(variable: string, value: string): void;
  }
}
