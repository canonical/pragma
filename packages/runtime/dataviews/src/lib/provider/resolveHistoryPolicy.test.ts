import { describe, expect, it } from "vitest";
import resolveHistoryPolicy from "./resolveHistoryPolicy.js";

describe("resolveHistoryPolicy", () => {
  it("defaults to a replacing search and pushing everything else", () => {
    expect(resolveHistoryPolicy(undefined)).toEqual({
      filter: "push",
      search: "replace",
      sort: "push",
      group: "push",
      window: "push",
      view: "push",
      collapse: null,
      adopt: null,
      reset: "replace",
    });
  });

  it("sets every transition from one mode, and leaves the fixed causes alone", () => {
    expect(resolveHistoryPolicy("replace")).toEqual({
      filter: "replace",
      search: "replace",
      sort: "replace",
      group: "replace",
      window: "replace",
      view: "replace",
      collapse: null,
      adopt: null,
      reset: "replace",
    });
  });

  it.each([
    ["filter", "replace"],
    ["search", "push"],
    ["sort", "replace"],
    ["group", "replace"],
    ["window", "replace"],
    ["view", "replace"],
  ] as const)("overrides %s alone to %s", (transition, mode) => {
    const resolved = resolveHistoryPolicy({ [transition]: mode });
    expect(resolved[transition]).toBe(mode);
    const defaults = resolveHistoryPolicy(undefined);
    for (const other of Object.keys(defaults) as (keyof typeof defaults)[]) {
      if (other !== transition) {
        expect(resolved[other]).toBe(defaults[other]);
      }
    }
  });

  it("takes a member spelled undefined as no override", () => {
    // Outside the types, as a JavaScript caller can spell it.
    const spelled: unknown = { search: undefined };
    expect(
      resolveHistoryPolicy(
        spelled as Parameters<typeof resolveHistoryPolicy>[0],
      ).search,
    ).toBe("replace");
  });
});
