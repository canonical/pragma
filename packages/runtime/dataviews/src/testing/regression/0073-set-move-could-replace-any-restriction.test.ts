/**
 * Regression: moving a set replaces only the other set operator on its field.
 *
 * Before the fix, `setPredicate` took any operator to replace and never
 * checked it, so a move naming its own operator, a bound or text replaced a
 * restriction nobody meant to lift, in the same transition that applied the
 * new one. Such a command is now rejected with nothing changed.
 */

import { describe, expect, it } from "vitest";
import {
  applyQueryCommand,
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type Predicate,
  type QueryCommand,
} from "../../lib/query/index.js";

const standing = {
  ...EMPTY_SLICE,
  filter: [
    { field: "status", operator: "isAny", operands: ["failed"] },
    { field: "cpu", operator: "gte", operands: [4] },
  ] satisfies Predicate[],
};

/** A move as a JavaScript caller might spell one, unchecked by the compiler. */
const spellMove = (predicate: Predicate, replaces: string): QueryCommand =>
  ({ kind: "setPredicate", predicate, replaces }) as unknown as QueryCommand;

describe("regression 0073 — a set move could replace any restriction", () => {
  it("rejects a move onto its own operator, from a bound, or of text", () => {
    for (const command of [
      spellMove(
        { field: "status", operator: "isAny", operands: ["ready"] },
        "isAny",
      ),
      spellMove(
        { field: "status", operator: "isNone", operands: ["failed"] },
        "gte",
      ),
      spellMove(
        { field: "name", operator: "contains", operands: ["web"] },
        "isAny",
      ),
    ]) {
      const result = applyQueryCommand(standing, DEFAULT_WINDOW, command);
      expect(result.status).toBe("rejected");
      expect(result.slice).toBe(standing);
    }
  });
});
