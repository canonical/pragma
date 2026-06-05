import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseStaticPair } from "./parseStaticPair.js";

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

  it("treats an empty route as the root mount", () => {
    expect(parseStaticPair(":dist/client", "/proj")).toEqual({
      route: "/",
      dir: path.join("/proj", "dist/client"),
    });
  });

  it("defaults the base directory to process.cwd()", () => {
    expect(parseStaticPair("public").dir).toBe(
      path.join(process.cwd(), "public"),
    );
  });
});
