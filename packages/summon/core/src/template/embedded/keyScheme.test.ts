import { describe, expect, it } from "vitest";
import qualifiedKey from "./keyScheme.js";

describe("qualifiedKey", () => {
  it("keys by the prefix plus the path under the LAST templates/ segment", () => {
    expect(
      qualifiedKey("component", "/pkg/src/templates/react/types.ts.ejs"),
    ).toBe("component/react/types.ts.ejs");
    expect(
      qualifiedKey("package", "/pkg/src/templates/tsconfig.json.ejs"),
    ).toBe("package/tsconfig.json.ejs");
    expect(
      qualifiedKey(
        "application/react",
        "/pkg/src/application/react/templates/src/lib/index.ts.ejs",
      ),
    ).toBe("application/react/src/lib/index.ts.ejs");
  });

  it("uses the LAST templates/ segment when several appear — for BOTH halves", () => {
    // This is the ONE scheme: the writer (buildEmbeddedManifest) derives its
    // keys through this very function, so `x/file.ejs` is what gets embedded
    // AND what the reader looks up — pinned end-to-end in
    // buildEmbeddedManifest.test.ts ("nested templates/ dir … unified").
    expect(qualifiedKey("x", "/a/templates/nested/templates/file.ejs")).toBe(
      "x/file.ejs",
    );
  });

  it("returns undefined for a path with no templates/ segment", () => {
    expect(qualifiedKey("component", "/pkg/src/stray.ejs")).toBeUndefined();
  });
});
