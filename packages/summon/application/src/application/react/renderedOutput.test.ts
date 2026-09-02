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
