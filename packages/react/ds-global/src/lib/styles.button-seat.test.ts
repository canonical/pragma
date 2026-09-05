/**
 * The Button's density seat may not out-specify the component root.
 *
 * The seat is the last rule in `component/Button/styles.css` and beats the base
 * rule above it by source order. Put an ancestor back in front of it to win by
 * weight instead and that ancestor also beats every other global-tier package's
 * rules in the same layer — the fault this case exists to keep out (the form
 * package's combobox clear button lost its whole box to it).
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

/** Every one-line selector in the sheet that names the component root. */
const selectors = (source.match(/^[ \t]*[^{}@\n][^{}\n]*\{$/gm) ?? [])
  .map((line) => line.trim().slice(0, -1).trim())
  .filter((selector) => selector.includes(".ds.button"));

describe("the Button's selectors", () => {
  it("finds them", () => {
    // A pattern that silently matched nothing would make every case vacuous.
    expect(selectors.length).toBeGreaterThan(4);
  });

  for (const selector of selectors) {
    it(`starts at the component root: ${selector}`, () => {
      // Drop the zero-weight scope groups; what is left must start at the root.
      expect(selector.replace(/:where\([^()]*\)\s*/g, "").trim()).toMatch(
        /^\.ds\.button/,
      );
    });
  }
});
