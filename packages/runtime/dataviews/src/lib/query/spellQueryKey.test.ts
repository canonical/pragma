import { describe, expect, it } from "vitest";
import { filterStatusBy } from "../../../testing/fixtures.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "./constants.js";
import spellQueryKey from "./spellQueryKey.js";

describe("spellQueryKey", () => {
  it("keys the slice and the window together", () => {
    const query = { slice: EMPTY_SLICE, window: DEFAULT_WINDOW };
    expect(spellQueryKey(query)).toBe(spellQueryKey({ ...query }));
    expect(spellQueryKey(query)).not.toBe(
      spellQueryKey({ ...query, window: { ...DEFAULT_WINDOW, page: 2 } }),
    );
    expect(spellQueryKey(query)).not.toBe(
      spellQueryKey({ ...query, slice: filterStatusBy(["ready"]) }),
    );
  });

  it("agrees with the slice key on the slice", () => {
    // A respelled slice keys the same query, so a cache keyed by it is
    // shared between the two spellings.
    expect(
      spellQueryKey({
        slice: filterStatusBy(["ready", "failed"]),
        window: DEFAULT_WINDOW,
      }),
    ).toBe(
      spellQueryKey({
        slice: filterStatusBy(["failed", "ready"]),
        window: DEFAULT_WINDOW,
      }),
    );
  });
});
