/**
 * Regression: a table nested in another table's cell inherited the outer
 * table's selection and settings tracks.
 *
 * Before the fix, the two tracks were custom properties set on a table that
 * holds their cells and read by every row below it, so an inner table without
 * selection or settings drew their empty tracks too, and its solved columns
 * no longer lined up. Every table now sets both for itself.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../lib/_work_in_progress/DataTable/styles.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("regression 0053 — a nested table inherited its parent's tracks", () => {
  it("resets both tracks on every table root", () => {
    const root = sheet
      .match(/(?:^|[;{}])\s*\.ds\.data-table\s*\{([^{}]*)/)
      ?.at(1);
    expect(root).toMatch(/--data-table-selection-track:\s*initial;/);
    expect(root).toMatch(/--data-table-settings-track:\s*initial;/);
  });
});
