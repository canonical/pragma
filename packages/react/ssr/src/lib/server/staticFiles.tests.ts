import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  matchStaticRoute,
  parseStaticPair,
  resolveStaticFile,
  type StaticMount,
} from "./staticFiles.js";

describe("parseStaticPair", () => {
  it("parses a route:filepath pair", () => {
    expect(parseStaticPair("assets:dist/client/assets", "/proj")).toEqual({
      route: "/assets",
      dir: path.join("/proj", "dist/client/assets"),
    });
  });

  it("uses the whole string as route and dir when there is no separator", () => {
    expect(parseStaticPair("public", "/proj")).toEqual({
      route: "/public",
      dir: path.join("/proj", "public"),
    });
  });

  it("defaults the base directory to process.cwd()", () => {
    expect(parseStaticPair("public").dir).toBe(
      path.join(process.cwd(), "public"),
    );
  });
});

describe("matchStaticRoute", () => {
  it("matches the route itself", () => {
    expect(matchStaticRoute("/assets", "/assets")).toBe(true);
  });

  it("matches a path under the route", () => {
    expect(matchStaticRoute("/assets/app.js", "/assets")).toBe(true);
  });

  it("does not match a sibling prefix (segment boundary)", () => {
    expect(matchStaticRoute("/assetsfoo/app.js", "/assets")).toBe(false);
  });
});

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
    // The decoded tail "/etc/passwd" must NOT be treated as a filesystem root:
    // a naive path.join(dir, "/etc/passwd") returns "/etc/passwd" and escapes.
    // The leading separator is stripped, so the result stays under the mount.
    const resolved = resolveStaticFile("/assets/etc/passwd", mount);
    expect(resolved).toBe(
      path.resolve("/proj/dist/client/assets", "etc/passwd"),
    );
    expect(resolved).not.toBe(path.resolve("/etc/passwd"));
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

  it("serves the mount root itself", () => {
    expect(resolveStaticFile("/assets", mount)).toBe(
      path.resolve("/proj/dist/client/assets"),
    );
  });
});
