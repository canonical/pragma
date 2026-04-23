import { describe, expect, it } from "vitest";
import {
  clearPreferenceCookie,
  readPreferenceCookie,
  writePreferenceCookie,
} from "./cookie.js";

describe("cookie SSR guards (node environment)", () => {
  it("readPreferenceCookie returns null when document is undefined", () => {
    expect(readPreferenceCookie("theme")).toBeNull();
  });

  it("writePreferenceCookie is a no-op when document is undefined", () => {
    // Should not throw
    expect(() => writePreferenceCookie("theme", "dark")).not.toThrow();
  });

  it("clearPreferenceCookie is a no-op when document is undefined", () => {
    // Should not throw
    expect(() => clearPreferenceCookie("theme")).not.toThrow();
  });
});
