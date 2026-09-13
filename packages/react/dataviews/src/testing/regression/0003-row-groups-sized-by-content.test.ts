/**
 * Regression: row groups take their tracks' minimums, never their cells'
 * content.
 *
 * Before the fix, the row groups took `min-inline-size: max-content`, which
 * sized every cell of every row on each layout and, before the column
 * solver had measured the container, let flexible tracks grow to their
 * longest unbroken value, so the table painted too wide first.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Resolved from the package root, which is where the suite runs; the
// comments are dropped, so prose about the fix is not taken for a rule.
const sheet = readFileSync(
  path.resolve("src/lib/_work_in_progress/DataTable/styles.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("regression 0003 — row groups sized by their content", () => {
  it("sizes a row group by min-content and writes max-content nowhere", () => {
    const rule = sheet.match(/\.ds\.data-table-row-group\s*\{[^}]*\}/);
    expect(rule?.[0]).toMatch(/min-inline-size:\s*min-content;/);
    expect(sheet).not.toMatch(/max-content/);
  });
});
