import { describe, expect, it } from "vitest";
import Redirect from "./Redirect.js";

describe("Redirect", () => {
  it("constructs a redirect value with the default status", () => {
    const redirectValue = new Redirect("/login");

    expect(redirectValue.to).toBe("/login");
    expect(redirectValue.status).toBe(302);
  });
});
