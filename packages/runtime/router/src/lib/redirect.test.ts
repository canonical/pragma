import { describe, expect, it } from "vitest";
import Redirect from "./Redirect.js";

import redirect from "./redirect.js";

describe("redirect", () => {
  it("throws a redirect value from the redirect helper", () => {
    expect(() => {
      redirect("/login", 307);
    }).toThrow(Redirect);

    try {
      redirect("/login", 307);
    } catch (error) {
      expect(error).toBeInstanceOf(Redirect);
      expect(error).toMatchObject({ to: "/login", status: 307 });
    }
  });

  it("uses the default redirect status when one is not provided", () => {
    try {
      redirect("/signin");
    } catch (error) {
      expect(error).toBeInstanceOf(Redirect);
      expect(error).toMatchObject({ to: "/signin", status: 302 });
    }
  });
});
