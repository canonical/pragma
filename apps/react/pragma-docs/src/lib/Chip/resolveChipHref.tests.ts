import { describe, expect, it, vi } from "vitest";
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

  it("lands term mentions on the Definitions lens (D31: the noun's home)", () => {
    // The glossary's home is the ontology explorer's term route
    // (`/definitions/:term`). The route-side half of this pin —
    // `appRoutes.definitionsTerm.render({ term }) === resolveChipHref(term,
    // "term")` — lives in `routeQueries.tests.ts` beside the component pin.
    expect(resolveChipHref("ds:UIBlock", "term")).toBe(
      "/definitions/ds%3AUIBlock",
    );
  });

  it("rejects an empty uri and an unknown kind", () => {
    expect(() => resolveChipHref("", "component")).toThrow(/non-empty/);
    expect(() => resolveChipHref("ds:thing", "gadget" as never)).toThrow(
      /unknown kind/,
    );
  });

  it("dev-warns when the kind disagrees with the URI's kind segment, without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      // No throw, and the address shape is unchanged — `kind` still drives it.
      expect(resolveChipHref("ds:global.pattern.card", "component")).toBe(
        "/components/ds%3Aglobal.pattern.card",
      );
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls.at(0)?.at(0));
      expect(message).toContain('"component"');
      expect(message).toContain('"pattern"');
      expect(message).toContain("ds:global.pattern.card");
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn when the kind agrees with the URI's kind segment", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      resolveChipHref("ds:global.component.button", "component");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn when the URI encodes no kind segment", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      resolveChipHref("cs:typescript.imports", "standard");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
