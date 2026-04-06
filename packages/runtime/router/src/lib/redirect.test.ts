import { describe, expect, it } from "vitest";
import RouteRedirect from "./RouteRedirect.js";

import redirect from "./redirect.js";

describe("redirect", () => {
  it("throws a redirect value from the redirect helper", () => {
    expect.assertions(3);

    expect(() => {
      redirect("/login", 307);
    }).toThrow(RouteRedirect);

    try {
      redirect("/login", 307);
    } catch (error) {
      expect(error).toBeInstanceOf(RouteRedirect);
      expect(error).toMatchObject({ to: "/login", status: 307 });
    }
  });

  it("uses the default redirect status when one is not provided", () => {
    expect.assertions(2);

    try {
      redirect("/signin");
    } catch (error) {
      expect(error).toBeInstanceOf(RouteRedirect);
      expect(error).toMatchObject({ to: "/signin", status: 302 });
    }
  });
});
