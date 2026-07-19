import { describe, expect, it } from "vitest";
import { ROUTE_PREFIX_BY_KIND } from "./constants.js";
import { KINDS } from "./encodings.js";
import { resolveChipHref } from "./resolveChipHref.js";

describe("resolveChipHref", () => {
  it("lands every kind on its route prefix", () => {
    for (const kind of KINDS) {
      const href = resolveChipHref("ds:some.entity", kind);
      expect(href).toBe(
        `${ROUTE_PREFIX_BY_KIND[kind]}/${encodeURIComponent("ds:some.entity")}`,
      );
    }
  });

  it("percent-encodes the uri as the terminal path segment", () => {
    expect(resolveChipHref("ds:global.component.button", "component")).toBe(
      "/components/ds%3Aglobal.component.button",
    );
  });

  it("rejects an empty uri and an unknown kind", () => {
    expect(() => resolveChipHref("", "component")).toThrow(/non-empty/);
    expect(() => resolveChipHref("ds:thing", "gadget" as never)).toThrow(
      /unknown kind/,
    );
  });
});
