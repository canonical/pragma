import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deriveEmbeddedKey,
  loadEmbeddedSync,
  setEmbeddedFiles,
} from "./loadEmbedded.js";

afterEach(() => {
  setEmbeddedFiles({});
});

describe("deriveEmbeddedKey", () => {
  it("scopes the tail after the last /templates/ by package name", () => {
    expect(
      deriveEmbeddedKey(
        "@canonical/summon-component",
        "/repo/packages/summon/component/src/templates/react/types.ts.ejs",
      ),
    ).toBe("@canonical/summon-component/react/types.ts.ejs");
  });

  it("agrees between a src harvest root and a dist runtime root", () => {
    const fromSrc = deriveEmbeddedKey(
      "@canonical/summon-application",
      "/repo/packages/summon/application/src/application/react/templates/src/server/renderer.tsx",
    );
    const fromDist = deriveEmbeddedKey(
      "@canonical/summon-application",
      "/repo/packages/summon/application/dist/esm/application/react/templates/src/server/renderer.tsx",
    );
    expect(fromSrc).toBe(fromDist);
    expect(fromSrc).toBe(
      "@canonical/summon-application/src/server/renderer.tsx",
    );
  });

  it("keeps two packages' identically-named files apart", () => {
    expect(
      deriveEmbeddedKey("@a/one", "/x/templates/package.json.ejs"),
    ).not.toBe(deriveEmbeddedKey("@a/two", "/x/templates/package.json.ejs"));
  });

  it("is undefined for a path with no template root", () => {
    expect(deriveEmbeddedKey("@a/one", "/x/y/z.ejs")).toBeUndefined();
  });
});

describe("loadEmbeddedSync", () => {
  it("prefers disk over an embedded entry for the same key", () => {
    const dir = mkdtempSync(join(tmpdir(), "summon-embedded-"));
    const root = join(dir, "templates");
    mkdirSync(root, { recursive: true });
    const file = join(root, "a.ejs");
    writeFileSync(file, "from disk");
    setEmbeddedFiles({ "@a/one/a.ejs": "from manifest" });
    expect(loadEmbeddedSync("@a/one", file).content).toBe("from disk");
  });

  it("falls back to the manifest when the file is not on disk", () => {
    setEmbeddedFiles({ "@a/one/a.ejs": "from manifest" });
    expect(
      loadEmbeddedSync("@a/one", "/$bunfs/root/templates/a.ejs").content,
    ).toBe("from manifest");
  });

  it("serves an EMPTY embedded file rather than treating it as missing", () => {
    // `.gitkeep` is genuinely empty; keying off falsiness would throw on it.
    setEmbeddedFiles({ "@a/one/assets/.gitkeep": "" });
    expect(
      loadEmbeddedSync("@a/one", "/$bunfs/root/templates/assets/.gitkeep")
        .content,
    ).toBe("");
  });

  it("does not serve another package's entry for the same tail", () => {
    setEmbeddedFiles({ "@a/two/a.ejs": "wrong package" });
    expect(() =>
      loadEmbeddedSync("@a/one", "/$bunfs/root/templates/a.ejs"),
    ).toThrow(/@a\/one\/a\.ejs/);
  });

  it("throws naming both the path and the derived key", () => {
    let message = "";
    try {
      loadEmbeddedSync("@a/one", "/$bunfs/root/templates/missing.ejs");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("/$bunfs/root/templates/missing.ejs");
    expect(message).toContain("@a/one/missing.ejs");
  });

  it("names the path when it carries no template root at all", () => {
    expect(() => loadEmbeddedSync("@a/one", "/nowhere/x.ejs")).toThrow(
      /this path/,
    );
  });
});
