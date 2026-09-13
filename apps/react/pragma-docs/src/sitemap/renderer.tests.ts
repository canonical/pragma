/**
 * The sitemap's base-URL guard.
 *
 * `SitemapRenderer` resolves every relative `loc` with `new URL(loc, baseUrl)`,
 * so the base has to be a URL you can resolve a path against — not merely one
 * that parses. A base that parses but cannot be resolved against makes
 * `/sitemap.xml` answer 500; the guard's job is to send that case to the
 * localhost fallback instead.
 */
import { describe, expect, it } from "vitest";
import { isAbsoluteUrl } from "./renderer.js";

describe("isAbsoluteUrl", () => {
  it("accepts an http(s) origin", () => {
    expect(isAbsoluteUrl("https://example.com")).toBe(true);
    expect(isAbsoluteUrl("http://localhost:5174")).toBe(true);
  });

  it("rejects a relative or empty value", () => {
    expect(isAbsoluteUrl("/")).toBe(false);
    expect(isAbsoluteUrl("")).toBe(false);
    expect(isAbsoluteUrl("example.com")).toBe(false);
  });

  it("rejects an absolute URL that no path can be resolved against", () => {
    // Raised in review. These all parse, so `URL.canParse` alone let them
    // through — and each one throws the moment a relative `loc` is resolved
    // against it, which is a 500 on a route a crawler asks for.
    expect(isAbsoluteUrl("mailto:docs@example.com")).toBe(false);
    expect(isAbsoluteUrl("data:text/plain,x")).toBe(false);
    expect(isAbsoluteUrl("urn:isbn:0451450523")).toBe(false);

    // The reason, stated as a fact rather than a claim.
    expect(() => new URL("/components", "mailto:docs@example.com")).toThrow();
  });
});
