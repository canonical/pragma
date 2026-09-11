import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * `index.css` is the one file a consumer links to get every component's CSS.
 * It is a hand-written list on purpose — an explicit import over a build step
 * that discovers stylesheets by naming convention — and a hand-written list
 * is exactly the kind of thing that goes stale the first time somebody adds
 * a component and forgets the line.
 *
 * So this is the drift check, and it is the whole reason the list is allowed
 * to be hand-written: the set of paths the file imports must equal the set of
 * `styles.css` files under `src/lib`, and the lines must be in the order a
 * reader would put them in. Nothing here generates anything; it only refuses
 * to let the two disagree.
 */

// `path.dirname(fileURLToPath(import.meta.url))` and not `new URL(".", …)`:
// the tests run in jsdom, whose global `URL` is not Node's, and resolving a
// relative reference through it loses the `file:` scheme.
const libDir = path.dirname(fileURLToPath(import.meta.url));

/** Every `styles.css` under `src/lib`, as a path relative to `src/lib`. */
const stylesheetsOnDisk = readdirSync(libDir, { recursive: true })
  .map((entry) => String(entry).split(path.sep).join("/"))
  // `rel === "styles.css"` catches a sheet placed directly at `src/lib`,
  // whose relative path carries no separator; none exists today, and the day
  // one does the list must still name it.
  .filter((rel) => rel === "styles.css" || rel.endsWith("/styles.css"));

/** `index.css` without its comments, which quote an import of their own. */
const entry = readFileSync(path.join(libDir, "index.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** The paths `index.css` imports, in the order it imports them. */
const imported = [...entry.matchAll(/^@import url\("\.\/(.+?)"\);$/gm)].map(
  ([, importPath]) => importPath,
);

const manifest = JSON.parse(
  readFileSync(path.join(libDir, "../../package.json"), "utf8"),
) as {
  readonly style: string;
  readonly exports: Record<string, unknown>;
  readonly scripts: Record<string, string>;
};

describe("index.css lists every component stylesheet", () => {
  it("finds the stylesheets it is meant to compare against", () => {
    // A guard on the guard: a rename that empties either side would otherwise
    // make the two comparisons below pass by matching nothing.
    expect(stylesheetsOnDisk.length).toBeGreaterThan(0);
    expect(imported.length).toBe(stylesheetsOnDisk.length);
  });

  it("imports exactly the stylesheets on disk", () => {
    expect([...imported].sort()).toEqual([...stylesheetsOnDisk].sort());
  });

  it("lists them alphabetically", () => {
    expect(imported).toEqual([...imported].sort());
  });

  it("imports nothing in any other form", () => {
    // An import the pattern above cannot read would slip past both
    // comparisons, and the published entry would name a missing sheet.
    expect(entry.match(/@import\b/g)?.length).toBe(imported.length);
  });

  it("names sheets their components also import", () => {
    // The entry buys presence from the first paint; the component's own
    // import is what keeps a page that never links the entry styled.
    for (const sheet of imported) {
      const folder = path.dirname(sheet);
      if (folder === ".") {
        // A sheet at the root of `src/lib` belongs to no component.
        continue;
      }
      const component = readFileSync(
        path.join(libDir, folder, `${path.basename(folder)}.tsx`),
        "utf8",
      );
      expect(component).toMatch(/^import "\.\/styles\.css";$/m);
    }
  });

  it("is published where the build copies it", () => {
    // `build:package:copycss` copies `src/lib/**` to `dist/esm/lib/**`.
    expect(manifest.exports["./index.css"]).toBe("./dist/esm/lib/index.css");
    expect(manifest.style).toBe("dist/esm/lib/index.css");
    expect(manifest.scripts["build:package:copycss"]).toBe(
      "copyfiles -u 1 'src/lib/{,**/}*.css' dist/esm",
    );
  });
});
