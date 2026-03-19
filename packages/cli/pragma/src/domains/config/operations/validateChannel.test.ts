import { describe, expect, it } from "vitest";
import validateChannel from "./validateChannel.js";

describe("validateChannel", () => {
  it("returns the channel for valid values", () => {
    expect(validateChannel("normal")).toBe("normal");
    expect(validateChannel("experimental")).toBe("experimental");
    expect(validateChannel("prerelease")).toBe("prerelease");
  });

  it("throws INVALID_INPUT for an invalid channel", () => {
    expect(() => validateChannel("aggressive")).toThrow(
      'Invalid channel "aggressive"',
    );
  });

  it("includes valid channels in error validOptions", () => {
    try {
      validateChannel("nope");
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      const pragmaErr = err as { code: string; validOptions: string[] };
      expect(pragmaErr.code).toBe("INVALID_INPUT");
      expect(pragmaErr.validOptions).toEqual([
        "normal",
        "experimental",
        "prerelease",
      ]);
    }
  });
});
