/**
 * The lens filter vocabulary's contracts. These pin the two properties the
 * whole explorer rests on: the DEFAULT is a no-op (the SSR determinism
 * rule — a non-no-op default would change first paint and break
 * hydration), and text never reaches the chip predicate (the rail/graph
 * separation the exhibit establishes).
 */

import { describe, expect, it } from "vitest";
import {
  ABSTRACTION_VALUES,
  abstractionOf,
  allNamespacesFilter,
  DEFAULT_LENS_FILTER,
  matchesChips,
  matchesText,
  normalizeFilterText,
  toggleIn,
} from "./lensFilter.js";

describe("the default filter is a no-op (the SSR determinism keystone)", () => {
  it("matches every term's text", () => {
    expect(
      matchesText(DEFAULT_LENS_FILTER.text, "UI Block", "ds:UIBlock"),
    ).toBe(true);
    expect(matchesText(DEFAULT_LENS_FILTER.text, null, "anything:at-all")).toBe(
      true,
    );
  });

  it("allows both abstraction values, so no class is dimmed on that axis", () => {
    expect([...DEFAULT_LENS_FILTER.abstractions]).toEqual([
      ...ABSTRACTION_VALUES,
    ]);
  });

  it("carries no text — nothing typed, nothing seeded", () => {
    // If this ever becomes non-empty (a query-string or localStorage seed),
    // the server's markup and the client's first paint diverge.
    expect(DEFAULT_LENS_FILTER.text).toBe("");
  });
});

describe("allNamespacesFilter", () => {
  it("lights every prefix it is given, in order", () => {
    const filter = allNamespacesFilter(["ds", "cs", "anatomy"]);
    expect([...filter.namespaces]).toEqual(["ds", "cs", "anatomy"]);
    expect(filter.text).toBe("");
  });

  it("passes every class when seeded from the ontologies' own prefixes", () => {
    const filter = allNamespacesFilter(["ds", "cs", "anatomy"]);
    expect(matchesChips(filter, true, "ds")).toBe(true);
    expect(matchesChips(filter, false, "cs")).toBe(true);
    expect(matchesChips(filter, false, "anatomy")).toBe(true);
  });
});

describe("matchesText — the exhibit's rule", () => {
  it("matches case-insensitively over the label", () => {
    expect(matchesText("ui bl", "UI Block", "ds:UIBlock")).toBe(true);
  });

  it("matches over the prefixed uri too", () => {
    expect(matchesText("uiblock", "UI Block", "ds:UIBlock")).toBe(true);
    expect(matchesText("ds:", "UI Block", "ds:UIBlock")).toBe(true);
  });

  it("falls back to the prefixed uri when a term has no label", () => {
    expect(matchesText("uiblock", null, "ds:UIBlock")).toBe(true);
  });

  it("rejects a non-substring", () => {
    expect(matchesText("zzz", "UI Block", "ds:UIBlock")).toBe(false);
  });
});

describe("matchesChips — text never reaches the graph", () => {
  it("ignores the text axis entirely", () => {
    // A filter whose text matches NOTHING still passes the chip predicate:
    // the search box dims the rail, never the graph.
    const filter = {
      ...allNamespacesFilter(["ds"]),
      text: "no-such-term-anywhere",
    };
    expect(matchesChips(filter, false, "ds")).toBe(true);
  });

  it("dims a class whose namespace chip is off", () => {
    expect(matchesChips(allNamespacesFilter(["ds"]), false, "cs")).toBe(false);
  });

  it("dims a class whose abstraction chip is off", () => {
    const concreteOnly = {
      ...allNamespacesFilter(["ds"]),
      abstractions: ["concrete"] as const,
    };
    expect(matchesChips(concreteOnly, true, "ds")).toBe(false);
    expect(matchesChips(concreteOnly, false, "ds")).toBe(true);
  });

  it("dims everything on an axis whose allow-list is empty", () => {
    const nothingLit = {
      ...allNamespacesFilter([]),
      abstractions: [],
    } as const;
    expect(matchesChips(nothingLit, true, "ds")).toBe(false);
    expect(matchesChips(nothingLit, false, "ds")).toBe(false);
  });
});

describe("abstractionOf", () => {
  it("is total over isAbstract", () => {
    expect(abstractionOf(true)).toBe("abstract");
    expect(abstractionOf(false)).toBe("concrete");
  });
});

describe("normalizeFilterText", () => {
  it("trims and lower-cases", () => {
    expect(normalizeFilterText("  UI Block  ")).toBe("ui block");
  });
});

describe("toggleIn", () => {
  const ordered = ["ds", "cs", "anatomy"] as const;

  it("removes a lit value", () => {
    expect([...toggleIn(["ds", "cs"], ordered, "ds")]).toEqual(["cs"]);
  });

  it("adds an unlit value back in CANONICAL order, not append order", () => {
    // Order stability matters: the chips render from this list, and a
    // re-ordering toggle would make them jump around under the cursor.
    expect([...toggleIn(["anatomy"], ordered, "ds")]).toEqual([
      "ds",
      "anatomy",
    ]);
  });

  it("round-trips to the original set", () => {
    const once = toggleIn(ordered, ordered, "cs");
    const twice = toggleIn(once, ordered, "cs");
    expect([...twice]).toEqual([...ordered]);
  });
});
