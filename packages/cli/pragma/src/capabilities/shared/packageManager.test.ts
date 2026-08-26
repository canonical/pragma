/**
 * The install-scope heuristic's two path questions.
 *
 * `detectInstallSource` itself reads `import.meta.url` and the real working
 * directory, so the decision it makes is exercised here through the two pure
 * helpers it composes — which is where every case that has ever been wrong
 * lives.
 */

import { describe, expect, it } from "vitest";
import { containsPath, findInstallRoot } from "./packageManager.js";

describe("findInstallRoot", () => {
  it("yields the directory the package was installed into", () => {
    expect(
      findInstallRoot(
        "/proj/node_modules/@canonical/pragma-cli/dist/src/bin.js",
      ),
    ).toBe("/proj");
  });

  it("takes the INNERMOST node_modules when they nest", () => {
    expect(
      findInstallRoot("/proj/node_modules/a/node_modules/b/dist/bin.js"),
    ).toBe("/proj/node_modules/a");
  });

  it("reports no install root for a source checkout", () => {
    expect(findInstallRoot("/work/pragma/packages/cli/pragma/src/bin.ts")).toBe(
      undefined,
    );
  });
});

describe("containsPath", () => {
  it("counts a directory as containing itself", () => {
    expect(containsPath("/proj", "/proj")).toBe(true);
  });

  // The case a literal cwd-prefix test got wrong: an ordinary local install run
  // from a subdirectory — which in a monorepo is the usual way to run it — was
  // reported as a GLOBAL install.
  it("counts a subdirectory as contained", () => {
    expect(containsPath("/proj", "/proj/packages/foo")).toBe(true);
  });

  it("does not count a sibling that merely shares a prefix", () => {
    expect(containsPath("/proj", "/proj-two")).toBe(false);
  });

  it("does not count an ancestor or an unrelated tree", () => {
    expect(containsPath("/proj/packages/foo", "/proj")).toBe(false);
    expect(containsPath("/usr/lib", "/home/u/proj")).toBe(false);
  });
});
