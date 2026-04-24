import { afterEach, describe, expect, it } from "vitest";
import {
  clearPreferenceCookie,
  readPreferenceCookie,
  readPreferenceCookieFromHeader,
  writePreferenceCookie,
} from "./cookie.js";

describe("readPreferenceCookie", () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=; max-age=0";
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "contrast=; max-age=0";
  });

  it("returns null when cookie is not set", () => {
    expect(readPreferenceCookie("theme")).toBeNull();
  });

  it("reads a cookie value", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";
    expect(readPreferenceCookie("theme")).toBe("dark");
  });

  it("reads the correct cookie when multiple are set", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=dark";
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "contrast=more";
    expect(readPreferenceCookie("contrast")).toBe("more");
    expect(readPreferenceCookie("theme")).toBe("dark");
  });

  it("handles encoded values", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = `theme=${encodeURIComponent("light")}`;
    expect(readPreferenceCookie("theme")).toBe("light");
  });
});

describe("writePreferenceCookie", () => {
  afterEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: test setup
    document.cookie = "theme=; max-age=0";
  });

  it("writes a cookie readable by readPreferenceCookie", () => {
    writePreferenceCookie("theme", "dark");
    expect(readPreferenceCookie("theme")).toBe("dark");
  });

  it("overwrites an existing cookie", () => {
    writePreferenceCookie("theme", "dark");
    writePreferenceCookie("theme", "light");
    expect(readPreferenceCookie("theme")).toBe("light");
  });
});

describe("clearPreferenceCookie", () => {
  it("removes a cookie", () => {
    writePreferenceCookie("theme", "dark");
    clearPreferenceCookie("theme");
    expect(readPreferenceCookie("theme")).toBeNull();
  });
});

describe("readPreferenceCookieFromHeader", () => {
  it("returns null for null header", () => {
    expect(readPreferenceCookieFromHeader(null, "theme")).toBeNull();
  });

  it("returns null when cookie is not in header", () => {
    expect(readPreferenceCookieFromHeader("contrast=more", "theme")).toBeNull();
  });

  it("reads a cookie from a header string", () => {
    expect(
      readPreferenceCookieFromHeader("theme=dark; contrast=more", "theme"),
    ).toBe("dark");
  });

  it("reads the last matching cookie", () => {
    expect(
      readPreferenceCookieFromHeader("contrast=more; motion=reduce", "motion"),
    ).toBe("reduce");
  });

  it("handles encoded values in header", () => {
    expect(
      readPreferenceCookieFromHeader(
        `theme=${encodeURIComponent("light")}`,
        "theme",
      ),
    ).toBe("light");
  });
});
