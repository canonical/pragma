/**
 * The union in `types.ts` is hand-spelled rather than imported, because the two
 * graphql majors this package supports declare `BreakingChangeType`
 * differently — v16 as a `declare enum`, v17 as a const-object union — and
 * importing it would make the shipped `.d.ts` vary with the consumer's
 * installed major.
 *
 * Hand-spelling it buys that independence and costs a promise: that the sixteen
 * names really are graphql's set. That promise is this file. A failure here
 * means graphql changed the set, and the union must be updated and the peer
 * range reconsidered — not that the assertion should be relaxed.
 *
 * The import is type-and-value from `graphql`, which is fine: test files are
 * excluded from the build, so nothing here reaches `dist/`.
 */

import { BreakingChangeType } from "graphql";
import { describe, expect, it } from "vitest";
import {
  INVALID_SCHEMA,
  INVALID_SDL,
  ROOT_TYPE_MISMATCH,
} from "./constants.js";
import type { ContractViolationCode } from "./types.js";

/**
 * The sixteen graphql codes, spelled out exactly as `types.ts` spells them.
 * Typed as the union, so removing a name from `types.ts` fails to compile here
 * before it fails to run.
 */
const GRAPHQL_CODES: readonly ContractViolationCode[] = [
  "TYPE_REMOVED",
  "TYPE_CHANGED_KIND",
  "TYPE_REMOVED_FROM_UNION",
  "VALUE_REMOVED_FROM_ENUM",
  "REQUIRED_INPUT_FIELD_ADDED",
  "IMPLEMENTED_INTERFACE_REMOVED",
  "FIELD_REMOVED",
  "FIELD_CHANGED_KIND",
  "REQUIRED_ARG_ADDED",
  "ARG_REMOVED",
  "ARG_CHANGED_KIND",
  "DIRECTIVE_REMOVED",
  "DIRECTIVE_ARG_REMOVED",
  "REQUIRED_DIRECTIVE_ARG_ADDED",
  "DIRECTIVE_REPEATABLE_REMOVED",
  "DIRECTIVE_LOCATION_REMOVED",
];

describe("ContractViolationCode", () => {
  it("carries exactly graphql's BreakingChangeType set, and nothing invented", () => {
    expect([...GRAPHQL_CODES].sort()).toEqual(
      Object.values(BreakingChangeType).sort(),
    );
  });

  it("adds exactly the three codes this package defines itself", () => {
    // The synthetic set: graphql has no notion of "your SDL did not parse" or
    // "your SDL is not a schema", because it never returns a verdict on one
    // schema alone — and its schema comparison never looks at root-type
    // assignments, so "you serve queries from another type" is ours too.
    // Everything else in the union is graphql's.
    const synthetic: readonly ContractViolationCode[] = [
      INVALID_SDL,
      INVALID_SCHEMA,
      ROOT_TYPE_MISMATCH,
    ];
    expect(synthetic).toEqual([
      "INVALID_SDL",
      "INVALID_SCHEMA",
      "ROOT_TYPE_MISMATCH",
    ]);
    for (const code of synthetic) {
      expect(Object.values(BreakingChangeType)).not.toContain(code);
    }
  });
});
