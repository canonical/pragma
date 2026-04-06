import { describe, expect, it } from "vitest";
import RouteRedirect from "./RouteRedirect.js";

describe("RouteRedirect", () => {
  it("constructs a redirect value with the default status", () => {
    const redirectValue = new RouteRedirect("/login");

    expect(redirectValue.to).toBe("/login");
    expect(redirectValue.status).toBe(302);
  });
});
