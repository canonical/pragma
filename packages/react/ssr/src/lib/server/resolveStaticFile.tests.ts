import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStaticFile } from "./resolveStaticFile.js";
import type { StaticMount } from "./StaticMount.js";

describe("resolveStaticFile", () => {
  const mount: StaticMount = {
    route: "/assets",
    dir: "/proj/dist/client/assets",
  };

  it("resolves a file under the mount", () => {
    expect(resolveStaticFile("/assets/index-abc.js", mount)).toBe(
      path.resolve("/proj/dist/client/assets", "index-abc.js"),
    );
  });

  it("returns null when the route does not match", () => {
    expect(resolveStaticFile("/other/x.js", mount)).toBeNull();
  });

  it("keeps an absolute-looking tail inside the mount (no path.join escape)", () => {
    // The decoded tail "/etc/passwd.txt" must NOT be treated as a filesystem
    // root: a naive path.join(dir, "/etc/passwd.txt") returns "/etc/passwd.txt"
    // and escapes. The leading separator is stripped, so it stays under the mount.
    const resolved = resolveStaticFile("/assets/etc/passwd.txt", mount);
    expect(resolved).toBe(
      path.resolve("/proj/dist/client/assets", "etc/passwd.txt"),
    );
    expect(resolved).not.toBe(path.resolve("/etc/passwd.txt"));
  });

  it("rejects a traversal escape via encoded separators", () => {
    // %2f decodes to "/", %2e to ".", forming "/../../secret"
    expect(
      resolveStaticFile("/assets%2f..%2f..%2fsecret.txt", mount),
    ).toBeNull();
  });

  it("rejects an encoded .. segment under a valid /assets/ prefix", () => {
    // The "/assets/" prefix matches before decoding; the encoded "%2e%2e"
    // decodes to ".." and must be caught by the traversal guard, not silently
    // resolved. Exercises the decode-then-reject path.
    expect(
      resolveStaticFile("/assets/%2e%2e/%2e%2e/secret.txt", mount),
    ).toBeNull();
  });

  it("rejects a literal .. segment in the tail", () => {
    expect(resolveStaticFile("/assets/../secret.txt", mount)).toBeNull();
  });

  it("rejects malformed percent-encoding", () => {
    expect(resolveStaticFile("/assets/%E0%A4%A.js", mount)).toBeNull();
  });

  it("returns null for an extensionless path (it is a page route, not a file)", () => {
    expect(resolveStaticFile("/assets", mount)).toBeNull();
  });

  describe("root mount", () => {
    const root: StaticMount = { route: "/", dir: "/proj/dist/client" };

    it("serves a root file with an extension", () => {
      expect(resolveStaticFile("/robots.txt", root)).toBe(
        path.resolve("/proj/dist/client", "robots.txt"),
      );
    });

    it("serves a nested file under the root mount", () => {
      expect(resolveStaticFile("/assets/app-abc.js", root)).toBe(
        path.resolve("/proj/dist/client", "assets/app-abc.js"),
      );
    });

    it("returns null for extensionless routes so they are server-rendered", () => {
      expect(resolveStaticFile("/", root)).toBeNull();
      expect(resolveStaticFile("/about/team", root)).toBeNull();
    });

    it("still rejects traversal under the root mount", () => {
      expect(resolveStaticFile("/%2e%2e/%2e%2e/secret.txt", root)).toBeNull();
    });
  });
});
