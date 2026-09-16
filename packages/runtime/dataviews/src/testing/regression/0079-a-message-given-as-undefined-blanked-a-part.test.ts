/**
 * Regression: a message given as `undefined` keeps its English.
 *
 * Before the fix the merge copied every key it was handed, `undefined`
 * among them, so an application whose catalog had not loaded — or whose
 * lookup missed — put `undefined` over the English. A worded message then
 * threw where a part called it, and a text message rendered as an empty
 * name. Only this repository's strict setting refuses it at compile time,
 * so an ordinary application never saw the type error.
 */

import { describe, expect, it } from "vitest";
import type { DataViewsMessages } from "../../lib/messages/index.js";
import { resolveMessages } from "../../lib/messages/index.js";

describe("regression 0079 — a message given as undefined blanked a part", () => {
  it("keeps English for a text message and a worded one", () => {
    // Through `unknown`: this repository's strict preset refuses the cast
    // that an ordinary application's compiler allows.
    const missed = {
      goToNextPage: undefined,
      selectRow: undefined,
    } as unknown as Partial<DataViewsMessages>;
    const resolved = resolveMessages(missed);
    expect(resolved.goToNextPage).toBe("Next page");
    expect(() => resolved.selectRow("alder")).not.toThrow();
    expect(resolved.selectRow("alder")).toBe("Select alder");
  });

  it("still takes the messages given beside it", () => {
    const resolved = resolveMessages({
      search: "Rechercher",
      filters: undefined,
    } as unknown as Partial<DataViewsMessages>);
    expect(resolved.search).toBe("Rechercher");
    expect(resolved.filters).toBe("Filters");
  });
});
