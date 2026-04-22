import { describe, expect, it } from "vitest";
import { PragmaError } from "../../../error/index.js";
import { parsePackageEntry } from "./parseRef.js";

describe("parsePackageEntry", () => {
  describe("npm references", () => {
    it("parses a bare string as npm", () => {
      const ref = parsePackageEntry("@canonical/design-system");
      expect(ref).toEqual({ kind: "npm", pkg: "@canonical/design-system" });
    });

    it("parses an object without source as npm", () => {
      const ref = parsePackageEntry({ name: "@canonical/design-system" });
      expect(ref).toEqual({ kind: "npm", pkg: "@canonical/design-system" });
    });

    it("parses an object with undefined source as npm", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: undefined,
      });
      expect(ref).toEqual({ kind: "npm", pkg: "@canonical/design-system" });
    });
  });

  describe("file references", () => {
    it("parses file:// source with absolute path", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: "file:///home/user/code/design-system",
      });
      expect(ref).toEqual({
        kind: "file",
        pkg: "@canonical/design-system",
        path: "/home/user/code/design-system",
      });
    });

    it("parses file:// source with relative path", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: "file://./local-packages/design-system",
      });
      expect(ref).toEqual({
        kind: "file",
        pkg: "@canonical/design-system",
        path: "./local-packages/design-system",
      });
    });

    it("throws on empty file:// path", () => {
      expect(() =>
        parsePackageEntry({
          name: "@canonical/design-system",
          source: "file://",
        }),
      ).toThrow(PragmaError);
    });
  });

  describe("git references", () => {
    it("parses git+https:// source with branch ref", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: "git+https://github.com/canonical/design-system.git#main",
      });
      expect(ref).toEqual({
        kind: "git",
        pkg: "@canonical/design-system",
        url: "https://github.com/canonical/design-system.git",
        ref: "main",
      });
    });

    it("parses git+https:// source with tag ref", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: "git+https://github.com/canonical/design-system.git#v0.3.0",
      });
      expect(ref).toEqual({
        kind: "git",
        pkg: "@canonical/design-system",
        url: "https://github.com/canonical/design-system.git",
        ref: "v0.3.0",
      });
    });

    it("parses git+https:// source with SHA ref", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source:
          "git+https://github.com/canonical/design-system.git#abc1234def5678",
      });
      expect(ref).toEqual({
        kind: "git",
        pkg: "@canonical/design-system",
        url: "https://github.com/canonical/design-system.git",
        ref: "abc1234def5678",
      });
    });

    it("parses git+ssh:// source", () => {
      const ref = parsePackageEntry({
        name: "@canonical/design-system",
        source: "git+ssh://git@github.com/canonical/design-system.git#main",
      });
      expect(ref).toEqual({
        kind: "git",
        pkg: "@canonical/design-system",
        url: "ssh://git@github.com/canonical/design-system.git",
        ref: "main",
      });
    });

    it("throws on git URL without #ref", () => {
      expect(() =>
        parsePackageEntry({
          name: "@canonical/design-system",
          source: "git+https://github.com/canonical/design-system.git",
        }),
      ).toThrow(PragmaError);
    });

    it("throws on git URL with empty ref after #", () => {
      expect(() =>
        parsePackageEntry({
          name: "@canonical/design-system",
          source: "git+https://github.com/canonical/design-system.git#",
        }),
      ).toThrow(PragmaError);
    });
  });

  describe("invalid entries", () => {
    it("throws on unknown source scheme", () => {
      expect(() =>
        parsePackageEntry({
          name: "@canonical/design-system",
          source: "https://example.com/package.tar.gz",
        }),
      ).toThrow(PragmaError);
    });

    it("throws on empty name", () => {
      expect(() => parsePackageEntry({ name: "" })).toThrow(PragmaError);
    });

    it("throws on non-string source", () => {
      expect(() =>
        parsePackageEntry({
          name: "@canonical/design-system",
          source: 42 as unknown as string,
        }),
      ).toThrow(PragmaError);
    });
  });
});
