import { describe, expect, it } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../collection/index.js";
import { DEFAULT_WINDOW, EMPTY_SLICE } from "../query/index.js";
import spellLocation from "./spellLocation.js";

const { schema } = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

const failed = {
  slice: {
    ...EMPTY_SLICE,
    filter: [
      { field: "status", operator: "eq" as const, operands: ["failed"] },
    ],
  },
  window: DEFAULT_WINDOW,
};

describe("spellLocation", () => {
  it("spells the open view first, then the host's parameters, then the query", () => {
    expect(
      spellLocation({
        schema,
        query: failed,
        view: "v1",
        preserve: new URLSearchParams("tab=inventory&status=running"),
      }).toString(),
    ).toBe("view=v1&tab=inventory&status=failed&page=1&size=50");
  });

  it("keeps a spelling that already leads with the open view, and respells one that does not", () => {
    const spell = (preserve: string) =>
      spellLocation({
        schema,
        query: failed,
        view: "v1",
        preserve: new URLSearchParams(preserve),
      }).toString();
    expect(spell("view=v1&tab=inventory")).toBe(
      "view=v1&tab=inventory&status=failed&page=1&size=50",
    );
    // The view later, or twice: moved first, and once.
    expect(spell("tab=inventory&view=v1")).toBe(
      "view=v1&tab=inventory&status=failed&page=1&size=50",
    );
    expect(spell("view=v1&view=v1")).toBe(
      "view=v1&status=failed&page=1&size=50",
    );
  });

  it("drops a view the location carried when none is open, or another is", () => {
    const preserve = new URLSearchParams("view=gone&tab=inventory");
    expect(
      spellLocation({ schema, query: failed, view: null, preserve }).toString(),
    ).toBe("tab=inventory&status=failed&page=1&size=50");
    expect(
      spellLocation({ schema, query: failed, view: "v2", preserve }).toString(),
    ).toBe("view=v2&tab=inventory&status=failed&page=1&size=50");
  });
});
