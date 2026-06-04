import { describe, expect, it } from "vitest";
import { resolvePort } from "./resolvePort.js";

describe("resolvePort", () => {
  it("uses the flag when supplied", () => {
    expect(resolvePort("3000", undefined)).toBe(3000);
  });

  it("falls back to the PORT env var when no flag", () => {
    expect(resolvePort(undefined, "4000")).toBe(4000);
  });

  it("prefers the flag over the env var", () => {
    expect(resolvePort("3000", "4000")).toBe(3000);
  });

  it("falls back to the default when neither is supplied", () => {
    expect(resolvePort(undefined, undefined)).toBe(5174);
  });

  it("treats an empty string as not supplied", () => {
    expect(resolvePort("", undefined)).toBe(5174);
  });

  it("honours a custom fallback", () => {
    expect(resolvePort(undefined, undefined, 8080)).toBe(8080);
  });

  it("throws on a non-numeric value", () => {
    expect(() => resolvePort("abc", undefined)).toThrow(/Invalid port/);
  });

  it("throws on 0 (not a valid fixed listen port)", () => {
    expect(() => resolvePort(undefined, "0")).toThrow(/Invalid port/);
  });

  it("throws on a port above 65535", () => {
    expect(() => resolvePort("70000", undefined)).toThrow(/Invalid port/);
  });

  it("throws on a non-integer port", () => {
    expect(() => resolvePort("3000.5", undefined)).toThrow(/Invalid port/);
  });
});
