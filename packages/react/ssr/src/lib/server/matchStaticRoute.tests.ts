import { describe, expect, it } from "vitest";
import { matchStaticRoute } from "./matchStaticRoute.js";

describe("matchStaticRoute", () => {
  it("matches the route itself", () => {
    expect(matchStaticRoute("/assets", "/assets")).toBe(true);
  });

  it("matches a path under the route", () => {
    expect(matchStaticRoute("/assets/app.js", "/assets")).toBe(true);
  });

  it("does not match a sibling prefix (segment boundary)", () => {
    expect(matchStaticRoute("/assetsfoo/app.js", "/assets")).toBe(false);
  });

  it("matches any path under the root mount", () => {
    expect(matchStaticRoute("/robots.txt", "/")).toBe(true);
    expect(matchStaticRoute("/assets/app.js", "/")).toBe(true);
    expect(matchStaticRoute("/", "/")).toBe(true);
  });
});
