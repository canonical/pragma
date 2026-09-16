import { describe, expect, expectTypeOf, it } from "vitest";
import { DEFAULT_MESSAGES } from "./DEFAULT_MESSAGES.js";
import resolveMessages from "./resolveMessages.js";
import type { DataViewsMessages } from "./types.js";

describe("resolveMessages", () => {
  it("speaks English where the application gives no messages", () => {
    expect(resolveMessages()).toEqual(DEFAULT_MESSAGES);
  });

  it("keeps English for every message a partial override leaves out", () => {
    const selectRow = (name: string) => `Choisir ${name}`;
    const resolved = resolveMessages({ search: "Rechercher", selectRow });
    expect(resolved.search).toBe("Rechercher");
    expect(resolved.selectRow).toBe(selectRow);
    expect(resolved.filters).toBe(DEFAULT_MESSAGES.filters);
    expect(resolved.statusFailed).toBe(DEFAULT_MESSAGES.statusFailed);
  });

  it("leaves no English under a whole replacement", () => {
    const whole = Object.fromEntries(
      Object.keys(DEFAULT_MESSAGES).map((key) => [key, `«${key}»`]),
    ) as unknown as DataViewsMessages;
    const resolved = resolveMessages(whole);
    for (const [key, value] of Object.entries(resolved)) {
      expect(value).toBe(`«${key}»`);
    }
  });

  it("keeps English for a message given as undefined, rather than blanking it", () => {
    // A catalog that has not loaded, or a lookup that missed: the compiler
    // stops this only where `exactOptionalPropertyTypes` is on.
    // Through `unknown`: the strict preset refuses to call an explicit
    // `undefined` a member of a partial record, which is the point.
    const resolved = resolveMessages({
      search: undefined,
      selectRow: undefined,
    } as unknown as Partial<DataViewsMessages>);
    expect(resolved.search).toBe("Search");
    expect(resolved.selectRow("alder")).toBe("Select alder");
    expect(Object.hasOwn(resolved, "search")).toBe(true);
  });

  it("freezes what it resolves, so no part rewords another's", () => {
    expect(Object.isFrozen(resolveMessages({ search: "Find" }))).toBe(true);
    expect(Object.isFrozen(DEFAULT_MESSAGES)).toBe(true);
  });

  it("types a whole replacement against every message, and a partial one against none", () => {
    // @ts-expect-error — a whole replacement missing a message does not compile.
    const incomplete: DataViewsMessages = { search: "Find" };
    expect(incomplete.search).toBe("Find");
    expectTypeOf(resolveMessages)
      .parameter(0)
      .toEqualTypeOf<Partial<DataViewsMessages> | undefined>();
  });
});
