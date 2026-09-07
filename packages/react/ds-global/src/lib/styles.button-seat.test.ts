/**
 * The Button's density seat may not out-specify the component root.
 *
 * The seat is the last rule in `component/Button/styles.css` and beats the base
 * rule above it by source order. Put an ancestor back in front of it to win by
 * weight instead and that ancestor also beats every other global-tier package's
 * rules in the same layer — the fault this case exists to keep out (the form
 * package's combobox clear button lost its line box, its box-sizing, its
 * centring and its bottom padding to it).
 *
 * `:where(...)` is allowed: it says which scope the rule applies in and counts
 * for nothing. Any other ancestor is not. This covers the Button only; the
 * Accordion Item still has four of these and is carried on PRA-153.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Resolved the way the sibling layer check resolves its sheets.
const [sheet] = Object.keys(
  import.meta.glob("./component/Button/styles.css", {
    query: "?url",
    eager: true,
  }),
);
const source = readFileSync(
  fileURLToPath(new URL(sheet, import.meta.url)),
  "utf-8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Every rule prelude: the text before a `{`, back to the previous `{`, `}` or
 * `;`, with its whitespace collapsed — so a selector biome wrapped over two
 * lines to fit 80 columns is read as the one selector it is.
 */
const preludes: string[] = [];
let start = 0;
for (let i = 0; i < source.length; i += 1) {
  if (source[i] === "{") {
    preludes.push(source.slice(start, i).replace(/\s+/g, " ").trim());
    start = i + 1;
  } else if (source[i] === "}" || source[i] === ";") start = i + 1;
}

/** A selector list split on the commas that are not inside parentheses. */
const parts = (prelude: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let at = 0;
  for (let i = 0; i < prelude.length; i += 1) {
    if (prelude[i] === "(") depth += 1;
    else if (prelude[i] === ")") depth -= 1;
    else if (prelude[i] === "," && depth === 0) {
      out.push(prelude.slice(at, i));
      at = i + 1;
    }
  }
  return [...out, prelude.slice(at)].map((s) => s.trim()).filter(Boolean);
};

/** The selectors that reach the component root: by name, or through `&`. */
const selectors = preludes
  .flatMap(parts)
  .filter(
    (selector) => selector.includes(".ds.button") || selector.includes("&"),
  );

describe("the Button's selectors", () => {
  it("finds them", () => {
    // A pattern that silently matched nothing would make every case vacuous.
    expect(selectors.length).toBeGreaterThan(4);
  });

  for (const selector of selectors) {
    it(`starts at the component root: ${selector}`, () => {
      // Drop the zero-weight scope groups; what is left must start at the root.
      // A nested selector says the same thing with `&`: leading, it is a
      // compound or a descendant of the root; anywhere else, it has an
      // ancestor in front of the root.
      const bare = selector.replace(/:where\([^()]*\)\s*/g, "").trim();
      expect(bare).toMatch(bare.includes("&") ? /^&/ : /^\.ds\.button/);
    });
  }
});
