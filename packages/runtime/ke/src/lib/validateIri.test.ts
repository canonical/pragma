import { describe, expect, it } from "vitest";
import validateIri from "./validateIri.js";

describe("validateIri", () => {
  it("accepts a valid HTTP URI", () => {
    expect(() => validateIri("http://example.org/name")).not.toThrow();
  });

  it("accepts a valid HTTPS URI", () => {
    expect(() => validateIri("https://ds.canonical.com/UIBlock")).not.toThrow();
  });

  it("accepts a URI with hash fragment", () => {
    expect(() =>
      validateIri("http://www.w3.org/2002/07/owl#Class"),
    ).not.toThrow();
  });

  it("accepts a URI with path segments", () => {
    expect(() =>
      validateIri("https://ds.canonical.com/component/button"),
    ).not.toThrow();
  });

  it("rejects a URI with angle brackets", () => {
    expect(() => validateIri("http://example.org/<injected>")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with double quotes", () => {
    expect(() => validateIri('http://example.org/"quoted"')).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with curly braces", () => {
    expect(() => validateIri("http://example.org/{path}")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with whitespace", () => {
    expect(() => validateIri("http://example.org/with space")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with newline", () => {
    expect(() => validateIri("http://example.org/line\nbreak")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with tab", () => {
    expect(() => validateIri("http://example.org/with\ttab")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with backslash", () => {
    expect(() => validateIri("http://example.org/back\\slash")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with pipe", () => {
    expect(() => validateIri("http://example.org/a|b")).toThrow("Invalid IRI");
  });

  it("rejects a URI with backtick", () => {
    expect(() => validateIri("http://example.org/`tick`")).toThrow(
      "Invalid IRI",
    );
  });

  it("rejects a URI with caret", () => {
    expect(() => validateIri("http://example.org/a^b")).toThrow("Invalid IRI");
  });
});
