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
      path.join("/proj/dist/client/assets", "/index-abc.js"),
    );
  });

  it("returns null when the route does not match", () => {
    expect(resolveStaticFile("/other/x.js", mount)).toBeNull();
  });

  it("rejects a traversal escape via encoded separators", () => {
    // %2f decodes to "/", %2e to ".", forming "/../../secret"
    expect(
      resolveStaticFile("/assets%2f..%2f..%2fsecret.txt", mount),
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
      path.join("/proj/dist/client/assets", ""),
    );
  });
});
