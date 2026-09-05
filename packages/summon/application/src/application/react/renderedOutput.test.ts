/**
 * Well-formedness of the RENDERED output, across every flag combination.
 *
 * The conformance fixtures prove the producers agree with each other; they say
 * nothing about whether what they agree on is valid. A syntax error inside an
 * EJS branch renders identically through every producer, so it survives a
 * byte-equality check untouched — and only the combinations someone happens to
 * scaffold by hand would ever catch it.
 *
 * This closes that gap for the class it can close hermetically: every emitted
 * TypeScript file must PARSE, and every emitted JSON file must be JSON. It
 * needs no dependency resolution, so it runs anywhere the package's own tests
 * run, and it covers all 16 combinations rather than the two the fixtures pin.
 *
 * What it deliberately does NOT cover is type errors and build failures: those
 * need the generated app's dependencies resolved, and a scaffolded app pins
 * `@canonical/*` at versions that are not on npm yet, so `bun install` inside
 * one cannot succeed in CI. The reference app (`apps/react/boilerplate-vite`)
 * is the mechanism that covers that class today, for the SSR shape only.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderString, withHelpers } from "@canonical/summon-core";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const templatesDir = fileURLToPath(new URL("./templates", import.meta.url));

/** Every `.ejs` under the templates dir, as paths relative to it. */
const templates = readdirSync(templatesDir, { recursive: true })
  .map((entry) => String(entry).split(path.sep).join("/"))
  .filter((rel) => statSync(path.join(templatesDir, rel)).isFile())
  .filter((rel) => rel.endsWith(".ejs"))
  .sort();

/** The generator's own variable set, minus the parts that do not affect syntax. */
function varsFor(combo: {
  forms: boolean;
  intl: boolean;
  relay: boolean;
  spa: boolean;
}) {
  return withHelpers({
    name: "my-app",
    ...combo,
    // `standalone` gates only the patches block in package.json; both arms are
    // exercised because the combination list below flips it with `relay`.
    standalone: true,
    pragmaVersion: "^0.0.0-test",
  });
}

/** All 16 combinations of the four booleans the templates branch on. */
const combos = [false, true].flatMap((forms) =>
  [false, true].flatMap((intl) =>
    [false, true].flatMap((relay) =>
      [false, true].map((spa) => ({ forms, intl, relay, spa })),
    ),
  ),
);

const label = (c: {
  forms: boolean;
  intl: boolean;
  relay: boolean;
  spa: boolean;
}) =>
  `${c.spa ? "spa" : "ssr"}${c.forms ? " +forms" : ""}${c.intl ? " +intl" : ""}${c.relay ? " +relay" : ""}`;

describe("rendered template output is well-formed in every combination", () => {
  for (const combo of combos) {
    it(`${label(combo)}: every emitted file renders, parses, and is valid`, () => {
      const vars = varsFor(combo);

      for (const rel of templates) {
        const source = readFileSync(path.join(templatesDir, rel), "utf8");

        // 1. The template renders at all. An unbalanced tag or an undefined
        //    variable in a branch only this combination reaches throws here.
        let rendered: string;
        try {
          rendered = renderString(source, vars);
        } catch (error) {
          throw new Error(
            `${rel} failed to render for ${label(combo)}: ${(error as Error).message}`,
          );
        }

        const dest = rel.slice(0, -".ejs".length);

        // 2. Emitted TypeScript parses. `transpileModule` reports syntactic
        //    diagnostics only, which is exactly the class a gate on rendered
        //    text can honestly claim — no module resolution is involved.
        if (dest.endsWith(".ts") || dest.endsWith(".tsx")) {
          const { diagnostics } = ts.transpileModule(rendered, {
            reportDiagnostics: true,
            compilerOptions: {
              jsx: ts.JsxEmit.Preserve,
              target: ts.ScriptTarget.ESNext,
              module: ts.ModuleKind.ESNext,
            },
            fileName: dest,
          });
          const messages = (diagnostics ?? []).map((d) =>
            ts.flattenDiagnosticMessageText(d.messageText, " "),
          );
          expect(
            messages,
            `${dest} does not parse for ${label(combo)}`,
          ).toEqual([]);
        }

        // 3. Emitted JSON is JSON. The templates hand-manage commas around
        //    their gates, which is precisely where a subtractive answer breaks.
        if (dest.endsWith(".json")) {
          expect(
            () => JSON.parse(rendered),
            `${dest} is not valid JSON for ${label(combo)}`,
          ).not.toThrow();
        }
      }
    });
  }
});

/**
 * The root contract and the import order, asserted on the rendered text.
 *
 * These four facts are what makes a scaffolded application render as the
 * design system expects, and every one of them is a line in a template that a
 * later edit can quietly move: the class list on `<html>`, and the position of
 * the stylesheet among the entry's imports. The first decides whether the
 * scoped element-level layers apply at all; the second decides whether the
 * layer statement is the first thing in the built stylesheet or the 75th
 * kilobyte of it. Neither shows up as a syntax error, so neither is covered by
 * the parse gate above.
 */
describe("the rendered application declares the root contract", () => {
  /** The class list every rendered `<html>` must carry. */
  const ROOT_CLASSES = "ds app comfortable";

  const render = (rel: string, combo: (typeof combos)[number]) =>
    renderString(
      readFileSync(path.join(templatesDir, rel), "utf8"),
      varsFor(combo),
    );

  for (const combo of combos) {
    it(`${label(combo)}: <html> carries \`${ROOT_CLASSES}\``, () => {
      const html = render("index.html.ejs", combo);
      expect(html).toContain(`<html lang="en" class="${ROOT_CLASSES}">`);

      // The SPA arm has no server entry to render.
      if (combo.spa) return;

      // The opening tag on its own line, which is the shape the formatter
      // gives it — a bare `/<html/` would also match the prose in the comment
      // above it. Each rendered root carries the classes, with the theme
      // appended at runtime.
      const server = render("src/server/entry.tsx.ejs", combo);
      const roots = [...server.matchAll(/^\s*<html$/gm)];
      expect(roots.length).toBeGreaterThan(0);
      expect(
        [...server.matchAll(/className=\{\["([^"]*)"/g)].map(
          ([, list]) => list,
        ),
      ).toEqual(roots.map(() => ROOT_CLASSES));
    });

    it(`${label(combo)}: the stylesheet is the first import`, () => {
      // "First import" is what the cascade needs: the design system's layer
      // statement has to reach the page before any component's rules do.
      const firstImport = (source: string) => source.match(/^import .*$/m)?.[0];

      expect(firstImport(render("src/client/entry.tsx.ejs", combo))).toBe(
        'import "#styles/index.css";',
      );
      expect(firstImport(render(".storybook/preview.ts.ejs", combo))).toBe(
        'import "../src/styles/index.css";',
      );
      if (!combo.spa) {
        expect(firstImport(render("src/server/entry.tsx.ejs", combo))).toBe(
          'import "#styles/app.css";',
        );
      }
    });

    it(`${label(combo)}: the stylesheet imports the fonts and the components`, () => {
      const styles = render("src/styles/index.css.ejs", combo);
      const imports = [...styles.matchAll(/^@import url\("(.+?)"\);$/gm)].map(
        ([, specifier]) => specifier,
      );

      // Order is the point: the fonts (unlayered `@font-face`), then the layer
      // statement, then every component sheet, then the application's own.
      expect(imports.slice(0, 3)).toEqual([
        "@canonical/styles/fonts",
        "@canonical/styles",
        "@canonical/react-ds-global/index.css",
      ]);
      expect(imports.at(-1)).toBe("./app.css");
    });
  }
});
