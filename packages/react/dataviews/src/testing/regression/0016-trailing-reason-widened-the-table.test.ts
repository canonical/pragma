/**
 * Regression: a refusal's reason stays within its heading.
 *
 * Before the fix, the reason was positioned from the heading's start and
 * kept to one line, so a whole sentence under a trailing column ran past the
 * table's edge. The table is its own scroll container, and a positioned box
 * counts toward its scroll area: a horizontal scrollbar appeared, shifting
 * the rows, and went again when focus left.
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

describe("regression 0016 — a trailing reason widened the table", () => {
  it("spans the heading and wraps within it", () => {
    const rule = sheet.match(/& > \.sort-reason \{([^{}]*)/)?.at(1);
    expect(rule).toBeDefined();
    expect(rule).toMatch(/inset-inline:\s*0;/);
    expect(rule).not.toMatch(/white-space:\s*nowrap/);
    expect(rule).not.toMatch(/inset-inline-start/);
  });
});
